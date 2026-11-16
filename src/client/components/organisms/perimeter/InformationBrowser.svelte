<!--
	@author Oblx <code@oblx.dev>
	@description Chronos Information Browser (IB) with HudAccordionSection relation groups, CK OO metrics, and >=11px typography.
-->
<script lang="ts">
	import { DEVIATION_TEMPLATE_IDS, type DeviationTemplateId } from '@config/registries/annotation.templates';
	import { ENTITY_KIND_STYLE_MAP } from '@config/hud.tokens';
	import { ANNOTATION_KINDS, REFERENCE_KINDS, type AnnotationKind } from '@config/metamodel.constants';
	import {
		type AuditAnnotationRecord,
		type EntityCkMetrics,
		type GraphEntityNode,
		type GraphReferenceEdge,
		securityWire
	} from '@client/state';
	import HudAccordionSection from '@client/components/molecules/HudAccordionSection.svelte';

	interface Props {
		entity: GraphEntityNode;
		nodes: readonly GraphEntityNode[];
		edges: readonly GraphReferenceEdge[];
		ckMetrics?: EntityCkMetrics;
		annotations?: readonly AuditAnnotationRecord[];
		onAddAnnotation?: (tagKind: AnnotationKind, note: string, ruleCode: string | null, templateId?: DeviationTemplateId | null, ticketId?: string | null) => void;
		onSelectEntity: (id: number, highlightLine?: number) => void;
	}

	let { entity, nodes, edges, ckMetrics, annotations = [], onAddAnnotation, onSelectEntity }: Props = $props();
	let noteDraft = $state<string>('');
	let tagDraft = $state<AnnotationKind>(ANNOTATION_KINDS.NOTE);
	let ruleDraft = $state<string>('CFG_UNREACHABLE');
	let templateDraft = $state<DeviationTemplateId>(DEVIATION_TEMPLATE_IDS.ARCHITECTURAL_WAIVER);
	let ticketDraft = $state<string>('CHRONOS-AUDIT-001');

	let nodeMap = $derived(new Map(nodes.map((n) => [n.id, n])));
	let entityAnnotations = $derived(annotations.filter((a) => a.qualifiedName === entity.qualifiedName));
	let kindMeta = $derived(ENTITY_KIND_STYLE_MAP[entity.kind] ?? { glyph: '❖', colorVar: 'var(--hud-accent-primary)', shortLabel: entity.kind });

	interface IbRelationGroup {
		readonly key: string;
		readonly label: string;
		readonly items: ReadonlyArray<{ readonly peer: GraphEntityNode; readonly line: number; readonly kind: string }>;
	}

	let relationGroups = $derived.by((): readonly IbRelationGroup[] => {
		const outbound = edges.filter((e) => e.sourceEntityId === entity.id);
		const inbound = edges.filter((e) => e.targetEntityId === entity.id);
		const mapPeers = (list: readonly GraphReferenceEdge[], dir: 'IN' | 'OUT') =>
			list.map((e) => ({ peer: nodeMap.get(dir === 'OUT' ? e.targetEntityId : e.sourceEntityId)!, line: e.line, kind: e.kind })).filter((item) => Boolean(item.peer));

		return [
			{ key: 'DEFINES', label: 'Defines', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.DEFINES), 'OUT') },
			{ key: 'DEFINED_IN', label: 'Defined In', items: mapPeers(inbound.filter((e) => e.kind === REFERENCE_KINDS.DEFINES), 'IN') },
			{ key: 'CALLS', label: 'Calls', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.CALLS), 'OUT') },
			{ key: 'CALLED_BY', label: 'Called By', items: mapPeers(inbound.filter((e) => e.kind === REFERENCE_KINDS.CALLS), 'IN') },
			{ key: 'SETS', label: 'Sets (Init)', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.SETS), 'OUT') },
			{ key: 'MODIFIES', label: 'Modifies (Mutates)', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.MODIFIES), 'OUT') },
			{ key: 'USES', label: 'Uses (Reads)', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.USES), 'OUT') },
			{ key: 'TYPED', label: 'Typed / Uses Type', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.TYPED), 'OUT') },
			{ key: 'INHERITS', label: 'Inherits / Implements', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.INHERITS || e.kind === REFERENCE_KINDS.IMPLEMENTS), 'OUT') },
			{ key: 'OVERRIDES', label: 'Overrides', items: mapPeers(outbound.filter((e) => e.kind === REFERENCE_KINDS.OVERRIDES), 'OUT') },
		].filter((g) => g.items.length > 0);
	});

	function submitAnnotation(): void {
		if (!noteDraft.trim() || !onAddAnnotation) return;
		const isSuppress = tagDraft === ANNOTATION_KINDS.SUPPRESS_RULE;
		onAddAnnotation(tagDraft, noteDraft.trim(), isSuppress ? ruleDraft : null, isSuppress ? templateDraft : null, isSuppress ? ticketDraft : null);
		noteDraft = '';
	}
</script>

