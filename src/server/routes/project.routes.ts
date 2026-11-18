/**
 * @author Oblx <code@oblx.dev>
 * @description Multi-project CRUD, project_members contextual RBAC assignment, and Diegetic AI Command / Heuristic Chat endpoint (v2.2.0).
 */
import { and, eq } from 'drizzle-orm';
import { API_ROUTES, PROJECT_VISIBILITY, type ProjectVisibility } from '@config/constants';
import { CAPABILITY_BITS } from '@config/security.constants';
import { createChronosAiRegistry } from '@lib/ai/provider/client/ai.bridge';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';
import { deriveShortCodeFromName } from '@lib/db/indexeddb/repository/workspace.idb';
import { projectMembers, projects } from '@lib/db/sqlite/schema/tables';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { evaluateWorkspaceCodeCheck } from '@core/metrics/codecheck.engine';
import { appendAuditEntry } from '@core/security/audit.chain';
import { compileEffectiveUserMask } from '@core/security/chronos.rbac';
import { redactOutboundPayload } from '@core/security/guards/payload.redactor';
import { hasCapability } from '@core/security/rbac.bitmask';
import { executePluggableIngestion, type PluggableIngestRequest } from '@plugins/ingestors';
import { handleGitIngestRoute, handleGitPrPublishRoute } from '../http/git.route';
import { badRequestResponse, okResponse, parseBodyObject, resolveCallerUid, runCapabilityRoute, type ApiResponseEnvelope, type RequestPrincipal } from '../http/middleware';

const DEFAULT_TEAM_PROJECTS = [
	{ id: 1, slug: 'chronos-core', shortCode: 'CHR-CORE', name: 'Chronos Core Workspace', description: 'Primary Chronos Metamodel & HUD Engine', ownerId: 1, visibility: PROJECT_VISIBILITY.INTERNAL, files: 11, entities: 135 },
	{ id: 2, slug: 'payment-api', shortCode: 'PAYMENT-API', name: 'Payment Settlement Mesh', description: 'Zero-trust settlement ledger & HLC journals', ownerId: 1, visibility: PROJECT_VISIBILITY.INTERNAL, files: 8, entities: 64 },
	{ id: 3, slug: 'rust-simd', shortCode: 'RUST-SIMD', name: 'Rust SIMD Kernel', description: 'Vectorized AST tokenizer & bitmask pipeline', ownerId: 2, visibility: PROJECT_VISIBILITY.PUBLIC, files: 6, entities: 48 },
	{ id: 4, slug: 'webgl-engine', shortCode: 'WEBGL-SHDR', name: 'WebGL Shader Pipeline', description: 'Dual-phosphor CRT & spatial grid compositor', ownerId: 1, visibility: PROJECT_VISIBILITY.PRIVATE, files: 5, entities: 39 },
] as const;

export function ensureDefaultProjectsSeeded(handle: ChronosDatabaseHandle, snapshot?: WorkspaceSnapshot): void {
	const now = Date.now();
	for (const p of DEFAULT_TEAM_PROJECTS) {
		if (!handle.db.select().from(projects).where(eq(projects.slug, p.slug)).get()) {
			handle.db.insert(projects).values({
				id: p.id, slug: p.slug, shortCode: p.shortCode, name: p.name, description: p.description,
				ownerId: p.ownerId, visibility: p.visibility, defaultBranch: 'main',
				indexedFilesCount: p.id === 1 && snapshot ? snapshot.indexedFilesCount : p.files,
				entityCount: p.id === 1 && snapshot ? snapshot.nodes.length : p.entities,
				sourceMapJson: '{}', createdAt: now, updatedAt: now,
			}).run();
		}
	}
	if (!handle.db.select().from(projectMembers).where(and(eq(projectMembers.projectId, 1), eq(projectMembers.userId, 1))).get()) {
		handle.db.insert(projectMembers).values({ projectId: 1, userId: 1, groupId: 1, personalOverrideMask: 0, joinedAt: now }).run();
		handle.db.insert(projectMembers).values({ projectId: 2, userId: 2, groupId: 1, personalOverrideMask: 0, joinedAt: now }).run();
	}
}

