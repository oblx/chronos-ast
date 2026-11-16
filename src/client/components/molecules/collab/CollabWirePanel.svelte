<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Social Hub Column 3: Live Collab Wire, Token Cluster Join, Pending Invites & Tactical Pings.
-->
<script lang="ts">
	import { Crosshair, Radio, Share2, Users } from 'lucide-svelte';
	import { CHAMFER_PROFILES, HULL_PROFILES } from '@config/hud.tokens';
	import { wsClient } from '@client/state/ws.client.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		activeEntityName?: string;
		onRespondInvite: (inviteId: number, accept: boolean, clusterId?: string, scopeKind?: 'WORKSPACE' | 'FULL_APP') => void;
	}

	let { activeEntityName = 'dispatch_ast_job', onRespondInvite }: Props = $props();
	let joinTokenInput = $state('');

	function handleJoinToken(): void {
		if (!joinTokenInput.trim()) return;
		wsClient.joinCluster(joinTokenInput.trim(), wsClient.activeScope);
		joinTokenInput = '';
	}
</script>

<div id="collab-col-wire" class="relative overflow-hidden min-w-[300px] lg:min-w-0 lg:flex-1 h-[360px] snap-start">
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} patternOpacity={0.14} className="p-3.5 h-full flex flex-col justify-between gap-2">
		<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-2 shrink-0">
			<span class="text-[11px] font-bold uppercase tracking-wider text-[var(--hud-nominal)] flex items-center gap-1.5"><Radio size={12} /> Live Collab Wire &amp; Pings</span>
			<span class={`text-[10px] font-bold px-1.5 py-0.5 border ${wsClient.status === 'CONNECTED' ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)]' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}`}>{wsClient.status}</span>
		</div>

		<div class="flex items-center gap-1.5 shrink-0">
			<input type="text" bind:value={joinTokenInput} placeholder="Cluster token (e.g. cluster-1)..." class="min-w-0 flex-1 px-2 py-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[var(--hud-text)] text-[11.5px]" />
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} variant="accent" testid="collab-join-token-btn" tip="Join squad cluster by token" onclick={handleJoinToken} className="px-2.5 py-1 text-[10.5px] font-bold">Join</HudChamferButton>
		</div>

		{#if wsClient.pendingInvites.length > 0}
			<div class="p-2 border border-[var(--hud-accent-primary)]/60 bg-[var(--hud-bg)]/80 space-y-1 shrink-0">
				<div class="text-[10px] font-bold text-[var(--hud-accent-primary)]">INBOUND INVITES ({wsClient.pendingInvites.length})</div>
				{#each wsClient.pendingInvites as inv (inv.id)}
					<div class="flex items-center justify-between gap-2 text-[11px]">
						<span class="truncate">{String(inv.fromUsername ?? 'Peer')} → {String(inv.clusterId ?? 'cluster-1')}</span>
						<div class="flex items-center gap-1 shrink-0">
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} variant="nominal" tip="Accept and join cluster" onclick={() => onRespondInvite(Number(inv.id), true, String(inv.clusterId ?? 'cluster-1'), inv.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE')} className="px-1.5 py-0.5 text-[10px]">Join</HudChamferButton>
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} tip="Dismiss invite" onclick={() => onRespondInvite(Number(inv.id), false)} className="px-1.5 py-0.5 text-[10px]">Dismiss</HudChamferButton>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div data-hud-vscroll="true" data-testid="collab-live-feed" class="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 border border-[var(--hud-border)]/70 bg-[var(--hud-bg)]/60 p-2">
			{#each wsClient.collabFeed as ev (ev.id)}
				<div class="text-[11px] flex items-start justify-between gap-2 border-b border-[var(--hud-border)]/40 pb-1 last:border-none">
					<span class="text-[var(--hud-text)] min-w-0 break-words"><strong class="text-[var(--hud-accent-primary)]">[{ev.actor}]</strong> {ev.text}</span>
					<span class="text-[10px] text-[var(--hud-muted)] tabular-nums shrink-0">{ev.timeLabel}</span>
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-3 gap-1.5 shrink-0 pt-0.5">
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_LEFT} cutPx={5} variant="accent" testid="ping-focal-node-btn" tip={`Broadcast focal beacon for ${activeEntityName}`} onclick={() => wsClient.sendTacticalPing('PING_FOCAL', activeEntityName)} className="justify-center py-1 text-[10px] font-bold">
				<Crosshair size={11} /> Ping Focal
			</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={5} variant="brass" testid="gather-squad-btn" tip="Call squad peers to your active view" onclick={() => wsClient.sendTacticalPing('GATHER_SQUAD', activeEntityName)} className="justify-center py-1 text-[10px] font-bold">
				<Users size={11} /> Gather Squad
			</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={5} variant="nominal" testid="share-snapshot-btn" tip="Broadcast current canvas snapshot link" onclick={() => wsClient.sendTacticalPing('SHARE_SNAPSHOT', activeEntityName)} className="justify-center py-1 text-[10px] font-bold">
				<Share2 size={11} /> Share View
			</HudChamferButton>
		</div>
	</HudChamferFrame>
</div>
