<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.8.0 Social Hub: 3-Column Horizontal Bento Command Center (Squad Cluster, Operator Directory, Live Collab Wire).
-->
<script lang="ts">
	import { API_ROUTES } from '@config/constants';
	import { CHAMFER_PROFILES } from '@config/hud.tokens';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { clientDagKernel, hudWire, securityWire, wsClient } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudHorizontalDeck from '@client/components/molecules/HudHorizontalDeck.svelte';
	import HudSubTabBar, { type HudSubTabItem } from '@client/components/molecules/HudSubTabBar.svelte';
	import CollabSquadPanel from '@client/components/molecules/collab/CollabSquadPanel.svelte';
	import CollabDirectoryPanel from '@client/components/molecules/collab/CollabDirectoryPanel.svelte';
	import CollabWirePanel from '@client/components/molecules/collab/CollabWirePanel.svelte';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props { isOpen: boolean; activeEntityName?: string; onClose: () => void; }
	let { isOpen, activeEntityName = 'dispatch_ast_job', onClose }: Props = $props();

	let focusCol = $state<'SQUAD' | 'DIRECTORY' | 'WIRE'>('SQUAD');
	let statusNote = $state(''), actorWeight = $state(0);
	let operators = $state.raw<Array<Record<string, unknown>>>([]), friends = $state.raw<Array<Record<string, unknown>>>([]), pendingRequests = $state.raw<Array<Record<string, unknown>>>([]);
	let canOverride = $derived(securityWire.can(CAPABILITY_BITS.COLLAB_OVERRIDE));
	let maxSeats = $derived(Math.max(2, wsClient.seatCap));
	let collabTabs = $derived<readonly HudSubTabItem[]>([
		{ id: 'SQUAD', label: '1 · Squad Cluster', badge: `${wsClient.seatCount}/${maxSeats}` },
		{ id: 'DIRECTORY', label: '2 · Operators & Friends', badge: Math.max(operators.length, 3) },
		{ id: 'WIRE', label: '3 · Live Wire', badge: wsClient.collabFeed.length },
	]);

	function focusBentoColumn(id: string): void {
		focusCol = id as 'SQUAD' | 'DIRECTORY' | 'WIRE';
		const domId = id === 'SQUAD' ? 'collab-col-squad' : id === 'DIRECTORY' ? 'collab-col-directory' : 'collab-col-wire';
		if (typeof document !== 'undefined') document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
	}
	async function loadSocialDirectory(): Promise<void> {
		const res = await clientDagKernel.requestJson<Record<string, unknown>>(API_ROUTES.COLLAB_FRIENDS, { sourceZone: 'APP_MODAL', intentKind: 'COLLAB_DIRECTORY_LOAD' });
		if (!res.ok) return;
		if (typeof res.data.actorWeight === 'number') actorWeight = res.data.actorWeight;
		if (Array.isArray(res.data.operators)) operators = res.data.operators as Array<Record<string, unknown>>;
		if (Array.isArray(res.data.friends)) friends = res.data.friends as Array<Record<string, unknown>>;
		if (Array.isArray(res.data.pendingRequests)) pendingRequests = res.data.pendingRequests as Array<Record<string, unknown>>;
	}
	$effect(() => { if (isOpen) void loadSocialDirectory(); });

	async function postFriendAction(action: string, targetUserId?: number, targetUsername?: string): Promise<void> {
		const res = await clientDagKernel.requestJson<Record<string, unknown>>(API_ROUTES.COLLAB_FRIENDS, { method: 'POST', body: { action, targetUserId, targetUsername }, sourceZone: 'APP_MODAL', intentKind: `COLLAB_FRIEND_${action}` });
		statusNote = res.ok ? `Friend ${action} completed.` : String(res.data.error ?? 'Friend action failed');
		if (res.ok) wsClient.pushCollabEvent('SESSION', statusNote);
		await loadSocialDirectory();
	}
	async function sendCollabInvite(toUserId: number, scopeKind: 'WORKSPACE' | 'FULL_APP'): Promise<void> {
		const res = await clientDagKernel.requestJson<Record<string, unknown>>(API_ROUTES.COLLAB_INVITES, { method: 'POST', body: { action: 'SEND', toUserId, scopeKind, clusterId: wsClient.clusterId || 'cluster-1' }, sourceZone: 'APP_MODAL', intentKind: 'COLLAB_INVITE_SEND' });
		statusNote = res.ok ? `Sent ${scopeKind} invite to UID #${toUserId}.` : String(res.data.error ?? 'Invite failed');
		if (res.ok) wsClient.pushCollabEvent('INVITE', statusNote);
	}
	async function respondInvite(inviteId: number, accept: boolean, clusterId = 'cluster-1', scopeKind: 'WORKSPACE' | 'FULL_APP' = 'WORKSPACE'): Promise<void> {
		wsClient.dismissInvite(inviteId);
		if (accept) wsClient.joinCluster(clusterId, scopeKind);
		await clientDagKernel.requestJson(API_ROUTES.COLLAB_INVITES, { method: 'POST', body: { action: accept ? 'ACCEPT' : 'DECLINE', inviteId }, sourceZone: 'APP_MODAL', intentKind: 'COLLAB_INVITE_RESPOND' });
	}
	async function executeOverride(overrideAction: string, targetUserId: number, scopeKind: 'WORKSPACE' | 'FULL_APP' = 'FULL_APP'): Promise<void> {
		const res = await clientDagKernel.requestJson<Record<string, unknown>>(API_ROUTES.COLLAB_OVERRIDE, { method: 'POST', body: { overrideAction, targetUserId, scopeKind, clusterId: wsClient.clusterId || 'cluster-1', intent: { kind: 'SWITCH_PROJECTION', view: hudWire.activeView } }, sourceZone: 'APP_MODAL', intentKind: `COLLAB_OVERRIDE_${overrideAction}` });
		statusNote = res.ok ? `Executed ${overrideAction} on UID #${targetUserId}.` : String(res.data.error ?? 'Override denied');
		if (res.ok) wsClient.pushCollabEvent('OVERRIDE', statusNote);
		await loadSocialDirectory();
	}
