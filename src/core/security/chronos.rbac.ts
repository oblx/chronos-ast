/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos hierarchical RBAC compiler: group inheritance, weights, project_members contextual binding, and O(1) u32 bitmask output.
 */
import { and, eq } from 'drizzle-orm';
import { CAPABILITY_REGISTER, CHRONOS_RBAC_GROUPS, MUTATION_MASK, ROLE_IDS, ROLE_MASKS, type RoleId } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { projectMembers, rbacGroups, rbacPermissionNodes, rbacUserGroups, users } from '@lib/db/sqlite/schema/tables';
import { computeEffectiveMask, isSystemLockdownActive } from './rbac.bitmask';

export interface RbacCompileOptions {
	readonly workspaceContextId?: number | null;
	readonly tokenScopedMask?: number;
	readonly nowMs?: number;
	readonly lockdownActive?: boolean;
}

export function seedDefaultRbacGroups(handle: ChronosDatabaseHandle): void {
	for (const grp of CHRONOS_RBAC_GROUPS) {
		const existing = handle.db.select().from(rbacGroups).where(eq(rbacGroups.name, grp.name)).get();
		if (!existing) {
			handle.db.insert(rbacGroups).values({
				id: grp.id, name: grp.name, displayName: grp.displayName,
				weight: grp.weight, parentGroupId: grp.parentGroupId, defaultMask: grp.defaultMask >>> 0,
			}).run();
		}
	}
}

function resolveInheritedGroupChain(
	allGroups: ReadonlyArray<typeof rbacGroups.$inferSelect>,
	seedGroupIds: readonly number[]
): Array<typeof rbacGroups.$inferSelect> {
	const byId = new Map(allGroups.map((g) => [g.id, g]));
	const visited = new Map<number, typeof rbacGroups.$inferSelect>();
	const queue = [...seedGroupIds];
	while (queue.length > 0) {
		const gid = queue.shift()!;
		if (visited.has(gid)) continue;
		const grp = byId.get(gid);
		if (!grp) continue;
		visited.set(gid, grp);
		if (grp.parentGroupId && !visited.has(grp.parentGroupId)) queue.push(grp.parentGroupId);
	}
	return Array.from(visited.values()).sort((a, b) => a.weight - b.weight);
}

function applyNodeList(
	baseMask: number,
	nodes: ReadonlyArray<typeof rbacPermissionNodes.$inferSelect>,
	workspaceContextId: number | null,
	nowMs: number
): number {
	let mask = baseMask >>> 0;
	for (const n of nodes) {
		if (n.expiresAt !== null && n.expiresAt <= nowMs) continue;
		if (n.workspaceContextId !== null && n.workspaceContextId !== workspaceContextId) continue;
		const bitMask = (1 << (n.bitIndex & 31)) >>> 0;
		mask = n.value !== 0 ? (mask | bitMask) >>> 0 : (mask & ~bitMask) >>> 0;
	}
	return mask >>> 0;
}

export function compileEffectiveUserMask(
	handle: ChronosDatabaseHandle,
	userIdentifier: number | string,
	opts?: RbacCompileOptions
): number {
	seedDefaultRbacGroups(handle);
	const nowMs = opts?.nowMs ?? Date.now();
	const wsCtx = opts?.workspaceContextId ?? null;
	const scopeMask = (opts?.tokenScopedMask ?? 0xffffffff) >>> 0;
	const lockdown = opts?.lockdownActive ?? isSystemLockdownActive();

	const userRow = typeof userIdentifier === 'number'
		? handle.db.select().from(users).where(eq(users.uid, userIdentifier)).get()
		: handle.db.select().from(users).where(eq(users.id, String(userIdentifier))).get();

	if (!userRow) return computeEffectiveMask(ROLE_IDS.GUEST, 0, 0, scopeMask, lockdown);

	const allGroups = handle.db.select().from(rbacGroups).all();
	const userGroupRows = handle.db.select().from(rbacUserGroups).where(eq(rbacUserGroups.userId, userRow.uid)).all()
		.filter((ug) => ug.expiresAt === null || ug.expiresAt > nowMs);
	const projMemberRow = wsCtx !== null
		? handle.db.select().from(projectMembers).where(and(eq(projectMembers.projectId, wsCtx), eq(projectMembers.userId, userRow.uid))).get()
		: undefined;
	const seedIds = Array.from(new Set([
		userRow.primaryGroupId,
		...userGroupRows.map((u) => u.groupId),
		...(projMemberRow ? [projMemberRow.groupId] : []),
	]));
	const orderedGroups = resolveInheritedGroupChain(allGroups, seedIds);

	let mask = (ROLE_MASKS[userRow.roleId as RoleId] ?? 0) >>> 0;
	for (const grp of orderedGroups) {
		mask = (mask | (grp.defaultMask >>> 0)) >>> 0;
		const grpNodes = handle.db.select().from(rbacPermissionNodes)
			.where(and(eq(rbacPermissionNodes.holderKind, 'GROUP'), eq(rbacPermissionNodes.holderId, grp.id))).all();
		mask = applyNodeList(mask, grpNodes, wsCtx, nowMs);
	}

	const usrNodes = handle.db.select().from(rbacPermissionNodes)
		.where(and(eq(rbacPermissionNodes.holderKind, 'USER'), eq(rbacPermissionNodes.holderId, userRow.uid))).all();
	mask = applyNodeList(mask, usrNodes, wsCtx, nowMs);
	const projOverride = (projMemberRow?.personalOverrideMask ?? 0) >>> 0;
	mask = ((((mask | (userRow.grantMask >>> 0) | projOverride) & ~(userRow.denyMask >>> 0)) & scopeMask)) >>> 0;

	const isAdmin = userRow.roleId === ROLE_IDS.ADMIN || orderedGroups.some((g) => g.name === 'admin');
	if (lockdown && !isAdmin) mask = (mask & ~MUTATION_MASK) >>> 0;
	return mask >>> 0;
}

export function assignUserToGroup(
	handle: ChronosDatabaseHandle,
	userUid: number,
	groupId: number,
	expiresAt: number | null = null
): void {
	seedDefaultRbacGroups(handle);
	handle.db.insert(rbacUserGroups).values({ userId: userUid >>> 0, groupId: groupId >>> 0, expiresAt }).run();
}

export function setChronosRbacNode(
	handle: ChronosDatabaseHandle,
	input: {
		readonly holderKind: 'GROUP' | 'USER'; readonly holderId: number; readonly bitIndex: number;
		readonly value: boolean; readonly workspaceContextId?: number | null; readonly expiresAt?: number | null;
	}
): void {
	const bit = input.bitIndex & 31;
	const cap = CAPABILITY_REGISTER[bit];
	handle.db.insert(rbacPermissionNodes).values({
		holderKind: input.holderKind, holderId: input.holderId >>> 0,
		nodeKey: cap?.nodeKey ?? `chronos.bit.${bit}`, bitIndex: bit,
		value: input.value ? 1 : 0, workspaceContextId: input.workspaceContextId ?? null, expiresAt: input.expiresAt ?? null,
	}).run();
}

export function resolvePermissionNodeForMask(requiredMask: number): string {
	for (const cap of CAPABILITY_REGISTER) {
		if ((requiredMask & cap.mask) === cap.mask) return cap.nodeKey;
	}
	return 'chronos.studio.access';
}
