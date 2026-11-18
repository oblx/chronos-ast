<!--
	@author Oblx <code@oblx.dev>
	@description Settings Tab 3 (RBAC, Vault & Privacy): Horizontal Bento Deck switcher for u32 Capability Matrix, AEAD Vault, and HLC Audit/Privacy.
-->
<script lang="ts">
	import { ShieldCheck, ShieldAlert, KeyRound } from 'lucide-svelte';
	import { CAPABILITY_BITS, PRINCIPAL_KINDS, VAULT_PROVIDER_KINDS } from '@config/security.constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { HUD_INTENT_KINDS } from '@config/hud.tokens';
	import { UiHorizontalDeck } from '@ui';
	import { hudWire, securityWire, validateClientForm } from '@client/state';
	import HudSubTabBar, { type HudSubTabItem } from '@client/components/molecules/HudSubTabBar.svelte';
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

	function selectSecTab(tabId: string): void {
		activeSecTab = tabId as SecSubTab;
		hudWire.emitUiIntent(HUD_INTENT_KINDS.UI_TAB_SWITCH, 'APP_MODAL', { modal: 'SETTINGS_SECURITY', tab: activeSecTab });
	}
	function togglePatBit(bitMask: number): void { patScopeMask = ((patScopeMask >>> 0) ^ (bitMask >>> 0)) >>> 0; }
	async function handleSealSecret(): Promise<void> {
		vaultError = '';
		const v = validateClientForm('VAULT_SECRET', { label: vaultLabel, plaintextSecret: vaultSecret });
		if (!v.valid) { vaultError = v.error; shakeVault = true; setTimeout(() => (shakeVault = false), 300); return; }
		await securityWire.storeVaultSecret(vaultLabel, vaultProvider, vaultSecret);
		vaultSecret = ''; vaultLabel = '';
	}
</script>

