<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.1 RBAC-Gated Live Dual-Spine Wire Observatory (chronos.admin.wire.observe · bit 28).
-->
<script lang="ts">
	import { CHAMFER_PROFILES, HULL_PROFILES } from '@config/hud.tokens';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { clientDagKernel, securityWire, type WireChannelKind, type WireTraceRecord } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}
	let { isOpen, onClose }: Props = $props();

	const FILTERS: ReadonlyArray<{ readonly id: 'ALL' | WireChannelKind | 'SLOW'; readonly label: string }> = [
		{ id: 'ALL', label: 'All' },
		{ id: 'CLIENT_DAG', label: 'Client DAG' },
		{ id: 'SERVER_DAG', label: 'Server DAG' },
		{ id: 'WS_COLLAB', label: 'WS Collab' },
		{ id: 'RBAC_SECURITY', label: 'RBAC/Security' },
		{ id: 'SLOW', label: 'Slow >5ms' },
	] as const;

	let activeFilter = $state<'ALL' | WireChannelKind | 'SLOW'>('ALL');
	let paused = $state<boolean>(clientDagKernel.paused);
	let selectedSeq = $state<number>(1);
	let tick = $state<number>(0);

	$effect(() => {
		if (isOpen && securityWire.can(CAPABILITY_BITS.ADMIN_WIRE_OBSERVE)) {
			void clientDagKernel.syncServerWireTraces().then(() => { tick += 1; });
		}
	});

	let visibleTraces = $derived.by(() => {
		void tick;
		return clientDagKernel.filteredTraces(activeFilter);
	});
	let selectedTrace = $derived<WireTraceRecord | undefined>(
		visibleTraces.find((t) => t.seq === selectedSeq) ?? visibleTraces[0]
	);

	function handleTogglePause(): void {
		paused = clientDagKernel.togglePause();
		tick += 1;
	}
	function handleRefreshServerSpine(): void {
		void clientDagKernel.syncServerWireTraces().then(() => { tick += 1; });
	}
</script>

<HudModalShell {isOpen} ariaLabel="Live Dual-Spine Wire Observatory" maxWidthClass="max-w-5xl" {onClose}>
	{#snippet header()}
		<HudModalHeader
			title="Live Wire Observatory"
			subtitle="DUAL-SPINE CLIENT & SERVER DAG TELEMETRY · GATED BY chronos.admin.wire.observe (b28)"
			{onClose}
		/>
		<div data-testid="wire-observatory-toolbar" class="px-5 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-bg)]/90 flex flex-wrap items-center justify-between gap-2 shrink-0 font-mono text-xs">
			<div class="flex items-center gap-1.5 flex-wrap">
				{#each FILTERS as f, idx (f.id)}
					<HudChamferButton
						chamferCorner={idx === 0 ? CHAMFER_PROFILES.LEFT_END_CAP : idx === FILTERS.length - 1 ? CHAMFER_PROFILES.RIGHT_END_CAP : CHAMFER_PROFILES.INTERIOR_CHAMFER}
						cutPx={5}
						active={activeFilter === f.id}
						variant={activeFilter === f.id ? 'accent' : 'default'}
						testid={`wire-filter-${f.id.toLowerCase()}`}
						onclick={() => { activeFilter = f.id; tick += 1; }}
						className="px-2.5 py-1 text-[11px]"
					>
						{f.label}
					</HudChamferButton>
				{/each}
			</div>
			<div class="flex items-center gap-1.5">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={5} variant={paused ? 'brass' : 'nominal'} testid="wire-pause-toggle-btn" onclick={handleTogglePause} className="px-2.5 py-1 text-[11px] font-bold">
					{paused ? '▶ Resume Buffer' : '⏸ Freeze Buffer'}
				</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} variant="accent" testid="wire-sync-server-btn" onclick={handleRefreshServerSpine} className="px-2.5 py-1 text-[11px]">
					↻ Pull Server Spine
				</HudChamferButton>
			</div>
		</div>
	{/snippet}

	<div data-testid="wire-observatory-panel" class="grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono text-xs min-h-[340px]">
		<div class="lg:col-span-2 max-h-[360px] overflow-y-auto flex flex-col gap-1.5 pr-1">
			{#each visibleTraces as item (item.traceId)}
				<button
					type="button"
					data-testid={`wire-trace-row-${item.seq}`}
					onclick={() => (selectedSeq = item.seq)}
					class={`p-2 border text-left flex items-center justify-between gap-2 cursor-pointer ${selectedTrace?.seq === item.seq ? 'border-[var(--hud-accent-primary)] bg-[var(--hud-surface)]' : 'border-[var(--hud-border)] bg-[var(--hud-bg)]/80 hover:border-[var(--hud-accent-secondary)]'}`}
				>
					<div class="flex items-center gap-2 min-w-0">
						<span class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[10px] text-[var(--hud-accent-secondary)] shrink-0">{item.channel}</span>
						<span class="font-bold text-[var(--hud-text)] truncate">{item.intentKind}</span>
						<span class="text-[10px] text-[var(--hud-muted)] truncate hidden sm:inline">{item.stage}</span>
					</div>
					<div class="flex items-center gap-2 shrink-0 text-[10px] tabular-nums">
						<span class={item.status === 'OK' ? 'text-[var(--hud-nominal)]' : 'text-[var(--hud-danger)]'}>{item.status}</span>
						<span class="text-[var(--hud-accent-primary)]">{item.durationUs}µs</span>
					</div>
				</button>
			{/each}
		</div>

		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={true} className="p-3 flex flex-col justify-between gap-2 h-full">
			{#if selectedTrace}
				<div class="flex flex-col gap-1.5">
					<span class="text-[10px] font-bold uppercase tracking-wider text-[var(--hud-accent-primary)]">Trace Frame #{selectedTrace.seq} · {selectedTrace.traceId}</span>
					<div class="text-[11px] text-[var(--hud-text)] font-bold">{selectedTrace.summary}</div>
					<div class="grid grid-cols-2 gap-1 text-[10px] text-[var(--hud-muted)] border-y border-[var(--hud-border)] py-1.5">
						<span>Stage: <b class="text-[var(--hud-text)]">{selectedTrace.stage}</b></span>
						<span>Zone: <b class="text-[var(--hud-text)]">{selectedTrace.sourceZone}</b></span>
						<span>HLC: <b class="text-[var(--hud-text)]">{selectedTrace.hlc}</b></span>
						<span>Latency: <b class="text-[var(--hud-nominal)]">{selectedTrace.durationUs}µs</b></span>
					</div>
					<span class="text-[10px] text-[var(--hud-muted)] uppercase">Redacted Payload Preview</span>
					<pre data-testid="wire-trace-payload" class="p-2 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[10px] text-[var(--hud-accent-secondary)] overflow-x-auto whitespace-pre-wrap">{selectedTrace.payloadPreview}</pre>
				</div>
			{/if}
		</HudChamferFrame>
	</div>

	{#snippet footer()}
		<HudModalFooter metaText={`Ring Buffer: ${visibleTraces.length}/256 frames · Topic: ws:wire:observe · Status: ${paused ? 'PAUSED' : 'LIVE'}`}>
			{#snippet actions()}
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} variant="brass" onclick={onClose} className="px-3.5 py-1 text-xs">Close Observatory</HudChamferButton>
			{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
