/**
 * @author Oblx <code@oblx.dev>
 * @description Headless Svelte 5 Runes horizontal snap carousel state machine.
 */

export function createCarouselMachine(initialPageSize = 6) {
	let page = $state(0);
	let pageSize = $state(Math.max(1, initialPageSize));
	let totalItems = $state(0);

	const pageCount = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));
	const clampedPage = $derived(Math.min(page, pageCount - 1));

	return {
		get page() { return clampedPage; },
		get pageSize() { return pageSize; },
		get pageCount() { return pageCount; },
		get canPrev() { return clampedPage > 0; },
		get canNext() { return clampedPage + 1 < pageCount; },
		setTotalItems(count: number): void { totalItems = Math.max(0, count); },
		setPage(next: number): void { page = Math.max(0, Math.min(pageCount - 1, next)); },
		prev(): void { page = Math.max(0, clampedPage - 1); },
		next(): void { page = Math.min(pageCount - 1, clampedPage + 1); },
	};
}
