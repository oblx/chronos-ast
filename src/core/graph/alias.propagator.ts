/**
 * @author Oblx <code@oblx.dev>
 * @description Andersen-style O(V + E) worklist inter-procedural alias & chained member call-chain resolver.
 */
import { MAX_ALIAS_WORKLIST_PASSES } from '@config/constants';
import { ENTITY_KINDS, LEXICAL_CONSTANTS, REFERENCE_KINDS } from '@config/metamodel.constants';
import type { ExtractedReference } from '@core/ast/parsers';
import type { ResolvedEntityLookup, ResolvedReferencePayload } from '@core/metamodel/references/resolver/reference.resolver';

export interface AliasPropagationResult {
	readonly aliasSets: ReadonlyMap<number, ReadonlySet<number>>;
	readonly resolvedReferences: readonly ResolvedReferencePayload[];
	readonly worklistIterations: number;
}

function seedInitialTypeBindings(
	entities: readonly ResolvedEntityLookup[],
	resolvedReferences: readonly ResolvedReferencePayload[],
	byId: ReadonlyMap<number, ResolvedEntityLookup>
): { readonly aliasSets: Map<number, Set<number>>; readonly aliasFlowEdges: Map<number, Set<number>> } {
	const aliasSets = new Map<number, Set<number>>();
	const aliasFlowEdges = new Map<number, Set<number>>();
	const addType = (entId: number, typeId: number) => {
		const set = aliasSets.get(entId) ?? new Set<number>();
		set.add(typeId);
		aliasSets.set(entId, set);
	};
	for (const ent of entities) {
		if (ent.kind === ENTITY_KINDS.CLASS || ent.kind === ENTITY_KINDS.INTERFACE) addType(ent.id, ent.id);
	}
	const returnTypesByCallable = new Map<number, Set<number>>();
	for (const ref of resolvedReferences) {
		if (ref.kind !== REFERENCE_KINDS.TYPED) continue;
		addType(ref.sourceEntityId, ref.targetEntityId);
		const retSet = returnTypesByCallable.get(ref.sourceEntityId) ?? new Set<number>();
		retSet.add(ref.targetEntityId);
		returnTypesByCallable.set(ref.sourceEntityId, retSet);
	}
	for (const ref of resolvedReferences) {
		const targetEnt = byId.get(ref.targetEntityId);
		if (ref.kind === REFERENCE_KINDS.CALLS && targetEnt) {
			if (targetEnt.kind === ENTITY_KINDS.CLASS || /^[A-Z]/.test(targetEnt.name)) addType(ref.sourceEntityId, targetEnt.id);
			for (const retTypeId of returnTypesByCallable.get(targetEnt.id) ?? []) addType(ref.sourceEntityId, retTypeId);
		} else if (ref.kind === REFERENCE_KINDS.USES) {
			const flow = aliasFlowEdges.get(ref.targetEntityId) ?? new Set<number>();
			flow.add(ref.sourceEntityId);
			aliasFlowEdges.set(ref.targetEntityId, flow);
		}
	}
	return { aliasSets, aliasFlowEdges };
}

function runFixedPointAliasWorklist(aliasSets: Map<number, Set<number>>, aliasFlowEdges: ReadonlyMap<number, ReadonlySet<number>>): number {
	const worklist: number[] = Array.from(aliasSets.keys());
	const inQueue = new Set<number>(worklist);
	let iterations = 0;
	const maxSteps = Math.max(1, worklist.length * MAX_ALIAS_WORKLIST_PASSES);
	while (worklist.length > 0 && iterations < maxSteps) {
		iterations++;
		const currentId = worklist.shift()!;
		inQueue.delete(currentId);
		const sourceTypes = aliasSets.get(currentId);
		if (!sourceTypes || sourceTypes.size === 0) continue;
		for (const dependentId of aliasFlowEdges.get(currentId) ?? []) {
			const depSet = aliasSets.get(dependentId) ?? new Set<number>();
			let grew = false;
			for (const tId of sourceTypes) if (!depSet.has(tId)) { depSet.add(tId); grew = true; }
			if (grew) {
				aliasSets.set(dependentId, depSet);
				if (!inQueue.has(dependentId)) { worklist.push(dependentId); inQueue.add(dependentId); }
			}
		}
	}
	return iterations;
}

