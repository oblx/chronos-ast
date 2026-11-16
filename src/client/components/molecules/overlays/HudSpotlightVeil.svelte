<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.6.2 Universal SVG Spotlight Scrim, Animated Neon Halo & Zero-CLS Callout Placement.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	let vw = $state(1440);
	let vh = $state(900);
	let targetRect = $state({ x: 200, y: 150, width: 600, height: 400 });

	function updateBounds(): void {
		if (typeof window === 'undefined') return;
		vw = window.innerWidth;
		vh = window.innerHeight;
		const target = hudWire.spotlightTarget;
		if (!target) return;
		if (target.zone === 'WORLD_CANVAS') {
			targetRect = { x: Math.round(vw * 0.15), y: Math.round(vh * 0.18), width: Math.round(vw * 0.7), height: Math.round(vh * 0.62) };
			return;
		}
		const el = target.selector ? document.querySelector(target.selector) : null;
		if (el) {
			const b = el.getBoundingClientRect();
			targetRect = { x: Math.max(8, Math.round(b.left)), y: Math.max(8, Math.round(b.top)), width: Math.round(b.width), height: Math.round(b.height) };
		} else {
			targetRect = { x: Math.round(vw * 0.25), y: Math.round(vh * 0.25), width: Math.round(vw * 0.5), height: Math.round(vh * 0.5) };
		}
	}

	$effect(() => {
		const _ = hudWire.spotlightTarget;
		updateBounds();
	});

	onMount(() => {
		updateBounds();
		window.addEventListener('resize', updateBounds);
		const interval = setInterval(updateBounds, 300);
		return () => { window.removeEventListener('resize', updateBounds); clearInterval(interval); };
	});

	let cardLeft = $derived(Math.max(16, Math.min(vw - 340, targetRect.x + Math.round((targetRect.width - 320) / 2))));
	let isCalloutAbove = $derived(targetRect.y > 220);
	let cardTop = $derived(isCalloutAbove ? Math.max(16, targetRect.y - 170) : Math.min(vh - 180, targetRect.y + targetRect.height + 16));
</script>

{#if hudWire.spotlightTarget}
	<div class="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden" aria-hidden="true">
		<svg class="absolute inset-0 w-full h-full" width={vw} height={vh} viewBox="0 0 {vw} {vh}">
			<defs>
				<pattern id="spotlight-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
					<line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="1.2" />
				</pattern>
				<filter id="spotlight-glow" x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
					<feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
				</filter>
				<mask id="spotlight-mask">
					<rect width="100%" height="100%" fill="white" />
					<rect x={targetRect.x - 6} y={targetRect.y - 6} width={targetRect.width + 12} height={targetRect.height + 12} rx="6" fill="black" />
				</mask>
			</defs>
			<rect width="100%" height="100%" fill="black" mask="url(#spotlight-mask)" opacity="0.68" />
			<rect width="100%" height="100%" fill="url(#spotlight-hatch)" mask="url(#spotlight-mask)" opacity="0.22" class="text-[var(--hud-text-primary)]" />
			<rect x={targetRect.x - 6} y={targetRect.y - 6} width={targetRect.width + 12} height={targetRect.height + 12} rx="6" fill="none" stroke="var(--hud-accent-primary, cyan)" stroke-width="2.5" filter="url(#spotlight-glow)" opacity="0.95" />
			<g stroke="var(--hud-brass, orange)" stroke-width="2" fill="none" opacity="0.9">
				<path d="M {targetRect.x - 14} {targetRect.y} L {targetRect.x - 14} {targetRect.y - 14} L {targetRect.x} {targetRect.y - 14}" />
				<path d="M {targetRect.x + targetRect.width} {targetRect.y - 14} L {targetRect.x + targetRect.width + 14} {targetRect.y - 14} L {targetRect.x + targetRect.width + 14} {targetRect.y}" />
				<path d="M {targetRect.x - 14} {targetRect.y + targetRect.height} L {targetRect.x - 14} {targetRect.y + targetRect.height + 14} L {targetRect.x} {targetRect.y + targetRect.height + 14}" />
				<path d="M {targetRect.x + targetRect.width} {targetRect.y + targetRect.height + 14} L {targetRect.x + targetRect.width + 14} {targetRect.y + targetRect.height + 14} L {targetRect.x + targetRect.width + 14} {targetRect.y + targetRect.height}" />
			</g>
		</svg>

		<div class="absolute pointer-events-auto w-80 bg-[var(--hud-panel,#0b1120)]/95 border border-[var(--hud-accent-primary,#06b6d4)] p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-2 transition-all duration-200" style="left: {cardLeft}px; top: {cardTop}px;">
			<div class="flex items-center justify-between gap-2 border-b border-[var(--hud-border,#334155)] pb-1.5">
				<span class="text-[11px] font-mono tracking-widest text-[var(--hud-brass,#f59e0b)] uppercase font-semibold">
					HUD Tour · Step {hudWire.spotlightTarget.stepIndex ?? hudWire.tutorialStep}/5
				</span>
				<button type="button" class="text-[11px] font-mono text-[var(--hud-muted,#94a3b8)] hover:text-[var(--hud-text-primary)]" onclick={() => hudWire.clearSpotlight()}>[×]</button>
			</div>
			<div class="text-sm font-semibold text-[var(--hud-text-primary)] tracking-wide">{hudWire.spotlightTarget.title}</div>
			<p class="text-[13px] leading-relaxed text-[var(--hud-muted,#94a3b8)] m-0">{hudWire.spotlightTarget.description}</p>
			<div class="flex items-center justify-between gap-2 pt-1 border-t border-[var(--hud-border,#334155)] mt-1">
				<button type="button" class="text-[11px] font-mono text-[var(--hud-muted,#94a3b8)] hover:text-[var(--hud-text-primary)]" onclick={() => hudWire.skipTourAndUnfoldHud()}>Skip Tour</button>
				<HudChamferButton variant="primary" size="xs" onclick={() => {
					if (hudWire.tutorialStep >= 5) hudWire.completeTourAndOpenAuth();
					else hudWire.advanceTourStep(hudWire.tutorialStep + 1);
				}}>
					{hudWire.tutorialStep >= 5 ? 'Finish [✓]' : 'Next Step [→]'}
				</HudChamferButton>
			</div>
		</div>
	</div>
{/if}
