<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Social Hub Column 1: Active Squad Cluster 2-8 Seat Visual Matrix, Cursor Follow & Token Copy.
-->
<script lang="ts">
	import { Copy, Check, Crosshair, Zap } from 'lucide-svelte';
	import { CHAMFER_PROFILES, COLLAB_CURSOR_PALETTE, HULL_PROFILES } from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import { wsClient } from '@client/state/ws.client.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		canOverride: boolean;
		onExecuteOverride: (action: string, targetUid: number, scope: 'WORKSPACE' | 'FULL_APP') => void;
	}

	let { canOverride, onExecuteOverride }: Props = $props();
	let copied = $state(false);
	let totalSlots = $derived(Math.max(2, Math.min(8, wsClient.seatCap)));
	let seatSlots = $derived(
		Array.from({ length: totalSlots }, (_, idx) => {
			if (wsClient.roster.length === 0 && idx === 0) {
				return { clientId: wsClient.clientId, uid: securityWire.uid, username: securityWire.username, roleId: securityWire.roleId, scopeKind: wsClient.activeScope, activeProjection: hudWire.activeView, isLocal: true, isSyntheticLocal: true };
			}
			const peer = wsClient.roster[idx];
			return peer ? { ...peer, isLocal: peer.clientId === wsClient.clientId, isSyntheticLocal: false } : null;
		})
	);

	async function copyClusterToken(): Promise<void> {
		const token = wsClient.clusterId || 'cluster-1';
		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(token);
			copied = true;
			wsClient.pushCollabEvent('SESSION', `Copied squad token: ${token}`);
			setTimeout(() => (copied = false), 1800);
		} catch { /* ignore clipboard denial */ }
	}
</script>

<div id="collab-col-squad" class="relative overflow-hidden min-w-[300px] lg:min-w-0 lg:flex-1 h-[360px] snap-start">
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} patternOpacity={0.14} className="p-3.5 h-full flex flex-col justify-between gap-2.5">
		<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-2 shrink-0">
			<div class="min-w-0">
				<span class="text-[11px] font-bold uppercase tracking-wider text-[var(--hud-accent-primary)] block">◈ Active Squad Cluster</span>
				<span class="text-[11px] text-[var(--hud-muted)] truncate block">Token: <strong class="text-[var(--hud-text)]">{wsClient.clusterId || 'cluster-1'}</strong> · {wsClient.activeScope}</span>
			</div>
			<div class="flex items-center gap-1.5 shrink-0">
				<span data-testid="squad-seat-badge" class="px-2 py-0.5 border border-[var(--hud-accent-primary)]/60 bg-[var(--hud-bg)] text-[11px] font-bold text-[var(--hud-accent-primary)] tabular-nums">{wsClient.seatCount}/{totalSlots} SEATS</span>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_TOP_RIGHT} cutPx={5} variant={copied ? 'nominal' : 'brass'} tip="Copy squad invite token" onclick={copyClusterToken} className="px-2 py-0.5 text-[10.5px]">
					{#if copied}<Check size={12} /> Copied{:else}<Copy size={12} /> Token{/if}
				</HudChamferButton>
			</div>
		</div>

		<div data-hud-vscroll="true" class="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 gap-1.5 pr-1 content-start">
			{#each seatSlots as slot, idx (slot ? `${slot.clientId}-${idx}` : `empty-${idx}`)}
				{#if slot}
					{@const swatch = COLLAB_CURSOR_PALETTE[idx % COLLAB_CURSOR_PALETTE.length]}
					<div data-testid={slot.isSyntheticLocal ? 'cluster-local-summary' : 'cluster-peer-row'} class="flex items-center justify-between gap-2 px-2.5 py-2 border border-[var(--hud-border)] bg-[var(--hud-bg)]/80">
						<div class="flex items-center gap-2 min-w-0">
							<span style={`background-color: ${swatch};`} class="w-2.5 h-2.5 inline-block shrink-0 border border-[var(--hud-border)]"></span>
							<div class="min-w-0">
								<div class="text-xs font-bold text-[var(--hud-text)] truncate">{slot.username}</div>
								<div class="text-[10.5px] text-[var(--hud-muted)] truncate">{slot.roleId} · {slot.activeProjection ?? 'BUTTERFLY'}</div>
							</div>
						</div>
						<div class="flex items-center gap-1 shrink-0">
							{#if !slot.isLocal}
								<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} variant={wsClient.followingClientId === slot.clientId ? 'nominal' : 'default'} tip="Lock viewport camera to peer cursor" onclick={() => wsClient.followPeer(wsClient.followingClientId === slot.clientId ? null : slot.clientId)} className="px-2 py-0.5 text-[10.5px]">
									<Crosshair size={11} /> {wsClient.followingClientId === slot.clientId ? 'Following' : 'Follow'}
								</HudChamferButton>
								{#if canOverride && slot.uid > 0}
									<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={4} variant="brass" tip="Force-sync peer to your focal view" onclick={() => onExecuteOverride('OVERRIDE_COLLAB_INVITE', slot.uid, 'FULL_APP')} className="px-1.5 py-0.5 text-[10.5px]">
										<Zap size={11} /> Sync
									</HudChamferButton>
								{/if}
							{:else}
								<span class="px-1.5 py-0.5 text-[10px] border border-[var(--hud-nominal)]/60 text-[var(--hud-nominal)] font-bold">SEAT {idx + 1} · YOU</span>
							{/if}
						</div>
					</div>
				{:else}
					<div class="flex items-center justify-between px-2.5 py-1.5 border border-dashed border-[var(--hud-border)]/70 bg-[var(--hud-surface)]/30 text-[11px] text-[var(--hud-muted)]">
						<span>Seat {idx + 1} · Open Slot</span>
						<span class="text-[10px] uppercase tracking-wider">Ready</span>
					</div>
				{/if}
			{/each}
		</div>

		{#if wsClient.clusterFullError}
			<div class="px-2.5 py-1 border border-[var(--hud-danger)] bg-[var(--hud-bg)] text-[11px] text-[var(--hud-danger)] shrink-0">{wsClient.clusterFullError}</div>
		{/if}
	</HudChamferFrame>
</div>
