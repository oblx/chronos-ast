<!--
	@author Oblx <code@oblx.dev>
	@description Detailed AST entity card showing Halstead, LCOM4 cohesion, and coupling specifications.
-->
<script lang="ts">
	import { HUD_CONFIG } from '@config/constants';
	import { type GraphEntityNode, formatBytes, formatScaledRatio } from '@client/state';
	import HudMathFormula from '@client/components/atoms/HudMathFormula.svelte';

	interface Props {
		entity: GraphEntityNode;
		lcomScore: number;
		sourceByteLength?: number;
	}

	let { entity, lcomScore, sourceByteLength = 0 }: Props = $props();
	let showFormulae = $state<boolean>(false);

	let instabilityFormatted = $derived(
		formatScaledRatio(entity.instability, HUD_CONFIG.PRECISION_SCALE)
	);
	let formattedSourceSize = $derived(formatBytes(sourceByteLength));
</script>

<section
	aria-label="Selected Entity Metamodel Specification"
	class="border border-[var(--hud-border)] bg-[var(--hud-bg)] p-3.5 flex flex-col gap-2.5 font-mono text-[var(--hud-text)]"
>
	<div class="flex items-start justify-between gap-2 border-b border-[var(--hud-border)] pb-2">
		<div class="min-w-0">
			<div class="text-[11px] text-[var(--hud-accent)]">{entity.kind} · {formattedSourceSize}</div>
			<h2 class="text-sm font-semibold truncate" data-hud-tip={entity.qualifiedName}>{entity.name}</h2>
		</div>
		<span class="text-[11px] text-[var(--hud-muted)] tabular-nums shrink-0">ID #{entity.id}</span>
	</div>

	<dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs tabular-nums">
		<div>
			<dt class="text-[11px] text-[var(--hud-muted)]">Halstead Volume</dt>
			<dd class="font-semibold">{entity.halsteadVolume} bits</dd>
		</div>
		<div>
			<dt class="text-[11px] text-[var(--hud-muted)]">Cohesion (LCOM4)</dt>
			<dd class="font-semibold">{lcomScore} comp</dd>
		</div>
		<div>
			<dt class="text-[11px] text-[var(--hud-muted)]">Afferent (Ca)</dt>
			<dd class="text-[var(--hud-nominal)] font-semibold">{entity.afferentCoupling} callers</dd>
		</div>
		<div>
			<dt class="text-[11px] text-[var(--hud-muted)]">Efferent (Ce)</dt>
			<dd class="text-[var(--hud-accent)] font-semibold">{entity.efferentCoupling} targets</dd>
		</div>
	</dl>

	<div class="pt-1 border-t border-[var(--hud-border)] flex items-center justify-between text-[11px] text-[var(--hud-muted)]">
		<span class="truncate" data-hud-tip={entity.uuid}>UUID: {entity.uuid}</span>
		<div class="flex items-center gap-2 shrink-0">
			<span class="text-[var(--hud-text)]">I = {instabilityFormatted}</span>
			<button type="button" onclick={() => (showFormulae = !showFormulae)} class="px-1 border border-[var(--hud-border)] text-[var(--hud-accent-primary)] cursor-pointer">{showFormulae ? 'Hide f(x)' : 'f(x)'}</button>
		</div>
	</div>
	{#if showFormulae}
		<div class="border-t border-[var(--hud-border)] pt-1.5 flex flex-col gap-1 text-[11px] text-[var(--hud-muted)]">
			<div class="flex items-center justify-between"><span>Halstead:</span><HudMathFormula formula={'V = (N_1 + N_2) \\cdot \\log_2(\\eta_1 + \\eta_2)'} /></div>
			<div class="flex items-center justify-between"><span>Instability:</span><HudMathFormula formula={'I = \\frac{C_e}{C_a + C_e}'} /></div>
		</div>
	{/if}
</section>
