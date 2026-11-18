<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Horizontal Bento Chronos Lobby: Unbroken Octagonal Shell, 3-Column Bento Deck, Strict DEVMODE Isolation & Brand Purity.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { KeyRound, LogOut } from 'lucide-svelte';
	import { APP_METADATA, LOBBY_ENGAGEMENT_LOCK_MS } from '@config/constants';
	import { AUTH_LOBBY_TITLE, CHAMFER_PROFILES, HUD_INTENT_KINDS } from '@config/hud.tokens';
	import { PRINCIPAL_KINDS, PRINCIPAL_POSTURE_META, SEEDED_OPERATOR_CONFIG, type PrincipalKind } from '@config/security.constants';
	import { hudWire, securityWire, validateClientForm } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudSubTabBar from '@client/components/molecules/HudSubTabBar.svelte';
	import AuthBentoMissionDeck from '@client/components/modals/lobby/AuthBentoMissionDeck.svelte';
	import AuthSignInBentoCard from '@client/components/modals/lobby/AuthSignInBentoCard.svelte';
	import PrivacySovereigntyPanel from '@client/components/modals/lobby/PrivacySovereigntyPanel.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props { isOpen: boolean; workspaceIds: readonly string[]; onClose: () => void; }
	let { isOpen, workspaceIds, onClose }: Props = $props();
	let activeTab = $state<string>('SIGN_IN'), username = $state<string>(''), password = $state<string>('');
	let promoteOnRegister = $state<boolean>(true), statusNote = $state<string>(''), shakeForm = $state(false);
	let lockRemainingMs = $state(LOBBY_ENGAGEMENT_LOCK_MS);
	let isLocked = $derived(lockRemainingMs > 0);
	let SUB_TABS = $derived([
		{ id: 'SIGN_IN', label: securityWire.devMode ? 'Lobby & Identity / DEVMODE' : 'Lobby & Identity', glyph: '◈' },
		{ id: 'REGISTER_PROMOTE', label: 'Register & Promote Guest', glyph: '⬡', badge: workspaceIds.length },
		{ id: 'SESSIONS_KEYS', label: 'Active Sessions & Privacy', glyph: '⌖', badge: securityWire.sessions.length },
	]);
	let posture = $derived(PRINCIPAL_POSTURE_META[(securityWire.principalKind as PrincipalKind) ?? PRINCIPAL_KINDS.GUEST] ?? PRINCIPAL_POSTURE_META.GUEST);
	let lobbySubtitle = $derived(
		securityWire.principalKind === PRINCIPAL_KINDS.GUEST
			? 'SOVEREIGN LOCAL SANDBOX · ZERO-TRUST ARCHITECTURE STUDIO'
			: `${posture.badgePrefix} · ${securityWire.username} · ${securityWire.roleId} · ${securityWire.maskHex()}`
	);

	onMount(() => {
		const interval = setInterval(() => { if (lockRemainingMs > 0) lockRemainingMs = Math.max(0, lockRemainingMs - 100); else clearInterval(interval); }, 100);
		return () => clearInterval(interval);
	});

	function triggerShake(): void { shakeForm = true; setTimeout(() => (shakeForm = false), 300); }
	function selectLobbyTab(id: string): void { activeTab = id; hudWire.emitUiIntent(HUD_INTENT_KINDS.UI_TAB_SWITCH, 'APP_MODAL', { modal: 'AUTH_LOBBY', tab: id }); }
	function fillSeededOperator(): void { username = SEEDED_OPERATOR_CONFIG.USERNAME; password = SEEDED_OPERATOR_CONFIG.DEFAULT_PASSWORD; statusNote = `Filled seeded operator (${SEEDED_OPERATOR_CONFIG.USERNAME})`; }
	async function handleSignIn(): Promise<void> {
		statusNote = ''; const v = validateClientForm('AUTH_LOGIN', { username, password });
		if (!v.valid) { securityWire.lastError = v.error; triggerShake(); return; }
		if (await securityWire.login(username, password, securityWire.rememberMe)) {
			hudWire.unfoldPermittedHudZones();
			onClose();
			if (workspaceIds.length > 0) void securityWire.promoteGuest(workspaceIds);
			statusNote = `Authenticated as ${securityWire.username} (${securityWire.roleId} · ${securityWire.maskHex()})`;
		} else triggerShake();
	}
	async function handleDevSwitch(persona: string): Promise<void> { statusNote = ''; if (await securityWire.devSwitchPersona(persona)) statusNote = `DEVMODE switched active persona → ${securityWire.username} (${securityWire.roleId} · ${securityWire.maskHex()})`; }
	async function handleOAuthLogin(provider: 'GITHUB' | 'GOOGLE'): Promise<void> { statusNote = ''; if (await securityWire.loginWithOAuthProvider(provider)) statusNote = `Linked ${provider} OAuth2 PKCE identity → ${securityWire.username} (${securityWire.maskHex()})`; }
	async function handleRegisterAndPromote(): Promise<void> {
		statusNote = ''; const v = validateClientForm('AUTH_REGISTER', { username, password });
		if (!v.valid) { securityWire.lastError = v.error; triggerShake(); return; }
		if (await securityWire.register(username, password) && promoteOnRegister && workspaceIds.length > 0) { const count = await securityWire.promoteGuest(workspaceIds); statusNote = `Registered ${securityWire.username} & promoted ${count} workspace(s).`; } else if (securityWire.lastError) triggerShake();
	}
</script>

