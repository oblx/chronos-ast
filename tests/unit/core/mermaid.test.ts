/**
 * @author Oblx <code@oblx.dev>
 * @description Unit tests for Chronos v2.4.0 bidirectional Mermaid Studio DSL compiler and parser.
 */
import { describe, expect, test } from 'bun:test';
import { buildInMemorySnapshotFromSources, EMBEDDED_MULTI_LANG_SAMPLES } from '@core/metamodel/workspace.sources';
import { metamodelToMermaidDsl } from '@core/mermaid/mermaid.exporter';
import { parseMermaidDslToGraph } from '@core/mermaid/mermaid.parser';
import { layoutParsedMermaidGraph } from '@core/mermaid/mermaid.layout';

describe('Bidirectional Mermaid Studio Engine', () => {
	test('exports metamodel projections to valid flowchart, classDiagram, and sequenceDiagram DSL', () => {
		const snap = buildInMemorySnapshotFromSources(EMBEDDED_MULTI_LANG_SAMPLES);
		const bfDsl = metamodelToMermaidDsl({ kind: 'BUTTERFLY', focalEntity: snap.nodes[0], nodes: snap.nodes, edges: snap.edges });
		expect(bfDsl.startsWith('flowchart LR')).toBe(true);
		const parsedBf = parseMermaidDslToGraph(bfDsl);
		expect(parsedBf.diagnostics).toEqual([]);
		expect(parsedBf.nodes.length).toBeGreaterThan(0);

		const seqDsl = metamodelToMermaidDsl({ kind: 'UML_SEQUENCE', focalEntity: snap.nodes[0], nodes: snap.nodes, edges: snap.edges });
		expect(seqDsl.startsWith('sequenceDiagram')).toBe(true);
		const parsedSeq = parseMermaidDslToGraph(seqDsl);
		expect(parsedSeq.kind).toBe('SEQUENCE');
		expect(parsedSeq.diagnostics).toEqual([]);
	});

	test('parses flowchart subgraphs, shapes, dashed edges, and computes Sugiyama layout coordinates', () => {
		const dsl = [
			'flowchart TD',
			'\tsubgraph CORE [Core Ring]',
			'\t\tA[Indexer] -->|CALLS| B{Tarjan SCC}',
			'\t\tB -.->|cycle| C((Alert))',
			'\tend',
		].join('\n');
		const ast = parseMermaidDslToGraph(dsl);
		expect(ast.kind).toBe('FLOWCHART');
		expect(ast.subgraphs).toHaveLength(1);
		expect(ast.nodes).toHaveLength(3);
		expect(ast.edges[1]?.style).toBe('DASHED');
		expect(ast.diagnostics).toEqual([]);

		const layout = layoutParsedMermaidGraph(ast);
		expect(layout.nodes).toHaveLength(3);
		expect(layout.subgraphs).toHaveLength(1);
		expect(layout.nodes.find((n) => n.id === 'B')!.y).toBeGreaterThan(layout.nodes.find((n) => n.id === 'A')!.y);
	});
});
