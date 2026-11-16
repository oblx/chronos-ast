<!--
	@author Oblx <code@oblx.dev>
	@description Live AST Source Code Inspector and Multi-Language Ingestion Terminal organism.
-->
<script lang="ts">
	import { WORKSPACE_DEFAULTS } from '@config/constants';
	import {
		type CodeCheckViolation,
		type GraphEntityNode,
		validateClientForm
	} from '@client/state';
	import SourceSpanViewer from './SourceSpanViewer.svelte';

	interface Props {
		entity: GraphEntityNode;
		sourceCode: string;
		isAnalyzing: boolean;
		nodes?: readonly GraphEntityNode[];
		violations?: readonly CodeCheckViolation[];
		onSelectEntity?: (id: number, line?: number) => void;
		onAnalyzeSource: (filePath: string, sourceCode: string) => Promise<void>;
	}

	let {
		entity,
		sourceCode,
		isAnalyzing,
		nodes = [],
		violations = [],
		onSelectEntity = () => {},
		onAnalyzeSource,
	}: Props = $props();

	let draftFilePath = $state<string>(WORKSPACE_DEFAULTS.DEFAULT_INGEST_PATH);
	let draftSourceCode = $state(
		`export function routeTelemetryPacket(payloadSize: number, retries: number): number {\n\tif (payloadSize <= 0 || retries < 0) {\n\t\treturn 0;\n\t}\n\tlet acc = payloadSize;\n\tfor (let i = 0; i < retries; i++) {\n\t\tif (i % 2 === 0 && acc > 64) {\n\t\t\tacc = calculateCyclomaticMetrics(acc);\n\t\t}\n\t}\n\treturn acc;\n}`
	);
	let validationError = $state(''), submissionNotice = $state(''), shakeForm = $state(false);

	async function handleIngestSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		validationError = '';
		submissionNotice = '';
		const v = validateClientForm('ANALYZE_SOURCE', { filePath: draftFilePath, sourceCode: draftSourceCode });
		if (!v.valid) { validationError = v.error; shakeForm = true; setTimeout(() => (shakeForm = false), 300); return; }
		const cleanPath = draftFilePath.trim();
		await onAnalyzeSource(cleanPath, draftSourceCode.trim());
		submissionNotice = `Indexed ${cleanPath} into SQLite & IndexedDB metamodel.`;
	}
</script>

<div
	data-testid="telemetry-terminal-surface"
	class="w-full h-full bg-[var(--hud-bg)] text-[var(--hud-text)] p-5 overflow-auto grid grid-cols-1 xl:grid-cols-2 gap-5 font-mono"
>
	<div class="min-h-0 h-full overflow-hidden">
		<SourceSpanViewer {entity} {sourceCode} highlightedLine={null} {nodes} {violations} {onSelectEntity} />
	</div>

	<section class="border border-[var(--hud-border)] bg-[var(--hud-panel)] p-4 flex flex-col gap-3">
		<div class="border-b border-[var(--hud-border)] pb-2">
			<h2 class="text-sm font-semibold">
				Live AST Parser &amp; Drizzle Metamodel Ingestion
			</h2>
			<p class="text-xs text-[var(--hud-muted)]">
				Submit TypeScript (.ts), Rust (.rs), or C++ (.cpp) code to parse via Bun Worker and persist into SQLite + IndexedDB.
			</p>
		</div>

		<form onsubmit={handleIngestSubmit} class={`flex-1 flex flex-col gap-3 ${shakeForm ? 'hud-form-shake' : ''}`}>
			<div class="flex flex-col gap-1">
				<label for="ast-file-path" class="text-xs text-[var(--hud-muted)]">
					Module File Path (.ts, .rs, .cpp)
				</label>
				<input
					id="ast-file-path"
					type="text"
					bind:value={draftFilePath}
					placeholder="e.g. src/core/custom_analyzer.ts"
					class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-3 py-1.5 text-xs text-[var(--hud-text)] focus:outline-none focus:border-[var(--hud-accent)]"
				/>
			</div>

			<div class="flex-1 flex flex-col gap-1">
				<label for="ast-source-code" class="text-xs text-[var(--hud-muted)]">
					Source Code Payload
				</label>
				<textarea
					id="ast-source-code"
					rows="9"
					bind:value={draftSourceCode}
					placeholder="Paste function, struct, or class source..."
					class="flex-1 bg-[var(--hud-bg)] border border-[var(--hud-border)] p-3 text-xs text-[var(--hud-text)] focus:outline-none focus:border-[var(--hud-accent)] font-mono"
				></textarea>
			</div>

			{#if validationError}
				<p role="alert" class="text-xs text-rose-400 bg-rose-950/30 border border-rose-800 px-3 py-2">
					{validationError}
				</p>
			{/if}

			{#if submissionNotice}
				<p role="status" class="text-xs text-[var(--hud-nominal)] bg-[var(--hud-surface)] border border-[var(--hud-border)] px-3 py-2">
					{submissionNotice}
				</p>
			{/if}

			<div class="flex items-center justify-end gap-2 pt-1">
				<button
					type="button"
					onclick={() => {
						draftFilePath = '';
						draftSourceCode = '';
						validationError = '';
						submissionNotice = '';
					}}
					class="px-3 py-2 text-xs text-[var(--hud-text)] bg-[var(--hud-surface)] border border-[var(--hud-border)] cursor-pointer whitespace-nowrap shrink-0"
				>
					Clear Inputs
				</button>
				<button
					type="submit"
					disabled={isAnalyzing}
					class="px-4 py-2 text-xs font-semibold text-[var(--hud-bg-base)] bg-[var(--hud-accent)] hover:opacity-90 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
				>
					{isAnalyzing ? 'Indexing AST...' : 'Ingest & Analyze Source'}
				</button>
			</div>
		</form>
	</section>
</div>
