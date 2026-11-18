<!--
	@author Oblx <code@oblx.dev>
	@description 60 FPS exponentially-smoothed Virtual Cursor Overlay (WORKSPACE & FULL_APP scopes) + Incoming Collab Invite Toast (v1.7.1).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { API_ROUTES } from '@config/constants';
	import { COLLAB_CURSOR_PALETTE } from '@config/hud.tokens';
	import { clientDagKernel, hudWire, wsClient, type RemoteCollaborator } from '@client/state';

	interface Props {
		camera: { readonly panX: number; readonly panY: number; readonly zoomScale: number };
		focalEntityId: number;
	}
	let { camera, focalEntityId }: Props = $props();

	interface InterpolatedCursor {
		readonly clientId: string;
		readonly username: string;
		readonly roleLabel: string;
		readonly scopeKind: 'WORKSPACE' | 'FULL_APP';
		readonly colorHex: string;
		readonly activeProjection: string;
		readonly x: number;
		readonly y: number;
		readonly isIdle: boolean;
	}

	let renderedCursors = $state.raw<InterpolatedCursor[]>([]);
	const smoothPositions = new Map<string, { x: number; y: number }>();

	function resolveTargetScreenCoords(peer: RemoteCollaborator): { x: number; y: number } {
		const vw = typeof window !== 'undefined' ? Math.max(1, window.innerWidth) : 1280;
		const vh = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 720;
		if (peer.scopeKind === 'FULL_APP' && typeof peer.normalizedX === 'number' && typeof peer.normalizedY === 'number' && (peer.normalizedX > 0 || peer.normalizedY > 0)) {
			return { x: Math.max(8, Math.min(vw - 24, peer.normalizedX * vw)), y: Math.max(8, Math.min(vh - 24, peer.normalizedY * vh)) };
		}
		if (typeof peer.worldX === 'number' && typeof peer.worldY === 'number' && (peer.worldX !== 0 || peer.worldY !== 0)) {
			const sx = peer.worldX * camera.zoomScale + camera.panX;
			const sy = peer.worldY * camera.zoomScale + camera.panY;
			return { x: Math.max(8, Math.min(vw - 24, sx)), y: Math.max(8, Math.min(vh - 24, sy)) };
		}
		return { x: Math.max(8, Math.min(vw - 24, peer.cursorX || 240)), y: Math.max(8, Math.min(vh - 24, peer.cursorY || 180)) };
	}

	$effect(() => {
		const hasRemotePeers = wsClient.roster.some((r) => r.clientId !== wsClient.clientId);
		if (!hasRemotePeers) {
			smoothPositions.clear();
			if (renderedCursors.length > 0) renderedCursors = [];
			return;
		}
		let rafId = 0;
		let lastFrameMs = performance.now();
		const stepFrame = (nowMs: number) => {
			const dt = Math.min(0.1, Math.max(0.001, (nowMs - lastFrameMs) / 1000));
			lastFrameMs = nowMs;
			const alpha = 1 - Math.exp(-18 * dt);
			const nowWall = Date.now();
			const peers = wsClient.roster.filter((r) => r.clientId !== wsClient.clientId);
			const activeIds = new Set<string>();
			const nextList: InterpolatedCursor[] = [];
			for (let idx = 0; idx < peers.length; idx += 1) {
				const p = peers[idx]!;
				activeIds.add(p.clientId);
				const target = resolveTargetScreenCoords(p);
				const prev = smoothPositions.get(p.clientId) ?? target;
				const nx = prev.x + (target.x - prev.x) * alpha;
				const ny = prev.y + (target.y - prev.y) * alpha;
				smoothPositions.set(p.clientId, { x: nx, y: ny });
				nextList.push({
					clientId: p.clientId, username: p.username,
					roleLabel: p.roleId.replace('ROLE_', ''),
					scopeKind: p.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE',
					colorHex: p.colorHex ?? COLLAB_CURSOR_PALETTE[idx % COLLAB_CURSOR_PALETTE.length]!,
					activeProjection: p.activeProjection ?? 'BUTTERFLY',
					x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10,
					isIdle: nowWall - (p.lastUpdatedMs ?? nowWall) > 8000,
				});
			}
			for (const k of smoothPositions.keys()) { if (!activeIds.has(k)) smoothPositions.delete(k); }
			renderedCursors = nextList;
			rafId = requestAnimationFrame(stepFrame);
		};
		rafId = requestAnimationFrame(stepFrame);
		return () => cancelAnimationFrame(rafId);
	});

	onMount(() => {
		const onPointerMove = (e: PointerEvent) => {
			const z = Math.max(0.1, camera.zoomScale);
			wsClient.sendCursor(e.clientX, e.clientY, focalEntityId, (e.clientX - camera.panX) / z, (e.clientY - camera.panY) / z);
		};
		window.addEventListener('pointermove', onPointerMove, { passive: true });
		return () => window.removeEventListener('pointermove', onPointerMove);
	});

	async function respondToInvite(invite: Record<string, unknown>, accept: boolean): Promise<void> {
		const inviteId = Number(invite.id ?? 0);
		wsClient.dismissInvite(inviteId);
		await clientDagKernel.requestJson(API_ROUTES.COLLAB_INVITES, { method: 'POST', body: { action: accept ? 'ACCEPT' : 'DECLINE', inviteId }, sourceZone: 'WORLD_CANVAS', intentKind: 'COLLAB_INVITE_RESPOND' });
		if (accept) {
			const scope = invite.scopeKind === 'FULL_APP' ? 'FULL_APP' : 'WORKSPACE';
			wsClient.joinCluster(String(invite.clusterId ?? 'cluster-1'), scope);
			hudWire.pushTicker('COLLAB', `Joined ${scope} session (${String(invite.clusterId ?? 'cluster-1')})`);
		}
	}
