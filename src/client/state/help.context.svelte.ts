/**
 * @author Oblx <code@oblx.dev>
 * @description Live contextual help router mapping active view, modal, and edge drawer tabs to Field Tome chapters with 2.4s glitter burst signal.
 */
import { HUD_VIEWS, type HudViewMode } from '@config/constants';
import { HUD_MODALS, type HudModalId } from '@config/hud.events';
import { HUD_INTENT_KINDS, HUD_ZONES } from '@config/hud.tokens';
import { clientDagKernel } from './dag/client.kernel.svelte';

export interface HelpContextTarget {
	readonly chapterId: string;
	readonly sectionIndex: number;
	readonly topicTitle: string;
	readonly shortcutHint: string;
}

const MODAL_HELP_MAP: Partial<Record<HudModalId, HelpContextTarget>> = {
	[HUD_MODALS.WORKSPACE_INGEST]: { chapterId: '04-02', sectionIndex: 0, topicTitle: 'Workspace Ingest & Git Smart HTTP', shortcutHint: '7' },
	[HUD_MODALS.INSTANT_SEARCH]: { chapterId: '02-02', sectionIndex: 0, topicTitle: 'Instant Search & Query Algebra', shortcutHint: 'Ctrl+K' },
	[HUD_MODALS.DEVIATION_SIGN_OFF]: { chapterId: '03-04', sectionIndex: 0, topicTitle: 'CodeCheck Rules & Deviations', shortcutHint: 'ATN' },
	[HUD_MODALS.ACHIEVEMENT_VAULT]: { chapterId: '05-03', sectionIndex: 0, topicTitle: 'Card Vault & Cubic XP Matrix', shortcutHint: 'A' },
	[HUD_MODALS.AUTH_LOBBY]: { chapterId: '01-04', sectionIndex: 0, topicTitle: 'Security RBAC & Zero-Trust Vault', shortcutHint: 'AUTH' },
	[HUD_MODALS.COLLAB_SOCIAL]: { chapterId: '01-02', sectionIndex: 0, topicTitle: 'WebSocket CRDT Collaboration', shortcutHint: 'WS' },
	[HUD_MODALS.WIRE_OBSERVATORY]: { chapterId: '01-06', sectionIndex: 0, topicTitle: 'Dual-Spine Observable Event DAG', shortcutHint: 'W' },
	[HUD_MODALS.SETTINGS]: { chapterId: '05-01', sectionIndex: 0, topicTitle: 'HUD Ergonomics & Calibration', shortcutHint: ',' },
	[HUD_MODALS.STATIONS_LAUNCHER]: { chapterId: '05-02', sectionIndex: 0, topicTitle: 'Stations Directory & Hotbar', shortcutHint: 'S' },
};

const VIEW_HELP_MAP: Readonly<Record<HudViewMode, HelpContextTarget>> = {
	[HUD_VIEWS.CODEMAP]: { chapterId: '02-04', sectionIndex: 0, topicTitle: 'Full-Project ELK Codemap', shortcutHint: '1' },
	[HUD_VIEWS.BUTTERFLY]: { chapterId: '02-01', sectionIndex: 0, topicTitle: 'Butterfly Call Graph', shortcutHint: '2' },
	[HUD_VIEWS.UML_CLASS]: { chapterId: '02-03', sectionIndex: 0, topicTitle: 'UML Class Architecture', shortcutHint: '7' },
	[HUD_VIEWS.UML_SEQUENCE]: { chapterId: '02-03', sectionIndex: 1, topicTitle: 'UML Sequence Lifelines', shortcutHint: '7' },
	[HUD_VIEWS.SHARED_OBJECTS]: { chapterId: '02-03', sectionIndex: 2, topicTitle: 'Shared Objects Contention', shortcutHint: '7' },
	[HUD_VIEWS.DATA_FLOW]: { chapterId: '04-04', sectionIndex: 0, topicTitle: 'Data-Flow Lineage & HIS Safety', shortcutHint: '3' },
	[HUD_VIEWS.CONTROL_FLOW]: { chapterId: '04-05', sectionIndex: 0, topicTitle: 'Control-Flow & Virtual Debugger', shortcutHint: '4' },
	[HUD_VIEWS.TREEMAP]: { chapterId: '03-03', sectionIndex: 0, topicTitle: 'Squarified Cushion Treemap', shortcutHint: '5' },
	[HUD_VIEWS.DSM]: { chapterId: '03-02', sectionIndex: 0, topicTitle: 'Layered DSM & Tarjan Cycles', shortcutHint: '6' },
	[HUD_VIEWS.MATRIX]: { chapterId: '03-02', sectionIndex: 0, topicTitle: 'Layered DSM & Tarjan Cycles', shortcutHint: '6' },
	[HUD_VIEWS.MERMAID]: { chapterId: '02-05', sectionIndex: 0, topicTitle: 'Bidirectional Mermaid Studio', shortcutHint: '8' },
	[HUD_VIEWS.INSPECTOR]: { chapterId: '04-01', sectionIndex: 0, topicTitle: 'Polyglot AST & Source Span Viewer', shortcutHint: '9' },
};

