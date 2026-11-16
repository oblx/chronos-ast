<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v2.2.0 Diegetic Tactical Context Menu (z-40) for Entity Cartridges and Workspace Canvas.
-->
<script lang="ts">
	import { EXPORT_FORMATS, HUD_VIEWS, type ExportFormat } from '@config/constants';
	import { HUD_MODALS } from '@config/hud.events';
	import { HULL_PROFILES, HUD_GLYPHS } from '@config/hud.tokens';
	import { type GraphEntityNode, hudWire } from '@client/state';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';

	interface Props {
		open: boolean;
		x: number;
		y: number;
		targetEntity: GraphEntityNode | undefined;
		onClose: () => void;
		onSelectNode: (id: number) => void;
		onResetZoom: () => void;
		onFitCorridor: () => void;
		onToggleCompare: () => void;
		onRequestExport?: (format: ExportFormat) => void;
	}

	let { open, x, y, targetEntity, onClose, onSelectNode, onResetZoom, onFitCorridor, onToggleCompare, onRequestExport }: Props = $props();

	let safeX = $derived(typeof window !== 'undefined' ? Math.max(12, Math.min(x, window.innerWidth - 252)) : x);
	let safeY = $derived(typeof window !== 'undefined' ? Math.max(12, Math.min(y, window.innerHeight - 280)) : y);

	function runAction(fn: () => void): void {
		fn();
		onClose();
	}
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onClose(); }} />
{#if open}
	<div
		data-testid="hud-context-menu"
		role="menu"
		tabindex="-1"
		style={`left: ${safeX}px; top: ${safeY}px;`}
		class="fixed z-40 w-60 font-mono text-xs select-none"
	>
		<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={true} className="p-2 shadow-2xl">
			<div class="flex flex-col gap-1">
				<div class="px-1.5 py-1 border-b border-[var(--hud-border)] flex items-center justify-between text-[11px]">
					<span class="font-bold text-[var(--hud-accent-secondary)] truncate">
						{targetEntity ? `${HUD_GLYPHS.FOCAL_RETICLE} ${targetEntity.name}` : 'WORKSPACE CANVAS'}
					</span>
					<button type="button" onclick={onClose} class="text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer">×</button>
				</div>

				{#if targetEntity}
					<button type="button" role="menuitem" onclick={() => runAction(() => onSelectNode(targetEntity.id))} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-text)] flex items-center justify-between cursor-pointer">
						<span>Lock as Focal Target</span><span class="text-[10px] text-[var(--hud-accent-secondary)]">[DBL]</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => { onSelectNode(targetEntity.id); hudWire.selectView(HUD_VIEWS.DATA_FLOW); })} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-nominal)] flex items-center justify-between cursor-pointer">
						<span>Trace Variable Lineage (DFG)</span><span class="text-[10px] opacity-75">⟡</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => { onSelectNode(targetEntity.id); hudWire.selectView(HUD_VIEWS.CONTROL_FLOW); })} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] flex items-center justify-between cursor-pointer">
						<span>Inspect Control Flow (CFG)</span><span class="text-[10px] opacity-75">⑂</span>
					</button>
					<button type="button" role="menuitem" data-testid="ctx-send-to-ai" onclick={() => runAction(() => hudWire.prefillAiPrompt(`/explain @${targetEntity.name}`))} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-accent-secondary)] flex items-center justify-between cursor-pointer">
						<span>Send @Entity to AI Chat</span><span class="text-[10px] opacity-75">AI</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => { onSelectNode(targetEntity.id); hudWire.selectView(HUD_VIEWS.INSPECTOR); })} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-text)] flex items-center justify-between cursor-pointer">
						<span>Jump to Source Span</span><span class="text-[10px] opacity-75">⌥</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => { onSelectNode(targetEntity.id); hudWire.openModal(HUD_MODALS.DEVIATION_SIGN_OFF); })} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-warning)] flex items-center justify-between cursor-pointer">
						<span>Pin Hotspot Annotation (Atn)</span><span class="text-[10px] opacity-75">✎</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => { try { void navigator.clipboard?.writeText(targetEntity.qualifiedName); } catch {} hudWire.pushTicker('CLIP', `Copied ${targetEntity.qualifiedName}`); })} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-muted)] flex items-center justify-between cursor-pointer">
						<span>Copy Qualified Name</span><span class="text-[10px] opacity-75">⎘</span>
					</button>
				{:else}
					<button type="button" role="menuitem" onclick={() => runAction(onFitCorridor)} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-text)] flex items-center justify-between cursor-pointer">
						<span>Fit Graph to Safe Corridor</span><span class="text-[10px] text-[var(--hud-accent-primary)]">[F]</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(onResetZoom)} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-text)] flex items-center justify-between cursor-pointer">
						<span>Reset Zoom (100%)</span><span class="text-[10px] text-[var(--hud-accent-secondary)]">[0]</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => hudWire.triggerCanvasRecenter())} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-nominal)] flex items-center justify-between cursor-pointer">
						<span>Center on Focal Node</span><span class="text-[10px] opacity-75">⌖</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(onToggleCompare)} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-warning)] flex items-center justify-between cursor-pointer">
						<span>Toggle Compare Overlay</span><span class="text-[10px] opacity-75">Δ</span>
					</button>
					<button type="button" role="menuitem" onclick={() => runAction(() => onRequestExport?.(EXPORT_FORMATS.VECTOR_SVG))} class="px-2 py-1 text-left hover:bg-[var(--hud-surface)] text-[var(--hud-accent-primary)] flex items-center justify-between cursor-pointer">
						<span>Export Current View (SVG)</span><span class="text-[10px] opacity-75">⇣</span>
					</button>
				{/if}
			</div>
		</HudChamferFrame>
	</div>
{/if}
