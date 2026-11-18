/**
 * @author Oblx <code@oblx.dev>
 * @description Pure Markdown-to-Pedagogy compiler transforming docs/ markdown SSOT files into chapters, sub-steps, tables, and drills via weighted vector scoring.
 */

import { APP_METADATA, type HudViewMode } from '@config/constants';
import { HELP_BOOK_TOKENS } from '@config/hud.tokens';
import {
	inferDocPedagogyRule,
	scoreTargetAnchorVector,
	type DocPedagogyRule,
	type HelpLearningStage,
	type HelpSkillTier,
	type HelpTargetAnchorId,
	type TooltipPlacement,
} from '@config/registries/help.registry';

export type HelpTierFilter = HelpSkillTier | 'ALL';
export interface HelpMicroBullet { readonly term: string; readonly detail: string; }

export interface HelpSubStepSpec {
	readonly id: string;
	readonly chapterId: string;
	readonly stepCode: string;
	readonly title: string;
	readonly keyTakeaway: string;
	readonly formulas: readonly string[];
	readonly bullets: readonly HelpMicroBullet[];
	readonly tableHeaders: readonly string[];
	readonly tableRows: ReadonlyArray<readonly string[]>;
	readonly actionDrill: string;
	readonly anchorId: HelpTargetAnchorId;
	readonly recommendedView: HudViewMode;
	readonly tooltipPlacement: TooltipPlacement;
}

export interface HelpChapterSpec {
	readonly id: string;
	readonly docCode: string;
	readonly docPath: string;
	readonly order: number;
	readonly tier: HelpSkillTier;
	readonly stage: HelpLearningStage;
	readonly domainLabel: string;
	readonly title: string;
	readonly summary: string;
	readonly shortcutKey: string;
	readonly anchorId: HelpTargetAnchorId;
	readonly recommendedView: HudViewMode;
	readonly tooltipPlacement: TooltipPlacement;
	readonly actionDrill: string;
	readonly subSteps: readonly HelpSubStepSpec[];
}

export interface SpotlightRect { readonly top: number; readonly left: number; readonly width: number; readonly height: number; }
export interface TooltipFloatingCoords { readonly top: number; readonly left: number; }

function cleanMdText(raw: string): string {
	return raw.replace(/\bv1\.9\.\d+\b/g, `v${APP_METADATA.VERSION}`).replace(/\*\*/g, '').replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
}

function parseSubStepBlock(chapterId: string, idx: number, rawSection: string, chapterRule: DocPedagogyRule): HelpSubStepSpec {
	const lines = rawSection.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && l !== '---');
	const heading = cleanMdText((lines[0] ?? `Section ${idx + 1}`).replace(/^\d+\.\s*/, ''));
	const bullets: HelpMicroBullet[] = [];
	const rawTableLines: string[] = [];
	const formulas: string[] = [];
	let takeaway = '';

	for (const line of lines.slice(1)) {
		if (line.startsWith('|')) { rawTableLines.push(line); continue; }
		if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
			formulas.push(line.slice(2, -2).trim());
			continue;
		}
		if (line.startsWith('* ') || line.startsWith('- ')) {
			const body = line.slice(2).trim();
			const colonIdx = body.indexOf(':');
			if (colonIdx > 0 && colonIdx < HELP_BOOK_TOKENS.MAX_TERM_COLON_INDEX) {
				const detail = cleanMdText(body.slice(colonIdx + 1));
				if (detail.length > 0) bullets.push({ term: cleanMdText(body.slice(0, colonIdx)), detail });
			} else bullets.push({ term: `Point ${bullets.length + 1}`, detail: cleanMdText(body) });
		} else if (!takeaway && !line.startsWith('>')) takeaway = cleanMdText(line);
	}

	const tableCells = rawTableLines.filter((l) => !l.includes(':---') && !l.includes('---')).map((l) => l.split('|').slice(1, -1).map((c) => cleanMdText(c)));
	const tableHeaders = tableCells[0] ?? [];
	const tableRows = tableCells.slice(1, HELP_BOOK_TOKENS.MAX_TABLE_ROWS + 1);
	if (!takeaway) takeaway = bullets[0]?.detail ?? (tableRows[0] ? `${tableRows[0][0]}: ${tableRows[0][1] ?? ''}` : chapterRule.actionDrill);
	const matchedVec = scoreTargetAnchorVector(`${heading} ${takeaway} ${bullets.map((b) => b.term).join(' ')}`);
	return {
		id: `${chapterId}::sub-${idx + 1}`, chapterId, stepCode: `${chapterId}.${idx + 1}`, title: heading, keyTakeaway: takeaway, formulas,
		bullets: bullets.slice(0, HELP_BOOK_TOKENS.MAX_BULLETS_PER_STEP), tableHeaders, tableRows, actionDrill: matchedVec.drillTemplate || chapterRule.actionDrill,
		anchorId: matchedVec.anchorId, recommendedView: matchedVec.recommendedView, tooltipPlacement: matchedVec.tooltipPlacement,
	};
}

