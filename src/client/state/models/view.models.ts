/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.1 Humble-View State Facade: Domain Types, Pure Projection View-Models & Formatting Adapters for .svelte components.
 */
export type { GraphEntityNode, GraphReferenceEdge } from '@core/graph/graph_traversal';
export { buildMultiHopButterfly } from '@core/graph/projections/butterfly.layout';
export { computeTarjanScc } from '@core/graph/scc.tarjan';
export {
	type CodemapLodTier,
	type CodemapSymbolPill,
	type CodemapFileContainer,
	type CodemapModuleCluster,
	type CodemapTravelHop,
	type ProjectCodemapProjection,
	buildProjectCodemapProjection,
	queryFrustumVisibleIds,
	resolveCodemapLodTier,
	traceCodemapEntryPath,
} from '@core/graph/codemap';
export { buildControlFlowGraph } from '@core/ast/cfg.builder';
export {
	type VirtualStepperState,
	createVirtualStepperSession,
	stepInto,
	stepOver,
	stepReturn,
	backtrack,
	chooseBranch,
} from '@core/graph/projections/virtual_stepper';
export { type VariableFlowStep, traceVariableDataFlow } from '@core/graph/variable_tracker';
export { type DsmCellDescriptor, buildLayeredDsmProjection } from '@core/graph/projections/dsm.matrix';
export {
	type TreemapAreaMetric,
	type TreemapHeatMetric,
	type TreemapTile,
	computeHierarchicalTreemap,
} from '@core/graph/projections/treemap.layout';
export {
	buildBezierSpline,
	computeContentionRatio,
	computeUmlClassLayout,
	computeUmlSequenceLayout,
	visibilityColorVar,
} from '@core/graph/projections/uml.layout';
export {
	buildSharedObjectsProjection,
	buildUmlClassProjection,
	buildUmlSequenceProjection,
	exportMermaidClassDiagram,
	resolveMemberVisibility,
} from '@core/graph/projections/uml_projections';
export { type MermaidProjectionSourceKind, metamodelToMermaidDsl } from '@core/mermaid/mermaid.exporter';
export { parseMermaidDslToGraph } from '@core/mermaid/mermaid.parser';
export { layoutParsedMermaidGraph } from '@core/mermaid/mermaid.layout';
export { compileLatexToMathml, splitLatexMarkdownSegments } from '@core/math/latex.mathml';
export { type EntityCkMetrics, computeChidamberKemererSuite } from '@core/metrics/oo_metrics.engine';
export { computeEntityLcom4FromGraph } from '@core/metrics/stability.engine';
export {
	type CodeCheckViolation,
	type AuditAnnotationRecord,
	evaluateWorkspaceCodeCheck,
} from '@core/metrics/codecheck.engine';
export { type SnapshotDiffReport, diffWorkspaceSnapshots } from '@core/metamodel/snapshot.differ';
export { type HelpChapterSpec, type HelpSubStepSpec, compileHelpBookFromDocs, computeFloatingTooltipPosition, filterHelpChapters } from '@core/metamodel/help.engine';
export { executeInstantSearch } from '@core/graph/instant_search.engine';
export { summarizeEntityTaxonomy } from '@core/metamodel/entities/registry/entity.registry';
export type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
export type { SourceFileUnit } from '@core/metamodel/workspace.sources';
export { syntaxTokenCssVar, tokenizeCodeLine } from '@core/ast/syntax.highlighter';
export { hasCapability, toMaskHex } from '@core/security/rbac.bitmask';
export { validateClientForm } from '@core/security/guards/form.validator';
export { redactOutboundPayload } from '@core/security/guards/payload.redactor';
export { defaultGamificationInterceptor } from '@plugins/gamification/gamification.interceptor';
export { importSarif210Diagnostics } from '@plugins/exporters/sarif.adapter';
export { buildHudExportPayload } from '@plugins/exporters/export.dispatcher';
export { computeBetweennessCentrality } from '@plugins/exporters/memgraph.exporter';
export { buildCubicBezierPath, clampValue } from '@lib/utils/math_vector';
export { formatBytes, formatScaledRatio } from '@lib/utils/byte_formatter';
export { ENTITY_KINDS, type EntityKind } from '@lib/db/schema';
export { deriveShortCodeFromName, type WorkspaceTabDescriptor } from '@lib/db/indexeddb/repository/workspace.idb';
export type { DrizzleProjectRow } from '@lib/db/sqlite/schema/tables';
export { subscribeWorkspaceDomainEvents } from '@client/services/workspace/workspace.controller';
export { Island } from '@lib/ogygia';
