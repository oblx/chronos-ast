<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.4.0 Interactive 38.2%/61.8% Mermaid Studio with bidirectional DSL editor, syntax diagnostics, CRT SVG canvas, and entity click-through.
-->
<script lang="ts">
	import { HUD_CONFIG } from '@config/constants';
	import { MERMAID_STUDIO_TOKENS } from '@config/hud/hud.projections';
	import {
		type GraphEntityNode,
		type GraphReferenceEdge,
		type MermaidProjectionSourceKind,
		hudWire,
		layoutParsedMermaidGraph,
		metamodelToMermaidDsl,
		parseMermaidDslToGraph
	} from '@client/state';
	import HudSurfacePattern from '@client/components/atoms/fx/HudSurfacePattern.svelte';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';

	interface Props {
		focalEntity?: GraphEntityNode; nodes: readonly GraphEntityNode[]; edges: readonly GraphReferenceEdge[];
		sourceMap?: Readonly<Record<string, string>>; onSelectEntity: (id: number) => void;
	}

	let { focalEntity, nodes, edges, sourceMap = {}, onSelectEntity }: Props = $props();
	let dslText = $state<string>(MERMAID_STUDIO_TOKENS.DEFAULT_DSL);
	let sourceKind = $state<MermaidProjectionSourceKind>('BUTTERFLY');
	let editorCollapsed = $state<boolean>(false);
	let svgEl = $state<SVGSVGElement | null>(null);
	let localCam = $state({ panX: 0, panY: 0, zoomScale: 1 });

	$effect(() => { if (hudWire.mermaidDraftDsl) { dslText = hudWire.mermaidDraftDsl; hudWire.mermaidDraftDsl = ''; } });

	let parsed = $derived(parseMermaidDslToGraph(dslText));
	let diagram = $derived(layoutParsedMermaidGraph(parsed));

	function syncFromActiveMetamodel(kind: MermaidProjectionSourceKind = sourceKind): void {
		sourceKind = kind;
		dslText = metamodelToMermaidDsl({ kind, focalEntity, nodes, edges, sourceMap });
	}
	function focusMatchingEntity(label: string): void {
		const hit = nodes.find((n) => n.name.toLowerCase() === label.toLowerCase() || label.toLowerCase().includes(n.name.toLowerCase()));
		if (hit) onSelectEntity(hit.id);
	}
	function downloadTextFile(filename: string, content: string, mime: string): void {
		const url = URL.createObjectURL(new Blob([content], { type: mime }));
		const a = document.createElement('a');
		a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
	}
</script>

