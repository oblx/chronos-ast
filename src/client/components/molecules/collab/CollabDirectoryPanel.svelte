<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.8.0 Social Hub Column 2: Operator Directory, Friendships, Scoped Invites & Guest Sign-In Routing.
-->
<script lang="ts">
	import { UserPlus, Mail, Zap } from 'lucide-svelte';
	import { HUD_MODALS } from '@config/hud.events';
	import { CHAMFER_PROFILES, HULL_PROFILES } from '@config/hud.tokens';
	import { SEEDED_OPERATOR_CONFIG } from '@config/security.constants';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { securityWire } from '@client/state/security.wire.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface Props {
		operators: ReadonlyArray<Record<string, unknown>>;
		friends: ReadonlyArray<Record<string, unknown>>;
		pendingRequests: ReadonlyArray<Record<string, unknown>>;
		actorWeight: number;
		canOverride: boolean;
		onFriendAction: (action: string, targetUid?: number, targetUsername?: string) => void;
		onInvite: (toUid: number, scope: 'WORKSPACE' | 'FULL_APP') => void;
		onExecuteOverride: (action: string, targetUid: number, scope: 'WORKSPACE' | 'FULL_APP') => void;
	}

	let { operators, friends, pendingRequests, actorWeight, canOverride, onFriendAction, onInvite, onExecuteOverride }: Props = $props();
	let searchQuery = $state('');
	let targetUsernameInput = $state('');
	let isGuestMode = $derived(securityWire.roleId === 'ROLE_GUEST' || securityWire.principalKind === 'GUEST');

	let resolvedOperators = $derived.by(() => {
		const source = operators.length > 0
			? operators
			: SEEDED_OPERATOR_CONFIG.DEV_ACCOUNTS.filter((a) => a.uid !== securityWire.uid).map((a) => ({
				uid: a.uid, username: a.username, displayName: a.displayName, roleId: a.roleId,
				weight: a.roleId === 'ROLE_ADMIN' ? 1000 : a.roleId === 'ROLE_AUDITOR' ? 75 : a.roleId === 'ROLE_ANALYST' ? 50 : 10,
				level: a.roleId === 'ROLE_ADMIN' ? 18 : a.roleId === 'ROLE_AUDITOR' ? 12 : a.roleId === 'ROLE_ANALYST' ? 9 : 5,
				online: false, activityStatus: 'STANDBY',
			}));
		const q = searchQuery.trim().toLowerCase();
		return q ? source.filter((op) => String(op.username).toLowerCase().includes(q) || String(op.roleId).toLowerCase().includes(q)) : source;
	});
	function submitAddFriend(): void { onFriendAction('REQUEST', undefined, targetUsernameInput); targetUsernameInput = ''; }
</script>

