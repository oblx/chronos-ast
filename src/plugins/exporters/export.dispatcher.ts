/**
 * @author Oblx <code@oblx.dev>
 * @description Dispatches HUD artifact export formats cleanly across SARIF, SVG, DOT, HTML, CSV, Cypher, Cytoscape, and SonarQube.
 */
import { EXPORT_FORMATS, type ExportFormat, type HudViewMode } from '@config/constants';
import type { HudThemeId } from '@config/hud.tokens';
import type { AuditAnnotationRecord, CodeCheckViolation } from '@core/metrics/codecheck.engine';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { buildUmlClassProjection, exportMermaidClassDiagram, exportPlantUmlClassDiagram } from '@core/graph/projections/uml_projections';
import { metamodelToMermaidDsl } from '@core/mermaid/mermaid.exporter';
import { exportMemgraphCypherBatch } from '@plugins/exporters/memgraph.exporter';
import { exportCytoscapeGraph } from '@plugins/exporters/cytoscape.exporter';
import { exportSonarQubeReport } from '@plugins/exporters/sonarqube.exporter';
import { exportSarif210Report } from '@plugins/exporters/sarif.adapter';
import { exportGraphvizDotGraph, exportVectorSvgGraph } from '@plugins/exporters/vector_graph.exporter';
import { exportComplianceCsvReport, exportComplianceHtmlReport } from '@plugins/exporters/compliance_report.exporter';

export function buildHudExportPayload(params: {
	readonly format: ExportFormat;
	readonly workspaceName: string;
	readonly activeView: HudViewMode;
	readonly activeThemeId: HudThemeId;
	readonly activeEntity: WorkspaceSnapshot['nodes'][number] | undefined;
	readonly activeSourceCode: string;
	readonly snapshot: WorkspaceSnapshot;
	readonly violations: readonly CodeCheckViolation[];
	readonly auditAnnotations: readonly AuditAnnotationRecord[];
}): string {
	const { format, workspaceName, activeView, activeThemeId, activeEntity, activeSourceCode, snapshot, violations, auditAnnotations } = params;
	if (format === EXPORT_FORMATS.PLANTUML_PUML) return exportPlantUmlClassDiagram(buildUmlClassProjection([], snapshot));
	if (format === EXPORT_FORMATS.MERMAID_CLASS) return exportMermaidClassDiagram(buildUmlClassProjection([], snapshot));
	if (format === EXPORT_FORMATS.MERMAID_FLOWCHART) return metamodelToMermaidDsl({ kind: 'BUTTERFLY', focalEntity: activeEntity, nodes: snapshot.nodes, edges: snapshot.edges, sourceMap: snapshot.sourceMap });
	if (format === EXPORT_FORMATS.SARIF_210) return JSON.stringify(exportSarif210Report(violations), null, 2);
	if (format === EXPORT_FORMATS.VECTOR_SVG && activeEntity) return exportVectorSvgGraph(activeView, activeEntity, snapshot.nodes, snapshot.edges, activeSourceCode, activeThemeId);
	if (format === EXPORT_FORMATS.GRAPHVIZ_DOT && activeEntity) return exportGraphvizDotGraph(activeView, activeEntity, snapshot.nodes, snapshot.edges, activeSourceCode);
	if (format === EXPORT_FORMATS.COMPLIANCE_HTML) return exportComplianceHtmlReport(workspaceName, violations, auditAnnotations);
	if (format === EXPORT_FORMATS.COMPLIANCE_CSV) return exportComplianceCsvReport(violations, auditAnnotations);
	if (format === EXPORT_FORMATS.MEMGRAPH_CYPHER) return JSON.stringify(exportMemgraphCypherBatch(snapshot.nodes, snapshot.edges), null, 2);
	if (format === EXPORT_FORMATS.CYTOSCAPE) return JSON.stringify(exportCytoscapeGraph(snapshot.nodes, snapshot.edges), null, 2);
	return JSON.stringify(exportSonarQubeReport(snapshot.nodes), null, 2);
}
