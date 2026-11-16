/**
 * @author Oblx <code@oblx.dev>
 * @description Cytoscape.js JSON graph topology exporter plugin.
 */
import { APP_METADATA } from '@config/constants';
import type {
	GraphEntityNode,
	GraphReferenceEdge,
} from '@core/graph/graph_traversal';

export interface CytoscapeGraphDocument {
	readonly formatVersion: string;
	readonly generatedBy: string;
	readonly elements: {
		readonly nodes: ReadonlyArray<{
			readonly data: {
				readonly id: string;
				readonly label: string;
				readonly kind: string;
				readonly qualifiedName: string;
				readonly loc: number;
				readonly cyclomatic: number;
				readonly instability: number;
			};
		}>;
		readonly edges: ReadonlyArray<{
			readonly data: {
				readonly id: string;
				readonly source: string;
				readonly target: string;
				readonly kind: string;
				readonly line: number;
			};
		}>;
	};
}

export function exportCytoscapeGraph(
	nodes: readonly GraphEntityNode[],
	edges: readonly GraphReferenceEdge[]
): CytoscapeGraphDocument {
	return {
		formatVersion: '1.0',
		generatedBy: `${APP_METADATA.NAME} v${APP_METADATA.VERSION}`,
		elements: {
			nodes: nodes.map((n) => ({
				data: {
					id: `entity-${n.id}`,
					label: n.name,
					kind: n.kind,
					qualifiedName: n.qualifiedName,
					loc: n.loc,
					cyclomatic: n.cyclomatic,
					instability: n.instability,
				},
			})),
			edges: edges.map((e) => ({
				data: {
					id: `edge-${e.id}`,
					source: `entity-${e.sourceEntityId}`,
					target: `entity-${e.targetEntityId}`,
					kind: e.kind,
					line: e.line,
				},
			})),
		},
	};
}
