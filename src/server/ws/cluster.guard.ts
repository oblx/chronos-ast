/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v2.6.0 RBAC Collaborating Cluster Engine: deterministic 2–8 seat cluster rooms capped by host RoleId.
 */
import { HUD_EVENTS } from '@config/hud.events';
import { resolveClusterSeatCap } from '@config/security.constants';

export interface WsClusterRecord {
	readonly clusterId: string;
	readonly workspaceId: string;
	readonly hostClientId: string;
	readonly hostRoleId: string;
	readonly seatCap: number;
	readonly memberIds: Set<string>;
}

export interface WsClusterJoinResult {
	readonly accepted: boolean;
	readonly code: number;
	readonly event?: string;
	readonly seatCount: number;
	readonly seatCap: number;
	readonly reason?: string;
	readonly cluster?: WsClusterRecord;
}

const clusters = new Map<string, WsClusterRecord>();

export function joinOrCreateCluster(
	clusterId: string,
	workspaceId: string,
	clientId: string,
	hostRoleId: string
): WsClusterJoinResult {
	const safeId = clusterId.trim().slice(0, 64) || `cluster-${workspaceId}`;
	let rec = clusters.get(safeId);
	if (!rec) {
		const seatCap = resolveClusterSeatCap(hostRoleId);
		rec = {
			clusterId: safeId,
			workspaceId,
			hostClientId: clientId,
			hostRoleId,
			seatCap,
			memberIds: new Set<string>([clientId]),
		};
		clusters.set(safeId, rec);
		return { accepted: true, code: 1000, seatCount: rec.memberIds.size, seatCap: rec.seatCap, cluster: rec };
	}
	if (!rec.memberIds.has(clientId) && rec.memberIds.size >= rec.seatCap) {
		return {
			accepted: false,
			code: 4008,
			event: HUD_EVENTS.CLUSTER_SEAT_LIMIT_REACHED,
			seatCount: rec.memberIds.size,
			seatCap: rec.seatCap,
			reason: `${rec.memberIds.size}/${rec.seatCap} Seats Active`,
		};
	}
	rec.memberIds.add(clientId);
	return { accepted: true, code: 1000, seatCount: rec.memberIds.size, seatCap: rec.seatCap, cluster: rec };
}

export function leaveClusterMember(clientId: string): WsClusterRecord[] {
	const updated: WsClusterRecord[] = [];
	for (const [cid, rec] of clusters.entries()) {
		if (!rec.memberIds.delete(clientId)) continue;
		if (rec.memberIds.size === 0) clusters.delete(cid);
		else updated.push(rec);
	}
	return updated;
}

export function getClusterSnapshot(clusterId: string) {
	const rec = clusters.get(clusterId);
	if (!rec) return null;
	return {
		clusterId: rec.clusterId,
		workspaceId: rec.workspaceId,
		hostRoleId: rec.hostRoleId,
		seatCount: rec.memberIds.size,
		seatCap: rec.seatCap,
		memberIds: [...rec.memberIds],
	};
}

export function resetWsClusters(): void {
	clusters.clear();
}
