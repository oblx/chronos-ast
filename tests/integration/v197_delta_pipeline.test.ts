/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.9.7 Scoped Verification Gate: SSG Tome (34ch), 08-sprints Archive, Contextual Glitter Help, Horizontal Settings, Treemap archMode, Multi-Forge Git v1/v2 & Audit.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { APP_METADATA, HUD_VIEWS } from '@config/constants';
import { TOME_SSG_CHAPTERS } from '@config/help/index';
import { HUD_MODALS } from '@config/hud.events';
import { HUD_INTENT_KINDS } from '@config/hud/hud.intents';
import { ARCH_GROUPING_MODES } from '@config/registries/architecture.schema';
import { computeHierarchicalTreemap } from '@core/graph/projections/treemap.layout';
import { parseRemoteGitUrl } from '@core/metamodel/workspace/ingestion/git.url';
import * as gitPack from '@core/metamodel/workspace/ingestion/git_pack.parser';
import { createChronosDb } from '@lib/db/sqlite/client/connection';
import { EMBEDDED_MULTI_LANG_SAMPLES } from '@core/metamodel/workspace.sources';
import { indexSourcesIntoDb } from '@core/metamodel/workspace.indexer';
import { helpContext, resolveContextualHelpTarget } from '@client/state/help.context.svelte';
import { hudWire } from '@client/state/hud.wire.svelte';
import { runCodebaseInvariantAudit } from '../../src/workers/auditor/invariant.auditor';

