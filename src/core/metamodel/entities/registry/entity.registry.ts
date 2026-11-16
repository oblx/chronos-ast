/**
 * @author Oblx <code@oblx.dev>
 * @description Entity taxonomy registry and canonical Drizzle-to-GraphEntityNode projection mapper.
 */
import { HUD_CONFIG } from '@config/constants';
import {
	ENTITY_KINDS,
	type DrizzleEntityRow,
	type DrizzleMetricRow,
	type EntityKind,
} from '@lib/db/sqlite/schema/tables';
import type { GraphEntityNode } from '@core/graph/graph_traversal';

export interface EntityTaxonomySummary {
	readonly totalCount: number;
	readonly byKind: Readonly<Record<EntityKind, number>>;
}

export function mapEntitiesToGraphNodes(
	entityRows: readonly DrizzleEntityRow[],
	metricRows: readonly DrizzleMetricRow[]
): readonly GraphEntityNode[] {
	const metricByEntity = new Map(metricRows.map((m) => [m.entityId, m]));
	return entityRows.map((e) => {
		const m = metricByEntity.get(e.id);
		return {
			id: e.id,
			uuid: e.uuid,
			kind: e.kind,
			name: e.name,
			qualifiedName: e.qualifiedName,
			loc: m?.loc ?? HUD_CONFIG.METRIC_DEFAULTS.LOC,
			cyclomatic:
				m?.cyclomaticComplexity ?? HUD_CONFIG.METRIC_DEFAULTS.CYCLOMATIC,
			halsteadVolume:
				m?.halsteadVolume ?? HUD_CONFIG.METRIC_DEFAULTS.HALSTEAD_VOLUME,
			afferentCoupling:
				m?.afferentCoupling ?? HUD_CONFIG.METRIC_DEFAULTS.COUPLING,
			efferentCoupling:
				m?.efferentCoupling ?? HUD_CONFIG.METRIC_DEFAULTS.COUPLING,
			instability: m?.instability ?? HUD_CONFIG.METRIC_DEFAULTS.INSTABILITY,
		};
	});
}

export function summarizeEntityTaxonomy(
	nodes: readonly GraphEntityNode[]
): EntityTaxonomySummary {
	const counts = Object.fromEntries(
		Object.values(ENTITY_KINDS).map((kind) => [kind, 0])
	) as Record<EntityKind, number>;
	for (const node of nodes) {
		counts[node.kind] = (counts[node.kind] ?? 0) + 1;
	}
	return {
		totalCount: nodes.length,
		byKind: counts,
	};
}
