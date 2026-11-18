<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic chamfered sub-tab bar molecule with Left/Interior/Right end-cap profiles.
-->
<script lang="ts">
	import { CHAMFER_PROFILES, CORNER_STYLES, type ChamferCorner, type CornerVertex } from '../tokens';
	import UiChamferButton from '../atoms/UiChamferButton.svelte';

	export interface UiSubTabItem {
		readonly id: string;
		readonly label: string;
		readonly badge?: string | number;
		readonly glyph?: string;
	}

	interface Props {
		items: readonly UiSubTabItem[];
		activeId: string;
		ariaLabel: string;
		cornerStyle?: CornerVertex;
		fontScalePct?: number;
		highContrastMode?: boolean;
		onSelect: (id: string) => void;
	}

	let {
		items,
		activeId,
		ariaLabel,
		cornerStyle = CORNER_STYLES.CHAMFER,
		fontScalePct = 100,
		highContrastMode = false,
		onSelect,
	}: Props = $props();

	function resolveTabCorner(idx: number, total: number): ChamferCorner {
		if (total <= 1) return CHAMFER_PROFILES.INTERIOR_CHAMFER;
		if (idx === 0) return CHAMFER_PROFILES.LEFT_END_CAP;
		if (idx === total - 1) return CHAMFER_PROFILES.RIGHT_END_CAP;
		return CHAMFER_PROFILES.INTERIOR_CHAMFER;
	}
</script>

<div role="tablist" aria-label={ariaLabel} class="flex flex-wrap items-center gap-1.5 font-mono text-xs">
	{#each items as item, idx (item.id)}
		{@const active = item.id === activeId}
		<UiChamferButton
			role="tab"
			ariaSelected={active}
			chamferCorner={resolveTabCorner(idx, items.length)}
			{cornerStyle}
			{fontScalePct}
			{highContrastMode}
			cutPx={6}
			{active}
			variant={active ? 'accent' : 'default'}
			onclick={() => onSelect(item.id)}
			className="px-3 py-1 text-xs"
		>
			{#if item.glyph}<span class="text-[var(--hud-accent-secondary)]">{item.glyph}</span>{/if}
			<span>{item.label}</span>
			{#if item.badge !== undefined}
				<span class="px-1.5 py-0.5 text-[10px] bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[var(--hud-muted)] tabular-nums">
					{item.badge}
				</span>
			{/if}
		</UiChamferButton>
	{/each}
</div>
