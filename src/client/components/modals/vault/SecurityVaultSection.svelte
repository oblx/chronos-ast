<!--
	@author Oblx <code@oblx.dev>
	@description Settings Tab 3 (RBAC, Vault & Audit): Sub-segmented switcher between u32 Capability Matrix, AEAD Vault, and HLC Audit Chain.
-->
<script lang="ts">
	import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-svelte';
	import { CAPABILITY_BITS, PRINCIPAL_KINDS, VAULT_PROVIDER_KINDS } from '@config/security.constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { hudWire, securityWire, validateClientForm } from '@client/state';
	import HudSubTabBar, { type HudSubTabItem } from '@client/components/molecules/HudSubTabBar.svelte';
	import HudAccordionSection from '@client/components/molecules/HudAccordionSection.svelte';
	import PrivacySovereigntyPanel from '@client/components/modals/lobby/PrivacySovereigntyPanel.svelte';
	import RbacBitMatrix from '../lobby/RbacBitMatrix.svelte';

	interface Props { workspaceIds: readonly string[]; }
	let { workspaceIds }: Props = $props();
	type SecSubTab = 'RBAC_PAT' | 'AEAD_VAULT' | 'HLC_AUDIT';
	let activeSecTab = $state<SecSubTab>('RBAC_PAT');
	let patLabel = $state('ci-agent'), patScopeMask = $state<number>(securityWire.effectiveMask);
	let vaultLabel = $state(''), vaultProvider = $state<string>(VAULT_PROVIDER_KINDS.GITHUB_PAT), vaultSecret = $state(''), vaultError = $state(''), shakeVault = $state(false);
	let canWriteVault = $derived(securityWire.can(CAPABILITY_BITS.VAULT_SECRET_WRITE));
	let canLockdown = $derived(securityWire.can(CAPABILITY_BITS.SYSTEM_LOCKDOWN));

	const secTabs: readonly HudSubTabItem[] = [
		{ id: 'RBAC_PAT', label: 'u32 Capability Matrix & PAT', badge: '32 BITS' },
		{ id: 'AEAD_VAULT', label: 'AEAD Secrets Vault', badge: 'AES-256-GCM' },
		{ id: 'HLC_AUDIT', label: 'HLC Sync, Audit & Privacy', badge: 'SHA-256' },
	];

	function togglePatBit(bitMask: number): void { patScopeMask = ((patScopeMask >>> 0) ^ (bitMask >>> 0)) >>> 0; }
	async function handleSealSecret(): Promise<void> {
		vaultError = '';
		const v = validateClientForm('VAULT_SECRET', { label: vaultLabel, plaintextSecret: vaultSecret });
		if (!v.valid) { vaultError = v.error; shakeVault = true; setTimeout(() => (shakeVault = false), 300); return; }
		await securityWire.storeVaultSecret(vaultLabel, vaultProvider, vaultSecret);
		vaultSecret = ''; vaultLabel = '';
	}
</script>

