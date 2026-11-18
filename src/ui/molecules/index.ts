/**
 * @author Oblx <code@oblx.dev>
 * @description Barrel export for @chronos-ui/svelte molecules.
 */
export { default as UiAnimatedResizeBody } from './UiAnimatedResizeBody.svelte';
export { default as UiSubTabBar } from './UiSubTabBar.svelte';
export { default as UiHorizontalDeck } from './UiHorizontalDeck.svelte';
export { default as UiAccordionSection } from './UiAccordionSection.svelte';
export { default as UiCyberTooltip } from './UiCyberTooltip.svelte';
export { default as UiContextMenu } from './UiContextMenu.svelte';

export interface UiSubTabItem {
	id: string;
	label: string;
	badge?: string | number;
	icon?: string;
}

export interface UiContextMenuAction {
	id: string;
	label: string;
	shortcut?: string;
	danger?: boolean;
}

