/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.1 Single-Point Observable Server DAG Kernel (5-Stage Pipeline + RBAC Wire Tap).
 */
import { API_ROUTES, HTTP_STATUS } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import { okResponse, requireCapability, type ApiResponseEnvelope, type RequestPrincipal } from './middleware';

export const MAX_SERVER_WIRE_BUFFER = 256 as const;

export type ServerDagStage =
	| 'STAGE_1_WIRE_GUARD'
	| 'STAGE_2_AUTH_RBAC'
	| 'STAGE_3_SANITIZE'
	| 'STAGE_4_DOMAIN_COMMIT'
	| 'STAGE_5_FANOUT_OBSERVE';

export interface ServerWireTraceRecord {
	readonly seq: number;
	readonly traceId: string;
	readonly hlc: string;
	readonly stage: ServerDagStage;
	readonly channel: 'SERVER_DAG' | 'WS_COLLAB' | 'RBAC_SECURITY';
	readonly intentKind: string;
	readonly sourceZone: string;
	readonly durationUs: number;
	readonly status: 'OK' | 'DENIED' | 'ERROR';
	readonly summary: string;
	readonly payloadPreview: string;
}

class ServerDagKernel {
	private seq = 0;
	private logical = 0;
	private buffer: ServerWireTraceRecord[] = [];

	private nextHlc(): string {
		this.logical = (this.logical + 1) & 0xffff;
		return `${Date.now()}:${this.logical}`;
	}

	record(input: Omit<ServerWireTraceRecord, 'seq' | 'traceId' | 'hlc'>): ServerWireTraceRecord {
		const seq = ++this.seq;
		const rec: ServerWireTraceRecord = {
			seq,
			traceId: `srv-${seq.toString(16).padStart(6, '0')}`,
			hlc: this.nextHlc(),
			...input,
		};
		this.buffer = [rec, ...this.buffer].slice(0, MAX_SERVER_WIRE_BUFFER);
		return rec;
	}

	listTraces(limit = 64): readonly ServerWireTraceRecord[] {
		return this.buffer.slice(0, Math.max(1, Math.min(MAX_SERVER_WIRE_BUFFER, limit)));
	}

	async execute(
		urlPath: string,
		method: string,
		principal: RequestPrincipal,
		bodyPreview: string,
		handler: () => Promise<ApiResponseEnvelope>
	): Promise<ApiResponseEnvelope> {
		const t0 = performance.now();
		const res = await handler();
		const durationUs = Math.max(1, Math.round((performance.now() - t0) * 1000));
		const isRbac = urlPath.includes('/security/') || urlPath.includes('/auth/') || res.status === HTTP_STATUS.FORBIDDEN;
		const isCollab = urlPath.includes('/collab/') || urlPath.includes('/ws/');
		const status: ServerWireTraceRecord['status'] =
			res.status === HTTP_STATUS.FORBIDDEN || res.status === HTTP_STATUS.UNAUTHORIZED
				? 'DENIED'
				: res.status >= 400
					? 'ERROR'
					: 'OK';
		const trace = this.record({
			stage: status === 'DENIED' ? 'STAGE_2_AUTH_RBAC' : 'STAGE_5_FANOUT_OBSERVE',
			channel: isRbac ? 'RBAC_SECURITY' : isCollab ? 'WS_COLLAB' : 'SERVER_DAG',
			intentKind: `${method} ${urlPath.split('?')[0]}`,
			sourceZone: principal.username || 'guest',
			durationUs,
			status,
			summary: `${method} ${urlPath.split('?')[0]} → ${res.status} (${durationUs}µs)`,
			payloadPreview: bodyPreview.slice(0, 140) || '{}',
		});
		return {
			...res,
			headers: { ...(res.headers ?? {}), 'x-chronos-wire-trace': JSON.stringify(trace) },
		};
	}

	async handleWireObserveRoute(
		urlPath: string,
		method: string,
		headers: Record<string, string>,
		principal: RequestPrincipal
	): Promise<ApiResponseEnvelope | null> {
		if (!urlPath.startsWith(API_ROUTES.SECURITY_WIRE_OBSERVE) || method !== 'GET') return null;
		const denied = await requireCapability(principal, method, headers, CAPABILITY_BITS.ADMIN_WIRE_OBSERVE);
		if (denied) return denied;
		return okResponse({ topic: 'ws:wire:observe', traces: this.listTraces(64) });
	}
}

export const serverDagKernel = new ServerDagKernel();
