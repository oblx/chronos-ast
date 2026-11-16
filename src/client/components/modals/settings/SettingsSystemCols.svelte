<!--
	@author Oblx <code@oblx.dev>
	@description Settings Tab 2 (Engines & Storage): Graph Backend, CodeCheck Profile, Maintenance & Orange Pi 512MB SBC Mode.
-->
<script lang="ts">
	import { Database, ShieldCheck, RefreshCw, Cpu } from 'lucide-svelte';
	import { GRAPH_ENGINES, type GraphEngineMode } from '@config/constants';
	import { detectIsSbcLowSpec, setManualSbcOverride } from '@config/hud/performance.tokens';
	import HudModalGrid from '../HudModalGrid.svelte';
	import HudAccordionSection from '@client/components/molecules/HudAccordionSection.svelte';

	interface Props {
		graphEngine: GraphEngineMode;
		useHisSafetyProfile: boolean;
		onClose: () => void;
		onToggleEngine: () => void;
		onToggleHisProfile: () => void;
		onReindexWorkspace: () => Promise<void>;
	}

	let { graphEngine, useHisSafetyProfile, onClose, onToggleEngine, onToggleHisProfile, onReindexWorkspace }: Props = $props();
	let isSbc = $state(detectIsSbcLowSpec());

	function toggleSbc(): void {
		const next = !isSbc;
		isSbc = next;
		setManualSbcOverride(next);
	}
</script>

<HudModalGrid columns={2}>
	<div class="flex flex-col gap-3">
		<HudAccordionSection
			title="1. Graph Backend (SQLite / Memgraph)"
			badge={graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? 'SQLITE_LOCAL' : 'MEMGRAPH_BOLT'}
			defaultOpen={true}
		>
			<p class="text-[13px] text-[var(--hud-muted)] leading-snug">
				Switch between deterministic embedded <code class="text-[var(--hud-text)]">bun:sqlite</code> WAL storage and high-throughput external Memgraph Bolt graph projections.
			</p>
			<button
				type="button"
				onclick={onToggleEngine}
				class="px-3 py-2 border border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-left font-mono text-xs flex items-center justify-between cursor-pointer hud-hover-lift"
			>
				<span class="flex items-center gap-1.5 text-[var(--hud-text)]"><Database size={13} /> Active Graph Engine</span>
				<span class="text-[var(--hud-accent-primary)] font-bold">{graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? 'SQLITE_LOCAL' : 'MEMGRAPH_BOLT'}</span>
			</button>
		</HudAccordionSection>

		<HudAccordionSection
			title="2. CodeCheck Threshold Profile"
			badge={useHisSafetyProfile ? 'HIS_SAFETY' : 'STANDARD'}
			defaultOpen={true}
		>
			<p class="text-[13px] text-[var(--hud-muted)] leading-snug">
				Toggle between Standard OO thresholds and strict HIS Safety-Critical Embedded limits (<code class="text-[var(--hud-text)]">v(G) &lt;= 10</code>, <code class="text-[var(--hud-text)]">GOTO = 0</code>).
			</p>
			<button
				type="button"
				onclick={onToggleHisProfile}
				class={`px-3 py-2 border text-left font-mono text-xs flex items-center justify-between cursor-pointer hud-hover-lift ${
					useHisSafetyProfile ? 'border-[var(--hud-warning)] bg-[var(--hud-surface)] text-[var(--hud-warning)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'
				}`}
			>
				<span class="flex items-center gap-1.5"><ShieldCheck size={13} /> Active Rule Profile</span>
				<span>{useHisSafetyProfile ? 'HIS_SAFETY' : 'STANDARD'}</span>
			</button>
		</HudAccordionSection>
	</div>

	<div class="flex flex-col gap-3">
		<HudAccordionSection title="3. Workspace Maintenance & Re-Index" badge="AST / DAG" defaultOpen={true}>
			<p class="text-[13px] text-[var(--hud-muted)] leading-snug">
				Re-parse active source buffers through the polyglot AST worker pool, recompute Martin packaging stability and LCOM4 cohesion, and flush stale snapshots.
			</p>
			<button
				type="button"
				onclick={() => { onClose(); onReindexWorkspace(); }}
				class="px-3 py-2 border border-[var(--hud-accent-secondary)] hud-z1-entity hud-glint-trigger text-left font-mono text-xs flex items-center justify-between text-[var(--hud-accent-primary)] font-bold cursor-pointer"
			>
				<span class="flex items-center gap-1.5"><RefreshCw size={13} /> Re-Index &amp; Reset Workspace</span>
				<span>↻</span>
			</button>
		</HudAccordionSection>

		<HudAccordionSection title="4. 512MB RAM SBC Profile" badge={isSbc ? 'SBC_512MB' : 'STANDARD'} defaultOpen={false}>
			<p class="text-[13px] text-[var(--hud-muted)] leading-snug">
				Limits DOM frustum to 350 nodes, sets SQLite cache_size = -4000, disables multi-pass blurs, and optimizes rendering for 7" Orange Pi Zero touchscreens.
			</p>
			<button
				type="button"
				onclick={toggleSbc}
				class={`px-3 py-2 border text-left font-mono text-xs flex items-center justify-between cursor-pointer hud-hover-lift ${
					isSbc ? 'border-[var(--hud-nominal)] bg-[var(--hud-surface)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'
				}`}
			>
				<span class="flex items-center gap-1.5"><Cpu size={13} /> Orange Pi Zero Profile</span>
				<span>{isSbc ? 'ENABLED (350 Nodes)' : 'DISABLED'}</span>
			</button>
		</HudAccordionSection>
	</div>
</HudModalGrid>
