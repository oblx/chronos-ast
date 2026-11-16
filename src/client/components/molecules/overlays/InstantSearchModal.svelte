<!--
	@author Oblx <code@oblx.dev>
	@description Chronos Instant Search Modal (Ctrl+K / /) supporting string:, identifier:, comment:, globbing (*, ?), and Levenshtein fuzzy (~) queries.
-->
<script lang="ts">
	import { SEARCH_FIELD_PREFIXES } from '@config/constants';
	import { type GraphEntityNode, executeInstantSearch } from '@client/state';
	import HudModalShell from '@client/components/modals/HudModalShell.svelte';
	import HudModalHeader from '@client/components/modals/HudModalHeader.svelte';
	import HudModalFooter from '@client/components/modals/HudModalFooter.svelte';

	interface Props {
		isOpen: boolean;
		nodes: readonly GraphEntityNode[];
		sourceMap: Readonly<Record<string, string>>;
		onClose: () => void;
		onSelectHit: (entityId: number, line?: number) => void;
	}

	let { isOpen, nodes, sourceMap, onClose, onSelectHit }: Props = $props();
	let query = $state<string>('identifier:*Engine*');
	let hits = $derived(isOpen ? executeInstantSearch(query, nodes, sourceMap) : []);

	function applyPrefix(prefix: string): void {
		query = `${prefix}${query.replace(/^(string:|identifier:|comment:)/i, '')}`;
	}
</script>

<HudModalShell {isOpen} ariaLabel="Instant Search Query Modal" maxWidthClass="max-w-3xl" {onClose}>
	{#snippet header()}
		<HudModalHeader title="Instant Search" subtitle="LEXICAL & FUZZY ENGINE · CTRL+K" {onClose} />
	{/snippet}

	<div class="flex flex-col gap-3 font-mono">
		<div class="flex flex-col gap-2">
			<input
				type="search"
				aria-label="Instant search query"
				bind:value={query}
				placeholder="e.g. identifier:compute* AND NOT comment:todo or state~"
				class="w-full px-3 py-2 text-xs bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[var(--hud-text)] focus:border-[var(--hud-accent)] outline-none"
			/>
			<div class="flex items-center justify-between text-[11px] text-[var(--hud-muted)] flex-wrap gap-2">
				<div class="flex items-center gap-1.5 flex-wrap">
					<span>Scopes:</span>
					<button type="button" onclick={() => applyPrefix(SEARCH_FIELD_PREFIXES.IDENTIFIER)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[var(--hud-accent)] cursor-pointer">identifier:</button>
					<button type="button" onclick={() => applyPrefix(SEARCH_FIELD_PREFIXES.STRING)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[var(--hud-nominal)] cursor-pointer">string:</button>
					<button type="button" onclick={() => applyPrefix(SEARCH_FIELD_PREFIXES.COMMENT)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[var(--hud-warning)] cursor-pointer">comment:</button>
					<span>· Wildcards: <code>* ?</code> · Fuzzy: <code>term~</code></span>
				</div>
				<span class="tabular-nums text-[var(--hud-accent)]">{hits.length} matches</span>
			</div>
		</div>

		<div class="max-h-72 overflow-y-auto divide-y divide-[var(--hud-border)] border border-[var(--hud-border)] bg-[var(--hud-bg)]/60 text-xs">
			{#if hits.length === 0}
				<div class="p-5 text-center text-[var(--hud-muted)]">No source_units or entity identifiers matched "{query}".</div>
			{:else}
				{#each hits.slice(0, 40) as hit (`${hit.entityId}-${hit.line}`)}
					<button
						type="button"
						onclick={() => { onSelectHit(hit.entityId, hit.line); onClose(); }}
						class="w-full px-4 py-2 text-left hover:bg-[var(--hud-surface)] flex items-center justify-between gap-3 cursor-pointer"
					>
						<div class="flex flex-col truncate min-w-0">
							<div class="flex items-center gap-2">
								<span class="px-1.5 py-0.5 text-[11px] border border-[var(--hud-border)] text-[var(--hud-accent)]">{hit.matchedField}</span>
								<span class="font-display text-sm font-semibold text-[var(--hud-text)]">{hit.entityName}</span>
								<span class="text-[11px] text-[var(--hud-muted)] truncate">{hit.qualifiedName}</span>
							</div>
							<span class="text-[11px] text-[var(--hud-nominal)] truncate mt-0.5">{hit.snippet}</span>
						</div>
						<span class="text-[11px] text-[var(--hud-muted)] shrink-0 tabular-nums">@L{hit.line}</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<HudModalFooter metaText="Select a hit to lock focal target in World Canvas · Press [ESC] to close">
			{#snippet actions()}
				<button type="button" onclick={onClose} class="px-3 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] hover:border-[var(--hud-accent)] cursor-pointer">Close</button>
			{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
