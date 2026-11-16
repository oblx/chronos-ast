<!--
	@author Oblx <code@oblx.dev>
	@description Retro-editorial Stations Launcher Modal (MONITOR, MANAGE, INTERACT, ADMIN) with Chronos u32 capability gating.
-->
<script lang="ts">
	import { STATION_CATEGORIES, STATIONS_DIRECTORY, type StationActionKind, type StationCatalogItem } from '@config/hud.events';
	import { securityWire } from '@client/state/security.wire.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalGrid from '../HudModalGrid.svelte';
	import HudModalItemRow from '../HudModalItemRow.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onExecuteAction: (action: StationActionKind) => void;
	}

	let { isOpen, onClose, onExecuteAction }: Props = $props();

	function handleTrigger(item: StationCatalogItem): void {
		if (item.requiredMask && !securityWire.requireCapabilityOrPrompt(item.requiredMask)) {
			return;
		}
		onClose();
		onExecuteAction(item.action);
	}

	function isAuthorized(item: StationCatalogItem): boolean {
		return !item.requiredMask || securityWire.can(item.requiredMask);
	}

	function handleWindowKeydown(e: KeyboardEvent): void {
		if (!isOpen || e.ctrlKey || e.metaKey || e.altKey) return;
		const key = e.key.toUpperCase();
		const matched = STATIONS_DIRECTORY.find((item) => item.shortcutKey === key && isAuthorized(item));
		if (matched) {
			e.preventDefault();
			handleTrigger(matched);
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<HudModalShell {isOpen} ariaLabel="Chronos Stations Quick-Jump Directory" maxWidthClass="max-w-6xl" {onClose}>
	{#snippet header()}
		<HudModalHeader
			title="Stations"
			subtitle={`CHRONOS COMMAND DIRECTORY · ${securityWire.roleId} (${securityWire.maskHex()})`}
			{onClose}
		/>
	{/snippet}

	<HudModalGrid columns={4}>
		{#each STATION_CATEGORIES as cat (cat.key)}
			{@const authorizedItems = STATIONS_DIRECTORY.filter((s) => s.category === cat.key && isAuthorized(s))}
			{#if authorizedItems.length > 0}
				<section aria-label={cat.label} class="flex flex-col">
					<h3 class="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--hud-accent)] border-b border-[var(--hud-brass)] pb-1.5 mb-1">
						{cat.label}
					</h3>
					<div class="flex flex-col">
						{#each authorizedItems as item (item.id)}
							<HudModalItemRow
								iconGlyph={item.iconGlyph}
								label={item.label}
								description={item.description}
								shortcutKey={item.shortcutKey}
								onclick={() => handleTrigger(item)}
							/>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</HudModalGrid>

	{#snippet footer()}
		<HudModalFooter metaText="Press [1]–[0] or [Z] to jump · Stations dynamically filtered by active Chronos u32 capability mask">
			{#snippet actions()}
				<button
					type="button"
					onclick={onClose}
					class="px-3 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] hover:border-[var(--hud-accent)] cursor-pointer"
				>
					Return to Canvas
				</button>
			{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
