<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.0 Sovereign Data Portability & Cryptographic Right-to-Erasure Panel (GDPR/CCPA Zero-Trust Controls).
-->
<script lang="ts">
	import { Download, Trash2, ShieldCheck } from 'lucide-svelte';
	import { API_ROUTES } from '@config/constants';
	import { CHAMFER_PROFILES } from '@config/hud.tokens';
	import { PRINCIPAL_KINDS } from '@config/security.constants';
	import { clientDagKernel, gamificationWire, hudWire, securityWire } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	let statusMessage = $state('');
	let confirmPurge = $state(false);
	let busy = $state(false);
	let isGuest = $derived(securityWire.principalKind === PRINCIPAL_KINDS.GUEST);

	async function handleExportArchive(): Promise<void> {
		busy = true;
		statusMessage = '';
		try {
			const res = await clientDagKernel.requestJson(API_ROUTES.PRIVACY_EXPORT, { method: 'GET', sourceZone: 'APP_MODAL', intentKind: 'PRIVACY_EXPORT_ARCHIVE' });
			if (res.ok) {
				const blob = new Blob([JSON.stringify(res.data, null, '\t')], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `chronos-sovereign-export-${securityWire.username}-${Date.now()}.json`;
				a.click();
				URL.revokeObjectURL(url);
				statusMessage = `Exported sovereign JSON archive for ${securityWire.username} (zero raw hashes/salts).`;
				hudWire.pushTicker('PRIVACY', 'Exported sovereign JSON data archive');
			}
		} finally {
			busy = false;
		}
	}

	function wipeLocalBrowserSandbox(): void {
		clientDagKernel.purgeBrowserStorage();
		gamificationWire.totalXp = 0;
		gamificationWire.cardLevels = {};
		gamificationWire.cardProgress = {};
	}

	async function handleErasure(): Promise<void> {
		if (!confirmPurge) {
			confirmPurge = true;
			statusMessage = 'Click confirm again to execute irreversible cryptographic erasure & local sandbox wipe.';
			return;
		}
		busy = true;
		try {
			const res = await clientDagKernel.requestJson(API_ROUTES.PRIVACY_ERASE, { method: 'DELETE', sourceZone: 'APP_MODAL', intentKind: 'PRIVACY_ERASE_ACCOUNT' });
			wipeLocalBrowserSandbox();
			if (res.ok) {
				await securityWire.logout();
				statusMessage = 'Cryptographic erasure complete: account & local sandbox wiped; audit chain preserved.';
				hudWire.pushTicker('PRIVACY', 'Executed cryptographic right-to-erasure & sandbox wipe');
			}
		} finally {
			confirmPurge = false;
			busy = false;
		}
	}
</script>

<div data-testid="privacy-sovereignty-panel" class="p-3 border border-[var(--hud-border)] bg-[var(--hud-bg)]/85 flex flex-col gap-2.5 font-mono text-xs">
	<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)]/70 pb-1.5">
		<span class="font-bold text-[var(--hud-accent-primary)] flex items-center gap-1.5">
			<ShieldCheck size={14} /> Sovereign Data Portability &amp; Right to Erasure
		</span>
		<span class="px-1.5 py-0.5 border border-[var(--hud-nominal)]/60 text-[10px] text-[var(--hud-nominal)]">HMAC-SHA256 ANON</span>
	</div>
	<p class="text-[11px] text-[var(--hud-muted)] m-0 leading-normal">
		Zero raw IPs, User-Agents, or unhashed tokens are stored. Export your portable JSON archive or execute cryptographic erasure at any time.
	</p>
	<div class="flex flex-wrap items-center justify-between gap-2 pt-0.5">
		<HudChamferButton
			chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT}
			cutPx={6}
			variant="accent"
			testid="privacy-export-archive-btn"
			disabled={busy}
			onclick={handleExportArchive}
			className="px-3 py-1.5 text-xs font-bold"
		>
			<Download size={13} /> Export Sovereign Data Archive (.JSON)
		</HudChamferButton>
		<HudChamferButton
			chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT}
			cutPx={6}
			variant="danger"
			testid="privacy-erase-sandbox-btn"
			disabled={busy}
			onclick={handleErasure}
			className="px-3 py-1.5 text-xs font-bold"
		>
			<Trash2 size={13} />
			{confirmPurge ? 'Confirm Irreversible Purge' : isGuest ? 'Wipe Local Browser Sandbox' : 'Cryptographic Account & Sandbox Purge'}
		</HudChamferButton>
	</div>
	{#if statusMessage}
		<div role="status" data-testid="privacy-sovereignty-status" class="px-2.5 py-1.5 border border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-[11px] text-[var(--hud-text)]">
			{statusMessage}
		</div>
	{/if}
</div>
