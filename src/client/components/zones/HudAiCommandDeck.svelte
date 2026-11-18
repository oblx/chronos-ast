<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.7.0 Diegetic AI Command & Heuristic Chat Console with Outbound Privacy Shield Redactor.
-->
<script lang="ts">
	import { API_ROUTES } from '@config/constants';
	import { CHAMFER_CORNERS, HULL_PROFILES } from '@config/hud.tokens';
	import { CAPABILITY_BITS } from '@config/security.constants';
	import { clientDagKernel, hudWire, redactOutboundPayload, securityWire, validateClientForm, type GraphEntityNode } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';
	import HudChamferFrame from '@client/components/atoms/HudChamferFrame.svelte';
	import HudAnimatedResizeBody from '@client/components/molecules/HudAnimatedResizeBody.svelte';

	interface Props {
		focalEntity: GraphEntityNode | undefined; entityCount: number; violationCount: number; hasCycles: boolean;
		providerUrl?: string; providerBearer?: string; canCompare?: boolean; hasWorkspace?: boolean; hasBaseline?: boolean;
		onToggleCompare?: (event: MouseEvent) => void;
	}
	interface ChatMessage { readonly id: number; readonly prompt: string; readonly mode: 'LOCAL_HEURISTIC' | 'LIVE_AI_BRIDGE'; readonly summary: string; readonly bullets: readonly string[]; }

	let { focalEntity, entityCount, violationCount, hasCycles, providerUrl = '', providerBearer = '', canCompare = false, hasWorkspace = false, hasBaseline = false, onToggleCompare }: Props = $props();
	let promptInput = $state(''), threadExpanded = $state(false), busy = $state(false), shakeForm = $state(false), formError = $state('');
	let messages = $state<ChatMessage[]>([]);
	let defaultReadout = $derived(`READY · @${focalEntity?.name ?? 'dispatch_ast_job'} · ${entityCount}E · ${hasCycles ? 1 : 0} SCC`);

	$effect(() => { const draft = hudWire.consumeAiPromptDraft(); if (draft) promptInput = draft; });
	let latestMsg = $derived<ChatMessage>(messages[0] ?? {
		id: 0, prompt: '/explain @Focal', mode: 'LOCAL_HEURISTIC',
		summary: defaultReadout,
		bullets: ['Deterministic AST/CFG/CodeCheck reducer active in DEMO & Offline modes; Live AI Bridge gated by chronos.ai.invoke (b18).'],
	});
	let canInvokeLiveAi = $derived(securityWire.can(CAPABILITY_BITS.AI_BRIDGE_INVOKE) && Boolean(providerUrl));
	let livePreviewRedaction = $derived(redactOutboundPayload(promptInput));

	function attachContextTag(tag: string): void {
		const token = tag === '@Focal' && focalEntity ? `@${focalEntity.name}` : tag;
		promptInput = `${promptInput.trim()} ${token}`.trim();
	}

	async function submitPrompt(customPrompt?: string): Promise<void> {
		formError = '';
		const rawQ = (customPrompt ?? promptInput).trim();
		const v = validateClientForm('AI_PROMPT', { prompt: rawQ });
		if (!v.valid) { formError = v.error; shakeForm = true; setTimeout(() => (shakeForm = false), 300); return; }
		const redacted = redactOutboundPayload(rawQ);
		const q = redacted.redactedText;
		busy = true;
		try {
			const res = await clientDagKernel.requestJson<{ mode?: 'LOCAL_HEURISTIC' | 'LIVE_AI_BRIDGE'; summary?: string; bullets?: string[] }>(API_ROUTES.AI_CHAT, {
				method: 'POST', sourceZone: 'BOTTOM_CENTER', intentKind: 'AI_COMMAND_INVOKE',
				body: { prompt: q, focalEntityId: focalEntity?.id ?? null, providerUrl, providerBearer },
			});
			if (res.ok) {
				messages = [{ id: Date.now(), prompt: q, mode: res.data.mode ?? 'LOCAL_HEURISTIC', summary: res.data.summary ?? 'Analysis complete.', bullets: res.data.bullets ?? [] }, ...messages].slice(0, 12);
				hudWire.pushTicker('AI', `${res.data.mode ?? 'LOCAL'}: ${q.slice(0, 36)}`);
			} else {
				messages = [{
					id: Date.now(), prompt: q, mode: 'LOCAL_HEURISTIC',
					summary: focalEntity ? `@${focalEntity.name} — LOC:${focalEntity.loc} · v(G):${focalEntity.cyclomatic} · V:${focalEntity.halsteadVolume} (${violationCount} violations, cycles:${hasCycles ? 'YES' : '0'})` : `${entityCount} entities analyzed offline.`,
					bullets: ['Offline deterministic fallback evaluated from local Metamodel store.'],
				}, ...messages].slice(0, 12);
			}
		} finally { busy = false; if (!customPrompt) promptInput = ''; }
	}
</script>

