<!--
	@author Oblx <code@oblx.dev>
	@description Settings Tab 2 (Engines & Storage): Horizontal Bento Deck for Graph Backend, CodeCheck Profile, Maintenance & Orange Pi 512MB SBC Mode.
-->
<script lang="ts">
	import { Database, ShieldCheck, RefreshCw, Cpu } from 'lucide-svelte';
	import { GRAPH_ENGINES, type GraphEngineMode } from '@config/constants';
	import { detectIsSbcLowSpec, setManualSbcOverride } from '@config/hud/performance.tokens';
	import { UiHorizontalDeck } from '@ui';

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

<UiHorizontalDeck testid="settings-engines-deck" ariaLabel="Engines and Storage Bento Cards" showSteppers={true} className="items-stretch font-mono">
	<section class="shrink-0 w-[18.5rem] h-[19rem] snap-start border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 p-3.5 flex flex-col justify-between gap-2">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)]">1. Graph Backend</h3>
			<span class="text-[10px] text-[var(--hud-accent-primary)]">{graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? 'SQLITE' : 'MEMGRAPH'}</span>
		</div>
		<p class="text-xs text-[var(--hud-muted)] leading-relaxed flex-1">
			Switch between deterministic embedded <code class="text-[var(--hud-text)]">bun:sqlite</code> WAL storage and high-throughput external Memgraph Bolt graph projections.
		</p>
		<button type="button" onclick={onToggleEngine} class="px-3 py-2 border border-[var(--hud-accent-primary)] bg-[var(--hud-surface)] text-left text-xs flex items-center justify-between cursor-pointer hud-hover-lift">
			<span class="flex items-center gap-1.5 text-[var(--hud-text)]"><Database size={13} /> Engine</span>
			<span class="text-[var(--hud-accent-primary)] font-bold">{graphEngine === GRAPH_ENGINES.SQLITE_LOCAL ? 'SQLITE_LOCAL' : 'MEMGRAPH_BOLT'}</span>
		</button>
	</section>

	<section class="shrink-0 w-[18.5rem] h-[19rem] snap-start border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 p-3.5 flex flex-col justify-between gap-2">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)]">2. CodeCheck Profile</h3>
			<span class="text-[10px] text-[var(--hud-warning)]">{useHisSafetyProfile ? 'HIS' : 'STD'}</span>
		</div>
		<p class="text-xs text-[var(--hud-muted)] leading-relaxed flex-1">
			Toggle between Standard OO thresholds and strict HIS Safety-Critical Embedded limits (<code class="text-[var(--hud-text)]">v(G) &lt;= 10</code>, <code class="text-[var(--hud-text)]">GOTO = 0</code>).
		</p>
		<button type="button" onclick={onToggleHisProfile} class={`px-3 py-2 border text-left text-xs flex items-center justify-between cursor-pointer hud-hover-lift ${useHisSafetyProfile ? 'border-[var(--hud-warning)] bg-[var(--hud-surface)] text-[var(--hud-warning)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'}`}>
			<span class="flex items-center gap-1.5"><ShieldCheck size={13} /> Profile</span>
			<span>{useHisSafetyProfile ? 'HIS_SAFETY' : 'STANDARD'}</span>
		</button>
	</section>

	<section class="shrink-0 w-[18.5rem] h-[19rem] snap-start border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 p-3.5 flex flex-col justify-between gap-2">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)]">3. AST Maintenance</h3>
			<span class="text-[10px] text-[var(--hud-muted)]">AST / DAG</span>
		</div>
		<p class="text-xs text-[var(--hud-muted)] leading-relaxed flex-1">
			Re-parse active source buffers through the polyglot AST worker pool, recompute Martin stability and LCOM4 cohesion, and flush stale snapshots.
		</p>
		<button type="button" onclick={() => { onClose(); onReindexWorkspace(); }} class="px-3 py-2 border border-[var(--hud-accent-secondary)] hud-z1-entity hud-glint-trigger text-left text-xs flex items-center justify-between text-[var(--hud-accent-primary)] font-bold cursor-pointer">
			<span class="flex items-center gap-1.5"><RefreshCw size={13} /> Re-Index Workspace</span>
			<span>↻</span>
		</button>
	</section>

	<section class="shrink-0 w-[18.5rem] h-[19rem] snap-start border border-[var(--hud-border)] bg-[var(--hud-bg)]/65 p-3.5 flex flex-col justify-between gap-2">
		<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
			<h3 class="text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-secondary)]">4. SBC 512MB Mode</h3>
			<span class="text-[10px] text-[var(--hud-nominal)]">{isSbc ? 'SBC_512MB' : 'STANDARD'}</span>
		</div>
		<p class="text-xs text-[var(--hud-muted)] leading-relaxed flex-1">
			Limits DOM frustum to 350 nodes, sets SQLite cache_size = -4000, disables multi-pass blurs, and optimizes 7&quot; Orange Pi Zero touchscreens.
		</p>
		<button type="button" onclick={toggleSbc} class={`px-3 py-2 border text-left text-xs flex items-center justify-between cursor-pointer hud-hover-lift ${isSbc ? 'border-[var(--hud-nominal)] bg-[var(--hud-surface)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-border)] bg-[var(--hud-bg)] text-[var(--hud-text)]'}`}>
			<span class="flex items-center gap-1.5"><Cpu size={13} /> Orange Pi Profile</span>
			<span>{isSbc ? 'ENABLED' : 'DISABLED'}</span>
		</button>
	</section>
</UiHorizontalDeck>
