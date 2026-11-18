/**
 * @author Oblx <code@oblx.dev>
 * @description Headless Svelte 5 Runes modal state machine with countdown lock and focus management.
 */

export function createModalMachine<TModalId extends string = string>(initialModal: TModalId) {
	let activeModal = $state<TModalId>(initialModal);
	let activeSubTab = $state<string>('');
	let lockRemainingMs = $state<number>(0);

	return {
		get activeModal() { return activeModal; },
		get activeSubTab() { return activeSubTab; },
		get lockRemainingMs() { return lockRemainingMs; },
		open(modalId: TModalId, subTab = ''): void {
			activeModal = modalId;
			if (subTab) activeSubTab = subTab;
		},
		close(noneId: TModalId): void {
			if (lockRemainingMs > 0) return;
			activeModal = noneId;
		},
		setSubTab(subTab: string): void {
			activeSubTab = subTab;
		},
		setLockMs(ms: number): void {
			lockRemainingMs = Math.max(0, ms);
		},
	};
}