<div data-testid="hud-ai-command-deck" data-help-target="AI_COMMAND_DECK" class="relative w-full h-[80px] flex flex-col justify-between pt-1.5 border-t border-[var(--hud-border)]/80 font-mono text-[11px] leading-4">
	{#if threadExpanded}
		<div data-testid="ai-thread-drawer" class="absolute bottom-[132px] left-0 right-0 z-30 max-h-[42vh]">
			<HudChamferFrame profile={HULL_PROFILES.CHAMFER_CORNER_POD} chevrons={true} className="p-3 shadow-2xl">
				<HudAnimatedResizeBody transitionKey={messages.length} testid="ai-thread-resize-body">
					<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5 mb-2">
						<span class="text-xs font-bold text-[var(--hud-accent-secondary)] uppercase">Diegetic AI Architectural Thread ({messages.length})</span>
						<button type="button" onclick={() => (threadExpanded = false)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[11px] text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer">Collapse [v]</button>
					</div>
					<div class="max-h-[30vh] overflow-y-auto flex flex-col gap-2">
						{#each [latestMsg, ...messages.slice(1)] as msg (msg.id)}
							<div class="p-2 border border-[var(--hud-border)] bg-[var(--hud-bg)]/85 flex flex-col gap-1">
								<div class="flex items-center justify-between text-[10px]">
									<span class="text-[var(--hud-accent-primary)] font-bold">&gt; {msg.prompt}</span>
									<span class="px-1 border border-[var(--hud-border)] text-[var(--hud-nominal)]">{msg.mode}</span>
								</div>
								<p class="text-[11px] text-[var(--hud-text)]">{msg.summary}</p>
								{#each msg.bullets as b}<span class="text-[10px] text-[var(--hud-muted)]">· {b}</span>{/each}
							</div>
						{/each}
					</div>
				</HudAnimatedResizeBody>
			</HudChamferFrame>
		</div>
	{/if}

	<form onsubmit={(e) => { e.preventDefault(); void submitPrompt(); }} class={`flex items-center gap-1.5 min-w-0 ${shakeForm ? 'hud-form-shake' : ''}`}>
		<span class={`px-1.5 py-0.5 border text-[10px] leading-3 font-bold shrink-0 ${canInvokeLiveAi ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)]' : 'border-[var(--hud-accent-secondary)] text-[var(--hud-accent-secondary)]'}`}>{canInvokeLiveAi ? 'AI·LIVE' : 'AI·LOCAL'}</span>
		<HudChamferButton chamferCorner={CHAMFER_CORNERS.CHAMFER_OCTAGON} cutPx={5} variant="nominal" testid="ai-privacy-shield-badge" tip={livePreviewRedaction.redactionCount > 0 ? `Privacy Shield: Active — Sanitized preview: ${livePreviewRedaction.redactedText}` : 'Privacy Shield: Active — Outbound secret & PII redactor'} className="hidden md:inline-flex h-7 px-2 text-[10px] shrink-0">◈ Privacy{livePreviewRedaction.redactionCount > 0 ? ` (${livePreviewRedaction.redactionCount})` : ''}</HudChamferButton>
		<input type="text" data-testid="ai-command-input" bind:value={promptInput} placeholder={`Ask AI about @${focalEntity?.name ?? 'dispatch_ast_job'} or /hotspots...`} class="flex-1 min-w-0 h-7 px-2 bg-[var(--hud-bg)] border border-[var(--hud-border)] text-[11px] text-[var(--hud-text)] placeholder:text-[var(--hud-muted)]" />
		<div class="hidden min-[1360px]:flex items-center gap-0.5 shrink-0">
			{#each ['@Focal', '@Flags', '@Diff', '@Flow'] as tag (tag)}
				<button type="button" onclick={() => attachContextTag(tag)} class="px-1 py-0.5 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[10px] leading-3 text-[var(--hud-accent-primary)] hover:border-[var(--hud-accent-primary)] cursor-pointer whitespace-nowrap">{tag}</button>
			{/each}
		</div>
		<HudChamferButton type="submit" chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} variant="brass" testid="ai-command-send" disabled={busy} className="h-7 px-3 text-[11px] shrink-0 mr-1">{busy ? '...' : 'Send [↵]'}</HudChamferButton>
	</form>

	<div class="flex items-center justify-between gap-2 bg-[var(--hud-bg)]/75 px-2.5 h-7 border border-[var(--hud-border)]/70 min-w-0">
		<div class="min-w-0 flex-1 truncate">
			{#if formError}
				<span role="alert" class="text-[var(--hud-danger)] font-bold">{formError}</span>
			{:else}
				<span class="text-[var(--hud-accent-primary)] font-bold mr-1">[{latestMsg.mode === 'LIVE_AI_BRIDGE' ? 'BRIDGE' : 'TELEMETRY'}]</span>
				<span data-testid="ai-command-readout" class="text-[var(--hud-text)]">{latestMsg.summary}</span>
			{/if}
		</div>
		<div class="flex items-center gap-1 shrink-0">
			{#if canCompare && hasWorkspace}
				<button type="button" data-testid="hotbar-compare-btn" onclick={(e) => onToggleCompare?.(e)} class={`px-1.5 py-0.5 border text-[10px] leading-3 cursor-pointer ${hasBaseline ? 'border-[var(--hud-nominal)] text-[var(--hud-nominal)] font-bold' : 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)]'}`}>{hasBaseline ? 'Comparing' : 'Δ Compare'}</button>
			{/if}
			<button type="button" onclick={() => void submitPrompt('/hotspots')} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[10px] leading-3 text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer">/hotspots</button>
			<button type="button" onclick={() => void submitPrompt('/cycles')} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[10px] leading-3 text-[var(--hud-muted)] hover:text-[var(--hud-text)] cursor-pointer hidden xl:inline-block">/cycles</button>
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.CORNER_BOTTOM_RIGHT} cutPx={5} variant="accent" testid="ai-expand-thread-btn" onclick={() => (threadExpanded = !threadExpanded)} className="h-5 px-2.5 text-[10px] shrink-0 mr-1">{threadExpanded ? 'Hide [v]' : 'Thread [^]'}</HudChamferButton>
		</div>
	</div>
</div>
