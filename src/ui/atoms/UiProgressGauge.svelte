<!--
	@author Oblx <code@oblx.dev>
	@description Threshold-aware progress & telemetry gauge atom for @chronos-ui/svelte.
-->
<script lang="ts">
	interface Props {
		label: string;
		value: number;
		thresholdWarning: number;
		thresholdCritical: number;
		unit?: string;
	}

	let {
		label,
		value,
		thresholdWarning,
		thresholdCritical,
		unit = '',
	}: Props = $props();

	let percentage = $derived(Math.min(100, Math.max(0, (value / (thresholdCritical * 1.25)) * 100)));
	let statusTone = $derived.by(() => {
		if (value >= thresholdCritical) return { bar: 'bg-[var(--hud-danger)]', text: 'text-[var(--hud-danger)]', badge: 'Critical' };
		if (value >= thresholdWarning) return { bar: 'bg-[var(--hud-warning)]', text: 'text-[var(--hud-warning)]', badge: 'Elevated' };
		return { bar: 'bg-[var(--hud-nominal)]', text: 'text-[var(--hud-nominal)]', badge: 'Nominal' };
	});
</script>

<div class="p-3 bg-[var(--hud-surface)]/80 border border-[var(--hud-border)] transition-colors">
	<div class="flex items-center justify-between mb-1.5">
		<span class="text-xs font-medium text-[var(--hud-muted)]">{label}</span>
		<div class="flex items-center gap-2">
			<span class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-[var(--hud-bg)] font-mono {statusTone.text}">
				{statusTone.badge}
			</span>
			<span class="text-sm font-mono font-bold {statusTone.text}">
				{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(3) : value}{unit}
			</span>
		</div>
	</div>
	<div class="w-full h-1.5 bg-[var(--hud-bg)] overflow-hidden">
		<div class="h-full transition-all duration-300 {statusTone.bar}" style="width: {percentage}%"></div>
	</div>
	<div class="flex justify-between mt-1 text-[10px] font-mono text-[var(--hud-muted)]">
		<span>0</span>
		<span>Warn: {thresholdWarning}</span>
		<span>Crit: {thresholdCritical}</span>
	</div>
</div>