function resolveMemberOnType(typeId: number, memberName: string, byId: ReadonlyMap<number, ResolvedEntityLookup>, byQualifiedName: ReadonlyMap<string, number>, entities: readonly ResolvedEntityLookup[]): number | undefined {
	const typeEnt = byId.get(typeId);
	if (!typeEnt) return undefined;
	const sep = LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR;
	return byQualifiedName.get(`${typeEnt.qualifiedName}${sep}${memberName}`) ?? entities.find((e) => e.name === memberName && e.qualifiedName.startsWith(`${typeEnt.qualifiedName}${sep}`))?.id;
}

function resolveChainedMemberCalls(
	entities: readonly ResolvedEntityLookup[],
	rawReferences: readonly ExtractedReference[],
	aliasSets: ReadonlyMap<number, ReadonlySet<number>>,
	byId: ReadonlyMap<number, ResolvedEntityLookup>,
	byQualifiedName: ReadonlyMap<string, number>,
	byShortName: ReadonlyMap<string, number>,
	augmented: ResolvedReferencePayload[],
	dedup: Set<string>
): void {
	const sep = LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR;
	for (const raw of rawReferences) {
		if (raw.kind !== REFERENCE_KINDS.CALLS || !raw.targetSymbolName.includes('.')) continue;
		const sourceId = byQualifiedName.get(raw.sourceQualifiedName) ?? byShortName.get(raw.sourceQualifiedName);
		const hops = raw.targetSymbolName.split('.').filter(Boolean);
		if (sourceId === undefined || hops.length < 2) continue;
		const scopeSegs = raw.sourceQualifiedName.split(sep);
		let receiverId: number | undefined;
		for (let d = scopeSegs.length; d >= 1 && receiverId === undefined; d--) receiverId = byQualifiedName.get(`${scopeSegs.slice(0, d).join(sep)}${sep}${hops[0]!}`);
		receiverId ??= byShortName.get(hops[0]!);
		if (receiverId === undefined) continue;
		let activeTypeIds = new Set<number>(aliasSets.get(receiverId) ?? [receiverId]);
		for (let i = 1; i < hops.length; i++) {
			const nextIds = new Set<number>();
			for (const tId of activeTypeIds) {
				const memberId = resolveMemberOnType(tId, hops[i]!, byId, byQualifiedName, entities);
				if (memberId === undefined) continue;
				if (i === hops.length - 1) {
					const key = `${REFERENCE_KINDS.CALLS}:${sourceId}->${memberId}@${raw.line}`;
					if (!dedup.has(key) && sourceId !== memberId) { dedup.add(key); augmented.push({ kind: REFERENCE_KINDS.CALLS, sourceEntityId: sourceId, targetEntityId: memberId, line: raw.line, column: raw.column }); }
				} else for (const nextType of aliasSets.get(memberId) ?? [memberId]) nextIds.add(nextType);
			}
			activeTypeIds = nextIds;
		}
	}
}

export function propagateInterProceduralAliases(
	entities: readonly ResolvedEntityLookup[],
	resolvedReferences: readonly ResolvedReferencePayload[],
	rawReferences: readonly ExtractedReference[] = []
): AliasPropagationResult {
	const byId = new Map<number, ResolvedEntityLookup>(entities.map((e) => [e.id, e]));
	const byQualifiedName = new Map<string, number>(entities.map((e) => [e.qualifiedName, e.id]));
	const byShortName = new Map<string, number>();
	for (const e of entities) if (!byShortName.has(e.name)) byShortName.set(e.name, e.id);
	const { aliasSets, aliasFlowEdges } = seedInitialTypeBindings(entities, resolvedReferences, byId);
	const worklistIterations = runFixedPointAliasWorklist(aliasSets, aliasFlowEdges);
	const augmented: ResolvedReferencePayload[] = [...resolvedReferences];
	const dedup = new Set<string>(resolvedReferences.map((r) => `${r.kind}:${r.sourceEntityId}->${r.targetEntityId}@${r.line}`));
	resolveChainedMemberCalls(entities, rawReferences, aliasSets, byId, byQualifiedName, byShortName, augmented, dedup);
	return { aliasSets, resolvedReferences: augmented, worklistIterations };
}