function buildHeuristicAiResponse(prompt: string, focalEntityId: number | null, snapshot: WorkspaceSnapshot) {
	const q = prompt.trim().toLowerCase(), focal = snapshot.nodes.find((n) => n.id === focalEntityId) ?? snapshot.nodes[0];
	const suite = evaluateWorkspaceCodeCheck(snapshot.nodes, snapshot.edges, snapshot.sourceMap);
	const hotspots = [...snapshot.nodes].sort((a, b) => b.cyclomatic - a.cyclomatic).slice(0, 3);
	const ca = focal ? snapshot.edges.filter((e) => e.targetEntityId === focal.id).length : 0;
	const ce = focal ? snapshot.edges.filter((e) => e.sourceEntityId === focal.id).length : 0;
	const fName = focal?.qualifiedName ?? 'chronos-core';
	const score = Math.max(0, 100 - suite.violations.length * 4);
	if (q.includes('/hotspots') || q.includes('hotspot') || q.includes('complex')) {
		return { mode: 'LOCAL_HEURISTIC' as const, summary: `Top complexity hotspots across ${snapshot.nodes.length} entities: ${hotspots.map((h) => `${h.name} (v(G)=${h.cyclomatic}, LOC=${h.loc})`).join(' · ')}`, bullets: hotspots.map((h) => `${h.qualifiedName} — v(G)=${h.cyclomatic}, V=${h.halsteadVolume}, Ca=${h.afferentCoupling}, Ce=${h.efferentCoupling}`), focalQualifiedName: fName };
	}
	if (q.includes('/cycles') || q.includes('scc') || q.includes('cycle')) {
		return { mode: 'LOCAL_HEURISTIC' as const, summary: snapshot.hasCycles ? 'Tarjan SCC detector flagged cyclic dependencies in active graph.' : `DAG invariant verified: 0 Strongly Connected Component cycles across ${snapshot.edges.length} edges.`, bullets: [`Nodes: ${snapshot.nodes.length} · Edges: ${snapshot.edges.length} · Cycles: ${snapshot.hasCycles ? 'DETECTED' : '0 (Clean DAG)'}`, `Compliance Score: ${score}% (${suite.violations.length} active violations)`], focalQualifiedName: fName };
	}
	if (q.includes('/audit') || q.includes('violation') || q.includes('codecheck')) {
		return { mode: 'LOCAL_HEURISTIC' as const, summary: `Chronos CodeCheck Audit: ${score}% compliance (${suite.violations.length} active violations, ${suite.suppressedCount} suppressed).`, bullets: suite.violations.slice(0, 3).map((v) => `[${v.ruleCode}] ${v.entityName}: ${v.message}`), focalQualifiedName: fName };
	}
	return {
		mode: 'LOCAL_HEURISTIC' as const,
		summary: focal ? `@${focal.name} (${focal.kind}) — LOC:${focal.loc} · v(G):${focal.cyclomatic} · V:${focal.halsteadVolume} · Blast Radius: Ca=${ca} callers, Ce=${ce} callees.` : `Workspace indexed: ${snapshot.nodes.length} entities across ${snapshot.indexedFilesCount} files.`,
		bullets: [focal ? `Qualified: ${focal.qualifiedName} (Instability I=${(focal.instability / 100).toFixed(2)})` : 'Select a focal node to inspect lineage', `Graph Posture: ${snapshot.hasCycles ? 'Cyclic warning' : 'Strict Acyclic DAG'} · Compliance ${score}%`],
		focalQualifiedName: fName,
	};
}

