<!--
	@author Oblx <code@oblx.dev>
	@description Phosphor CRT Source Span Viewer with Fira Code ligatures, polyglot syntax highlighting, and right-aligned symbol jump pills (v2.5.0).
-->
<script lang="ts">
	import { SOURCE_VIEWER_TOKENS } from '@config/hud.tokens';
	import {
		type CodeCheckViolation,
		type GraphEntityNode,
		hudWire,
		syntaxTokenCssVar,
		tokenizeCodeLine
	} from '@client/state';
	import SourceCodeLens from '@client/components/molecules/SourceCodeLens.svelte';

	interface Props {
		entity: GraphEntityNode; sourceCode: string; highlightedLine: number | null;
		nodes: readonly GraphEntityNode[]; violations?: readonly CodeCheckViolation[];
		onSelectEntity: (id: number, line?: number) => void;
	}

	let { entity, sourceCode, highlightedLine, nodes, violations = [], onSelectEntity }: Props = $props();
	let activeSymbolHighlight = $state<string>('');

	let lines = $derived(sourceCode.split(/\r?\n/).slice(0, SOURCE_VIEWER_TOKENS.MAX_VISIBLE_LINES));
	let entityViolationCount = $derived(violations.filter((v) => v.entityId === entity.id).length);
	let violationLineSet = $derived(new Set(violations.filter((v) => v.entityId === entity.id).map((v) => v.line)));

	function matchDeclarationAtLine(rawLine: string, lineNumber: number): GraphEntityNode | undefined {
		if (lineNumber === 1) return entity;
		const m = rawLine.match(/\b(?:function|class|interface|fn|def)\s+([A-Za-z_][A-Za-z0-9_]*)/);
		if (!m) return undefined;
		return nodes.find((n) => n.name === m[1]);
	}

	function findReferencedNodeOnLine(lineText: string): GraphEntityNode | undefined {
		for (const candidate of nodes) {
			if (candidate.id === entity.id || candidate.name.length < 3) continue;
			if (lineText.includes(candidate.name)) return candidate;
		}
		return undefined;
	}

	function gutterHeatClass(rawLine: string, lineNum: number): string {
		if (violationLineSet.has(lineNum)) return 'border-r-4 border-r-[var(--hud-danger)]';
		if (/\b(?:if|for|while|switch|match|catch)\b/.test(rawLine)) return 'border-r-4 border-r-[var(--hud-warning)]';
		return 'border-r border-r-[var(--hud-border)]';
	}
</script>

<section aria-label="Phosphor Source Span Viewer" class="border border-[var(--hud-border)] bg-[var(--hud-bg)] flex flex-col h-full min-h-0 font-mono text-xs">
	<div class="px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-panel)] flex items-center justify-between gap-2 shrink-0">
		<div class="flex items-center gap-2 min-w-0">
			<span class="text-[var(--hud-accent)] font-bold">SRC // TELEMETRY VIEWER</span>
			<span class="text-[11px] text-[var(--hud-muted)] truncate">{entity.qualifiedName}</span>
		</div>
		<div class="flex items-center gap-1.5 shrink-0">
			{#if activeSymbolHighlight}
				<button type="button" onclick={() => (activeSymbolHighlight = '')} class="text-[11px] px-1.5 py-0.5 bg-[var(--hud-accent-secondary)]/20 text-[var(--hud-accent-secondary)] border border-[var(--hud-accent-secondary)] cursor-pointer">SYM: {activeSymbolHighlight} ✕</button>
			{/if}
			{#if highlightedLine}
				<span class="text-[11px] px-1.5 py-0.5 bg-[var(--hud-accent)]/20 text-[var(--hud-accent)] border border-[var(--hud-accent)]">LOCKED L{highlightedLine}</span>
			{/if}
		</div>
	</div>

	<div class="flex-1 overflow-auto divide-y divide-[var(--hud-border)]/30">
		{#each lines as rawLine, idx (idx)}
			{@const lineNumber = idx + 1}
			{@const declTarget = matchDeclarationAtLine(rawLine, lineNumber)}
			{@const linkedPeer = findReferencedNodeOnLine(rawLine)}
			{@const hasSymbolHit = activeSymbolHighlight.length > 0 && rawLine.includes(activeSymbolHighlight)}
			{@const tokens = tokenizeCodeLine(rawLine)}
			{#if declTarget}
				<SourceCodeLens entity={declTarget} violationCount={declTarget.id === entity.id ? entityViolationCount : 0} {onSelectEntity} />
			{/if}
			<div data-testid="source-code-row" class={`flex items-center justify-between leading-5 transition-colors ${highlightedLine === lineNumber ? 'bg-[var(--hud-accent)]/20 text-[var(--hud-accent)] font-semibold' : hasSymbolHit ? 'bg-[var(--hud-accent-secondary)]/15' : 'hover:bg-[var(--hud-surface)]'}`}>
				<span style={`width:${SOURCE_VIEWER_TOKENS.GUTTER_WIDTH_PX}px`} class={`px-2 py-0.5 text-right text-[11px] text-[var(--hud-muted)] bg-[var(--hud-panel)] select-none shrink-0 tabular-nums ${gutterHeatClass(rawLine, lineNumber)}`}>{lineNumber}</span>
				<pre
					style={`font-size:${hudWire.codeFontSizePx}px;`}
					class="px-3 py-0.5 flex-1 min-w-0 overflow-x-auto whitespace-pre cursor-text font-mono"
					ondblclick={() => { const w = rawLine.match(/[A-Za-z_][A-Za-z0-9_]{2,}/)?.[0]; if (w) activeSymbolHighlight = w; }}
				>{#if tokens.length === 0}{' '}{:else}{#each tokens as tok, tIdx (tIdx)}<span style={`color:${syntaxTokenCssVar(tok.kind)}`} data-syntax-kind={tok.kind}>{tok.text}</span>{/each}{/if}</pre>
				{#if linkedPeer}
					<div data-testid="source-jump-col" class="shrink-0 pl-3 pr-2 border-l border-[var(--hud-border)] bg-[var(--hud-surface)]/80">
						<button type="button" onclick={() => { activeSymbolHighlight = linkedPeer.name; onSelectEntity(linkedPeer.id, lineNumber); }} class="text-[11px] text-[var(--hud-accent)] hover:underline cursor-pointer whitespace-nowrap" data-hud-tip={`Jump & highlight ${linkedPeer.qualifiedName}`}>◈ {linkedPeer.name}</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</section>
