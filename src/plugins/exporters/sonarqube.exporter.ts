/**
 * @author Oblx <code@oblx.dev>
 * @description SonarQube Generic Issue & Telemetry Report exporter plugin.
 */
import { APP_METADATA, HUD_CONFIG } from '@config/constants';
import type { GraphEntityNode } from '@core/graph/graph_traversal';

export interface SonarQubeIssue {
	readonly engineId: string;
	readonly ruleId: string;
	readonly severity: 'INFO' | 'MINOR' | 'MAJOR' | 'CRITICAL';
	readonly type: 'CODE_SMELL' | 'MAINTAINABILITY';
	readonly primaryLocation: {
		readonly message: string;
		readonly filePath: string;
	};
}

export interface SonarQubeExportDocument {
	readonly generator: string;
	readonly version: string;
	readonly exportedAt: string;
	readonly summary: {
		readonly totalEntities: number;
		readonly averageCyclomatic: number;
		readonly highComplexityCount: number;
	};
	readonly issues: readonly SonarQubeIssue[];
}

export function exportSonarQubeReport(
	nodes: readonly GraphEntityNode[]
): SonarQubeExportDocument {
	const issues: SonarQubeIssue[] = [];
	let totalCyclomatic = 0;
	let highComplexityCount = 0;

	for (const node of nodes) {
		totalCyclomatic += node.cyclomatic;
		if (node.cyclomatic >= HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_WARNING) {
			highComplexityCount++;
			const isCrit =
				node.cyclomatic >= HUD_CONFIG.METRIC_THRESHOLDS.COMPLEXITY_CRITICAL;
			issues.push({
				engineId: APP_METADATA.NAME.toLowerCase(),
				ruleId: isCrit ? 'CHRONOS_CC_CRITICAL' : 'CHRONOS_CC_WARNING',
				severity: isCrit ? 'CRITICAL' : 'MAJOR',
				type: 'MAINTAINABILITY',
				primaryLocation: {
					message: `Entity '${node.name}' has Cyclomatic Complexity v(G)=${node.cyclomatic} and Instability I=${(
						node.instability / HUD_CONFIG.PRECISION_SCALE
					).toFixed(3)}`,
					filePath: node.qualifiedName.split('::')[0] ?? node.qualifiedName,
				},
			});
		}
	}

	const averageCyclomatic =
		nodes.length > 0 ? Number((totalCyclomatic / nodes.length).toFixed(2)) : 0;

	return {
		generator: `${APP_METADATA.NAME} v${APP_METADATA.VERSION}`,
		version: APP_METADATA.VERSION,
		exportedAt: new Date().toISOString(),
		summary: {
			totalEntities: nodes.length,
			averageCyclomatic,
			highComplexityCount,
		},
		issues,
	};
}
