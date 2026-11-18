<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.3 Global Zero-Delay Cyberpunk Tooltip Engine: closed octagonal SVG frame, 3px left accent bar & smart viewport clamping.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ZONE_CORNER_TUPLES, buildCornerPolygonPoints, buildHullClipPath,
		resolveChamferCutPx, resolveEffectiveCornerTuple,
	} from '@config/hud.tokens';
	import { hudWire } from '@client/state/hud.wire.svelte';

	let tipText = $state('');
	let tipKey = $state('');
	let visible = $state(false);
	let posX = $state(0);
	let posY = $state(0);
	let boxW = $state(180);
	let boxH = $state(32);
	let boxEl = $state<HTMLDivElement | null>(null);
	let activeAnchor: HTMLElement | null = null;
	let tipEpoch = 0;

	function positionNear(el: HTMLElement): void {
		const r = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const w = boxEl?.offsetWidth || Math.min(280, Math.max(96, tipText.length * 7.8 + (tipKey ? 48 : 28)));
		const h = boxEl?.offsetHeight || 34;
		const gap = 10;
		const pad = 8;

		let x = r.left + r.width / 2 - w / 2;
		let y = r.top > vh * 0.52 ? r.top - h - gap : r.bottom + gap;
		if (r.width <= 60 && r.left < 96) {
			x = r.right + gap;
			y = r.top + r.height / 2 - h / 2;
		} else if (r.width <= 60 && r.right > vw - 96) {
			x = r.left - w - gap;
			y = r.top + r.height / 2 - h / 2;
		}
		if (y < pad) y = r.bottom + gap;
		if (y + h > vh - pad) y = r.top - h - gap;
		posX = Math.round(Math.max(pad, Math.min(vw - w - pad, x)));
		posY = Math.round(Math.max(pad, Math.min(vh - h - pad, y)));
		boxW = w;
		boxH = h;
	}

	function showForTarget(target: EventTarget | null): void {
		const el = (target as HTMLElement | null)?.closest?.('[data-hud-tip]') as HTMLElement | null;
		const text = el?.getAttribute('data-hud-tip')?.trim() ?? '';
		if (!el || !text) { hideTooltip(); return; }
		const key = el.getAttribute('data-hud-tip-key')?.trim() ?? '';
		const epoch = ++tipEpoch;
		queueMicrotask(() => {
			if (epoch !== tipEpoch || !el.isConnected) return;
			activeAnchor = el;
			tipText = text;
			tipKey = key;
			visible = true;
			positionNear(el);
			requestAnimationFrame(() => { if (epoch === tipEpoch && visible && activeAnchor === el && el.isConnected) positionNear(el); });
		});
	}

	function hideTooltip(): void {
		const epoch = ++tipEpoch;
		queueMicrotask(() => {
			if (epoch !== tipEpoch) return;
			visible = false;
			activeAnchor = null;
		});
	}

	onMount(() => {
		const onOver = (e: Event) => showForTarget(e.target);
		const onOut = (e: MouseEvent | FocusEvent) => {
			const next = (e as MouseEvent).relatedTarget as HTMLElement | null;
			if (next?.closest?.('[data-hud-tip]') === activeAnchor && activeAnchor) return;
			hideTooltip();
		};
		document.addEventListener('pointerover', onOver, true);
		document.addEventListener('pointerout', onOut, true);
		document.addEventListener('focusin', onOver, true);
		document.addEventListener('focusout', onOut, true);
		window.addEventListener('scroll', hideTooltip, true);
		return () => {
			++tipEpoch;
			document.removeEventListener('pointerover', onOver, true);
			document.removeEventListener('pointerout', onOut, true);
			document.removeEventListener('focusin', onOver, true);
			document.removeEventListener('focusout', onOut, true);
			window.removeEventListener('scroll', hideTooltip, true);
		};
	});

	let effectiveTuple = $derived(resolveEffectiveCornerTuple({ cornerStyle: hudWire.cornerStyle, explicitCorners: ZONE_CORNER_TUPLES.PERIMETER_CHAMFER }));
	let cut = $derived(resolveChamferCutPx(boxW, boxH, 5, hudWire.fontScalePct, hudWire.cornerStyle, 3));
	let polyPts = $derived(buildCornerPolygonPoints(boxW, boxH, 0.5, effectiveTuple, cut));
	let hullClipStyle = $derived(buildHullClipPath(effectiveTuple, cut, 0));
</script>

{#if visible}
	<div
		bind:this={boxEl}
		data-testid="hud-cyber-tooltip"
		data-corner-style={hudWire.cornerStyle}
		role="tooltip"
		style={`left:${posX}px; top:${posY}px; ${hullClipStyle}`}
		class="fixed z-[95] pointer-events-none max-w-[280px] px-3 py-1.5 bg-[var(--hud-panel)] text-[var(--hud-text-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
	>
		<svg class="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox={`0 0 ${Math.max(10, boxW)} ${Math.max(10, boxH)}`} preserveAspectRatio="none" aria-hidden="true">
			<polygon points={polyPts} fill="none" stroke="var(--hud-accent-primary)" stroke-width="1.2" vector-effect="non-scaling-stroke" />
			<line x1="0" y1={cut} x2="0" y2={Math.max(cut + 2, boxH - cut)} stroke="var(--hud-accent-primary)" stroke-width="4" />
		</svg>
		<div class="relative z-10 flex items-center gap-2 font-mono text-[13px] leading-[18px]">
			<span class="break-words">{tipText}</span>
			{#if tipKey}
				<kbd class="shrink-0 px-1.5 py-0.5 text-[11px] leading-none border border-[var(--hud-accent-secondary)]/70 bg-[var(--hud-surface-recessed)] text-[var(--hud-accent-secondary)] font-bold">{tipKey}</kbd>
			{/if}
		</div>
	</div>
{/if}
