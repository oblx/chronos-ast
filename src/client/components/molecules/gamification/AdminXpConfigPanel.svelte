<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.2 Admin RBAC Dynamic DAG Event XP Matrix & Cooldown Configurator.
-->
<script lang="ts">
	import { ShieldAlert, Search, Save, Check } from 'lucide-svelte';
	import { INITIAL_DAG_XP_RULES, type GamificationXpRuleSpec } from '@config/gamification/gamification.registry';
	import { defaultGamificationInterceptor } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	let searchQuery = $state('');
	let savedSuccess = $state(false);
	const loadedRules = defaultGamificationInterceptor.getAllRules();
	let rules = $state<GamificationXpRuleSpec[]>(loadedRules.length > 0 ? [...loadedRules] : [...INITIAL_DAG_XP_RULES]);

	let filteredRules = $derived(
		searchQuery.trim() === ''
			? rules
			: rules.filter((r) => r.eventKind.toLowerCase().includes(searchQuery.toLowerCase()) || r.label.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function updateRuleField(index: number, field: keyof GamificationXpRuleSpec, value: unknown): void {
		const next = [...rules];
		next[index] = { ...next[index], [field]: value } as GamificationXpRuleSpec;
		rules = next;
	}

	function saveAllRules(): void {
		for (const r of rules) {
			defaultGamificationInterceptor.updateRule(r);
		}
		savedSuccess = true;
		setTimeout(() => { savedSuccess = false; }, 2500);
	}
</script>

<div class="p-3.5 border border-[var(--hud-border)] bg-[var(--hud-panel)] flex flex-col gap-3 font-mono text-[13px]">
	<div class="flex items-center justify-between gap-3 border-b border-[var(--hud-border)] pb-2.5">
		<div class="flex items-center gap-2">
			<ShieldAlert size={15} class="text-[var(--hud-accent-secondary)]" />
			<span class="text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)]">Dynamic DAG Event XP Configurator (RBAC Admin)</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="relative flex items-center">
				<Search size={12} class="absolute left-2 text-[var(--hud-muted)]" />
				<input type="text" bind:value={searchQuery} placeholder="Filter event kind..." class="bg-[var(--hud-bg)] border border-[var(--hud-border)] pl-6 pr-2 py-0.5 text-xs text-[var(--hud-text)] w-44" />
			</div>
			<HudChamferButton variant="accent" onclick={saveAllRules} className="px-2.5 py-1 text-xs">
				{#if savedSuccess}<Check size={12} /> Saved!{:else}<Save size={12} /> Save Matrix{/if}
			</HudChamferButton>
		</div>
	</div>

	<div class="overflow-x-auto max-h-64 overflow-y-auto border border-[var(--hud-border)]">
		<table class="w-full text-left text-xs border-collapse">
			<thead class="bg-[var(--hud-bg)] text-[var(--hud-muted)] uppercase tracking-wider sticky top-0 border-b border-[var(--hud-border)]">
				<tr>
					<th class="p-2">Event Kind</th>
					<th class="p-2">Category</th>
					<th class="p-2 w-20">Base XP</th>
					<th class="p-2 w-20">Cooldown</th>
					<th class="p-2 w-20">Daily Cap</th>
					<th class="p-2 w-16 text-center">Active</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-[var(--hud-border)]">
				{#each filteredRules as rule, i}
					<tr class="hover:bg-[var(--hud-surface)]/50">
						<td class="p-2">
							<div class="font-bold text-[var(--hud-text-primary)] text-[11px]">{rule.eventKind}</div>
							<span class="text-[10px] text-[var(--hud-muted)]">{rule.label}</span>
						</td>
						<td class="p-2 text-[10px] text-[var(--hud-accent-secondary)]">{rule.category}</td>
						<td class="p-2">
							<input type="number" min="0" max="1000" value={rule.baseXp} onchange={(e) => updateRuleField(i, 'baseXp', Number((e.target as HTMLInputElement).value))} class="w-16 bg-[var(--hud-bg)] border border-[var(--hud-border)] px-1.5 py-0.5 text-xs text-right text-[var(--hud-text-primary)]" />
						</td>
						<td class="p-2">
							<input type="number" min="0" max="300" value={rule.cooldownSec} onchange={(e) => updateRuleField(i, 'cooldownSec', Number((e.target as HTMLInputElement).value))} class="w-16 bg-[var(--hud-bg)] border border-[var(--hud-border)] px-1.5 py-0.5 text-xs text-right text-[var(--hud-text-primary)]" />
						</td>
						<td class="p-2">
							<input type="number" min="1" max="500" value={rule.dailyCapCount} onchange={(e) => updateRuleField(i, 'dailyCapCount', Number((e.target as HTMLInputElement).value))} class="w-16 bg-[var(--hud-bg)] border border-[var(--hud-border)] px-1.5 py-0.5 text-xs text-right text-[var(--hud-text-primary)]" />
						</td>
						<td class="p-2 text-center">
							<input type="checkbox" checked={rule.enabled} onchange={(e) => updateRuleField(i, 'enabled', (e.target as HTMLInputElement).checked)} class="accent-[var(--hud-accent-primary)] cursor-pointer" />
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
