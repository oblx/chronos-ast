<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic spatial context menu molecule with keyboard Escape & click-outside dismissal.
-->
<script lang="ts">
	import { HULL_PROFILES } from '../tokens';
	import UiChamferFrame from '../atoms/UiChamferFrame.svelte';

	export interface UiContextMenuAction {
		readonly id: string;
		readonly label: string;
		readonly shortcut?: string;
		readonly tone?: 'default' | 'accent' | 'brass' | 'danger';
	}

	interface Props {
		open: boolean;
		x: number;
		y: number;
		title: string;
		subtitle?: string;
		actions?: readonly UiContextMenuAction[];
		onSelect: (actionId: string) => void;
		onClose: () => void;
	}

	let {
		open,
		x,
		y,
		title,
		subtitle = '',
		actions = [],
		onSelect,
		onClose,
	}: Props = $props();

	let clampedX = $derived(typeof window !== 'undefined' ? Math.min(Math.max(12, x), window.innerWidth - 252) : x);
	let clampedY = $derived(typeof window !== 'undefined' ? Math.min(Math.max(12, y), window.innerHeight - 280) : y);
</script>

{#if open}
	<div
		role="presentation"
		onclick={onClose}
		oncontextmenu={(e) => { e.preventDefault(); onClose(); }}
		class="fixed inset-0 z-50 bg-transparent"
	>
		<div
			role="menu"
			tabindex="-1"
			data-testid="hud-context-menu"
			style={`transform: translate3d(${clampedX}px, ${clampedY}px, 0);`}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onClose()}
			class="fixed top-0 left-0 w-60 font-mono text-xs select-none"
		>
			<UiChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={true} className="w-full p-2.5 shadow-2xl">
				<div class="border-b border-[var(--hud-border)] pb-1.5 mb-1.5 flex items-center justify-between gap-2">
					<div class="truncate">
						<span class="text-[10px] uppercase tracking-wider text-[var(--hud-accent-secondary)] block">{subtitle}</span>
						<span class="font-bold text-[var(--hud-text)] truncate block">{title}</span>
					</div>
					<button type="button" onclick={onClose} class="text-[10px] text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer">ESC</button>
				</div>
				<div class="flex flex-col gap-1">
					{#each actions as act (act.id)}
						<button
							type="button"
							role="menuitem"
							data-testid={`ctx-action-${act.id.toLowerCase()}`}
							onclick={() => { onSelect(act.id); onClose(); }}
							class="w-full px-2 py-1.5 text-left flex items-center justify-between border border-transparent hover:border-[var(--hud-accent-primary)] hover:bg-[var(--hud-surface)] cursor-pointer transition-colors"
						>
							<span class={act.tone === 'accent' ? 'text-[var(--hud-accent-primary)] font-semibold' : act.tone === 'brass' ? 'text-[var(--hud-accent-secondary)] font-semibold' : act.tone === 'danger' ? 'text-[var(--hud-danger)] font-semibold' : 'text-[var(--hud-text)]'}>
								{act.label}
							</span>
							{#if act.shortcut}
								<span class="text-[10px] px-1 border border-[var(--hud-border)] text-[var(--hud-muted)]">{act.shortcut}</span>
							{/if}
						</button>
					{/each}
				</div>
			</UiChamferFrame>
		</div>
	</div>
{/if}
