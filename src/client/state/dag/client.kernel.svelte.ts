/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.1 Single-Point Observable Client DAG Kernel (4-Stage Pipeline + 256-Slot Wire Ring Buffer + HTTP/Storage Facades).
 */
import { API_ROUTES } from '@config/constants';
import { HLC_SYNC_CONSTANTS } from '@config/security.constants';
import { INTENT_ROUTING_CLASS, classifyIntentRoutingTier, type IntentRoutingTier } from '@ui/wire';
export { INTENT_ROUTING_CLASS, classifyIntentRoutingTier, type IntentRoutingTier };

export const MAX_WIRE_RING_BUFFER = 256 as const;
export type WireChannelKind = 'CLIENT_DAG' | 'SERVER_DAG' | 'WS_COLLAB' | 'RBAC_SECURITY';
export type WireStageKind =
	| 'STAGE_1_VALIDATE' | 'STAGE_2_REDUCE' | 'STAGE_3_EFFECT' | 'STAGE_4_TELEMETRY'
	| 'STAGE_5_FANOUT_OBSERVE' | 'STAGE_1_WIRE_GUARD' | 'STAGE_2_AUTH_RBAC';

export interface WireTraceRecord {
	readonly seq: number; readonly traceId: string; readonly hlc: string; readonly stage: WireStageKind;
	readonly channel: WireChannelKind; readonly intentKind: string; readonly sourceZone: string;
	readonly routingTier?: IntentRoutingTier;
	readonly durationUs: number; readonly status: 'OK' | 'DENIED' | 'ERROR';
	readonly summary: string; readonly payloadPreview: string;
}

export interface DagIntentEnvelope<T = Record<string, unknown>> {
	readonly intentKind: string; readonly sourceZone: string; readonly channel?: WireChannelKind;
	readonly payload?: T; readonly reduce?: () => void;
}

class ClientDagKernel {
	private seq = 0;
	private logical = 0;
	private headerBuilder: (() => Record<string, string>) | null = null;
	private tickerHook: ((tag: string, msg: string) => void) | null = null;
	paused = false;
	activeFilter: 'ALL' | WireChannelKind | 'SLOW' = 'ALL';
	traces: readonly WireTraceRecord[] = [{
		seq: 1, traceId: 'cli-000001', hlc: `${Date.now()}:1`, stage: 'STAGE_4_TELEMETRY',
		channel: 'CLIENT_DAG', intentKind: 'DAG_KERNEL_BOOT', sourceZone: 'WORLD_CANVAS',
		routingTier: INTENT_ROUTING_CLASS.TIER_0_LOCAL_UI,
		durationUs: 42, status: 'OK', summary: '4-Stage Client & 5-Stage Server Observable Wire DAG online',
		payloadPreview: '{"ringBuffer":256}',
	}];

	bindHooks(headerBuilder: () => Record<string, string>, tickerHook?: (tag: string, msg: string) => void): void {
		this.headerBuilder = headerBuilder;
		if (tickerHook) this.tickerHook = tickerHook;
	}

	private nextHlc(): string { this.logical = (this.logical + 1) & 0xffff; return `${Date.now()}:${this.logical}`; }

	appendTrace(input: Omit<WireTraceRecord, 'seq' | 'traceId' | 'hlc'>): WireTraceRecord {
		const seq = ++this.seq + 1;
		const rec: WireTraceRecord = { seq, traceId: `dag-${seq.toString(16).padStart(6, '0')}`, hlc: this.nextHlc(), routingTier: input.routingTier ?? classifyIntentRoutingTier(input.intentKind), ...input };
		if (!this.paused) this.traces = [rec, ...this.traces].slice(0, MAX_WIRE_RING_BUFFER);
		return rec;
	}

	dispatch<T = Record<string, unknown>>(env: DagIntentEnvelope<T>): WireTraceRecord {
		const t0 = performance.now();
		if (!env.intentKind.trim()) {
			return this.appendTrace({
				stage: 'STAGE_1_VALIDATE', channel: env.channel ?? 'CLIENT_DAG', intentKind: 'INVALID_INTENT',
				sourceZone: env.sourceZone || 'HUD', routingTier: INTENT_ROUTING_CLASS.TIER_0_LOCAL_UI, durationUs: 1, status: 'ERROR',
				summary: 'Rejected empty intentKind at STAGE_1_VALIDATE', payloadPreview: '{}',
			});
		}
		const routingTier = classifyIntentRoutingTier(env.intentKind);
		env.reduce?.();
		const durationUs = Math.max(1, Math.round((performance.now() - t0) * 1000));
		return this.appendTrace({
			stage: 'STAGE_4_TELEMETRY', channel: env.channel ?? (routingTier === INTENT_ROUTING_CLASS.TIER_2_REALTIME_CLUSTER ? 'WS_COLLAB' : 'CLIENT_DAG'), intentKind: env.intentKind,
			sourceZone: env.sourceZone, routingTier, durationUs, status: 'OK',
			summary: `${env.intentKind} [${env.sourceZone}] (${durationUs}µs)`,
			payloadPreview: JSON.stringify(env.payload ?? {}).slice(0, 140),
		});
	}

