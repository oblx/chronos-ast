<!--
	@author Oblx <code@oblx.dev>
	@description Inline Source View CodeLens bar above declarations with direct Butterfly & CFG pivot triggers.
-->
<script lang="ts">
	import { HUD_VIEWS } from '@config/constants';
	import { type GraphEntityNode, hudWire } from '@client/state';

	interface Props {
		entity: GraphEntityNode;
		violationCount: number;
		onSelectEntity: (id: number) => void;
	}

	let { entity, violationCount, onSelectEntity }: Props = $props();
</script>

<div class="px-3 py-1 bg-[var(--hud-surface)]/80 border-y border-[var(--hud-border)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
	<span class="text-[var(--hud-accent-secondary)] truncate">
		◈ {entity.name} · v(G)={entity.cyclomatic} · V={entity.halsteadVolume} · {entity.afferentCoupling} Callers · {entity.efferentCoupling} Callees · {violationCount} Violations
	</span>
	<span class="flex items-center gap-1.5 shrink-0">
		<button type="button" onclick={() => { onSelectEntity(entity.id); hudWire.selectView(HUD_VIEWS.BUTTERFLY); }} class="px-1.5 py-0.5 border border-[var(--hud-accent-primary)]/70 text-[var(--hud-accent-primary)] cursor-pointer hover:bg-[var(--hud-bg)]">Open Butterfly</button>
		<button type="button" onclick={() => { onSelectEntity(entity.id); hudWire.selectView(HUD_VIEWS.CONTROL_FLOW); }} class="px-1.5 py-0.5 border border-[var(--hud-accent-secondary)]/70 text-[var(--hud-accent-secondary)] cursor-pointer hover:bg-[var(--hud-bg)]">Open CFG</button>
	</span>
</div>