<div class="flex flex-col gap-3 font-mono text-xs">
	<div class="flex items-center justify-between gap-2 pb-2 border-b border-[var(--hud-border)]">
		<HudSubTabBar tabs={secTabs} activeTabId={activeSecTab} ariaLabel="Security Subsections" onSelect={(id) => (activeSecTab = id as SecSubTab)} />
		<button type="button" onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)} class="px-2.5 py-1 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] text-[11px] font-bold cursor-pointer shrink-0">
			Open Identity Lobby ({securityWire.username})
		</button>
	</div>

	{#if activeSecTab === 'RBAC_PAT'}
		<div class="grid grid-cols-1 md:grid-cols-[61.8fr_38.2fr] gap-4">
			<div class="p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70"><RbacBitMatrix mask={patScopeMask} interactive={true} onToggleBit={togglePatBit} /></div>
			<div class="flex flex-col gap-2.5">
				<HudAccordionSection title="Mint Scoped PAT Token" badge="PAT" defaultOpen={true}>
					<input type="text" bind:value={patLabel} placeholder="PAT label (e.g. ci-agent)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
					{#if securityWire.principalKind !== PRINCIPAL_KINDS.GUEST}
						<button type="button" onclick={() => securityWire.mintPat(patLabel, patScopeMask)} class="px-3 py-1.5 border border-[var(--hud-accent-secondary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold cursor-pointer flex items-center justify-center gap-1.5">
							<KeyRound size={12} /> Mint Scoped PAT
						</button>
					{/if}
					{#if securityWire.lastMintedPat}
						<div class="p-2 border border-[var(--hud-warning)] bg-[var(--hud-bg)] text-[11px] break-all flex items-center justify-between gap-2">
							<span class="text-[var(--hud-nominal)]">{securityWire.lastMintedPat}</span>
							<button type="button" onclick={() => (securityWire.lastMintedPat = '')} class="underline text-[var(--hud-muted)] cursor-pointer shrink-0">Hide</button>
						</div>
					{/if}
				</HudAccordionSection>
			</div>
		</div>
	{:else if activeSecTab === 'AEAD_VAULT'}
		<div class={`grid grid-cols-1 ${canWriteVault ? 'md:grid-cols-[50fr_50fr]' : ''} gap-4`}>
			<div class="p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col gap-2">
				<div class="text-xs font-bold text-[var(--hud-accent-primary)]">SEALED KEYS ({securityWire.vaultSecrets.length})</div>
				{#if securityWire.vaultSecrets.length === 0}
					<div class="text-[11px] text-[var(--hud-muted)] py-3">Zero sealed secrets in vault. Plaintext is never returned after encryption.</div>
				{:else}
					{#each securityWire.vaultSecrets as sec (sec.secretId)}
						<div class="px-2.5 py-1.5 border border-[var(--hud-border)] bg-[var(--hud-bg)] flex items-center justify-between text-xs">
							<span class="truncate">{sec.label} <strong class="text-[var(--hud-nominal)]">*{sec.lastFourChars}</strong> v{sec.keyVersion}</span>
							{#if canWriteVault}<button type="button" onclick={() => securityWire.deleteVaultSecret(sec.secretId)} class="text-[var(--hud-danger)] text-[11px] cursor-pointer">Del</button>{/if}
						</div>
					{/each}
				{/if}
			</div>
			{#if canWriteVault}
				<div class={shakeVault ? 'hud-form-shake' : ''}>
					<HudAccordionSection title="+ Seal New Secret (AES-256-GCM)" badge="WRITE-ONLY" defaultOpen={true}>
						<input type="text" bind:value={vaultLabel} placeholder="Secret label (e.g. GitHub Mirror)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
						<select aria-label="Vault Provider Kind" bind:value={vaultProvider} class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]">
							{#each Object.values(VAULT_PROVIDER_KINDS) as kind (kind)}<option value={kind}>{kind}</option>{/each}
						</select>
						<input type="password" bind:value={vaultSecret} placeholder="Plaintext secret (write-only)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
						{#if vaultError}<div role="alert" class="px-2 py-1 border border-[var(--hud-danger)] text-[11px] text-[var(--hud-danger)]">{vaultError}</div>{/if}
						<button type="button" onclick={handleSealSecret} class="px-3 py-1.5 border border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold cursor-pointer flex items-center justify-center gap-1.5">
							<span>Seal Secret (AES-256-GCM)</span>
						</button>
					</HudAccordionSection>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			<div class={`grid grid-cols-1 ${canLockdown ? 'md:grid-cols-2' : ''} gap-4`}>
				<div class="p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col gap-2">
					<div class="flex items-center justify-between"><span>Sync Posture</span><span class="font-bold text-[var(--hud-nominal)]">{securityWire.syncPosture}</span></div>
					<div class="flex items-center justify-between">
						<span>Audit SHA-256 Chain</span>
						<span class={`flex items-center gap-1 font-bold ${securityWire.auditChainValid ? 'text-[var(--hud-nominal)]' : 'text-[var(--hud-danger)]'}`}>
							{#if securityWire.auditChainValid}<ShieldCheck size={12} />{:else}<ShieldAlert size={12} />{/if}
							{securityWire.auditChainValid ? `VALID (${securityWire.auditCount})` : 'BROKEN'}
						</span>
					</div>
					<div class="flex items-center justify-between"><span>HLC Queued Deltas ({workspaceIds.length} WS)</span><span class="text-[var(--hud-accent-primary)] font-bold">{securityWire.queuedOpsCount}</span></div>
					<button type="button" disabled={securityWire.queuedOpsCount === 0} onclick={() => securityWire.reconcileQueuedOps()} class="px-3 py-1.5 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] disabled:opacity-40 cursor-pointer">Reconcile HLC Queue</button>
				</div>
				{#if canLockdown}
					<HudAccordionSection title="Emergency SYSTEM_LOCKDOWN Trigger" badge="BIT 31" defaultOpen={false}>
						<button type="button" onclick={() => securityWire.toggleLockdown()} class={`px-3 py-2 border font-bold cursor-pointer flex items-center justify-center gap-1.5 ${securityWire.lockdownActive ? 'border-[var(--hud-danger)] text-[var(--hud-danger)]' : 'border-[var(--hud-warning)] text-[var(--hud-warning)]'}`}>
							<span>{securityWire.lockdownActive ? 'Disengage SYSTEM_LOCKDOWN' : 'Engage SYSTEM_LOCKDOWN'}</span>
						</button>
					</HudAccordionSection>
				{/if}
			</div>
			<PrivacySovereigntyPanel />
		</div>
	{/if}
</div>