describe('Chronos v1.9.7 Master Architectural Alignment & Delta Pipeline Seal', () => {
	test('1. SemVer 1.9.7 lock, 34-chapter Static SSG Tome & 17-file docs/08-sprints archive', () => {
		expect(APP_METADATA.VERSION).toBe('1.9.7');
		expect(TOME_SSG_CHAPTERS).toHaveLength(34);
		expect(TOME_SSG_CHAPTERS.some((c) => c.docPath.includes('08-sprints'))).toBe(false);
		const sprintFiles = Array.from(new Bun.Glob('**/*.md').scanSync({ cwd: 'docs/08-sprints' }));
		expect(sprintFiles).toHaveLength(17);

		const helpModalSrc = readFileSync('src/client/components/molecules/tome/HelpCenterModal.svelte', 'utf8');
		expect(helpModalSrc).toContain('TOME_SSG_CHAPTERS');
		expect(helpModalSrc).toContain('hudWire.helpTargetRequest');
		expect(helpModalSrc.includes('import.meta.glob')).toBe(false);
	});

	test('2. Contextual Help Router, Glitter Signal, OPEN_CONTEXTUAL_HELP & Horizontal Bento Settings contract', () => {
		const settingsTarget = resolveContextualHelpTarget({ activeView: HUD_VIEWS.CODEMAP, activeModal: HUD_MODALS.SETTINGS });
		expect(settingsTarget.chapterId).toBe('05-01');
		const treemapTarget = resolveContextualHelpTarget({ activeView: HUD_VIEWS.TREEMAP, activeModal: HUD_MODALS.NONE });
		expect(treemapTarget.chapterId).toBe('03-03');

		helpContext.syncContext({ activeView: HUD_VIEWS.BUTTERFLY, activeModal: HUD_MODALS.NONE, kineticMotionEnabled: true });
		helpContext.syncContext({ activeView: HUD_VIEWS.DSM, activeModal: HUD_MODALS.NONE, kineticMotionEnabled: true });
		expect(helpContext.current.chapterId).toBe('03-02');
		expect(helpContext.glitterActive).toBe(true);

		hudWire.openContextualHelp({ chapterId: treemapTarget.chapterId, sectionIndex: 0, topicTitle: treemapTarget.topicTitle });
		expect(hudWire.helpTargetRequest?.chapterId).toBe('03-03');
		expect(hudWire.lastIntent?.intentKind).toBe(HUD_INTENT_KINDS.OPEN_CONTEXTUAL_HELP);

		const settingsSrc = readFileSync('src/client/components/modals/settings/SettingsModal.svelte', 'utf8');
		expect(settingsSrc).toContain('title="Settings"');
		expect(settingsSrc).toContain('APPEARANCE · ACCESSIBILITY · ENGINES · SECURITY & PRIVACY');
		expect(settingsSrc).toContain('data-testid="settings-bento-body"');
		expect(settingsSrc.includes('overflow-y-auto')).toBe(false);
	});

	test('3. Treemap archMode grouping, Multi-Forge parseRemoteGitUrl & Smart HTTP v1/v2 pkt-line fallback', () => {
		const db = createChronosDb(':memory:');
		const snap = indexSourcesIntoDb(db, EMBEDDED_MULTI_LANG_SAMPLES);
		const customTree = computeHierarchicalTreemap(snap.nodes, {}, 860, 480, 'LOC', 'CYCLOMATIC', null, ARCH_GROUPING_MODES.CUSTOM_RULES);
		const langTree = computeHierarchicalTreemap(snap.nodes, {}, 860, 480, 'LOC', 'CYCLOMATIC', null, ARCH_GROUPING_MODES.LANGUAGE);
		const dirTree = computeHierarchicalTreemap(snap.nodes, {}, 860, 480, 'LOC', 'CYCLOMATIC', null, ARCH_GROUPING_MODES.DIRECTORY);
		expect(langTree.containers.some((c) => c.containerName.startsWith('LANG //'))).toBe(true);
		expect(langTree.containers.map((c) => c.containerName)).not.toEqual(customTree.containers.map((c) => c.containerName));
		expect(dirTree.containers.length).toBeGreaterThan(0);
		db.sqlite.close();

		const gh = parseRemoteGitUrl('https://github.com/oblx/chronos.git');
		const gl = parseRemoteGitUrl('https://gitlab.com/org/platform/sub/chronos-engine/-/tree/dev/src/core');
		const bb = parseRemoteGitUrl('https://bitbucket.org/team/atlas/src/main/lib');
		const cb = parseRemoteGitUrl('https://codeberg.org/forge-org/tool.git');
		const sr = parseRemoteGitUrl('https://git.sr.ht/~oblx/chronos');
		const selfHosted = parseRemoteGitUrl('https://git.corp.local:8443/core/kernel/repo.git');
		expect(gh.forge).toBe('GITHUB');
		expect(gl.forge).toBe('GITLAB'); expect(gl.owner).toBe('org/platform/sub'); expect(gl.ref).toBe('dev'); expect(gl.subpath).toBe('src/core');
		expect(bb.forge).toBe('BITBUCKET'); expect(bb.archiveUrls[0]).toContain('/get/main.zip');
		expect(cb.forge).toBe('GITEA');
		expect(sr.forge).toBe('SOURCEHUT'); expect(sr.owner).toBe('~oblx');
		expect(selfHosted.forge).toBe('GENERIC_GIT'); expect(selfHosted.host).toBe('git.corp.local:8443');

		const oid = 'a'.repeat(40);
		expect(gitPack.isSmartHttpV2Advertisement(new TextEncoder().encode('000eversion 2\n'))).toBe(true);
		expect(gitPack.isSmartHttpV2Advertisement(new TextEncoder().encode(`003f${oid} refs/heads/main\0multi_ack\n`))).toBe(false);
		expect(gitPack.extractRefOidFromInfoRefs(new TextEncoder().encode(`003f${oid} refs/heads/main\0multi_ack\n`), 'main')).toBe(oid);
		expect(new TextDecoder().decode(gitPack.encodeSmartV1Want(oid))).toContain(`want ${oid}`);
	});

	test('4. Full codebase invariant audit passes under v1.9.7 lock', async () => {
		const audit = await runCodebaseInvariantAudit('src', 'docs');
		if (!audit.passed) console.error('Invariant audit failures:', audit);
		expect(audit.passed).toBe(true);
	});
});
