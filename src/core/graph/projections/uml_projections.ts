/**
 * @author Oblx <code@oblx.dev>
 * @description Studio UML projections: Sugiyama 3-compartment Class Diagram, Sequence lifelines/activations/fragments, Shared-Object contention, and PlantUML/Mermaid exporters.
 */
import { UML_PROJECTION_LIMITS } from '@config/constants';
import { ENTITY_KINDS, isChildScopeOf, REFERENCE_KINDS, type ReferenceKind } from '@config/metamodel.constants';
import { buildIndexedGraphAdjacency, type GraphEntityNode, type GraphReferenceEdge } from '../graph_traversal';

export interface UmlSequenceMessage {
	readonly stepOrder: number; readonly caller: GraphEntityNode; readonly callee: GraphEntityNode;
	readonly line: number; readonly column: number; readonly isSelfCall?: boolean;
}
export interface UmlSequenceFragment {
	readonly kind: 'loop' | 'alt'; readonly label: string; readonly startStep: number; readonly endStep: number;
}
export interface UmlSequenceProjection {
	readonly rootEntity: GraphEntityNode; readonly lifelines: readonly GraphEntityNode[];
	readonly messages: readonly UmlSequenceMessage[]; readonly fragments: readonly UmlSequenceFragment[];
}
export interface UmlClassCompartment {
	readonly entity: GraphEntityNode; readonly stereotype: '<<interface>>' | '<<class>>' | '<<module>>';
	readonly tier: number; readonly methods: readonly GraphEntityNode[]; readonly fields: readonly GraphEntityNode[];
}
export interface UmlClassRelation { readonly fromClassId: number; readonly toClassId: number; readonly kind: ReferenceKind; }
export interface UmlClassProjection { readonly classes: readonly UmlClassCompartment[]; readonly relations: readonly UmlClassRelation[]; }
export interface SharedObjectCouplingEntry {
	readonly stateEntity: GraphEntityNode;
	readonly accessorFunctions: ReadonlyArray<{ readonly fn: GraphEntityNode; readonly referenceKind: ReferenceKind; readonly line: number }>;
	readonly mutators: ReadonlyArray<{ readonly fn: GraphEntityNode; readonly referenceKind: ReferenceKind; readonly line: number }>;
	readonly readers: ReadonlyArray<{ readonly fn: GraphEntityNode; readonly referenceKind: ReferenceKind; readonly line: number }>;
	readonly contentionScore: number;
}
export interface SharedObjectsProjection { readonly sharedObjects: readonly SharedObjectCouplingEntry[]; }

export function resolveMemberVisibility(name: string): '+' | '-' | '#' {
	if (name.startsWith('_') || name.startsWith('#') || name.toLowerCase().includes('private') || name.toLowerCase().includes('secret')) return '-';
	if (name.toLowerCase().includes('internal') || name.toLowerCase().includes('protected')) return '#';
	return '+';
}

export function buildUmlSequenceProjection(
	rootEntityId: number, snapshot: { readonly nodes: readonly GraphEntityNode[]; readonly edges: readonly GraphReferenceEdge[] }
): UmlSequenceProjection | null {
	const { nodeById, outboundBySourceId, inboundByTargetId } = buildIndexedGraphAdjacency(snapshot.nodes, snapshot.edges);
	const rootEntity = nodeById.get(rootEntityId) ?? snapshot.nodes[0];
	if (!rootEntity) return null;
	const rawCalls = [
		...(outboundBySourceId.get(rootEntity.id) ?? []),
		...(inboundByTargetId.get(rootEntity.id) ?? []).filter((e) => e.sourceEntityId !== rootEntity.id),
	].filter((e) => e.kind === REFERENCE_KINDS.CALLS).sort((a, b) => (a.line !== b.line ? a.line - b.line : a.column - b.column));
	const lifelineMap = new Map<number, GraphEntityNode>([[rootEntity.id, rootEntity]]);
	const messages: UmlSequenceMessage[] = [];
	rawCalls.forEach((edge, idx) => {
		const caller = nodeById.get(edge.sourceEntityId), callee = nodeById.get(edge.targetEntityId);
		if (!caller || !callee) return;
		lifelineMap.set(caller.id, caller); lifelineMap.set(callee.id, callee);
		messages.push({ stepOrder: idx + 1, caller, callee, line: edge.line, column: edge.column, isSelfCall: caller.id === callee.id });
	});
	const fragments: UmlSequenceFragment[] = [];
	if (messages.length >= 2 && rootEntity.cyclomatic >= 2) {
		fragments.push({ kind: rootEntity.cyclomatic >= 4 ? 'loop' : 'alt', label: `[v(G)=${rootEntity.cyclomatic} guard]`, startStep: 1, endStep: Math.min(messages.length, 3) });
	}
	return { rootEntity, lifelines: Array.from(lifelineMap.values()), messages, fragments };
}