	togglePause(force?: boolean): boolean { this.paused = force ?? !this.paused; return this.paused; }

	filteredTraces(filter: 'ALL' | WireChannelKind | 'SLOW' = this.activeFilter): readonly WireTraceRecord[] {
		if (filter === 'ALL') return this.traces;
		if (filter === 'SLOW') return this.traces.filter((t) => t.durationUs >= 5000);
		return this.traces.filter((t) => t.channel === filter);
	}

	async requestJson<R = Record<string, unknown>>(
		route: string,
		init?: { method?: string; body?: unknown; sourceZone?: string; intentKind?: string }
	): Promise<{ ok: boolean; status: number; data: R }> {
		const method = init?.method ?? 'GET', sourceZone = init?.sourceZone ?? 'HUD';
		const intentKind = init?.intentKind ?? `${method} ${route.split('?')[0]}`;
		const bodyStr = init?.body !== undefined ? JSON.stringify(init.body) : undefined;
		this.dispatch({ intentKind, sourceZone, channel: 'CLIENT_DAG', payload: (init?.body ?? { route }) as Record<string, unknown> });
		const t0 = performance.now();
		const headers = this.headerBuilder ? this.headerBuilder() : { 'content-type': 'application/json' };
		try {
			const res = await fetch(route, { method, headers, credentials: 'same-origin', body: bodyStr });
			const durationUs = Math.max(1, Math.round((performance.now() - t0) * 1000));
			const srvHeader = res.headers.get('x-chronos-wire-trace');
			if (srvHeader) {
				try { const p = JSON.parse(srvHeader) as WireTraceRecord; this.appendTrace({ ...p, channel: p.channel ?? 'SERVER_DAG' }); } catch {}
			} else {
				this.appendTrace({
					stage: 'STAGE_5_FANOUT_OBSERVE', channel: route.includes('/collab') ? 'WS_COLLAB' : 'SERVER_DAG',
					intentKind: `${method} ${route.split('?')[0]}`, sourceZone, durationUs,
					status: res.status === 403 || res.status === 401 ? 'DENIED' : res.ok ? 'OK' : 'ERROR',
					summary: `${method} ${route.split('?')[0]} → ${res.status} (${durationUs}µs)`,
					payloadPreview: (bodyStr ?? '{}').slice(0, 140),
				});
			}
			return { ok: res.ok, status: res.status, data: (await res.json()) as R };
		} catch { return { ok: false, status: 0, data: {} as R }; }
	}

	async syncServerWireTraces(): Promise<readonly WireTraceRecord[]> {
		const res = await this.requestJson<{ traces?: WireTraceRecord[] }>(API_ROUTES.SECURITY_WIRE_OBSERVE, { method: 'GET', sourceZone: 'BOTTOM_LEFT', intentKind: 'WIRE_OBSERVE_SYNC' });
		if (res.ok && Array.isArray(res.data.traces)) {
			for (const tr of res.data.traces.slice(0, 16)) if (!this.traces.some((e) => e.traceId === tr.traceId)) this.appendTrace(tr);
		}
		return this.traces;
	}

	async fetchServerWireHistory(): Promise<readonly WireTraceRecord[]> {
		return this.syncServerWireTraces();
	}

	purgeBrowserStorage(): void {
		this.dispatch({ intentKind: 'PRIVACY_PURGE_LOCAL', sourceZone: 'APP_MODAL', channel: 'RBAC_SECURITY' });
		try {
			if (typeof localStorage !== 'undefined') localStorage.clear();
			if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
			if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(HLC_SYNC_CONSTANTS.IDB_SECURITY_DB);
		} catch {}
		this.tickerHook?.('PRIVACY', 'Cleared localStorage, sessionStorage & IndexedDB caches');
	}
}

export const clientDagKernel = new ClientDagKernel();
