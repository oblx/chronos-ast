/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.2 Codemap compound graph projection and travel-spine data contracts.
 */
import type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
import type { CodemapEntryCandidate } from './entry.detector';
import type { SpatialFrustumIndex } from './frustum.culler';

export interface CodemapSymbolPill {
	readonly id: number; readonly name: string; readonly kind: GraphEntityNode['kind']; readonly filePath: string;
	readonly ringDepth: number; readonly loc: number; readonly cyclomatic: number; readonly isGenesis: boolean;
	readonly isCyclic: boolean; readonly x: number; readonly y: number; readonly width: number; readonly height: number;
}
export interface CodemapFileContainer {
	readonly id: string; readonly filePath: string; readonly dirPath: string; readonly primaryEntityId: number;
	readonly ringDepth: number; readonly loc: number; readonly maxCyclomatic: number; readonly healthGrade: 'A' | 'B' | 'C' | 'D';
	readonly isEntryFile: boolean; readonly isCyclic: boolean; readonly x: number; readonly y: number;
	readonly width: number; readonly height: number; readonly symbols: readonly CodemapSymbolPill[];
}
export interface CodemapModuleCluster {
	readonly id: string; readonly dirPath: string; readonly ringDepth: number; readonly fileCount: number;
	readonly totalLoc: number; readonly isEntryCluster: boolean; readonly hasCycles: boolean;
	readonly x: number; readonly y: number; readonly width: number; readonly height: number;
}
export interface CodemapMacroHighway {
	readonly id: string; readonly sourceClusterId: string; readonly targetClusterId: string; readonly edgeCount: number;
	readonly strokeWidth: number; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number;
}
export interface CodemapMesoEdge {
	readonly id: string; readonly sourceEntityId: number; readonly targetEntityId: number; readonly kind: GraphReferenceEdge['kind'];
	readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number;
}
export interface CodemapTravelHop {
	readonly hopIndex: number; readonly entityId: number; readonly ringDepth: number;
	readonly label: string; readonly badgeText: string; readonly x: number; readonly y: number;
	readonly rowLeftX: number; readonly rowRightX: number; readonly rowMidY: number;
}
export interface ProjectCodemapProjection {
	readonly entryPoints: readonly CodemapEntryCandidate[]; readonly moduleClusters: readonly CodemapModuleCluster[];
	readonly fileContainers: readonly CodemapFileContainer[]; readonly symbolById: ReadonlyMap<number, CodemapSymbolPill>;
	readonly macroHighways: readonly CodemapMacroHighway[]; readonly mesoEdges: readonly CodemapMesoEdge[];
	readonly frustumIndex: SpatialFrustumIndex; readonly parentByEntityId: ReadonlyMap<number, number>;
	readonly worldWidth: number; readonly worldHeight: number;
}
