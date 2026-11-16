<!--
	@author Oblx <code@oblx.dev>
	@description Reusable progressive disclosure sub-tab bar rendering chamfered HudChamferButton tabs (LEFT_END_CAP, INTERIOR_CHAMFER, RIGHT_END_CAP).
-->
<script lang="ts">
	import { CHAMFER_PROFILES, type ChamferCorner } from '@config/hud.tokens';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	export interface HudSubTabItem {
		readonly id: string;
		readonly label: string;
		readonly glyph?: string;
		readonly badge?: string | number;
		readonly testid?: string;
	}

	interface Props {
		items?: readonly HudSubTabItem[];
		tabs?: readonly HudSubTabItem[];
		activeId?: string;
		activeTabId?: string;
		ariaLabel?: string;
		onSelect: (id: string) => void;
	}

	let { items, tabs, activeId, activeTabId, ariaLabel = 'Sub-Navigation Tabs', onSelect }: Props = $props();
	let resolvedItems = $derived(items ?? tabs ?? []);
	let resolvedActiveId = $derived(activeId ?? activeTabId ?? '');

	function resolveTabCorner(idx: number, total: number): ChamferCorner {
		if (total > 1 && idx === 0) return CHAMFER_PROFILES.LEFT_END_CAP;
		if (total > 1 && idx === total - 1) return CHAMFER_PROFILES.RIGHT_END_CAP;
		return CHAMFER_PROFILES.INTERIOR_CHAMFER;
	}
</script>

<div role="tablist" aria-label={ariaLabel} class="flex flex-wrap justify-center items-center gap-1.5 font-mono text-xs leading-4 whitespace-nowrap">
	{#each resolvedItems as item, idx (item.id)}
		{@const isActive = item.id === resolvedActiveId}
		<HudChamferButton
			chamferCorner={resolveTabCorner(idx, resolvedItems.length)}
			cutPx={5}
			active={isActive}
			variant={isActive ? 'accent' : 'default'}
			role="tab"
			ariaSelected={isActive}
			testid={item.testid}
			onclick={() => onSelect(item.id)}
			className="px-3.5 py-1.5 font-mono text-xs leading-4 shrink-0"
		>
			{#if item.glyph}<span class="text-[var(--hud-accent-secondary)]">{item.glyph}</span>{/if}
			<span>{item.label}</span>
			{#if item.badge !== undefined}
				<span class="px-1.5 py-0.5 text-[11px] leading-4 border border-[var(--hud-border)] bg-[var(--hud-panel)] text-[var(--hud-accent-secondary)] tabular-nums">
					{item.badge}
				</span>
			{/if}
		</HudChamferButton>
	{/each}
</div>
