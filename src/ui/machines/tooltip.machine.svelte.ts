/**
 * @author Oblx <code@oblx.dev>
 * @description Headless Svelte 5 Runes tooltip state machine and use:uiTooltip action.
 */

export interface UiTooltipSpec {
	readonly label: string;
	readonly keycap?: string;
}

export function createTooltipMachine() {
	let visible = $state(false);
	let label = $state('');
	let keycap = $state('');
	let x = $state(0);
	let y = $state(0);

	return {
		get visible() { return visible; },
		get label() { return label; },
		get keycap() { return keycap; },
		get x() { return x; },
		get y() { return y; },
		show(nextLabel: string, nextX: number, nextY: number, nextKey = ''): void {
			label = nextLabel;
			keycap = nextKey;
			x = Math.round(nextX);
			y = Math.round(nextY);
			visible = true;
		},
		hide(): void {
			visible = false;
		},
	};
}

export function uiTooltip(node: HTMLElement, spec: string | UiTooltipSpec) {
	const applyAttrs = (s: string | UiTooltipSpec) => {
		const lbl = typeof s === 'string' ? s : s.label;
		const key = typeof s === 'string' ? undefined : s.keycap;
		if (lbl) node.setAttribute('data-hud-tip', lbl);
		else node.removeAttribute('data-hud-tip');
		if (key) node.setAttribute('data-hud-tip-key', key);
		else node.removeAttribute('data-hud-tip-key');
	};
	applyAttrs(spec);
	return {
		update(next: string | UiTooltipSpec) { applyAttrs(next); },
		destroy() {
			node.removeAttribute('data-hud-tip');
			node.removeAttribute('data-hud-tip-key');
		},
	};
}