<div class="flex flex-col gap-2.5 font-mono text-xs">
	<div class="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--hud-border)]">
		<HudSubTabBar tabs={secTabs} activeTabId={activeSecTab} ariaLabel="Security Subsections" onSelect={selectSecTab} />
		<button type="button" onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)} class="px-2.5 py-1 border border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)] text-[11px] font-bold cursor-pointer shrink-0">
			Open Identity Lobby ({securityWire.username})
		</button>
	</div>

	<UiHorizontalDeck testid="settings-security-deck" ariaLabel="Security and Privacy Bento Cards" showSteppers={false} className="items-stretch">
		{#if activeSecTab === 'RBAC_PAT'}
			<div class="shrink-0 w-[33rem] h-[19rem] snap-start p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col justify-center">
				<RbacBitMatrix mask={patScopeMask} interactive={true} onToggleBit={togglePatBit} />
			</div>
			<div class="shrink-0 w-[21rem] h-[19rem] snap-start p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col justify-between gap-2">
				<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
					<span class="font-bold text-[var(--hud-accent-secondary)]">Mint Scoped PAT Token</span>
					<span class="text-[10px] text-[var(--hud-muted)]">PAT</span>
				</div>
				<div class="flex flex-col gap-2 flex-1 justify-center">
					<input type="text" bind:value={patLabel} placeholder="PAT label (e.g. ci-agent)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
					{#if securityWire.principalKind !== PRINCIPAL_KINDS.GUEST}
						<button type="button" onclick={() => securityWire.mintPat(patLabel, patScopeMask)} class="px-3 py-1.5 border border-[var(--hud-accent-secondary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold cursor-pointer flex items-center justify-center gap-1.5">
							<KeyRound size={12} /> Mint Scoped PAT
						</button>
					{:else}
						<p class="text-[11px] text-[var(--hud-muted)]">Authenticate in Identity Lobby to mint scoped PAT credentials.</p>
					{/if}
					{#if securityWire.lastMintedPat}
						<div class="p-2 border border-[var(--hud-warning)] bg-[var(--hud-bg)] text-[11px] break-all flex items-center justify-between gap-2">
							<span class="text-[var(--hud-nominal)]">{securityWire.lastMintedPat}</span>
							<button type="button" onclick={() => (securityWire.lastMintedPat = '')} class="underline text-[var(--hud-muted)] cursor-pointer shrink-0">Hide</button>
						</div>
					{/if}
				</div>
			</div>
		{:else if activeSecTab === 'AEAD_VAULT'}
			<div class="shrink-0 w-[26rem] h-[19rem] snap-start p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col gap-2 overflow-y-auto">
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
				<div class={`shrink-0 w-[26rem] h-[19rem] snap-start p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col justify-between gap-2 ${shakeVault ? 'hud-form-shake' : ''}`}>
					<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
						<span class="font-bold text-[var(--hud-accent-secondary)]">+ Seal New Secret (AES-256-GCM)</span>
						<span class="text-[10px] text-[var(--hud-muted)]">WRITE-ONLY</span>
					</div>
					<input type="text" bind:value={vaultLabel} placeholder="Secret label (e.g. GitHub Mirror)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
					<select aria-label="Vault Provider Kind" bind:value={vaultProvider} class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]">
						{#each Object.values(VAULT_PROVIDER_KINDS) as kind (kind)}<option value={kind}>{kind}</option>{/each}
					</select>
					<input type="password" bind:value={vaultSecret} placeholder="Plaintext secret (write-only)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-xs text-[var(--hud-text)]" />
					{#if vaultError}<div role="alert" class="px-2 py-1 border border-[var(--hud-danger)] text-[11px] text-[var(--hud-danger)]">{vaultError}</div>{/if}
					<button type="button" onclick={handleSealSecret} class="px-3 py-1.5 border border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] font-bold cursor-pointer">Seal Secret (AES-256-GCM)</button>
				</div>
			{/if}
		{:else}
			<div class="shrink-0 w-[22rem] h-[19rem] snap-start p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col justify-between gap-2">
				<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
					<span class="font-bold text-[var(--hud-accent-secondary)]">HLC Sync &amp; Audit</span>
					<span class="text-[10px] text-[var(--hud-nominal)]">{securityWire.syncPosture}</span>
				</div>
				<div class="flex flex-col gap-2">
					<div class="flex items-center justify-between"><span>Audit SHA-256 Chain</span><span class={`flex items-center gap-1 font-bold ${securityWire.auditChainValid ? 'text-[var(--hud-nominal)]' : 'text-[var(--hud-danger)]'}`}>{#if securityWire.auditChainValid}<ShieldCheck size={12} />{:else}<ShieldAlert size={12} />{/if}{securityWire.auditChainValid ? `VALID (${securityWire.auditRowCount})` : 'BROKEN'}</span></div>
					<div class="flex items-center justify-between"><span>HLC Queued ({workspaceIds.length} WS)</span><span class="text-[var(--hud-accent-primary)] font-bold">{securityWire.queuedOpsCount}</span></div>
				</div>
				<button type="button" disabled={securityWire.queuedOpsCount === 0} onclick={() => securityWire.reconcileOfflineSync()} class="px-3 py-1.5 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-text)] disabled:opacity-40 cursor-pointer">Reconcile HLC Queue</button>
			</div>
			<div class="shrink-0 w-[27rem] h-[19rem] snap-start flex flex-col justify-center">
				<PrivacySovereigntyPanel />
			</div>
			{#if canLockdown}
				<div class="shrink-0 w-[18rem] h-[19rem] snap-start p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/70 flex flex-col justify-between gap-2">
					<span class="font-bold text-[var(--hud-warning)]">Emergency Lockdown (BIT 31)</span>
					<p class="text-[11px] text-[var(--hud-muted)]">Suspend all non-owner write paths and seal external sync channels.</p>
					<button type="button" onclick={() => securityWire.toggleSystemLockdown(!securityWire.lockdownActive)} class={`px-3 py-2 border font-bold cursor-pointer ${securityWire.lockdownActive ? 'border-[var(--hud-danger)] text-[var(--hud-danger)]' : 'border-[var(--hud-warning)] text-[var(--hud-warning)]'}`}>{securityWire.lockdownActive ? 'Disengage SYSTEM_LOCKDOWN' : 'Engage SYSTEM_LOCKDOWN'}</button>
				</div>
			{/if}
		{/if}
	</UiHorizontalDeck>
</div>
