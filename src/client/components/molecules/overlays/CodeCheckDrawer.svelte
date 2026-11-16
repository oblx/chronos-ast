<!--
	@author Oblx <code@oblx.dev>
	@description Declarative CodeCheck governance drawer using SEVERITY_STYLE_MAP and >=11px typography.
-->
<script lang="ts">
	import { SEVERITY_STYLE_MAP } from '@config/hud.tokens';
	import { RULE_SEVERITIES } from '@config/registries/rules.registry';
	import type { CodeCheckViolation } from '@client/state';
	import HudMathFormula from '@client/components/atoms/HudMathFormula.svelte';

	interface Props {
		violations: readonly CodeCheckViolation[];
		suppressedCount?: number;
		useHisSafetyProfile?: boolean;
		onToggleHisProfile?: () => void;
		onImportSarifJson?: (rawSarifJson: string) => void;
		onSelectEntity: (entityId: number, line?: number) => void;
	}

	let { violations, suppressedCount = 0, useHisSafetyProfile = false, onToggleHisProfile, onImportSarifJson, onSelectEntity }: Props = $props();
	let isExpanded = $state<boolean>(false);
	let showRuleMath = $state<boolean>(false);
	let sarifInput = $state<string>('');

	let blockerCount = $derived(violations.filter((v) => v.severity === RULE_SEVERITIES.BLOCKER).length);
	let criticalCount = $derived(violations.filter((v) => v.severity === RULE_SEVERITIES.CRITICAL).length);

	function handleSarifSubmit(): void {
		if (!sarifInput.trim() || !onImportSarifJson) return;
		onImportSarifJson(sarifInput.trim());
		sarifInput = '';
	}
</script>

<section aria-label="CodeCheck Governance Violations" class="border border-[var(--hud-border)] bg-[var(--hud-panel)] font-mono text-xs">
	<button
		type="button"
		onclick={() => (isExpanded = !isExpanded)}
		class="w-full px-2.5 py-1.5 flex items-center justify-between text-left hover:bg-[var(--hud-surface)] cursor-pointer"
	>
		<span class="text-[11px] font-bold text-[var(--hud-accent)]">
			{isExpanded ? '▾' : '▸'} CODECHECK // ({violations.length})
		</span>
		<span class="text-[11px] tabular-nums">
			<strong class="text-[var(--hud-danger)]">{blockerCount} BLK</strong> · <strong class="text-[var(--hud-warning)]">{criticalCount} CRIT</strong>{#if suppressedCount > 0} · <span class="text-[var(--hud-nominal)]">{suppressedCount} SUPP</span>{/if}
		</span>
	</button>

	{#if isExpanded}
		<div class="p-1.5 border-t border-[var(--hud-border)] bg-[var(--hud-surface)] flex items-center justify-between gap-1 text-[11px]">
			<button type="button" onclick={onToggleHisProfile} class={`px-1.5 py-0.5 border cursor-pointer ${useHisSafetyProfile ? 'border-[var(--hud-accent)] text-[var(--hud-accent)] font-bold' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>
				PROFILE: {useHisSafetyProfile ? 'HIS_SAFETY' : 'STANDARD'}
			</button>
			<button type="button" onclick={() => (showRuleMath = !showRuleMath)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[var(--hud-accent-primary)] cursor-pointer">f(x)</button>
			{#if onImportSarifJson}
				<div class="flex items-center gap-1 flex-1 min-w-0">
					<input type="text" bind:value={sarifInput} placeholder="SARIF JSON..." class="min-w-0 flex-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] px-1 py-0.5 text-[11px] text-[var(--hud-text)]" />
					<button type="button" onclick={handleSarifSubmit} class="px-1.5 py-0.5 bg-[var(--hud-accent)] text-[var(--hud-bg-base)] font-bold cursor-pointer shrink-0">In</button>
				</div>
			{/if}
		</div>
		{#if showRuleMath}
			<div class="px-2 py-1.5 border-t border-[var(--hud-border)] bg-[var(--hud-bg)] text-[11px] text-[var(--hud-muted)] flex flex-col gap-0.5">
				<div class="flex justify-between"><span>CHR-001/002:</span><HudMathFormula formula="v(G) = E - N + 2P" /></div>
				<div class="flex justify-between"><span>CHR-013 Pain:</span><HudMathFormula formula="D = |A + I - 1| \ge 0.7" /></div>
			</div>
		{/if}
		<div class="max-h-40 overflow-y-auto divide-y divide-[var(--hud-border)] border-t border-[var(--hud-border)] bg-[var(--hud-bg)]">
			{#if violations.length === 0}
				<div class="p-2 text-[11px] text-[var(--hud-nominal)] text-center">All 15 CodeCheck governance rules nominal.</div>
			{:else}
				{#each violations as v, idx (`${v.ruleId}-${v.entityId}-${idx}`)}
					{@const sevStyle = SEVERITY_STYLE_MAP[v.severity] ?? SEVERITY_STYLE_MAP.WARNING!}
					<button
						type="button"
						onclick={() => onSelectEntity(v.entityId, v.line)}
						class="w-full p-2 text-left hover:bg-[var(--hud-surface)] flex flex-col gap-0.5 cursor-pointer"
					>
						<div class="flex items-center justify-between text-[11px]">
							<span class={`${sevStyle.textClass} font-bold`}>[{v.ruleId}] {v.entityName}</span>
							<span class="text-[var(--hud-muted)]">{v.sourceTool ?? v.severity}</span>
						</div>
						<div class="text-[11px] text-[var(--hud-text)] truncate">{v.message}</div>
						<div class="text-[11px] text-[var(--hud-muted)] truncate">{v.remediationHint}</div>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</section>
