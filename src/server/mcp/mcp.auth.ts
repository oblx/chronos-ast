/**
 * @author Oblx <code@oblx.dev>
 * @description RBAC capability filtering, Dual-Capability + Group Weight Twin authorization, and SHA-256 audit logging for MCP.
 */
import { CAPABILITY_BITS, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
import { appendAuditEntry } from '@core/security/audit.chain';
import { hasCapability } from '@core/security/rbac.bitmask';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import type { RequestPrincipal } from '../http/middleware';
import { resolveUserMaxGroupWeight } from '../routes/collab.routes';
import { MCP_FORENSIC_TOOLS, type JsonRpcError, type McpToolSpec, type WsSessionDescriptor } from './mcp.types';

export function listPermittedForensicTools(principal: RequestPrincipal): readonly McpToolSpec[] {
	return MCP_FORENSIC_TOOLS.filter((tool) => hasCapability(principal.effectiveMask, tool.requiredCapability));
}

export function checkForensicToolCapability(principal: RequestPrincipal, toolName: string): JsonRpcError | null {
	const spec = MCP_FORENSIC_TOOLS.find((t) => t.name === toolName);
	if (!spec) return { code: -32601, message: `Unknown Forensic MCP tool: ${toolName}` };
	if (!hasCapability(principal.effectiveMask, spec.requiredCapability)) {
		return { code: -32003, message: `Forbidden: principal ${principal.username} lacks capability for ${toolName}.` };
	}
	return null;
}

export function checkForensicResourceRead(principal: RequestPrincipal): JsonRpcError | null {
	if (!hasCapability(principal.effectiveMask, CAPABILITY_BITS.METAMODEL_QUERY)) {
		return { code: -32003, message: `Forbidden: principal ${principal.username} lacks METAMODEL_QUERY capability.` };
	}
	return null;
}

export async function authorizeTwinMcpRequest(
	handle: ChronosDatabaseHandle,
	principal: RequestPrincipal,
	targets: readonly WsSessionDescriptor[] = []
): Promise<JsonRpcError | null> {
	const hasAdminWire = hasCapability(principal.effectiveMask, CAPABILITY_BITS.ADMIN_WIRE_OBSERVE);
	const hasOverride = hasCapability(principal.effectiveMask, CAPABILITY_BITS.COLLAB_OVERRIDE);
	if (!hasAdminWire || !hasOverride) {
		await appendAuditEntry(
			handle, principal.userId, 'TWIN_MCP_DENIED', 'WARN',
			`Denied Twin MCP call for ${principal.username} (${principal.roleId}): missing ADMIN_WIRE_OBSERVE or COLLAB_OVERRIDE.`
		);
		return { code: -32003, message: 'Forbidden: Twin MCP requires ADMIN_WIRE_OBSERVE and COLLAB_OVERRIDE capabilities.' };
	}
	if (principal.uid === SEEDED_OPERATOR_CONFIG.UID) return null;
	const actorWeight = resolveUserMaxGroupWeight(handle, principal.uid, principal.roleId);
	for (const sess of targets) {
		const targetWeight = resolveUserMaxGroupWeight(handle, sess.uid, sess.roleId);
		if (actorWeight < targetWeight) {
			await appendAuditEntry(
				handle, principal.userId, 'TWIN_MCP_WEIGHT_DENIED', 'WARN',
				`Denied Twin MCP targeting ${sess.username} (weight ${targetWeight} > actor ${actorWeight}).`
			);
			return { code: -32003, message: `Forbidden: insufficient RBAC group weight (${actorWeight} < ${targetWeight}) for ${sess.username}.` };
		}
	}
	return null;
}

export async function recordTwinMcpAudit(
	handle: ChronosDatabaseHandle,
	principal: RequestPrincipal,
	action: string,
	detail: string
): Promise<void> {
	await appendAuditEntry(handle, principal.userId, action, 'INFO', detail);
}
