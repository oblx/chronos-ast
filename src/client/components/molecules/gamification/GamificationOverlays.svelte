<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.2 Gamification Overlays: Spotlight Veil, Floating XP Spark Pills & Level-Up Celebration Banner.
-->
<script lang="ts">
	import { Trophy } from 'lucide-svelte';
	import { gamificationWire } from '@client/state/gamification.wire.svelte';
	import HudSpotlightVeil from '@client/components/molecules/overlays/HudSpotlightVeil.svelte';
</script>

<HudSpotlightVeil />

{#each gamificationWire.sparkPills as pill (pill.id)}
	<div
		class="fixed pointer-events-none z-50 px-2 py-0.5 rounded-full font-mono text-xs font-bold text-[var(--hud-bg-base)] bg-[var(--hud-accent-primary,#06b6d4)] shadow-[0_0_12px_rgba(6,182,212,0.8)] animate-bounce"
		style="left: {pill.x}px; top: {pill.y}px;"
	>
		+{pill.xp} XP
	</div>
{/each}

{#if gamificationWire.celebrationToast}
	<div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 border-2 border-[var(--hud-brass,#f59e0b)] bg-[var(--hud-panel,#0b1120)]/95 shadow-[0_0_25px_rgba(245,158,11,0.5)] backdrop-blur-md animate-pulse">
		<Trophy size={18} class="text-[var(--hud-brass,#f59e0b)]" />
		<div class="flex flex-col">
			<span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--hud-brass,#f59e0b)]">
				{gamificationWire.celebrationToast.cardTitle ? 'Achievement Unlocked' : 'Level Up'}
			</span>
			<span class="text-sm font-bold text-[var(--hud-text-primary)]">
				{gamificationWire.celebrationToast.message}
			</span>
		</div>
		<button
			type="button"
			class="text-xs font-mono text-[var(--hud-muted,#94a3b8)] hover:text-[var(--hud-text-primary)] ml-2 cursor-pointer"
			onclick={() => gamificationWire.dismissToast()}
		>
			[×]
		</button>
	</div>
{/if}
