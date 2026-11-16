<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.6.0 Ephemeral Phosphor Particle FX Engine (16 radial sparks with 420ms gravity & decay on COMPARE and Quest triggers).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hudWire } from '@client/state/hud.wire.svelte';

	interface SparkNode {
		readonly id: string;
		x: number;
		y: number;
		vx: number;
		vy: number;
		r: number;
		colorVar: string;
	}
	interface ActiveBurst {
		readonly burstId: number;
		readonly startedAt: number;
		alpha: number;
		readonly sparks: SparkNode[];
	}

	const DURATION_MS = 420;
	let activeBursts = $state<ActiveBurst[]>([]);
	let seenBurstIds = new Set<number>();
	let rafId = 0;

	function spawnBurst(id: number, x: number, y: number, tone: string): void {
		const sparks: SparkNode[] = [];
		for (let i = 0; i < 16; i++) {
			const angle = (i / 16) * Math.PI * 2 + (i % 2 === 0 ? 0.12 : -0.08);
			const speed = 2.2 + (i % 4) * 1.15;
			const colorVar = i % 2 === 0
				? (tone === 'compare' ? 'var(--hud-nominal)' : 'var(--hud-accent-primary)')
				: 'var(--hud-accent-secondary)';
			sparks.push({ id: `${id}-${i}`, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 0.8, r: i % 3 === 0 ? 2.6 : 1.9, colorVar });
		}
		activeBursts = [...activeBursts, { burstId: id, startedAt: performance.now(), alpha: 1, sparks }];
		if (!rafId) rafId = requestAnimationFrame(tick);
	}

	function tick(now: number): void {
		const next: ActiveBurst[] = [];
		for (const b of activeBursts) {
			const progress = (now - b.startedAt) / DURATION_MS;
			if (progress >= 1) { hudWire.clearParticleBurst(b.burstId); continue; }
			for (const s of b.sparks) { s.x += s.vx; s.y += s.vy; s.vy += 0.14; s.vx *= 0.96; }
			b.alpha = Number((1 - progress).toFixed(2));
			next.push(b);
		}
		activeBursts = next;
		rafId = next.length > 0 ? requestAnimationFrame(tick) : 0;
	}

	$effect(() => {
		for (const b of hudWire.particleBursts) {
			if (!seenBurstIds.has(b.id)) {
				seenBurstIds.add(b.id);
				spawnBurst(b.id, b.x, b.y, b.tone);
			}
		}
	});

	onMount(() => () => { if (rafId) cancelAnimationFrame(rafId); });
</script>

{#if activeBursts.length > 0}
	<svg data-testid="hud-particle-layer" aria-hidden="true" class="pointer-events-none fixed inset-0 w-full h-full z-50">
		{#each activeBursts as burst (burst.burstId)}
			<g opacity={burst.alpha}>
				{#each burst.sparks as s (s.id)}
					<circle cx={s.x} cy={s.y} r={s.r} fill={s.colorVar} />
				{/each}
			</g>
		{/each}
	</svg>
{/if}