<HudModalShell {isOpen} preventDismiss={isLocked} transitionKey={activeTab} ariaLabel={AUTH_LOBBY_TITLE} maxWidthClass="max-w-6xl" {onClose}>
	{#snippet header()}
		<HudModalHeader title={AUTH_LOBBY_TITLE} subtitle={lobbySubtitle} preventDismiss={isLocked} dismissRemainingMs={lockRemainingMs} {onClose}>
			{#snippet tabs()}<HudSubTabBar items={SUB_TABS} activeId={activeTab} ariaLabel="Auth Lobby Sub-Tabs" onSelect={selectLobbyTab} />{/snippet}
		</HudModalHeader>
	{/snippet}

	<div class={`flex-1 min-h-0 flex flex-col gap-3 font-mono text-[13px] leading-5 ${shakeForm ? 'hud-form-shake' : ''}`}>
		{#if activeTab === 'SIGN_IN'}
			<div data-testid="welcome-lobby-entry-paths" class="flex-1 min-h-0 flex flex-col justify-center">
				<AuthBentoMissionDeck onStartTour={() => hudWire.startInteractiveTour()} onSkipTour={() => hudWire.unfoldPermittedHudZones()}>
					{#snippet signInCard()}
						<AuthSignInBentoCard
							{username}
							{password}
							onUsernameChange={(v) => (username = v)}
							onPasswordChange={(v) => (password = v)}
							onSignIn={handleSignIn}
							onOAuthLogin={handleOAuthLogin}
							onFillSeeded={fillSeededOperator}
							onDevSwitch={handleDevSwitch}
						/>
					{/snippet}
				</AuthBentoMissionDeck>
			</div>
		{:else if activeTab === 'REGISTER_PROMOTE'}
			<div data-testid="welcome-lobby-entry-paths" class="p-4 border border-[var(--hud-border)] bg-[var(--hud-panel)] flex flex-col gap-3">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
					<input type="text" bind:value={username} placeholder="New operator username (>=3 chars)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-3 py-1.5 text-[13px] text-[var(--hud-text)]" />
					<input type="password" bind:value={password} placeholder="Strong password (>=8 chars)" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-3 py-1.5 text-[13px] text-[var(--hud-text)]" />
				</div>
				<label class="flex items-center gap-2 text-xs text-[var(--hud-text)] cursor-pointer"><input type="checkbox" bind:checked={promoteOnRegister} class="accent-[var(--hud-accent-primary)]" /><span>Automatically sign &amp; promote {workspaceIds.length} guest workspace(s)</span></label>
				<div class="flex items-center gap-2"><HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={6} variant="brass" tip="Create account and promote local workspaces" onclick={handleRegisterAndPromote} className="px-4 py-1.5 text-xs font-bold">Register &amp; Promote Guest</HudChamferButton></div>
			</div>
		{:else}
			<div data-testid="welcome-lobby-entry-paths" class="p-4 border border-[var(--hud-border)] bg-[var(--hud-panel)] flex flex-col gap-3 overflow-y-auto" data-hud-vscroll="true">
				<div class="grid grid-cols-3 gap-2 text-xs bg-[var(--hud-bg)] p-3 border border-[var(--hud-border)]">
					<div><span class="text-[var(--hud-muted)] block text-[11px]">Principal ID</span><strong data-testid="auth-principal-id" class="text-[var(--hud-text)]">{securityWire.uid} ({securityWire.username})</strong></div>
					<div><span class="text-[var(--hud-muted)] block text-[11px]">Active Role &amp; Mask</span><strong class="text-[var(--hud-accent-primary)]">{securityWire.roleId} · {securityWire.maskHex()}</strong></div>
					<div><span class="text-[var(--hud-muted)] block text-[11px]">Sync Posture</span><strong class="text-[var(--hud-nominal)]">{securityWire.syncPosture} ({securityWire.sessions.length} sess)</strong></div>
				</div>
				<div class="flex items-center justify-between pt-1">
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={6} testid="rotate-refresh-btn" tip="Rotate sliding refresh token family" disabled={securityWire.principalKind === PRINCIPAL_KINDS.GUEST} onclick={() => securityWire.refreshSession()} className="px-3 py-1.5 text-xs"><KeyRound size={13} /> Rotate Refresh Token</HudChamferButton>
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} variant="danger" testid="sign-out-btn" tip="Revoke active tokens & return to Guest Sandbox" disabled={securityWire.principalKind === PRINCIPAL_KINDS.GUEST} onclick={async () => { await securityWire.logout(); statusNote = 'Reverted to Demo Guest Sandbox.'; }} className="px-3 py-1.5 text-xs"><LogOut size={13} /> Sign Out / Revoke Session</HudChamferButton>
				</div>
				<PrivacySovereigntyPanel />
			</div>
		{/if}
		{#if statusNote}<div role="status" class="px-3 py-2 border border-[var(--hud-nominal)] bg-[var(--hud-surface)] text-xs text-[var(--hud-nominal)] shrink-0">{statusNote}</div>{/if}
		{#if securityWire.lastError}<div role="alert" class="px-3 py-2 border border-[var(--hud-danger)] bg-[var(--hud-surface)] text-xs text-[var(--hud-danger)] shrink-0">{securityWire.lastError}</div>{/if}
	</div>

	{#snippet footer()}
		<HudModalFooter metaText={`${APP_METADATA.NAME} v${APP_METADATA.VERSION} · Zero-Trust AEAD & Chronos u32 Capability Engine`} />
	{/snippet}
</HudModalShell>
