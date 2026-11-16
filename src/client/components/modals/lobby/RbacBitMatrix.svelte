<!--
	@author Oblx <code@oblx.dev>
	@description Spacious 8x4 Interactive u32 RBAC Bit Matrix visualizer for CAPABILITY_REGISTER (bits 0..31) with >=11px labels and active bit legend.
-->
<script lang="ts">
	import { CAPABILITY_REGISTER, type CapabilityDescriptor } from '@config/security.constants';
	import { hasCapability, toMaskHex } from '@client/state';

	interface Props {
		mask: number;
		interactive?: boolean;
		onToggleBit?: (bitMask: number) => void;
	}

	let { mask, interactive = false, onToggleBit }: Props = $props();
	let activeCap = $state<CapabilityDescriptor>(CAPABILITY_REGISTER[0]!);
</script>

<div class="flex flex-col gap-2 font-mono">
	<div class="flex items-center justify-between text-[11px]">
		<span class="text-[var(--hud-accent-primary)] font-bold">u32 CAPABILITY BIT MATRIX (BITS 0..31)</span>
		<span class="px-1.5 py-0.5 border border-[var(--hud-accent-secondary)] bg-[var(--hud-bg)] text-[var(--hud-nominal)] font-bold tabular-nums">{toMaskHex(mask)}</span>
	</div>
	<div data-testid="rbac-bit-matrix" class="grid grid-cols-8 gap-1">
		{#each CAPABILITY_REGISTER as cap (cap.bit)}
			{@const enabled = hasCapability(mask, cap.mask)}
			<button
				type="button"
				disabled={!interactive}
				data-hud-tip={`b${cap.bit}: ${cap.key} (${toMaskHex(cap.mask)})`}
				onmouseenter={() => (activeCap = cap)}
				onfocus={() => (activeCap = cap)}
				onclick={() => { activeCap = cap; if (interactive) onToggleBit?.(cap.mask); }}
				class={`px-1 py-1.5 text-[11px] border flex flex-col items-center justify-center leading-tight transition-colors ${
					enabled
						? 'border-[var(--hud-nominal)] bg-[var(--hud-nominal)]/15 text-[var(--hud-text)] font-bold'
						: 'border-[var(--hud-border)] bg-[var(--hud-bg)]/70 text-[var(--hud-muted)] opacity-65'
				} ${interactive ? 'cursor-pointer hover:border-[var(--hud-accent-primary)]' : 'cursor-default'}`}
			>
				<span class={`w-1.5 h-1.5 mb-0.5 ${enabled ? 'bg-[var(--hud-nominal)]' : 'bg-[var(--hud-border)]'}`}></span>
				<span>b{cap.bit}</span>
			</button>
		{/each}
	</div>
	<div class="px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-bg)] flex items-center justify-between text-[11px]">
		<span class="text-[var(--hud-accent-secondary)] font-bold">b{activeCap.bit} · {activeCap.key}</span>
		<span class="text-[var(--hud-muted)] tabular-nums">{activeCap.label} · {toMaskHex(activeCap.mask)}</span>
	</div>
</div>