<section data-testid="mermaid-studio-surface" aria-label="Interactive Mermaid Studio" class="relative w-full h-full flex flex-col bg-[var(--hud-bg)]/85 border border-[var(--hud-accent-primary)]/45 font-mono text-xs overflow-hidden">
	<div class="relative z-10 px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-panel)]/95 flex flex-wrap items-center justify-between gap-2 shrink-0">
		<div class="flex flex-wrap items-center gap-1.5">
			<span class="text-[var(--hud-accent-secondary)] font-bold">◇ MERMAID STUDIO // {parsed.kind}</span>
			<button type="button" onclick={() => (editorCollapsed = !editorCollapsed)} class="px-2 py-0.5 text-[11px] border border-[var(--hud-border)] text-[var(--hud-muted)] cursor-pointer">{editorCollapsed ? 'Show DSL' : 'Hide DSL'}</button>
			{#each (['BUTTERFLY', 'CFG', 'DFG', 'UML_CLASS', 'UML_SEQUENCE'] as const) as k (k)}
				<button type="button" onclick={() => syncFromActiveMetamodel(k)} class={`px-1.5 py-0.5 text-[11px] border cursor-pointer ${sourceKind === k ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{k.replace('UML_', '')}</button>
			{/each}
		</div>
		<div class="flex items-center gap-1 text-[11px]">
			<button type="button" onclick={() => syncFromActiveMetamodel()} class="px-2 py-0.5 bg-[var(--hud-accent-primary)] text-[var(--hud-bg-base)] font-bold cursor-pointer">Sync Active View</button>
			<button type="button" onclick={() => downloadTextFile('chronos-diagram.mmd', dslText, 'text/plain')} class="px-2 py-0.5 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] cursor-pointer">.mmd</button>
			<button type="button" onclick={() => svgEl && downloadTextFile('chronos-diagram.svg', svgEl.outerHTML, 'image/svg+xml')} class="px-2 py-0.5 border border-[var(--hud-nominal)] text-[var(--hud-nominal)] cursor-pointer">.svg</button>
			<button type="button" onclick={() => hudWire.triggerCanvasRecenter()} class="px-2 py-0.5 border border-[var(--hud-border)] text-[var(--hud-muted)] cursor-pointer">{Math.round(localCam.zoomScale * HUD_CONFIG.PERCENTAGE_MAX)}%</button>
		</div>
	</div>

	<div class={`relative z-10 flex-1 min-h-0 grid ${editorCollapsed ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[38.2fr_61.8fr]'}`}>
		{#if !editorCollapsed}
			<div class="h-full flex flex-col border-r border-[var(--hud-border)] bg-[var(--hud-panel)]/80 min-h-0">
				<textarea aria-label="Mermaid DSL Editor" bind:value={dslText} spellcheck="false" class="flex-1 w-full bg-[var(--hud-bg)] p-3 text-xs leading-5 text-[var(--hud-text)] focus:outline-none resize-none font-mono"></textarea>
				<div class="px-3 py-1.5 border-t border-[var(--hud-border)] bg-[var(--hud-surface)] text-[11px] max-h-20 overflow-y-auto">
					{#if parsed.diagnostics.length === 0}
						<span class="text-[var(--hud-nominal)]">DSL VALID · {parsed.nodes.length} nodes · {parsed.edges.length} edges</span>
					{:else}
						{#each parsed.diagnostics as d (d.line + d.message)}<div class="text-[var(--hud-danger)]">L{d.line}: {d.message}</div>{/each}
					{/if}
				</div>
			</div>
		{/if}
		<div class="relative h-full overflow-hidden">
			<HudSurfacePattern patternId={hudWire.surfacePatterns.SUBSTRATE} opacity={hudWire.surfaceOpacity * 0.25} tileScale={hudWire.surfaceScale} />
			<HudInteractiveCanvasStage boundsWidth={diagram.width} boundsHeight={diagram.height} fitKey={`mmd-${parsed.kind}-${diagram.nodes.length}-${diagram.edges.length}`} ariaLabel="Mermaid SVG Canvas" onCameraChange={(c) => (localCam = c)}>
				{#snippet children()}
					<svg bind:this={svgEl} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${diagram.width} ${diagram.height}`} width={diagram.width} height={diagram.height} class="relative z-10 select-none">
						<defs><marker id="mmd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><polygon points="0,1 9,5 0,9" fill="var(--hud-accent-primary)" /></marker></defs>
						{#each diagram.subgraphs as sg (sg.id)}
							<rect x={sg.x} y={sg.y} width={sg.w} height={sg.h} fill="var(--hud-surface)" fill-opacity="0.22" stroke="var(--hud-border)" stroke-dasharray="5 3" />
							<text x={sg.x + 8} y={sg.y + 15} fill="var(--hud-accent-secondary)" font-size="11" font-family="IBM Plex Mono" font-weight="700">{sg.label}</text>
						{/each}
						{#if parsed.kind === 'SEQUENCE'}
							{#each diagram.nodes as lf (lf.id)}<line x1={lf.x + lf.w / 2} y1={lf.y + lf.h} x2={lf.x + lf.w / 2} y2={diagram.height - 24} stroke="var(--hud-border)" stroke-dasharray="5 4" />{/each}
						{/if}
						{#each diagram.edges as edge, eIdx (`${edge.from}-${edge.to}-${eIdx}`)}
							<line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} stroke={edge.style === 'THICK' ? 'var(--hud-accent-secondary)' : edge.style === 'DASHED' ? 'var(--hud-warning)' : 'var(--hud-accent-primary)'} stroke-width={edge.style === 'THICK' ? '2.4' : '1.5'} stroke-dasharray={edge.style === 'DASHED' ? '5 3' : undefined} marker-end="url(#mmd-arrow)" />
						{/each}
						{#each diagram.nodes as node (node.id)}
							<g transform={`translate(${node.x}, ${node.y})`} class="cursor-pointer" role="button" tabindex="0" onclick={() => focusMatchingEntity(node.label)} onkeydown={(e) => e.key === 'Enter' && focusMatchingEntity(node.label)}>
								{#if node.shape === 'DIAMOND'}
									<polygon points={`${node.w / 2},0 ${node.w},${node.h / 2} ${node.w / 2},${node.h} 0,${node.h / 2}`} fill="var(--hud-panel)" stroke="var(--hud-warning)" stroke-width="1.5" />
								{:else}
									<rect width={node.w} height={node.h} rx={node.shape === 'CIRCLE' ? node.h / 2 : node.shape === 'ROUND' ? 12 : 2} fill="var(--hud-panel)" stroke="var(--hud-accent-primary)" stroke-width="1.5" />
								{/if}
								<text x={node.w / 2} y={node.members.length > 0 ? 18 : node.h / 2 + 4} text-anchor="middle" fill="var(--hud-text)" font-size="11" font-family="IBM Plex Mono" font-weight="700">{node.label.slice(0, 22)}</text>
								{#each node.members.slice(0, 4) as mbr, mIdx (mIdx)}<text x="8" y={34 + mIdx * 13} fill="var(--hud-muted)" font-size="10" font-family="IBM Plex Mono">{mbr.slice(0, 24)}</text>{/each}
							</g>
						{/each}
						<g data-testid="mermaid-edge-pills">
							{#each diagram.edges as edge, eIdx (`pill-${edge.from}-${edge.to}-${eIdx}`)}
								{#if edge.label}
									{@const isAngled = Math.abs(edge.x2 - edge.x1) > 24 && Math.abs(edge.y2 - edge.y1) > 12}
									{@const midX = Math.round((edge.x1 + edge.x2) / 2)}
									{@const midY = Math.round((edge.y1 + edge.y2) / 2) + (isAngled ? 12 : -10)}
									{@const pillW = Math.max(58, Math.round(edge.label.length * 6.4 + 14))}
									<rect x={midX - pillW / 2} y={midY - 9} width={pillW} height="16" rx="3" fill="var(--hud-surface-z2, var(--hud-surface))" fill-opacity="0.98" stroke="var(--hud-border)" stroke-width="1" />
									<text x={midX} y={midY + 2} text-anchor="middle" fill="var(--hud-nominal)" font-size="10" font-family="IBM Plex Mono" font-weight="600">{edge.label}</text>
								{/if}
							{/each}
						</g>
					</svg>
				{/snippet}
			</HudInteractiveCanvasStage>
		</div>
	</div>
</section>
