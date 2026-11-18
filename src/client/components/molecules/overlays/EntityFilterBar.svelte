<!--
	@author Oblx <code@oblx.dev>
	@description Interactive entity search and tokenized predicate filter sidebar with DAG intent emission and Explorer/Files/Violations tab awareness (v1.9.6).
-->
<script lang="ts">
	import { WORKSPACE_DEFAULTS } from '@config/constants';
	import {
		ENTITY_KINDS, type EntityCkMetrics, type EntityKind, type GraphEntityNode,
		hudWire, summarizeEntityTaxonomy,
	} from '@client/state';

	interface Props {
		entities: readonly GraphEntityNode[]; selectedEntityId: number; searchQuery: string; activeKindFilter: string;
		ckMap?: Readonly<Record<number, EntityCkMetrics>>; cyclicIds?: ReadonlySet<number>; violationMap?: Readonly<Record<number, number>>;
		onSelectEntity: (id: number) => void; onSearchChange: (q: string) => void; onKindChange: (kind: string) => void;
	}

	let {
		entities, selectedEntityId, searchQuery, activeKindFilter, ckMap = {}, cyclicIds = new Set<number>(),
		violationMap = {}, onSelectEntity, onSearchChange, onKindChange,
	}: Props = $props();

	const filterOptions = [
		WORKSPACE_DEFAULTS.FILTER_ALL, ENTITY_KINDS.FILE, ENTITY_KINDS.FUNCTION, ENTITY_KINDS.CLASS,
		ENTITY_KINDS.METHOD, ENTITY_KINDS.INTERFACE, ENTITY_KINDS.VARIABLE,
	] as const;

	let taxonomy = $derived(summarizeEntityTaxonomy(entities));

	function handleKindClick(kindOpt: string): void {
		const nextTab = kindOpt === ENTITY_KINDS.FILE ? 'FILES' : hudWire.leftEdgeActiveTab === 'FILES' ? 'EXPLORER' : hudWire.leftEdgeActiveTab;
		hudWire.setLeftDrawerTab(nextTab, kindOpt);
		onKindChange(kindOpt);
	}

	function resetEntityFilters(): void {
		onSearchChange('');
		hudWire.setLeftDrawerTab('EXPLORER', WORKSPACE_DEFAULTS.FILTER_ALL);
		onKindChange(WORKSPACE_DEFAULTS.FILTER_ALL);
	}

	function matchesTokenizedPredicate(item: GraphEntityNode, rawQuery: string): boolean {
		const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);
		if (tokens.length === 0) return true;
		for (const tok of tokens) {
			const lower = tok.toLowerCase();
			if (lower.startsWith('kind:')) {
				if (item.kind.toLowerCase() !== lower.slice(5)) return false;
			} else if (lower.startsWith('wmc:gt:')) {
				if ((ckMap[item.id]?.wmc ?? item.cyclomatic) <= (Number(lower.slice(7)) || 0)) return false;
			} else if (lower === 'scc:cyclic') {
				if (!cyclicIds.has(item.id)) return false;
			} else if (lower.startsWith('violations:gt:')) {
				if ((violationMap[item.id] ?? 0) <= (Number(lower.slice(14)) || 0)) return false;
			} else if (!item.name.toLowerCase().includes(lower) && !item.qualifiedName.toLowerCase().includes(lower)) {
				return false;
			}
		}
		return true;
	}

	let filteredEntities = $derived(
		entities.filter((item) => {
			if (hudWire.leftEdgeActiveTab === 'FILES' && item.kind !== ENTITY_KINDS.FILE) return false;
			if (hudWire.leftEdgeActiveTab === 'VIOLATIONS' && (violationMap[item.id] ?? 0) <= 0 && item.cyclomatic < 4) return false;
			const matchesKind = activeKindFilter === WORKSPACE_DEFAULTS.FILTER_ALL || item.kind === (activeKindFilter as EntityKind);
			return matchesKind && matchesTokenizedPredicate(item, searchQuery);
		})
	);
</script>

<div class="flex flex-col min-h-0 flex-1 w-full bg-[var(--hud-panel)] text-[var(--hud-text)]">
	<div class="shrink-0 p-3 border-b border-[var(--hud-border)] flex flex-col gap-2">
		<label for="entity-search-input" class="text-xs font-medium text-[var(--hud-muted)]">
			Filter AST Entities ({filteredEntities.length} / {taxonomy.totalCount})
		</label>
		<input id="entity-search-input" type="search" value={searchQuery} oninput={(e) => onSearchChange((e.currentTarget as HTMLInputElement).value)} placeholder="Filter symbol or kind:CLASS" class="w-full bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)] placeholder:text-[var(--hud-muted)] focus:outline-none focus:border-[var(--hud-accent)] font-mono" />
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Filter by symbol kind">
			{#each filterOptions as kindOpt}
				<button type="button" data-testid={`left-kind-pill-${kindOpt.toLowerCase()}`} aria-pressed={activeKindFilter === kindOpt} onclick={() => handleKindClick(kindOpt)} class={`px-2 py-0.5 text-[0.6875rem] font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${activeKindFilter === kindOpt ? 'bg-[var(--hud-surface)] text-[var(--hud-accent)] border-[var(--hud-accent)] font-semibold' : 'bg-[var(--hud-bg)] text-[var(--hud-muted)] border-[var(--hud-border)] hover:text-[var(--hud-text)]'}`}>{kindOpt}</button>
			{/each}
		</div>
	</div>

	<div class="flex-1 min-h-0 max-h-64 overflow-y-auto divide-y divide-[var(--hud-border)]" role="listbox" aria-label="Indexed AST Entities">
		{#if filteredEntities.length === 0}
			<div class="p-6 text-center text-xs text-[var(--hud-muted)] flex flex-col gap-2">
				<p>No AST symbols match current predicate.</p>
				<button type="button" onclick={resetEntityFilters} class="px-3 py-1.5 bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-accent)] text-xs font-mono cursor-pointer">Reset Entity Filters</button>
			</div>
		{:else}
			{#each filteredEntities as item (item.id)}
				<button type="button" role="option" aria-selected={item.id === selectedEntityId} onclick={() => onSelectEntity(item.id)} class={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors cursor-pointer ${item.id === selectedEntityId ? 'bg-[var(--hud-surface)] text-[var(--hud-accent)]' : 'hover:bg-[var(--hud-surface)] text-[var(--hud-text)]'}`}>
					<div class="flex items-center justify-between gap-2">
						<span class="font-mono text-xs font-medium truncate">{item.name}</span>
						<span class="font-mono text-[0.6875rem] text-[var(--hud-muted)] shrink-0 tabular-nums">v(G)={item.cyclomatic}</span>
					</div>
					<div class="flex items-center justify-between text-[0.6875rem] text-[var(--hud-muted)] font-mono">
						<span>{item.kind}</span>
						<span class="tabular-nums">{item.loc}L · Ca:{item.afferentCoupling} Ce:{item.efferentCoupling}</span>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</div>