export function resolveContextualHelpTarget(opts: {
	readonly activeView: HudViewMode;
	readonly activeModal: HudModalId;
	readonly rightTab?: string;
	readonly leftTab?: string;
}): HelpContextTarget {
	if (opts.activeModal !== HUD_MODALS.NONE && opts.activeModal !== HUD_MODALS.SSOT_HELP_BOOK) {
		const modalMatch = MODAL_HELP_MAP[opts.activeModal];
		if (modalMatch) return modalMatch;
	}
	if (opts.rightTab === 'FORENSIC' && opts.activeModal === HUD_MODALS.NONE && opts.activeView === HUD_VIEWS.BUTTERFLY) {
		return { chapterId: '03-04', sectionIndex: 0, topicTitle: 'Forensic Metrics & CodeCheck', shortcutHint: '3' };
	}
	return VIEW_HELP_MAP[opts.activeView] ?? { chapterId: '00-01', sectionIndex: 0, topicTitle: 'Chronos Field Tome', shortcutHint: 'F1' };
}

class HelpContextTracker {
	current = $state<HelpContextTarget>({ chapterId: '02-01', sectionIndex: 0, topicTitle: 'Butterfly Call Graph', shortcutHint: 'F1' });
	glitterActive = $state<boolean>(false);
	glitterKey = $state<number>(0);
	private timer: ReturnType<typeof setTimeout> | null = null;
	private initialized = false;
	private lastKey = '02-01:0';
	private seq = 0;

	syncContext(opts: {
		readonly activeView: HudViewMode;
		readonly activeModal: HudModalId;
		readonly kineticMotionEnabled: boolean;
		readonly rightTab?: string;
		readonly leftTab?: string;
	}): void {
		const next = resolveContextualHelpTarget(opts);
		const nextKey = `${next.chapterId}:${next.sectionIndex}`;
		const changed = nextKey !== this.lastKey;
		if (!this.initialized) {
			this.initialized = true;
			if (changed) { this.lastKey = nextKey; this.current = next; }
			return;
		}
		if (!changed) return;
		this.lastKey = nextKey;
		this.current = next;
		clientDagKernel.dispatch({
			intentKind: HUD_INTENT_KINDS.HELP_CONTEXT_SHIFTED,
			sourceZone: HUD_ZONES.TOP_RIGHT,
			payload: { chapterId: next.chapterId, sectionIndex: next.sectionIndex, topicTitle: next.topicTitle },
		});
		if (!opts.kineticMotionEnabled) { this.glitterActive = false; return; }
		this.triggerGlitterBurst();
	}

	triggerGlitterBurst(): void {
		if (this.timer) clearTimeout(this.timer);
		this.glitterKey = ++this.seq;
		this.glitterActive = true;
		this.timer = setTimeout(() => { this.glitterActive = false; this.timer = null; }, 2400);
	}
}

export const helpContext = new HelpContextTracker();
