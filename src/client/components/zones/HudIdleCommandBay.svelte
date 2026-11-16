<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.0.2 Idle No-Workspace-Open Command Bay rendered inside Zone 09 WORLD_CANVAS with 3-pass SVG vector chassis, shoulder chevrons, and >=11px typography.
-->
<script lang="ts">
	import { APP_METADATA } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { HULL_PROFILES, HUD_GLYPHS } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		statusBanner: string;
		onOpenIngest: () => void;
		onOpenPreset: () => Promise<void>;
		onIngestSampleZip: () => Promise<void>;
	}

	let { statusBanner, onOpenIngest, onOpenPreset, onIngestSampleZip }: Props = $props();
</script>

<HudChamferFrame
	profile={HULL_PROFILES.CHAMFER_OCTAGON}
	chevrons={true}
	patternOpacity={0.45}
	className="max-w-2xl w-full hud-z3-modal hud-starburst-rays p-7"
>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-3 font-mono">
			<span class="px-2 py-0.5 text-[11px] leading-4 font-bold bg-[var(--hud-accent-secondary)] text-[var(--hud-bg-base)] truncate max-w-full sm:max-w-[60%]" data-hud-tip={statusBanner}>{statusBanner}</span>
			<span class="text-xs leading-4 text-[var(--hud-accent-primary)] font-bold whitespace-nowrap shrink-0">{HUD_GLYPHS.BRAND_CREST} CHRONOS v{APP_METADATA.VERSION} // 11-ZONE HUD</span>
		</div>
		<h1 class="font-display text-3xl font-bold text-[var(--hud-text)]">Chronos Static Analysis Bay</h1>
		<p class="text-[13px] leading-5 text-[var(--hud-muted)]">Upload a codebase (.zip, folder, remote URL, JSON bundle) or open a preset multi-language corpus to illuminate the 11-zone forensic canvas.</p>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-mono">
			<button type="button" onclick={onOpenIngest} class="p-3 text-left hud-z1-entity border border-[var(--hud-accent-secondary)] text-xs font-bold text-[var(--hud-accent-secondary)] cursor-pointer hud-glint-trigger">[01] UPLOAD .ZIP / URL / JSON →</button>
			<button type="button" onclick={onOpenPreset} class="p-3 text-left hud-z1-entity border border-[var(--hud-nominal)] text-xs font-bold text-[var(--hud-nominal)] cursor-pointer hud-glint-trigger">[02] OPEN PRESET WORKSPACE →</button>
			<button type="button" onclick={onIngestSampleZip} class="p-3 text-left hud-z1-entity border border-[var(--hud-accent-primary)] text-xs text-[var(--hud-text)] cursor-pointer hud-hover-lift">[03] UNPACK SAMPLE ARCADE .ZIP →</button>
			<button type="button" onclick={() => hudWire.openModal(HUD_MODALS.SSOT_HELP_BOOK)} class="p-3 text-left hud-z1-entity border border-[var(--hud-warning)] text-xs font-bold text-[var(--hud-warning)] cursor-pointer hud-hover-lift">[04] OPEN ARCHITECT'S FIELD TOME (?) →</button>
		</div>
	</div>
</HudChamferFrame>