</script>

{#if wsClient.pendingInvites.length > 0}
	{@const topInvite = wsClient.pendingInvites[0]!}
	<div data-testid="collab-invite-toast" class="fixed top-[92px] left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-3 px-4 py-2 font-mono text-[12px] bg-[var(--hud-surface)] border-2 border-[var(--hud-accent-primary)] text-[var(--hud-text)] shadow-lg">
		<span class="text-[var(--hud-accent-secondary)] font-bold">↯ COLLAB INVITE</span>
		<span>from <b>{String(topInvite.fromUsername ?? `UID #${topInvite.fromUserId}`)}</b> · Scope: <span class="text-[var(--hud-accent-primary)] font-bold">{String(topInvite.scopeKind ?? 'WORKSPACE')}</span></span>
		<button type="button" onclick={() => respondToInvite(topInvite, true)} class="px-2 py-0.5 border border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold cursor-pointer">✓ Join Session</button>
		<button type="button" onclick={() => respondToInvite(topInvite, false)} class="px-2 py-0.5 border border-[var(--hud-border)] text-[var(--hud-muted)] cursor-pointer">× Decline</button>
	</div>
{/if}

<div data-testid="virtual-cursors-layer" class="fixed inset-0 z-40 pointer-events-none overflow-hidden select-none">
	{#each renderedCursors as peer (peer.clientId)}
		<div data-testid="virtual-peer-cursor" data-peer-client={peer.clientId} style={`transform: translate3d(${peer.x}px, ${peer.y}px, 0); color: ${peer.colorHex};`} class={`absolute top-0 left-0 transition-opacity duration-300 ${peer.isIdle ? 'opacity-35' : 'opacity-100'}`}>
			<svg width="16" height="16" viewBox="0 0 16 16" class="drop-shadow"><path d="M1 1 L6 14 L8.5 8.5 L14 6 Z" fill="currentColor" stroke="var(--hud-bg)" stroke-width="1.4" /></svg>
			<div style={`border-color: ${peer.colorHex};`} class="ml-3 -mt-1 px-1.5 py-0.5 bg-[var(--hud-bg)]/95 border font-mono text-[10px] leading-tight whitespace-nowrap text-[var(--hud-text)]">
				<span class="font-bold" style={`color: ${peer.colorHex};`}>{peer.username}</span> · <span>{peer.roleLabel}</span> · <span class=" opacity-80">[{peer.scopeKind}]</span>
			</div>
		</div>
	{/each}
</div>
