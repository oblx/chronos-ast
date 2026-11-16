/**
 * @author Oblx <code@oblx.dev>
 * @description Signed Outbound Workflow Event Bridge: HMAC-SHA256 webhook dispatcher backed by SQLite system_configs & AEAD secrets_vault.
 */
import { eq } from 'drizzle-orm';
import { WORKFLOW_CONFIG_KEYS, WORKFLOW_WEBHOOK_EVENTS, type WorkflowWebhookEvent } from '@config/constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { secretsVault, systemConfigs } from '@lib/db/sqlite/schema/tables';
import { bytesToHex, encodeUtf8, hmacSha256Bytes } from '@core/security/crypto.primitives';
import { validateOutboundUrl } from '@core/security/guards/net.guard';
import { redactOutboundPayload } from '@core/security/guards/payload.redactor';
import { decryptVaultSecret } from '@core/security/vault.crypto';

export interface WorkflowWebhookConfig {
	readonly webhookUrl: string;
	readonly events: readonly WorkflowWebhookEvent[];
	readonly secretId: string;
}

export interface WebhookDeliveryResult {
	readonly delivered: boolean;
	readonly status: number;
	readonly deliveryId: string;
	readonly eventKind: WorkflowWebhookEvent;
	readonly signatureHeader: string;
}

export function upsertWorkflowWebhookConfig(handle: ChronosDatabaseHandle, cfg: Partial<WorkflowWebhookConfig>, updatedBy = 'operator'): void {
	const now = Date.now();
	const pairs: Array<[string, string]> = [];
	if (cfg.webhookUrl !== undefined) pairs.push([WORKFLOW_CONFIG_KEYS.WEBHOOK_URL, cfg.webhookUrl.trim()]);
	if (cfg.events !== undefined) pairs.push([WORKFLOW_CONFIG_KEYS.WEBHOOK_EVENTS, JSON.stringify(cfg.events)]);
	if (cfg.secretId !== undefined) pairs.push([WORKFLOW_CONFIG_KEYS.WEBHOOK_SECRET_ID, cfg.secretId.trim()]);
	for (const [configKey, configValue] of pairs) {
		handle.db.insert(systemConfigs).values({ configKey, configValue, updatedBy, updatedAt: now })
			.onConflictDoUpdate({ target: systemConfigs.configKey, set: { configValue, updatedBy, updatedAt: now } }).run();
	}
}

export function readWorkflowWebhookConfig(handle: ChronosDatabaseHandle): WorkflowWebhookConfig | null {
	const rows = handle.db.select().from(systemConfigs).all();
	const byKey = new Map(rows.map((r) => [r.configKey, r.configValue]));
	const webhookUrl = byKey.get(WORKFLOW_CONFIG_KEYS.WEBHOOK_URL)?.trim() ?? '';
	if (!webhookUrl) return null;
	const rawEvents = byKey.get(WORKFLOW_CONFIG_KEYS.WEBHOOK_EVENTS) ?? JSON.stringify(Object.values(WORKFLOW_WEBHOOK_EVENTS));
	let parsedEvents: WorkflowWebhookEvent[] = Object.values(WORKFLOW_WEBHOOK_EVENTS);
	try {
		const arr = JSON.parse(rawEvents) as unknown;
		if (Array.isArray(arr)) parsedEvents = arr.map((v) => String(v) as WorkflowWebhookEvent);
	} catch {}
	return { webhookUrl, events: parsedEvents, secretId: byKey.get(WORKFLOW_CONFIG_KEYS.WEBHOOK_SECRET_ID)?.trim() ?? '' };
}

async function resolveWebhookHmacKey(handle: ChronosDatabaseHandle, secretId: string): Promise<string | null> {
	if (!secretId) return null;
	const row = handle.db.select().from(secretsVault).where(eq(secretsVault.id, secretId)).get();
	if (!row) return null;
	return decryptVaultSecret({ ownerId: row.ownerId, secretId: row.id, ciphertextB64: row.ciphertextB64, ivB64: row.ivB64, keyVersion: row.keyVersion });
}

export async function signWebhookBody(secret: string, bodyJson: string): Promise<string> {
	const mac = await hmacSha256Bytes(encodeUtf8(secret), encodeUtf8(bodyJson));
	return `sha256=${bytesToHex(mac)}`;
}

export async function deliverWorkflowWebhook(
	handle: ChronosDatabaseHandle,
	eventKind: WorkflowWebhookEvent,
	payload: unknown,
	options: { readonly allowLoopback?: boolean } = {}
): Promise<WebhookDeliveryResult | null> {
	const cfg = readWorkflowWebhookConfig(handle);
	if (!cfg || !cfg.events.includes(eventKind)) return null;
	const allowLoopback = options.allowLoopback ?? process.env.CHRONOS_ALLOW_LOCAL_WEBHOOK === 'true';
	const validated = await validateOutboundUrl(cfg.webhookUrl, { allowLoopback });
	const deliveryId = `dlv-${crypto.randomUUID().slice(0, 12)}`;
	const cleanPayload = redactOutboundPayload(JSON.stringify({ event: eventKind, deliveryId, timestamp: Date.now(), data: payload })).redactedText;
	const signingSecret = await resolveWebhookHmacKey(handle, cfg.secretId);
	const signatureHeader = signingSecret ? await signWebhookBody(signingSecret, cleanPayload) : 'sha256=unsigned';
	const res = await fetch(validated.url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-chronos-event': eventKind,
			'x-chronos-delivery-id': deliveryId,
			'x-chronos-signature': signatureHeader,
		},
		body: cleanPayload,
	});
	return { delivered: res.ok, status: res.status, deliveryId, eventKind, signatureHeader };
}

export function dispatchWorkflowWebhookAsync(
	handle: ChronosDatabaseHandle | null | undefined,
	eventKind: WorkflowWebhookEvent,
	payload: unknown,
	options: { readonly allowLoopback?: boolean } = {}
): void {
	if (!handle) return;
	void deliverWorkflowWebhook(handle, eventKind, payload, options).catch(() => {});
}