export function buildUmlClassProjection(
	targetIds: readonly number[], snapshot: { readonly nodes: readonly GraphEntityNode[]; readonly edges: readonly GraphReferenceEdge[] }
): UmlClassProjection {
	const { nodeById, outboundBySourceId } = buildIndexedGraphAdjacency(snapshot.nodes, snapshot.edges);
	const classNodes = snapshot.nodes.filter((n) => (n.kind === ENTITY_KINDS.CLASS || n.kind === ENTITY_KINDS.INTERFACE) && (targetIds.length === 0 || targetIds.includes(n.id)));
	const selectedClasses = classNodes.length > 0 ? classNodes : snapshot.nodes.filter((n) => n.kind === ENTITY_KINDS.CLASS || n.kind === ENTITY_KINDS.INTERFACE || n.kind === ENTITY_KINDS.MODULE).slice(0, UML_PROJECTION_LIMITS.FALLBACK_CLASS_CAP);
	const classIdSet = new Set(selectedClasses.map((c) => c.id));
	const relations: UmlClassRelation[] = [];
	for (const e of snapshot.edges) {
		if (e.kind !== REFERENCE_KINDS.INHERITS && e.kind !== REFERENCE_KINDS.IMPLEMENTS && e.kind !== REFERENCE_KINDS.TYPED && e.kind !== REFERENCE_KINDS.CALLS) continue;
		const srcQ = nodeById.get(e.sourceEntityId)?.qualifiedName ?? '', dstQ = nodeById.get(e.targetEntityId)?.qualifiedName ?? '';
		const srcOwner = classIdSet.has(e.sourceEntityId) ? e.sourceEntityId : selectedClasses.find((c) => isChildScopeOf(srcQ, c.qualifiedName))?.id;
		const dstOwner = classIdSet.has(e.targetEntityId) ? e.targetEntityId : selectedClasses.find((c) => isChildScopeOf(dstQ, c.qualifiedName))?.id;
		if (srcOwner !== undefined && dstOwner !== undefined && srcOwner !== dstOwner && !relations.some((r) => r.fromClassId === srcOwner && r.toClassId === dstOwner)) {
			relations.push({ fromClassId: srcOwner, toClassId: dstOwner, kind: e.kind === REFERENCE_KINDS.CALLS ? REFERENCE_KINDS.TYPED : e.kind });
		}
	}
	const classes: UmlClassCompartment[] = selectedClasses.map((cls) => {
		const definedChildIds = new Set((outboundBySourceId.get(cls.id) ?? []).filter((e) => e.kind === REFERENCE_KINDS.DEFINES).map((e) => e.targetEntityId));
		const children = snapshot.nodes.filter((n) => definedChildIds.has(n.id) || isChildScopeOf(n.qualifiedName, cls.qualifiedName));
		const stereotype = cls.kind === ENTITY_KINDS.INTERFACE ? '<<interface>>' : cls.kind === ENTITY_KINDS.CLASS ? '<<class>>' : '<<module>>';
		const hasSuper = relations.some((r) => r.fromClassId === cls.id && (r.kind === REFERENCE_KINDS.INHERITS || r.kind === REFERENCE_KINDS.IMPLEMENTS));
		return {
			entity: cls, stereotype, tier: cls.kind === ENTITY_KINDS.INTERFACE ? 0 : hasSuper ? 2 : 1,
			methods: children.filter((c) => c.kind === ENTITY_KINDS.METHOD || c.kind === ENTITY_KINDS.FUNCTION),
			fields: children.filter((c) => c.kind === ENTITY_KINDS.VARIABLE),
		};
	});
	return { classes, relations };
}