</script>

<HudModalShell {isOpen} ariaLabel="Social Hub" maxWidthClass="max-w-6xl" {onClose}>
	{#snippet header()}
		<HudModalHeader title="Social Hub" subtitle="MULTI-SCOPE REALTIME AWARENESS · 2–8 SEAT CLUSTERS" {onClose} />
		<div data-testid="collab-subtab-toolbar" class="px-5 py-2 border-b border-[var(--hud-border)] bg-[var(--hud-bg)]/85 flex flex-wrap items-center justify-between gap-2 shrink-0">
			<div data-testid="collab-cluster-status-bar" class="hidden lg:flex items-center gap-2 font-mono text-[11px] text-[var(--hud-accent-primary)]">
				<span class="w-2 h-2 rounded-full bg-[var(--hud-nominal)] hud-led-pulse"></span>
				<span class="font-bold tracking-wider">CLUSTER: ACTIVE · SEATS: {wsClient.seatCount}/{maxSeats} · LATENCY: &lt;12ms</span>
			</div>
			<div class="lg:hidden">
				<HudSubTabBar items={collabTabs} activeId={focusCol} ariaLabel="Social Hub Bento Columns" onSelect={focusBentoColumn} />
			</div>
			<div class="flex items-center gap-1.5 shrink-0">
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.LEFT_END_CAP} cutPx={5} active={wsClient.activeScope === 'WORKSPACE'} variant={wsClient.activeScope === 'WORKSPACE' ? 'accent' : 'default'} testid="collab-scope-workspace" tip="Share awareness strictly within active project workspace" onclick={() => wsClient.setScope('WORKSPACE')} className="px-2.5 py-1 font-mono text-[11px]">Scope: WORKSPACE</HudChamferButton>
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} active={wsClient.activeScope === 'FULL_APP'} variant={wsClient.activeScope === 'FULL_APP' ? 'brass' : 'default'} testid="collab-scope-fullapp" tip="Share cursors & viewport synchronization app-wide" onclick={() => wsClient.setScope('FULL_APP')} className="px-2.5 py-1 font-mono text-[11px]">Scope: FULL_APP</HudChamferButton>
			</div>
		</div>
	{/snippet}

	<div data-testid="collab-social-modal" class="flex-1 min-h-0 flex flex-col gap-2 font-mono text-[12px]">
		{#if statusNote}<div data-testid="collab-status-note" class="px-3 py-1 border border-[var(--hud-nominal)]/60 bg-[var(--hud-bg)]/80 text-[11px] text-[var(--hud-nominal)] shrink-0">{statusNote}</div>{/if}
		<HudHorizontalDeck testid="collab-bento-deck" trackClassName="items-stretch">
			<CollabSquadPanel {canOverride} onExecuteOverride={executeOverride} />
			<CollabDirectoryPanel {operators} {friends} {pendingRequests} {actorWeight} {canOverride} onFriendAction={postFriendAction} onInvite={sendCollabInvite} onExecuteOverride={executeOverride} />
			<CollabWirePanel {activeEntityName} onRespondInvite={respondInvite} />
		</HudHorizontalDeck>
	</div>

	{#snippet footer()}
		<HudModalFooter metaText={`Active Scope: ${wsClient.activeScope} · Seats: ${wsClient.seatCount}/${maxSeats} · Actor Weight: ${actorWeight}`}>
			{#snippet actions()}<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={6} tip="Close Social Hub" onclick={onClose} className="px-3.5 py-1 text-xs">Close Hub</HudChamferButton>{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
