/**
 * @author Oblx <code@oblx.dev>
 * @description Workspace portable bundle serializer hardened against prototype-pollution keys.
 */
import { APP_METADATA } from '@config/constants';
import type { WorkspaceSnapshot } from '@core/metamodel/workspace.indexer';
import { parseSafeJson } from '@lib/utils/log.sanitizer';

export interface PortableWorkspaceBundle {
	readonly format: 'CHRONOS_WORKSPACE_BUNDLE_V1';
	readonly version: string;
	readonly workspaceId: string;
	readonly workspaceName: string;
	readonly exportedAt: number;
	readonly snapshot: WorkspaceSnapshot;
}

export function serializeWorkspaceBundle(
	workspaceId: string,
	workspaceName: string,
	snapshot: WorkspaceSnapshot
): PortableWorkspaceBundle {
	return {
		format: 'CHRONOS_WORKSPACE_BUNDLE_V1',
		version: APP_METADATA.VERSION,
		workspaceId,
		workspaceName,
		exportedAt: Date.now(),
		snapshot,
	};
}

export function deserializeWorkspaceBundle(rawJson: string): PortableWorkspaceBundle {
	const parsed = parseSafeJson<Partial<PortableWorkspaceBundle>>(rawJson);
	if (parsed.snapshot && Array.isArray(parsed.snapshot.nodes) && Array.isArray(parsed.snapshot.edges)) {
		return {
			format: 'CHRONOS_WORKSPACE_BUNDLE_V1',
			version: parsed.version ?? APP_METADATA.VERSION,
			workspaceId: parsed.workspaceId ?? `ws-import-${Date.now()}`,
			workspaceName: parsed.workspaceName ?? 'Imported Workspace',
			exportedAt: parsed.exportedAt ?? Date.now(),
			snapshot: parsed.snapshot,
		};
	}
	throw new Error('Invalid Chronos Workspace Bundle JSON: missing snapshot.nodes or snapshot.edges.');
}