export function parseMarkdownDocIntoChapter(docPath: string, rawMarkdown: string): HelpChapterSpec {
	const lines = rawMarkdown.split('\n');
	const h1 = lines.find((l) => l.startsWith('# '))?.slice(2).trim() ?? docPath;
	const parts = h1.split('//').map((s) => s.trim());
	const docCode = (parts[0]?.match(/^\d{2}(?:-\d{2})?/)?.[0]) ?? '00';
	const title = cleanMdText(parts[1] ?? h1);
	const rule = inferDocPedagogyRule(docCode, rawMarkdown);
	const folderSeg = docPath.split('/').find((s) => /^\d{2}-/.test(s)) ?? '00-index';
	const domainLabel = folderSeg.replace(/^\d{2}-/, '').toUpperCase();
	const rawSections = rawMarkdown.split(/\n##\s+/).slice(1);
	const subSteps = rawSections.map((sec, idx) => parseSubStepBlock(docCode, idx, sec, rule));
	const summary = subSteps[0]?.keyTakeaway ?? rule.actionDrill;
	return {
		id: docCode, docCode, docPath, order: rule.order, tier: rule.tier, stage: rule.stage, domainLabel,
		title: `${docCode} // ${title}`, summary, shortcutKey: rule.shortcutKey, anchorId: rule.anchorId,
		recommendedView: rule.recommendedView, tooltipPlacement: rule.tooltipPlacement, actionDrill: rule.actionDrill, subSteps,
	};
}

export function compileHelpBookFromDocs(rawDocsMap: Readonly<Record<string, string>>): readonly HelpChapterSpec[] {
	const sorted = Object.entries(rawDocsMap)
		.filter(([path]) => path.endsWith('.md') && !path.includes('/skills/') && !path.includes('08-sprints/'))
		.map(([path, content]) => parseMarkdownDocIntoChapter(path, content))
		.sort((a, b) => a.order - b.order || a.docCode.localeCompare(b.docCode));
	return sorted.map((ch, idx) => ({ ...ch, order: idx + 1 }));
}

export function filterHelpChapters(chapters: readonly HelpChapterSpec[], tierFilter: HelpTierFilter = 'ALL', query = ''): readonly HelpChapterSpec[] {
	const needle = query.trim().toLowerCase();
	return chapters.filter((c) => {
		if (tierFilter !== 'ALL' && c.tier !== tierFilter) return false;
		if (!needle) return true;
		const subText = c.subSteps.map((s) => `${s.title} ${s.keyTakeaway} ${s.bullets.map((b) => `${b.term} ${b.detail}`).join(' ')}`).join(' ');
		return `${c.title} ${c.summary} ${c.domainLabel} ${c.shortcutKey} ${subText}`.toLowerCase().includes(needle);
	});
}

export function computeFloatingTooltipPosition(rect: SpotlightRect, placement: TooltipPlacement, viewportW: number, viewportH: number): TooltipFloatingCoords {
	const { CARD_WIDTH_PX: cardW, CARD_HEIGHT_PX: cardH, ANCHOR_GAP_PX: gap, SIDE_OFFSET_Y_PX: offsetY, VIEWPORT_MARGIN_PX: margin } = HELP_BOOK_TOKENS;
	const top = placement === 'TOP' ? rect.top - cardH - gap : placement === 'BOTTOM' ? rect.top + rect.height + gap : rect.top + offsetY;
	const left = placement === 'RIGHT' ? rect.left + rect.width + gap : placement === 'LEFT' ? rect.left - cardW - gap : rect.left;
	return {
		top: Math.round(Math.max(margin, Math.min(top, Math.max(margin, viewportH - cardH - margin)))),
		left: Math.round(Math.max(margin, Math.min(left, Math.max(margin, viewportW - cardW - margin)))),
	};
}
