<!--
	@author Oblx <code@oblx.dev>
	@description Static Virtual Debugger (Logic Path Stepper) toolbar for interactive CFG basic-block and call-edge stepping.
-->
<script lang="ts">
	import type { VirtualStepperState } from '@client/state';

	interface Props {
		stepper: VirtualStepperState;
		onStepOver: () => void;
		onStepInto: () => void;
		onStepReturn: () => void;
		onBacktrack: () => void;
		onChooseBranch: (branchIndex: number) => void;
		onReset: () => void;
	}

	let { stepper, onStepOver, onStepInto, onStepReturn, onBacktrack, onChooseBranch, onReset }: Props = $props();
	let varEntries = $derived(Object.entries(stepper.variableBindings));
</script>

<div class="px-3 py-1.5 border-b border-[var(--hud-border)] bg-[var(--hud-surface)] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] shrink-0">
	<div class="flex items-center gap-1.5">
		<span class="text-[var(--hud-accent)] font-bold">VIRTUAL DEBUGGER:</span>
		<span class="px-1.5 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-nominal)]">
			B{stepper.currentBlockId} @L{stepper.currentLine} · Stack:{stepper.callStack.length} · Path:{stepper.visitedBlockPath.length}
		</span>
		<button type="button" onclick={onStepOver} class="px-2 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-text)] hover:border-[var(--hud-accent)] cursor-pointer hud-tactile-bevel">Step Over</button>
		<button type="button" onclick={onStepInto} class="px-2 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-accent)] hover:border-[var(--hud-accent)] cursor-pointer hud-tactile-bevel">Step Into</button>
		<button type="button" onclick={onStepReturn} class="px-2 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-text)] cursor-pointer hud-tactile-bevel">Step Return</button>
		<button type="button" onclick={onBacktrack} class="px-2 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-warning)] cursor-pointer hud-tactile-bevel">Backtrack</button>
		<button type="button" onclick={() => onChooseBranch(0)} class="px-1.5 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-nominal)] text-[var(--hud-nominal)] cursor-pointer">Br:True</button>
		<button type="button" onclick={() => onChooseBranch(1)} class="px-1.5 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-danger)] text-[var(--hud-danger)] cursor-pointer">Br:False</button>
		<button type="button" onclick={onReset} class="px-1.5 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-muted)] cursor-pointer">Reset</button>
	</div>

	<div class="flex items-center gap-1.5 truncate max-w-xs">
		<span class="text-[var(--hud-muted)]">Vars:</span>
		{#if varEntries.length === 0}
			<span class="text-[var(--hud-muted)]">none</span>
		{:else}
			{#each varEntries.slice(0, 3) as [k, v] (k)}
				<span class="px-1 py-0.5 bg-[var(--hud-panel)] border border-[var(--hud-border)] text-[var(--hud-nominal)]">{k}{v}</span>
			{/each}
		{/if}
	</div>
</div>
