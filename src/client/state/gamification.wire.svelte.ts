/**
 * @author Oblx <code@oblx.dev>
 * @description Svelte 5 Reactive Wire for Chronos Cubic Progression: XP progress, leveled cards, phosphor sparks & toast alerts.
 */
import { ACHIEVEMENT_CARDS, type CardTierLevel } from '@config/gamification/gamification.registry';
import { calculateLevelFromXp, type GamificationLevelProgress } from '@core/gamification/xp.curve';
import { defaultGamificationInterceptor, type GamificationAwardResult } from '@plugins/gamification/gamification.interceptor';

export interface GamificationSparkPill {
	readonly id: number;
	readonly xp: number;
	readonly sourceZone: string;
	readonly x: number;
	readonly y: number;
}

export interface GamificationCelebrationToast {
	readonly id: number;
	readonly level: number;
	readonly cardTitle?: string;
	readonly message: string;
}

let nextSeq = 1;
const STORAGE_KEY = 'chronos_gamification_v1';

class ChronosGamificationWire {
	totalXp = $state<number>(0);
	levelMeta = $derived<GamificationLevelProgress>(calculateLevelFromXp(this.totalXp));
	cardLevels = $state<Record<string, CardTierLevel>>({});
	cardProgress = $state<Record<string, number>>({});
	sparkPills = $state<readonly GamificationSparkPill[]>([]);
	celebrationToast = $state<GamificationCelebrationToast | null>(null);

	constructor() {
		this.loadLocalState();
	}

	private loadLocalState(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				this.totalXp = Number(parsed.totalXp ?? 0);
				this.cardLevels = parsed.cardLevels ?? {};
				this.cardProgress = parsed.cardProgress ?? {};
				defaultGamificationInterceptor.setUserState(this.totalXp, this.cardProgress);
			}
		} catch {}
	}

	saveLocalState(): void {
		if (typeof localStorage === 'undefined') return;
		try {
			const data = { totalXp: this.totalXp, cardLevels: this.cardLevels, cardProgress: this.cardProgress };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch {}
	}

	awardEvent(eventKind: string, sourceZone: string = 'WORLD_CANVAS', coords?: { x: number; y: number }): GamificationAwardResult | null {
		const res = defaultGamificationInterceptor.intercept({ kind: eventKind, timestamp: Date.now() });
		if (!res) return null;

		this.totalXp = res.newTotalXp;
		if (coords) this.triggerSparkPill(res.awardedXp, sourceZone, coords.x, coords.y);

		if (res.levelUp) {
			this.celebrationToast = { id: nextSeq++, level: res.newLevel, message: `Reached Level ${res.newLevel}!` };
			setTimeout(() => { if (this.celebrationToast?.level === res.newLevel) this.celebrationToast = null; }, 3500);
		}

		for (const cl of res.cardLevelUps) {
			this.cardLevels = { ...this.cardLevels, [cl.cardId]: cl.newLevel as CardTierLevel };
			const card = ACHIEVEMENT_CARDS.find((c) => c.id === cl.cardId);
			if (card) {
				this.celebrationToast = { id: nextSeq++, level: cl.newLevel, cardTitle: card.title, message: `Card Unlocked: ${card.title} (Tier ${cl.newLevel})` };
				setTimeout(() => { this.celebrationToast = null; }, 3500);
			}
		}

		this.saveLocalState();
		return res;
	}

	triggerSparkPill(xp: number, sourceZone: string, x: number, y: number): void {
		const pill: GamificationSparkPill = { id: nextSeq++, xp, sourceZone, x: Math.round(x), y: Math.round(y) };
		this.sparkPills = [...this.sparkPills.slice(-4), pill];
		setTimeout(() => { this.sparkPills = this.sparkPills.filter((p) => p.id !== pill.id); }, 1400);
	}

	dismissToast(): void {
		this.celebrationToast = null;
	}
}

export const gamificationWire = new ChronosGamificationWire();