<div id="collab-col-directory" class="relative overflow-hidden min-w-[300px] lg:min-w-0 lg:flex-1 h-[360px] snap-start">
	<HudChamferFrame profile={HULL_PROFILES.CHAMFER_OCTAGON} chevrons={false} patternOpacity={0.14} className="p-3.5 h-full flex flex-col gap-2">
		<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border)] pb-2 shrink-0">
			<span class="text-[11px] font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)]">⬡ Operator Directory &amp; Friends</span>
			<span class="text-[10.5px] text-[var(--hud-muted)] tabular-nums">{resolvedOperators.length} operators · {friends.length} friends</span>
		</div>

		<div class="flex items-center gap-1.5 shrink-0">
			<input type="text" bind:value={searchQuery} placeholder="Filter roster..." class="min-w-0 flex-1 px-2 py-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[var(--hud-text)] text-[11.5px]" />
			{#if !isGuestMode}
				<input type="text" bind:value={targetUsernameInput} placeholder="Username..." class="w-24 px-2 py-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[var(--hud-text)] text-[11.5px]" />
				<HudChamferButton chamferCorner={CHAMFER_PROFILES.RIGHT_END_CAP} cutPx={5} variant="accent" testid="add-friend-btn" tip="Send friend request by username" onclick={submitAddFriend} className="px-2 py-1 text-[10.5px] font-bold">
					<UserPlus size={11} /> Add
				</HudChamferButton>
			{/if}
		</div>

		{#if pendingRequests.length > 0}
			<div class="p-2 border border-[var(--hud-accent-secondary)]/60 bg-[var(--hud-bg)]/70 space-y-1 shrink-0">
				<div class="text-[10px] text-[var(--hud-accent-secondary)] font-bold">PENDING REQUESTS ({pendingRequests.length})</div>
				{#each pendingRequests as req (`${req.userLowId}-${req.userHighId}`)}
					{@const peerUid = Number(req.userLowId) === securityWire.uid ? Number(req.userHighId) : Number(req.userLowId)}
					<div class="flex items-center justify-between text-[11px]">
						<span>UID #{peerUid}</span>
						<div class="flex items-center gap-1">
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} variant="nominal" tip="Accept friend request" onclick={() => onFriendAction('ACCEPT', peerUid)} className="px-1.5 py-0.5 text-[10px]">Accept</HudChamferButton>
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} tip="Decline friend request" onclick={() => onFriendAction('DECLINE', peerUid)} className="px-1.5 py-0.5 text-[10px]">Decline</HudChamferButton>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div data-hud-vscroll="true" class="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
			{#each resolvedOperators as op (op.uid)}
				{@const opUid = Number(op.uid)}
				{@const opWeight = Number(op.weight ?? 0)}
				{@const isFriend = friends.some((f) => Number(f.userLowId) === opUid || Number(f.userHighId) === opUid)}
				<div data-testid="operator-directory-row" class="p-2 border border-[var(--hud-border)] bg-[var(--hud-bg)]/80 flex flex-col gap-1.5">
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-1.5 min-w-0">
							<span class={`w-2 h-2 rounded-full shrink-0 ${op.online ? 'bg-[var(--hud-nominal)]' : 'bg-[var(--hud-muted)]'}`}></span>
							<span class="font-bold text-xs text-[var(--hud-text)] truncate">{op.username}</span>
							<span class="text-[10px] px-1 border border-[var(--hud-border)] text-[var(--hud-accent-primary)]">LV {op.level ?? 5}</span>
						</div>
						<div class="flex items-center gap-1 shrink-0">
							{#if isFriend}<span class="px-1.5 py-0.5 text-[9.5px] border border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold">FRIEND</span>{/if}
							<span class="text-[10px] text-[var(--hud-muted)]">{String(op.roleId ?? '').replace('ROLE_', '')}</span>
						</div>
					</div>
					<div class="flex flex-wrap items-center gap-1">
						{#if isGuestMode}
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={5} variant="accent" testid={`guest-signin-connect-${opUid}`} tip="Authenticate in Chronos Lobby to add friends and send cluster invites" onclick={() => hudWire.openModal(HUD_MODALS.AUTH_LOBBY)} className="px-2.5 py-1 text-[10.5px] font-bold">Sign In to Connect →</HudChamferButton>
						{:else}
							{#if !isFriend}
								<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} tip={`Send friend request to ${op.username}`} onclick={() => onFriendAction('REQUEST', opUid)} className="px-2 py-0.5 text-[10px]">+ Friend</HudChamferButton>
							{/if}
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} variant="accent" tip="Invite to active workspace cluster" onclick={() => onInvite(opUid, 'WORKSPACE')} className="px-2 py-0.5 text-[10px]"><Mail size={10} /> Invite WS</HudChamferButton>
							<HudChamferButton chamferCorner={CHAMFER_PROFILES.INTERIOR_CHAMFER} cutPx={4} variant="brass" tip="Invite with full studio synchronization" onclick={() => onInvite(opUid, 'FULL_APP')} className="px-2 py-0.5 text-[10px]">Full-App</HudChamferButton>
							{#if canOverride && (securityWire.uid === 1 || actorWeight > opWeight)}
								<HudChamferButton chamferCorner={CHAMFER_PROFILES.CORNER_BOTTOM_RIGHT} cutPx={4} variant="brass" testid={`force-summon-${opUid}`} tip="Privileged RBAC override summon" onclick={() => onExecuteOverride('OVERRIDE_COLLAB_INVITE', opUid, 'FULL_APP')} className="px-2 py-0.5 text-[10px] font-bold"><Zap size={10} /> Summon</HudChamferButton>
							{/if}
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</HudChamferFrame>
</div>