<section aria-label="Information Browser" class="border border-[var(--hud-border)] bg-[var(--hud-bg)] p-2.5 flex flex-col gap-2 font-mono text-xs">
	<div class="flex items-center justify-between border-b border-[var(--hud-border)] pb-1.5">
		<span class="text-[var(--hud-accent)] font-bold uppercase tracking-wider text-[11px]">IB // Information Browser</span>
		<span class="text-[11px] text-[var(--hud-muted)]">{kindMeta.glyph} {entity.kind}</span>
	</div>

	{#if ckMetrics}
		<div class="grid grid-cols-3 gap-1 text-[11px] bg-[var(--hud-surface)] p-1.5 border border-[var(--hud-border)]">
			<div><span class="text-[var(--hud-muted)]">WMC:</span> <span class="text-[var(--hud-text)] font-bold">{ckMetrics.wmc}</span></div>
			<div><span class="text-[var(--hud-muted)]">DIT:</span> <span class="text-[var(--hud-text)] font-bold">{ckMetrics.dit}</span></div>
			<div><span class="text-[var(--hud-muted)]">NOC:</span> <span class="text-[var(--hud-text)] font-bold">{ckMetrics.noc}</span></div>
			<div><span class="text-[var(--hud-muted)]">CBO:</span> <span class="text-[var(--hud-text)] font-bold">{ckMetrics.cbo}</span></div>
			<div><span class="text-[var(--hud-muted)]">RFC:</span> <span class="text-[var(--hud-text)] font-bold">{ckMetrics.rfc}</span></div>
			<div><span class="text-[var(--hud-muted)]">Dist D:</span> <span class="text-[var(--hud-accent)] font-bold">{ckMetrics.mainSequenceDistance}</span></div>
		</div>
	{/if}

	<div class="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
		{#if relationGroups.length === 0}
			<div class="text-[11px] text-[var(--hud-muted)] py-1.5 text-center">No cross-references recorded for {entity.name}.</div>
		{:else}
			{#each relationGroups as group, gIdx (group.key)}
				<HudAccordionSection title={group.label} badge={`${group.items.length}`} defaultOpen={gIdx < 2}>
					{#each group.items as entry, idx (`${entry.peer.id}-${entry.line}-${idx}`)}
						<button type="button" onclick={() => onSelectEntity(entry.peer.id, entry.line)} class="w-full px-2 py-1 flex items-center justify-between text-[11px] hover:bg-[var(--hud-surface)] text-left cursor-pointer border border-[var(--hud-border)]">
							<span class="truncate text-[var(--hud-text)]">{entry.peer.name}</span>
							<span class="text-[11px] text-[var(--hud-muted)] shrink-0 tabular-nums">L{entry.line}</span>
						</button>
					{/each}
				</HudAccordionSection>
			{/each}
		{/if}
	</div>

	<div class="border-t border-[var(--hud-border)] pt-1.5 flex flex-col gap-1">
		<div class="flex items-center justify-between text-[11px]">
			<span class="text-[var(--hud-accent)] font-semibold">ATN // DEVIATION &amp; AUDIT ({entityAnnotations.length})</span>
			<select bind:value={tagDraft} aria-label="Annotation Tag Kind" class="bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[11px] px-1 py-0.5 text-[var(--hud-text)]">
				<option value={ANNOTATION_KINDS.NOTE}>NOTE</option>
				<option value={ANNOTATION_KINDS.SUPPRESS_RULE}>SUPPRESS_RULE</option>
				<option value={ANNOTATION_KINDS.HOTSPOT_PIN}>HOTSPOT_PIN</option>
			</select>
		</div>
		{#if tagDraft === ANNOTATION_KINDS.SUPPRESS_RULE}
			<div class="grid grid-cols-2 gap-1">
				<select bind:value={templateDraft} aria-label="Deviation Template" class="bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[11px] px-1 py-0.5 text-[var(--hud-text)]">
					<option value={DEVIATION_TEMPLATE_IDS.ARCHITECTURAL_WAIVER}>ARCH_WAIVER</option>
					<option value={DEVIATION_TEMPLATE_IDS.HIS_COMPLEXITY_EXEMPTION}>HIS_EXEMPT</option>
					<option value={DEVIATION_TEMPLATE_IDS.LEGACY_FREEZE}>LEGACY_FREEZE</option>
				</select>
				<input type="text" bind:value={ruleDraft} placeholder="Rule (e.g. CHR-016)" class="bg-[var(--hud-surface)] border border-[var(--hud-border)] px-1 py-0.5 text-[11px] text-[var(--hud-text)]" />
			</div>
		{/if}
		<div class="flex gap-1">
			<input type="text" bind:value={noteDraft} placeholder="Rationale / audit note..." class="flex-1 bg-[var(--hud-surface)] border border-[var(--hud-border)] px-1.5 py-0.5 text-[11px] text-[var(--hud-text)]" />
			<button type="button" onclick={submitAnnotation} class="px-2 py-0.5 bg-[var(--hud-accent)] text-[var(--hud-bg-base)] font-bold text-[11px] cursor-pointer">Pin</button>
		</div>
		{#each entityAnnotations as atn (atn.id)}
			<div class="px-1.5 py-1 bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[11px] flex items-center justify-between gap-1">
				<span class="truncate"><strong class="text-[var(--hud-warning)]">[{atn.templateId ?? atn.tagKind}{atn.ruleCode ? `:${atn.ruleCode}` : ''}]</strong> {atn.note}</span>
				{#if securityWire.conflictEntities.includes(entity.qualifiedName)}
					<span class="px-1 border border-[var(--hud-danger)] text-[var(--hud-danger)] font-bold text-[11px] shrink-0">HLC CONFLICT</span>
				{/if}
			</div>
		{/each}
	</div>
</section>
