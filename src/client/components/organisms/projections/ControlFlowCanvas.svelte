<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.4.0 Inline-Code CFG Flowchart with numbered source lines, Loop Nesting Zones, orthogonal [T]/[F] edges, and dominator trail.
-->
<script lang="ts">
	import { CFG_LAYOUT_CONSTANTS, HUD_INTENT_KINDS, HUD_THEME } from '@config/hud.tokens';
	import { CFG_BLOCK_KINDS, CFG_EDGE_KINDS } from '@config/metamodel.constants';
	import {
		type CodeCheckViolation,
		type GraphEntityNode,
		type GraphReferenceEdge,
		backtrack,
		buildControlFlowGraph,
		chooseBranch,
		createVirtualStepperSession,
		hudWire,
		stepInto,
		stepOver,
		stepReturn
	} from '@client/state';
	import HudSurfacePattern from '@client/components/atoms/fx/HudSurfacePattern.svelte';
	import VirtualStepperBar from '@client/components/molecules/overlays/VirtualStepperBar.svelte';
	import HudInteractiveCanvasStage from '../perimeter/HudInteractiveCanvasStage.svelte';
	import SourceSpanViewer from '../perimeter/SourceSpanViewer.svelte';

	interface Props {
		entity: GraphEntityNode; sourceCode: string; nodes: readonly GraphEntityNode[];
		edges?: readonly GraphReferenceEdge[]; sourceMap?: Readonly<Record<string, string>>;
		violations?: readonly CodeCheckViolation[]; onSelectEntity: (id: number, line?: number) => void;
	}

	let { entity, sourceCode, nodes, edges = [], sourceMap = {}, violations = [], onSelectEntity }: Props = $props();
	let selectedLine = $state<number | null>(null);
	let expandedBlocks = $state<number[]>([]);
	let effectiveSourceMap = $derived({ ...sourceMap, [entity.qualifiedName]: sourceCode });
	let stepperOverride = $state<ReturnType<typeof createVirtualStepperSession> | null>(null);
	let stepper = $derived(stepperOverride ?? createVirtualStepperSession(entity, effectiveSourceMap));

	$effect(() => { void entity.id; stepperOverride = null; expandedBlocks = []; });

	let cfg = $derived(buildControlFlowGraph(entity.qualifiedName, sourceCode, 1));
	let sourceLines = $derived(sourceCode.split(/\r?\n/));

	let dominatorTrail = $derived.by(() => {
		const trail = new Set<number>();
		let cur = cfg.blocks.find((b) => b.id === stepper.currentBlockId);
		for (let i = 0; cur && i < 16; i++) {
			trail.add(cur.id);
			cur = cur.immediateDominatorId ? cfg.blocks.find((b) => b.id === cur!.immediateDominatorId) : undefined;
		}
		return trail;
	});

	let layout = $derived.by(() => {
		let yCursor = 34;
		const items = cfg.blocks.map((block) => {
			const rawSlice = sourceLines.slice(Math.max(0, block.lineStart - 1), Math.max(block.lineStart, block.lineEnd));
			const isExpanded = expandedBlocks.includes(block.id);
			const shownLines = rawSlice.length > 0 ? rawSlice.slice(0, isExpanded ? 12 : 6) : [block.label];
			const h = 28 + shownLines.length * 14;
			const w = 290;
			const cx = CFG_LAYOUT_CONSTANTS.CENTER_X + (block.kind === CFG_BLOCK_KINDS.UNREACHABLE ? 140 : block.kind === CFG_BLOCK_KINDS.BRANCH_DECISION ? -28 : 0);
			const topY = yCursor;
			yCursor += h + 30;
			return { ...block, cx, topY, w, h, shownLines, hasMore: rawSlice.length > 6 };
		});
		return { items, coordMap: new Map(items.map((b) => [b.id, b])), totalH: Math.max(480, yCursor + 36) };
	});

	function orthoEdgePath(sx: number, sy: number, tx: number, ty: number): string {
		const midY = Math.round((sy + ty) / 2);
		return Math.abs(sx - tx) < 4 ? `M ${sx} ${sy} L ${tx} ${ty}` : `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
	}
	function selectCfgLine(line: number, stepKind?: string): void { selectedLine = line; hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'CFG', line, stepKind }); }
	function toggleBlockExpand(blockId: number, e: Event): void { e.stopPropagation(); expandedBlocks = expandedBlocks.includes(blockId) ? expandedBlocks.filter((id) => id !== blockId) : [...expandedBlocks, blockId]; hudWire.emitUiIntent(HUD_INTENT_KINDS.PROJECTION_OPTION_TOGGLE, 'WORLD_CANVAS', { view: 'CFG', blockId, expanded: expandedBlocks.includes(blockId) }); }
	function applyStepper(next: ReturnType<typeof createVirtualStepperSession> | null, kind: string): void { stepperOverride = next; selectCfgLine(next ? next.currentLine : 1, kind); if (next && next.activeEntityId !== entity.id && (kind === 'INTO' || kind === 'RETURN')) onSelectEntity(next.activeEntityId, next.currentLine); }
</script>

<div class="w-full h-full grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[var(--hud-bg)]/60 border border-[var(--hud-accent-primary)]/45">
	<div class="md:col-span-7 h-full min-h-[240px] flex flex-col md:border-r border-b md:border-b-0 border-[var(--hud-border)] overflow-hidden">
		<div class="px-4 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-panel)] flex items-center justify-between font-mono text-xs shrink-0">
			<div class="flex items-center gap-2"><span class="text-[var(--hud-accent-secondary)] font-bold">⑂ CFG // INLINE BASIC BLOCKS</span><span class="text-[var(--hud-muted)]">({cfg.blocks.length} blocks · v(G)={cfg.cyclomaticFormulaV})</span></div>
			<span class={`px-2 py-0.5 text-[11px] border ${cfg.unreachableCount > 0 ? 'border-[var(--hud-danger)] text-[var(--hud-danger)] font-bold' : 'border-[var(--hud-nominal)] text-[var(--hud-nominal)]'}`}>DEAD: {cfg.unreachableCount}</span>
		</div>
		<VirtualStepperBar {stepper} onStepOver={() => applyStepper(stepOver(stepper, effectiveSourceMap), 'OVER')} onStepInto={() => applyStepper(stepInto(stepper, nodes, edges, effectiveSourceMap), 'INTO')} onStepReturn={() => applyStepper(stepReturn(stepper), 'RETURN')} onBacktrack={() => applyStepper(backtrack(stepper, nodes), 'BACKTRACK')} onChooseBranch={(idx) => applyStepper(chooseBranch(stepper, effectiveSourceMap, idx), 'BRANCH')} onReset={() => applyStepper(null, 'RESET')} />
		<div class="relative flex-1 overflow-hidden">
			<HudSurfacePattern patternId={hudWire.surfacePatterns.SUBSTRATE} opacity={hudWire.surfaceOpacity * 0.25} tileScale={hudWire.surfaceScale} />
			<HudInteractiveCanvasStage boundsWidth={CFG_LAYOUT_CONSTANTS.VIEWBOX_WIDTH} boundsHeight={layout.totalH} nodeCount={cfg.blocks.length} fitKey={`cfg-${entity.id}-${cfg.blocks.length}`} resetNonce={hudWire.canvasResetNonce} ariaLabel="Interactive Control Flow Graph">
				{#snippet children()}
					<svg viewBox={`0 0 ${CFG_LAYOUT_CONSTANTS.VIEWBOX_WIDTH} ${layout.totalH}`} width={CFG_LAYOUT_CONSTANTS.VIEWBOX_WIDTH} height={layout.totalH} class="relative z-10 select-none">
						{#each layout.items.filter((b) => b.kind === CFG_BLOCK_KINDS.LOOP_HEADER) as loopHdr (loopHdr.id)}
							<rect x={loopHdr.cx - loopHdr.w / 2 - 22} y={loopHdr.topY - 14} width={loopHdr.w + 44} height={loopHdr.h + 90} fill="var(--hud-warning)" fill-opacity="0.06" stroke="var(--hud-warning)" stroke-dasharray="5 3" />
							<text x={loopHdr.cx - loopHdr.w / 2 - 14} y={loopHdr.topY - 3} fill="var(--hud-warning)" font-size="9" font-family="IBM Plex Mono">LOOP NESTING ZONE</text>
						{/each}
						{#each cfg.edges as edge, idx (`${edge.fromBlockId}-${edge.toBlockId}-${idx}`)}
							{@const src = layout.coordMap.get(edge.fromBlockId)}{@const dst = layout.coordMap.get(edge.toBlockId)}
							{#if src && dst}
								{@const isTrue = edge.kind === CFG_EDGE_KINDS.TRUE_BRANCH}{@const isFalse = edge.kind === CFG_EDGE_KINDS.FALSE_BRANCH}
								{@const stroke = isTrue ? 'var(--hud-nominal)' : isFalse ? 'var(--hud-danger)' : edge.kind === CFG_EDGE_KINDS.LOOP_BACK ? 'var(--hud-warning)' : 'var(--hud-accent-primary)'}
								{#if edge.fromBlockId === edge.toBlockId}
									<path d={`M ${src.cx + src.w / 2} ${src.topY + 18} C ${src.cx + src.w / 2 + 65} ${src.topY - 12}, ${src.cx + src.w / 2 + 65} ${src.topY + src.h}, ${src.cx + src.w / 2} ${src.topY + src.h - 10}`} fill="none" {stroke} stroke-width="1.6" stroke-dasharray="5 3" />
								{:else}
									<path d={orthoEdgePath(src.cx, src.topY + src.h, dst.cx, dst.topY)} fill="none" {stroke} stroke-width="1.6" />
									{#if isTrue || isFalse}<text x={Math.round((src.cx + dst.cx) / 2) + 6} y={Math.round((src.topY + src.h + dst.topY) / 2)} fill={stroke} font-size="10" font-family="IBM Plex Mono" font-weight="700">{isTrue ? '[T]' : '[F]'}</text>{/if}
								{/if}
							{/if}
						{/each}
						{#each layout.items as block (block.id)}
							{@const isDead = !block.isReachable || block.kind === CFG_BLOCK_KINDS.UNREACHABLE}{@const isActive = stepper.currentBlockId === block.id}{@const onDomTrail = dominatorTrail.has(block.id)}
							{@const stroke = isActive ? 'var(--hud-accent-secondary)' : isDead ? HUD_THEME.COLORS.DANGER : onDomTrail ? 'var(--hud-nominal)' : block.kind === CFG_BLOCK_KINDS.BRANCH_DECISION || block.kind === CFG_BLOCK_KINDS.LOOP_HEADER ? 'var(--hud-warning)' : 'var(--hud-accent-primary)'}
							<g data-graph-node="true" class="cursor-pointer" role="button" tabindex="0" onclick={() => selectCfgLine(block.lineStart, 'BLOCK')} onkeydown={(e) => e.key === 'Enter' && selectCfgLine(block.lineStart, 'BLOCK')}>
								<rect x={block.cx - block.w / 2} y={block.topY} width={block.w} height={block.h} fill="var(--hud-panel)" {stroke} stroke-width={isActive || onDomTrail ? '2.2' : '1.2'} />
								<rect x={block.cx - block.w / 2} y={block.topY} width={block.w} height="20" fill="var(--hud-surface)" />
								<text x={block.cx - block.w / 2 + 8} y={block.topY + 14} fill={stroke} font-size="10" font-family="IBM Plex Mono" font-weight="700">{isActive ? '▸ ' : ''}B{block.id} · {block.kind} · L{block.lineStart}</text>
								{#if block.hasMore}
									<g data-testid={`cfg-block-expand-${block.id}`} role="button" tabindex="0" class="cursor-pointer" onclick={(ev) => toggleBlockExpand(block.id, ev)} onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && toggleBlockExpand(block.id, ev)}>
										<rect x={block.cx + block.w / 2 - 26} y={block.topY + 3} width="22" height="14" fill="var(--hud-bg)" stroke={stroke} stroke-width="1" />
										<text x={block.cx + block.w / 2 - 15} y={block.topY + 13} text-anchor="middle" fill={stroke} font-size="9.5" font-family="IBM Plex Mono" font-weight="700">{expandedBlocks.includes(block.id) ? '[-]' : '[+]'}</text>
									</g>
								{/if}
								{#each block.shownLines as codeLine, lIdx (lIdx)}<text x={block.cx - block.w / 2 + 8} y={block.topY + 34 + lIdx * 14} fill="var(--hud-text)" font-size="10" font-family="IBM Plex Mono">{String(block.lineStart + lIdx).padStart(2, '0')} | {codeLine.trim().slice(0, 36)}</text>{/each}
							</g>
						{/each}
					</svg>
				{/snippet}
			</HudInteractiveCanvasStage>
		</div>
	</div>
	<div class="md:col-span-5 h-full min-h-[180px] overflow-hidden"><SourceSpanViewer {entity} {sourceCode} highlightedLine={selectedLine} {nodes} {violations} {onSelectEntity} /></div>
</div>
