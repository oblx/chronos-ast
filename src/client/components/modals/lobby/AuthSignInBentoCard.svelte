<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Column-3 Verified Identity Bento Card: Operator Sign-In, OAuth2 PKCE, Passkey & Strict DEVMODE Quick-Switch.
-->
<script lang="ts">
	import { ShieldCheck, Fingerprint, Globe, Sparkles } from 'lucide-svelte';
	import { CHAMFER_PROFILES, HULL_PROFILES, SURFACE_PATTERN_IDS } from '@config/hud.tokens';
	import { AUTH_SOURCES, SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		username: string;
		password: string;
		onUsernameChange: (v: string) => void;
		onPasswordChange: (v: string) => void;
		onSignIn: () => void;
		onOAuthLogin: (provider: 'GITHUB' | 'GOOGLE') => void;
		onFillSeeded: () => void;
		onDevSwitch: (persona: string) => void;
	}

	let { username, password, onUsernameChange, onPasswordChange, onSignIn, onOAuthLogin, onFillSeeded, onDevSwitch }: Props = $props();

	const DEV_PERSONAS = [
		{ id: 'oblx', label: 'oblx (Admin)', v: 'accent' as const, tid: 'dev-switch-oblx' },
		{ id: 'analyst_dev', label: 'analyst', v: 'nominal' as const, tid: 'dev-switch-analyst' },
		{ id: 'auditor_dev', label: 'auditor', v: 'brass' as const, tid: 'dev-switch-auditor' },
		{ id: 'viewer_dev', label: 'viewer', v: 'default' as const, tid: 'dev-switch-viewer' },
		{ id: 'guest', label: 'guest', v: 'brass' as const, tid: 'dev-switch-guest' },
	];
</script>

<div class="relative h-full">
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={true} surfacePatternId={SURFACE_PATTERN_IDS.TOPOGRAPHIC_CONTOUR} patternOpacity={0.18} className="h-full" contentClassName="p-5 flex flex-col justify-between gap-2">
		<div class="flex flex-col gap-1.5 min-w-0">
			<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-1">
				<span class="text-[11px] font-mono font-bold tracking-wider text-[var(--hud-accent-primary)] uppercase flex items-center gap-1.5">
					<ShieldCheck size={14} /> Verified Identity
				</span>
				{#if securityWire.devMode && !securityWire.lockdownActive}
					<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={5} variant="brass" testid="fill-seeded-operator-btn" tip={`Fill seeded operator (${SEEDED_OPERATOR_CONFIG.USERNAME})`} onclick={onFillSeeded} className="px-2 py-0.5 text-[10.5px]">
						<Sparkles size={12} /> Fill {SEEDED_OPERATOR_CONFIG.USERNAME}
					</HudChamferButton>
				{/if}
			</div>
			<h3 class="font-display text-lg font-bold text-[var(--hud-text)] leading-tight">Operator Sign-In</h3>
			<div class="grid grid-cols-1 gap-1.5">
				<label class="flex flex-col gap-0.5 text-[11px] text-[var(--hud-muted)]">
					<span>Operator Username</span>
					<input type="text" value={username} oninput={(e) => onUsernameChange((e.currentTarget as HTMLInputElement).value)} placeholder="operator" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1 text-xs text-[var(--hud-text)] focus:border-[var(--hud-accent-primary)] focus:outline-none" />
				</label>
				<label class="flex flex-col gap-0.5 text-[11px] text-[var(--hud-muted)]">
					<span>Operator Passphrase</span>
					<input type="password" value={password} oninput={(e) => onPasswordChange((e.currentTarget as HTMLInputElement).value)} placeholder="••••••••" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1 text-xs text-[var(--hud-text)] focus:border-[var(--hud-accent-primary)] focus:outline-none" />
				</label>
			</div>
			<label class="flex items-center gap-2 text-[11px] text-[var(--hud-text)] cursor-pointer select-none">
				<input type="checkbox" data-testid="auth-remember-me-checkbox" bind:checked={securityWire.rememberMe} class="accent-[var(--hud-accent-primary)] w-3.5 h-3.5 cursor-pointer" />
				<span>Remember Me (30d auto-restore)</span>
			</label>
		</div>

		<div class="mt-auto pt-3 flex flex-col gap-1.5">
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={6} variant="accent" testid="auth-signin-submit" tip="Authenticate & unlock permitted HUD capabilities" onclick={onSignIn} className="w-full justify-center py-1.5 text-xs font-bold">
				Sign In &amp; Restore Session
			</HudChamferButton>
			<div class="grid grid-cols-3 gap-1.5">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="brass" testid="oauth-github-btn" tip="Sign in via GitHub OAuth2 PKCE" onclick={() => onOAuthLogin('GITHUB')} className="justify-center py-2 text-xs font-bold"><Globe size={12} /> GitHub</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="accent" testid="oauth-google-btn" tip="Sign in via Google OAuth2 PKCE" onclick={() => onOAuthLogin('GOOGLE')} className="justify-center py-2 text-xs font-bold"><Globe size={12} /> Google</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={5} tip="Initiate FIDO2 WebAuthn Passkey challenge" onclick={() => hudWire.pushTicker('PASSKEY', `Initiated ${AUTH_SOURCES.WEBAUTHN_PASSKEY} challenge`)} className="justify-center py-2 text-xs font-bold"><Fingerprint size={12} /> Passkey</HudChamferButton>
			</div>
			{#if securityWire.devMode}
				<div data-testid="devmode-quick-switch" class="pt-1 border-t border-[var(--hud-accent-secondary)]/40 flex flex-wrap items-center gap-1">
					{#each DEV_PERSONAS as p}
						<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} variant={p.v} testid={p.tid} tip={`DEVMODE quick switch → ${p.id}`} onclick={() => onDevSwitch(p.id)} className="px-1.5 py-0.5 text-[10px]">{p.label}</HudChamferButton>
					{/each}
				</div>
			{/if}
		</div>
	</HudChamferFrame>
</div>
