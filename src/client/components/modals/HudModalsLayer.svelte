<!--
	@author Oblx <code@oblx.dev>
	@description Zone 11 APP_MODAL stack orchestrator mounting Stations, Settings, Auth Lobby, Deviation Sign-Off, Help Book, Instant Search, and Workspace Ingest.
-->
<script lang="ts">
	import type { DeviationTemplateId } from '@config/registries/annotation.templates';
	import type { GraphEngineMode } from '@config/constants';
	import { HUD_MODALS, type StationActionKind } from '@config/hud.events';
	import type { AnnotationKind } from '@config/metamodel.constants';
	import { hudWire, type GraphEntityNode, type SourceFileUnit } from '@client/state';
	import StationsModal from './collab/StationsModal.svelte';
	import SettingsModal from './settings/SettingsModal.svelte';
	import AuthLobbyModal from './lobby/AuthLobbyModal.svelte';
	import DeviationSignOffModal from './vault/DeviationSignOffModal.svelte';
	import HelpCenterModal from '@client/components/molecules/tome/HelpCenterModal.svelte';
	import InstantSearchModal from '@client/components/molecules/overlays/InstantSearchModal.svelte';
	import WorkspaceImportModal from '@client/components/molecules/workspace/WorkspaceImportModal.svelte';
	import AchievementVaultModal from './vault/AchievementVaultModal.svelte';
	import CollabSocialModal from './collab/CollabSocialModal.svelte';
	import WireObservatoryModal from './collab/WireObservatoryModal.svelte';

	interface Props {
		activeEntity: GraphEntityNode | undefined;
		nodes: readonly GraphEntityNode[];
		sourceMap: Readonly<Record<string, string>>;
		workspaceIds?: readonly string[];
		modalExportJson: string;
		providerUrl: string;
		providerBearer: string;
		graphEngine: GraphEngineMode;
		useHisSafetyProfile: boolean;
		onSelectEntity: (id: number) => void;
		onExecuteStationAction: (action: StationActionKind) => void;
		onAddAnnotation: (tagKind: AnnotationKind, note: string, ruleCode: string | null, templateId?: DeviationTemplateId | null, ticketId?: string | null) => void;
		onImportBundleJson: (rawJson: string) => Promise<void>;
		onUploadZipBytes: (zipBytes: Uint8Array, workspaceName: string) => Promise<void>;
		onUploadSourceFiles: (workspaceName: string, files: readonly SourceFileUnit[]) => Promise<void>;
		onIngestSampleZip: () => Promise<void>;
		onIngestRemoteUrl: (url: string, workspaceName?: string) => Promise<void>;
		onIngestGitRepo?: (repoUrl: string, branchOrRef?: string, vaultSecretId?: string) => Promise<void>;
		onSaveAiConfig: (url: string, bearer: string) => void;
		onToggleEngine: () => void;
		onToggleHisProfile: () => void;
		onReindexWorkspace: () => Promise<void>;
	}

	let { activeEntity, nodes, sourceMap, workspaceIds = [], modalExportJson, providerUrl, providerBearer, graphEngine, useHisSafetyProfile, onSelectEntity, onExecuteStationAction, onAddAnnotation, onImportBundleJson, onUploadZipBytes, onUploadSourceFiles, onIngestSampleZip, onIngestRemoteUrl, onIngestGitRepo, onSaveAiConfig, onToggleEngine, onToggleHisProfile, onReindexWorkspace }: Props = $props();
</script>

<StationsModal isOpen={hudWire.activeModal === HUD_MODALS.STATIONS_LAUNCHER} onClose={() => hudWire.closeModal()} onExecuteAction={onExecuteStationAction} />
<SettingsModal isOpen={hudWire.activeModal === HUD_MODALS.SETTINGS} {graphEngine} {useHisSafetyProfile} {workspaceIds} onClose={() => hudWire.closeModal()} {onToggleEngine} {onToggleHisProfile} {onReindexWorkspace} />
<AuthLobbyModal isOpen={hudWire.activeModal === HUD_MODALS.AUTH_LOBBY} {workspaceIds} onClose={() => hudWire.closeModal()} />
<DeviationSignOffModal isOpen={hudWire.activeModal === HUD_MODALS.DEVIATION_SIGN_OFF} entity={activeEntity} onClose={() => hudWire.closeModal()} onSubmit={onAddAnnotation} />
<HelpCenterModal isOpen={hudWire.activeModal === HUD_MODALS.SSOT_HELP_BOOK} activeView={hudWire.activeView} onClose={() => hudWire.closeModal()} onSelectView={(v) => hudWire.selectView(v)} />
<InstantSearchModal isOpen={hudWire.activeModal === HUD_MODALS.INSTANT_SEARCH} {nodes} {sourceMap} onClose={() => hudWire.closeModal()} onSelectHit={(id) => onSelectEntity(id)} />
<WorkspaceImportModal isOpen={hudWire.activeModal === HUD_MODALS.WORKSPACE_INGEST} exportedJson={modalExportJson} {providerUrl} {providerBearer} onClose={() => hudWire.closeModal()} {onImportBundleJson} {onUploadZipBytes} {onUploadSourceFiles} {onIngestSampleZip} {onIngestRemoteUrl} {onIngestGitRepo} {onSaveAiConfig} />
<AchievementVaultModal isOpen={hudWire.activeModal === HUD_MODALS.ACHIEVEMENT_VAULT} onClose={() => hudWire.closeModal()} />
<CollabSocialModal isOpen={hudWire.activeModal === HUD_MODALS.COLLAB_SOCIAL} activeEntityName={activeEntity?.name} onClose={() => hudWire.closeModal()} />
<WireObservatoryModal isOpen={hudWire.activeModal === HUD_MODALS.WIRE_OBSERVATORY} onClose={() => hudWire.closeModal()} />
