<!--
	@author Oblx <code@oblx.dev>
	@description Native MathML formula renderer backed by pure-TS compileLatexToMathml (zero external runtime math libraries).
-->
<script lang="ts">
	import { compileLatexToMathml } from '@client/state';

	interface Props {
		formula?: string;
		tex?: string;
		displayMode?: boolean;
		display?: boolean;
		className?: string;
	}

	let { formula = '', tex = '', displayMode = false, display = false, className = '' }: Props = $props();
	let activeFormula = $derived(formula || tex || '');
	let isBlock = $derived(displayMode || display);
	let mathmlHtml = $derived(compileLatexToMathml(activeFormula, isBlock));
</script>

{#if isBlock}
	<div
		class={`my-1.5 px-2.5 py-1.5 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[var(--hud-accent-primary)] overflow-x-auto text-center text-[13px] [&>math]:inline-block ${className}`}
		aria-label={`Formula: ${activeFormula}`}
	>
		{@html mathmlHtml}
	</div>
{:else}
	<span class={`inline-block align-baseline text-[var(--hud-accent-primary)] mx-0.5 ${className}`}>
		{@html mathmlHtml}
	</span>
{/if}