export function buildSharedObjectsProjection(
	snapshot: { readonly nodes: readonly GraphEntityNode[]; readonly edges: readonly GraphReferenceEdge[] }
): SharedObjectsProjection {
	const { nodeById } = buildIndexedGraphAdjacency(snapshot.nodes, snapshot.edges);
	const accessMap = new Map<number, Map<number, { readonly fn: GraphEntityNode; readonly referenceKind: ReferenceKind; readonly line: number }>>();
	for (const e of snapshot.edges) {
		if (e.kind !== REFERENCE_KINDS.SETS && e.kind !== REFERENCE_KINDS.MODIFIES && e.kind !== REFERENCE_KINDS.USES) continue;
		const src = nodeById.get(e.sourceEntityId), dst = nodeById.get(e.targetEntityId);
		if (!src || !dst || src.id === dst.id) continue;
		const bucket = accessMap.get(dst.id) ?? new Map();
		bucket.set(src.id, { fn: src, referenceKind: e.kind, line: e.line });
		accessMap.set(dst.id, bucket);
	}
	const sharedObjects: SharedObjectCouplingEntry[] = [];
	for (const [stateId, callers] of accessMap) {
		const stateEntity = nodeById.get(stateId);
		if (stateEntity && callers.size >= UML_PROJECTION_LIMITS.MIN_SHARED_ACCESSORS) {
			const accessorFunctions = Array.from(callers.values());
			const mutators = accessorFunctions.filter((a) => a.referenceKind === REFERENCE_KINDS.SETS || a.referenceKind === REFERENCE_KINDS.MODIFIES);
			const readers = accessorFunctions.filter((a) => a.referenceKind === REFERENCE_KINDS.USES);
			sharedObjects.push({ stateEntity, accessorFunctions, mutators, readers, contentionScore: mutators.length * 2 + readers.length });
		}
	}
	return { sharedObjects };
}

export function exportPlantUmlClassDiagram(proj: UmlClassProjection): string {
	const lines = ['@startuml ChronosUmlStudio', 'skinparam monochrome false'];
	for (const c of proj.classes) {
		lines.push(`${c.stereotype === '<<interface>>' ? 'interface' : 'class'} "${c.entity.name}" as C_${c.entity.id} {`);
		for (const f of c.fields) lines.push(`  ${resolveMemberVisibility(f.name)}${f.name}`);
		for (const m of c.methods) lines.push(`  ${resolveMemberVisibility(m.name)}${m.name}()`);
		lines.push('}');
	}
	for (const r of proj.relations) lines.push(`C_${r.fromClassId} ${r.kind === REFERENCE_KINDS.INHERITS ? '--|>' : r.kind === REFERENCE_KINDS.IMPLEMENTS ? '..|>' : '-->'} C_${r.toClassId} : ${r.kind}`);
	return [...lines, '@enduml'].join('\n');
}

export function exportMermaidClassDiagram(proj: UmlClassProjection): string {
	const lines = ['classDiagram'];
	for (const c of proj.classes) {
		lines.push(`  class ${c.entity.name.replace(/[^a-zA-Z0-9_]/g, '_')} {`, `    ${c.stereotype}`);
		for (const f of c.fields) lines.push(`    ${resolveMemberVisibility(f.name)}${f.name}`);
		for (const m of c.methods) lines.push(`    ${resolveMemberVisibility(m.name)}${m.name}()`);
		lines.push('  }');
	}
	return lines.join('\n');
}
