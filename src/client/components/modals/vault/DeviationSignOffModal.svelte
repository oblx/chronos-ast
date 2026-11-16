<!--
	@author Oblx <code@oblx.dev>
	@description Tier-3 Forensic Modal for recording Structured CodeCheck Deviation Approvals (Atn).
-->
<script lang="ts">
	import { DEVIATION_TEMPLATE_IDS, type DeviationTemplateId } from '@config/registries/annotation.templates';
	import { ANNOTATION_KINDS, type AnnotationKind } from '@config/metamodel.constants';
	import { type GraphEntityNode, validateClientForm } from '@client/state';
	import HudModalShell from '../HudModalShell.svelte';
	import HudModalHeader from '../HudModalHeader.svelte';
	import HudModalFooter from '../HudModalFooter.svelte';

	interface Props {
		isOpen: boolean;
		entity: GraphEntityNode | undefined;
		onClose: () => void;
		onSubmit: (tagKind: AnnotationKind, note: string, ruleCode: string | null, templateId?: DeviationTemplateId | null, ticketId?: string | null) => void;
	}

	let { isOpen, entity, onClose, onSubmit }: Props = $props();
	let tagDraft = $state<AnnotationKind>(ANNOTATION_KINDS.SUPPRESS_RULE);
	let templateDraft = $state<DeviationTemplateId>(DEVIATION_TEMPLATE_IDS.ARCHITECTURAL_WAIVER);
	let ruleDraft = $state<string>('CHR-016');
	let ticketDraft = $state<string>('CHRONOS-AUDIT-001');
	let noteDraft = $state<string>('');
	let formError = $state<string>('');
	let shakeForm = $state(false);

	function handleSave(): void {
		formError = '';
		if (!entity) return;
		const isSuppress = tagDraft === ANNOTATION_KINDS.SUPPRESS_RULE;
		const v = validateClientForm('DEVIATION_SIGNOFF', { note: noteDraft, ruleCode: isSuppress ? ruleDraft : '' });
		if (!v.valid) { formError = v.error; shakeForm = true; setTimeout(() => (shakeForm = false), 300); return; }
		onSubmit(tagDraft, noteDraft.trim(), isSuppress ? ruleDraft.trim() || '*' : null, isSuppress ? templateDraft : null, isSuppress ? ticketDraft.trim() : null);
		noteDraft = '';
		onClose();
	}
</script>

<HudModalShell {isOpen} ariaLabel="Deviation Sign-Off Modal" maxWidthClass="max-w-xl" {onClose}>
	{#snippet header()}
		<HudModalHeader
			title="Deviation Sign-Off"
			subtitle={entity ? `ENTITY // ${entity.qualifiedName}` : 'AUDIT ANNOTATION'}
			{onClose}
		/>
	{/snippet}

	<div class={`flex flex-col gap-3 font-mono text-xs ${shakeForm ? 'hud-form-shake' : ''}`}>
		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1">
				<span class="text-[11px] uppercase tracking-wider text-[var(--hud-accent)]">Annotation Kind</span>
				<select bind:value={tagDraft} class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-[var(--hud-text)]">
					<option value={ANNOTATION_KINDS.SUPPRESS_RULE}>SUPPRESS_RULE (Deviation)</option>
					<option value={ANNOTATION_KINDS.NOTE}>NOTE (Architectural Audit)</option>
					<option value={ANNOTATION_KINDS.HOTSPOT_PIN}>HOTSPOT_PIN</option>
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-[11px] uppercase tracking-wider text-[var(--hud-accent)]">Approval Template</span>
				<select bind:value={templateDraft} disabled={tagDraft !== ANNOTATION_KINDS.SUPPRESS_RULE} class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-[var(--hud-text)] disabled:opacity-40">
					<option value={DEVIATION_TEMPLATE_IDS.ARCHITECTURAL_WAIVER}>ARCHITECTURAL_WAIVER</option>
					<option value={DEVIATION_TEMPLATE_IDS.HIS_COMPLEXITY_EXEMPTION}>HIS_COMPLEXITY_EXEMPTION</option>
					<option value={DEVIATION_TEMPLATE_IDS.LEGACY_FREEZE}>LEGACY_FREEZE</option>
				</select>
			</label>
		</div>

		{#if tagDraft === ANNOTATION_KINDS.SUPPRESS_RULE}
			<div class="grid grid-cols-2 gap-3">
				<label class="flex flex-col gap-1">
					<span class="text-[11px] uppercase tracking-wider text-[var(--hud-muted)]">Target Rule Code / ID</span>
					<input type="text" bind:value={ruleDraft} placeholder="CHR-016 or *" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-[var(--hud-text)]" />
				</label>
				<label class="flex flex-col gap-1">
					<span class="text-[11px] uppercase tracking-wider text-[var(--hud-muted)]">Audit Ticket ID</span>
					<input type="text" bind:value={ticketDraft} placeholder="CHRONOS-AUDIT-001" class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-1.5 text-[var(--hud-text)]" />
				</label>
			</div>
		{/if}

		<label class="flex flex-col gap-1">
			<span class="text-[11px] uppercase tracking-wider text-[var(--hud-accent)]">Engineering Rationale</span>
			<textarea rows="3" bind:value={noteDraft} placeholder="Document technical justification and safety bounds..." class="bg-[var(--hud-bg)] border border-[var(--hud-border)] px-2.5 py-2 text-[var(--hud-text)]"></textarea>
		</label>
		{#if formError}<div role="alert" class="px-2.5 py-1.5 border border-[var(--hud-danger)] bg-[var(--hud-surface)] text-[11px] text-[var(--hud-danger)]">{formError}</div>{/if}
	</div>

	{#snippet footer()}
		<HudModalFooter metaText="Recorded deviations persist in SQLite + IndexedDB and export to Compliance HTML/CSV.">
			{#snippet actions()}
				<button type="button" onclick={onClose} class="px-3 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)] text-[var(--hud-muted)] cursor-pointer">Cancel</button>
				<button type="button" onclick={handleSave} disabled={!entity} class="px-3 py-1 bg-[var(--hud-accent)] text-[var(--hud-bg-base)] font-bold disabled:opacity-40 cursor-pointer">Record Sign-Off</button>
			{/snippet}
		</HudModalFooter>
	{/snippet}
</HudModalShell>
