/**
 * @author Oblx <code@oblx.dev>
 * @description Two-pass symbolic reference resolver with cross-file import binding, lexical scope shadowing, and Andersen alias propagation.
 */
import { LEXICAL_CONSTANTS, type EntityKind } from '@config/metamodel.constants';
import { REFERENCE_KINDS, type ReferenceKind } from '@lib/db/sqlite/schema/tables';
import type { ExtractedReference } from '@core/ast/parsers';
import { propagateInterProceduralAliases } from '@core/graph/alias.propagator';

export interface ResolvedEntityLookup {
	readonly id: number;
	readonly name: string;
	readonly qualifiedName: string;
	readonly kind?: EntityKind;
}

export interface ResolvedReferencePayload {
	readonly kind: ReferenceKind;
	readonly sourceEntityId: number;
	readonly targetEntityId: number;
	readonly line: number;
	readonly column: number;
}

function normalizeModulePathStem(rawSpecifier: string): string {
	return rawSpecifier
		.replace(/^(@[A-Za-z0-9_-]+\/|\.\.?\/)+/, '')
		.replace(/\.(ts|tsx|js|jsx|mjs|rs|cpp|hpp|h|svelte|py|lua|rb|f90|adb|sql)$/, '');
}

function buildFileImportBindings(
	entities: readonly ResolvedEntityLookup[],
	rawReferences: readonly ExtractedReference[]
): ReadonlyMap<string, ReadonlyMap<string, number>> {
	const sep = LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR;
	const bindings = new Map<string, Map<string, number>>();
	for (const ref of rawReferences) {
		if (ref.kind !== REFERENCE_KINDS.IMPORTS || !ref.importModulePath) continue;
		const sourceFile = ref.sourceQualifiedName.split(sep)[0] ?? ref.sourceQualifiedName;
		const stem = normalizeModulePathStem(ref.importModulePath);
		const matchedEntity = entities.find((ent) => {
			if (ent.name !== ref.targetSymbolName) return false;
			const entFileStem = normalizeModulePathStem(ent.qualifiedName.split(sep)[0] ?? '');
			return entFileStem.endsWith(stem) || stem.endsWith(entFileStem);
		});
		if (matchedEntity) {
			const fileMap = bindings.get(sourceFile) ?? new Map<string, number>();
			fileMap.set(ref.targetSymbolName, matchedEntity.id);
			bindings.set(sourceFile, fileMap);
		}
	}
	return bindings;
}

function resolveScopedTargetId(
	sourceQualifiedName: string,
	targetSymbolName: string,
	importModulePath: string | undefined,
	entities: readonly ResolvedEntityLookup[],
	byQualifiedName: ReadonlyMap<string, number>,
	byShortName: ReadonlyMap<string, number>,
	fileImportBindings: ReadonlyMap<string, ReadonlyMap<string, number>>
): number | undefined {
	const directMatch = byQualifiedName.get(targetSymbolName);
	if (directMatch !== undefined) return directMatch;

	const sep = LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR;
	if (importModulePath) {
		const stem = normalizeModulePathStem(importModulePath);
		const directImport = entities.find(
			(e) => e.name === targetSymbolName && normalizeModulePathStem(e.qualifiedName.split(sep)[0] ?? '').endsWith(stem)
		);
		if (directImport) return directImport.id;
	}

	const segments = sourceQualifiedName.split(sep);
	for (let depth = segments.length; depth >= 1; depth--) {
		const candidate = `${segments.slice(0, depth).join(sep)}${sep}${targetSymbolName}`;
		const scopedId = byQualifiedName.get(candidate);
		if (scopedId !== undefined) return scopedId;
	}

	const sourceFile = segments[0] ?? sourceQualifiedName;
	const importedTargetId = fileImportBindings.get(sourceFile)?.get(targetSymbolName);
	if (importedTargetId !== undefined) return importedTargetId;

	return byShortName.get(targetSymbolName);
}

export function resolveSymbolicReferences(
	entities: readonly ResolvedEntityLookup[],
	rawReferences: readonly ExtractedReference[]
): readonly ResolvedReferencePayload[] {
	const byQualifiedName = new Map<string, number>();
	const byShortName = new Map<string, number>();
	for (const ent of entities) {
		byQualifiedName.set(ent.qualifiedName, ent.id);
		if (!byShortName.has(ent.name)) byShortName.set(ent.name, ent.id);
	}
	const fileImportBindings = buildFileImportBindings(entities, rawReferences);
	const resolved: ResolvedReferencePayload[] = [];
	const dedupSet = new Set<string>();

	for (const ref of rawReferences) {
		const sourceId = byQualifiedName.get(ref.sourceQualifiedName) ?? byShortName.get(ref.sourceQualifiedName);
		const targetId = resolveScopedTargetId(
			ref.sourceQualifiedName,
			ref.targetSymbolName,
			ref.importModulePath,
			entities,
			byQualifiedName,
			byShortName,
			fileImportBindings
		);
		if (sourceId !== undefined && targetId !== undefined && sourceId !== targetId) {
			const edgeKey = `${ref.kind}:${sourceId}->${targetId}@${ref.line}`;
			if (!dedupSet.has(edgeKey)) {
				dedupSet.add(edgeKey);
				resolved.push({ kind: ref.kind, sourceEntityId: sourceId, targetEntityId: targetId, line: ref.line, column: ref.column });
			}
		}
	}
	return propagateInterProceduralAliases(entities, resolved, rawReferences).resolvedReferences;
}
