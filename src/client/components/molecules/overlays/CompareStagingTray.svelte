<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.6.0 Compare Staging Tray & Inline Diff Breakdown Drawer above BOTTOM_CENTER.
-->
<script lang="ts">
	import { COMPARE_STATUS } from '@config/constants';
	import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
	import { CHAMFER_CORNERS, HULL_PROFILES, HUD_ZONES } from '@config/hud.tokens';
	import { type SnapshotDiffReport, hudWire } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		diffReport: SnapshotDiffReport | null;
		baselineLabel?: string;
		onClearBaseline: () => void;
	}

	let { diffReport, baselineLabel = 'Baseline', onClearBaseline }: Props = $props();
	let badgeEl = $state<HTMLSpanElement | null>(null);
	let lastBurstActive = false;

	$effect(() => {
		const active = Boolean(diffReport);
		if (active && !lastBurstActive && badgeEl) {
			const r = badgeEl.getBoundingClientRect();
			hudWire.triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2, 'compare');
		}
		lastBurstActive = active;
	});

	let deltas = $derived(
		diffReport
			? Object.entries(diffReport.entityDeltas).filter(([, d]) => d.status !== COMPARE_STATUS.UNCHANGED)
			: []
	);
	let added = $derived(deltas.filter(([, d]) => d.status === COMPARE_STATUS.ADDED).length);
	let modified = $derived(deltas.filter(([, d]) => d.status === COMPARE_STATUS.MODIFIED).length);
	let removed = $derived(deltas.filter(([, d]) => d.status === COMPARE_STATUS.REMOVED).length);
</script>

{#if diffReport}
	<aside data-testid="compare-staging-tray" class="fixed bottom-[152px] left-1/2 -translate-x-1/2 z-25 pointer-events-auto hud-center-corridor-w flex flex-col items-center gap-1.5 font-mono text-[11px]">
		{#if hudWire.compareDrawerOpen}
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={false} className="w-full max-w-2xl p-2.5 shadow-2xl">
				<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1 mb-1.5">
					<span class="font-bold text-[var(--hud-accent-secondary)] uppercase">Diff Breakdown ({deltas.length} Changed Entities)</span>
					<button type="button" onclick={() => hudWire.dispatchIntent({ intentKind: HUD_INTENT_KINDS.COMPARE_TOGGLE_DRAWER, sourceZone: HUD_ZONES.BOTTOM_CENTER })} class="text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer">Close</button>
				</div>
				<div class="max-h-32 overflow-y-auto flex flex-col gap-1">
					{#if deltas.length === 0}
						<div class="text-[var(--hud-muted)] py-1">Active snapshot matches pinned baseline (0 structural deltas).</div>
					{:else}
						{#each deltas.slice(0, 24) as [qName, delta] (qName)}
							<div class="px-2 py-0.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] flex items-center justify-between gap-2">
								<span class="truncate text-[var(--hud-text)]">{qName}</span>
								<span class={delta.status === COMPARE_STATUS.ADDED ? 'text-[var(--hud-nominal)] font-bold' : delta.status === COMPARE_STATUS.MODIFIED ? 'text-[var(--hud-warning)] font-bold' : 'text-[var(--hud-danger)] font-bold'}>{delta.status}</span>
							</div>
						{/each}
					{/if}
				</div>
			</HudChamferFrame>
		{/if}

		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} className="px-3 py-1.5">
			<div class="flex flex-wrap items-center justify-center gap-2 whitespace-nowrap">
				<span bind:this={badgeEl} data-testid="compare-tray-badge" class="px-1.5 py-0.5 border border-[var(--hud-nominal)] bg-[var(--hud-nominal)]/15 text-[var(--hud-nominal)] font-bold">
					COMPARE TRAY [{deltas.length}] · {baselineLabel} vs. Active
				</span>
				<span class="text-[var(--hud-nominal)]">+{added} Added</span>
				<span class="text-[var(--hud-warning)]">~{modified} Mod</span>
				<span class="text-[var(--hud-danger)]">-{removed} Rem</span>
				<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="accent" testid="compare-drawer-toggle" onclick={() => hudWire.dispatchIntent({ intentKind: HUD_INTENT_KINDS.COMPARE_TOGGLE_DRAWER, sourceZone: HUD_ZONES.BOTTOM_CENTER })} className="px-2 py-0.5 text-[10px]">
					{hudWire.compareDrawerOpen ? 'Hide Diff' : 'Diff Drawer'}
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_CORNERS.BOTTOM_LEFT} cutPx={5} variant="danger" testid="compare-clear-btn" onclick={() => { hudWire.compareDrawerOpen = false; onClearBaseline(); }} className="px-2 py-0.5 text-[10px]">
					Clear
				</HudChamferButton>
			</div>
		</HudChamferFrame>
	</aside>
{/if}