async function handleProjectPost(
	handle: ChronosDatabaseHandle, snapshot: WorkspaceSnapshot, body: Record<string, unknown>,
	method: string, headers: Record<string, string>, principal: RequestPrincipal, uid: number
): Promise<ApiResponseEnvelope> {
	if (String(body.action ?? 'CREATE') === 'ASSIGN_MEMBER') {
		return runCapabilityRoute(principal, method, headers, CAPABILITY_BITS.USER_ROLE_ASSIGN, true, async () => {
			const projectId = Number(body.projectId ?? 1) >>> 0, targetUid = Number(body.userId ?? 2) >>> 0, groupId = Number(body.groupId ?? 2) >>> 0;
			const overrideMask = Number(body.personalOverrideMask ?? 0) >>> 0;
			handle.db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetUid))).run();
			handle.db.insert(projectMembers).values({ projectId, userId: targetUid, groupId, personalOverrideMask: overrideMask, joinedAt: Date.now() }).run();
			const effectiveMask = compileEffectiveUserMask(handle, targetUid, { workspaceContextId: projectId });
			await appendAuditEntry(handle, principal.userId, 'PROJECT_MEMBER_ASSIGNED', 'INFO', `Assigned uid=${targetUid} to project=${projectId} group=${groupId}`);
			return okResponse({ assigned: true, projectId, userId: targetUid, groupId, effectiveMask });
		});
	}
	const name = String(body.name ?? '').trim();
	if (!name) return badRequestResponse('Project name is required.');
	const slug = String(body.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 48) || `proj-${Date.now()}`;
	const shortCode = String(body.shortCode ?? deriveShortCodeFromName(name)).toUpperCase().slice(0, 12);
	const projectIdentityKey = String(body.projectIdentityKey ?? `local:${slug}`);
	const visibility = (body.visibility as ProjectVisibility) ?? PROJECT_VISIBILITY.INTERNAL;
	const now = Date.now(), ownerUid = uid || 1;
	const existing = handle.db.select().from(projects).where(eq(projects.projectIdentityKey, projectIdentityKey)).get() ?? handle.db.select().from(projects).where(eq(projects.slug, slug)).get();
	const upserted = existing
		? handle.db.update(projects).set({ name, shortCode, indexedFilesCount: Number(body.indexedFilesCount ?? snapshot.indexedFilesCount), entityCount: Number(body.entityCount ?? snapshot.nodes.length), snapshotRevision: (existing.snapshotRevision ?? 1) + 1, updatedAt: now }).where(eq(projects.id, existing.id)).returning().get()!
		: handle.db.insert(projects).values({ slug, shortCode, projectIdentityKey, name, description: String(body.description ?? name), ownerId: ownerUid, visibility, defaultBranch: String(body.defaultBranch ?? 'main'), indexedFilesCount: Number(body.indexedFilesCount ?? snapshot.indexedFilesCount), entityCount: Number(body.entityCount ?? snapshot.nodes.length), snapshotRevision: 1, sourceMapJson: '{}', createdAt: now, updatedAt: now }).returning().get();
	if (!handle.db.select().from(projectMembers).where(and(eq(projectMembers.projectId, upserted.id), eq(projectMembers.userId, ownerUid))).get()) {
		handle.db.insert(projectMembers).values({ projectId: upserted.id, userId: ownerUid, groupId: 1, personalOverrideMask: 0, joinedAt: now }).run();
	}
	return okResponse({ project: upserted, effectiveMask: compileEffectiveUserMask(handle, ownerUid, { workspaceContextId: upserted.id }) });
}

export async function handleProjectAndAiRoutes(
	handle: ChronosDatabaseHandle, snapshot: WorkspaceSnapshot, urlPath: string, method: string,
	bodyText: string | undefined, headers: Record<string, string>, principal: RequestPrincipal
): Promise<ApiResponseEnvelope | null> {
	ensureDefaultProjectsSeeded(handle, snapshot);
	if (urlPath.startsWith(API_ROUTES.INGEST_GIT) && method === 'POST') return handleGitIngestRoute(handle, bodyText, method, headers, principal);
	if (urlPath.startsWith(API_ROUTES.INGEST_UNIFIED) && method === 'POST') {
		return runCapabilityRoute(principal, method, headers, CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE, false, async () => {
			const outcome = await executePluggableIngestion(handle, snapshot, parseBodyObject(bodyText) as unknown as PluggableIngestRequest);
			return okResponse(outcome);
		});
	}
	if (urlPath.startsWith(API_ROUTES.GIT_PR) && method === 'POST') return handleGitPrPublishRoute(handle, snapshot, bodyText, method, headers, principal);
	if (urlPath.startsWith(API_ROUTES.PROJECTS)) {
		const uid = resolveCallerUid(handle, principal);
		if (method === 'GET') {
			const allProjs = handle.db.select().from(projects).all(), memberships = handle.db.select().from(projectMembers).all();
			const visible = allProjs.filter((p) => p.visibility !== 'PRIVATE' || p.ownerId === uid || memberships.some((m) => m.projectId === p.id && m.userId === uid));
			return okResponse({ projects: visible, memberships });
		}
		if (method === 'POST') return handleProjectPost(handle, snapshot, parseBodyObject(bodyText), method, headers, principal, uid);
	}
	if (urlPath.startsWith(API_ROUTES.AI_CHAT) && method === 'POST') {
		const body = parseBodyObject(bodyText);
		const redaction = redactOutboundPayload(String(body.prompt ?? '/explain').trim());
		const prompt = redaction.redactedText;
		const focalId = body.focalEntityId !== undefined && body.focalEntityId !== null ? Number(body.focalEntityId) : null;
		const heuristic = buildHeuristicAiResponse(prompt, focalId, snapshot);
		if (body.providerUrl && hasCapability(principal.effectiveMask, CAPABILITY_BITS.AI_BRIDGE_INVOKE)) {
			const ai = createChronosAiRegistry({ provider_url: String(body.providerUrl), provider_bearer: String(body.providerBearer ?? '') });
			const reply = await ai.client.complete(prompt);
			if (reply) return okResponse({ ...heuristic, mode: 'LIVE_AI_BRIDGE', summary: reply, privacyShield: redaction });
		}
		return okResponse({ ...heuristic, privacyShield: redaction });
	}
	return null;
}
