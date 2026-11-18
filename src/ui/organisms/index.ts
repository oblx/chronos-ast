/**
 * @author Oblx <code@oblx.dev>
 * @description Barrel export for @chronos-ui/svelte organisms.
 */
export { default as UiPerimeterHud } from './UiPerimeterHud.svelte';
export { default as UiEdgeDrawer } from './UiEdgeDrawer.svelte';
export { default as UiSpotlightVeil } from './UiSpotlightVeil.svelte';
export { default as UiBentoRadar } from './UiBentoRadar.svelte';
export { default as UiVirtualCursors } from './UiVirtualCursors.svelte';
export { default as UiToastStack } from './UiToastStack.svelte';
export { default as UiWireInspector } from './UiWireInspector.svelte';

export interface UiRemoteCursor {
	id: string;
	label: string;
	color: string;
	x: number;
	y: number;
}

export interface UiToastItem {
	id: string;
	title: string;
	detail?: string;
	tone?: 'cyan' | 'amber' | 'emerald' | 'rose';
}

