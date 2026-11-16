<!--
	@author Oblx <code@oblx.dev>
	@description Calibrated telemetry gauge atom with threshold-driven status indicator.
-->
<script lang="ts">
	import { HUD_CONFIG } from '@config/constants';

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

	let statusColor = $derived.by(() => {
		if (value >= thresholdCritical) return 'var(--hud-danger)';
		if (value >= thresholdWarning) return 'var(--hud-warning)';
		return 'var(--hud-accent)';
	});

	let statusLabel = $derived.by(() => {
		if (value >= thresholdCritical) return 'Critical';
		if (value >= thresholdWarning) return 'Elevated';
		return 'Nominal';
	});

	let percentage = $derived(
		Math.min(
			HUD_CONFIG.PERCENTAGE_MAX,
			Math.max(HUD_CONFIG.PERCENTAGE_MIN, (value / thresholdCritical) * HUD_CONFIG.PERCENTAGE_MAX)
		)
	);
</script>

<div class="relative flex flex-col bg-[var(--hud-bg)] border border-[var(--hud-border)] p-3 font-mono tabular-nums text-[var(--hud-text)]">
	<div class="flex justify-between items-center text-[11px] text-[var(--hud-muted)] mb-1.5 gap-1.5">
		<span class="font-medium text-[var(--hud-text)] whitespace-nowrap">{label}</span>
		<div class="flex items-center gap-1.5 shrink-0">
			<span class="text-[11px]">{statusLabel}</span>
			<span class="font-semibold text-xs" style="color: {statusColor}">
				{typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(3) : value}{unit}
			</span>
		</div>
	</div>
	<div class="h-1.5 w-full bg-[var(--hud-surface)] overflow-hidden relative border border-[var(--hud-border)]">
		<div
			class="h-full transition-transform duration-200 origin-left"
			style="transform: scaleX({percentage / 100}); background-color: {statusColor};"
		></div>
	</div>
	<div class="flex justify-between text-[11px] text-[var(--hud-muted)] mt-1">
		<span>Warn: {thresholdWarning}{unit}</span>
		<span>Crit: {thresholdCritical}{unit}</span>
	</div>
</div>
