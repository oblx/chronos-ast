<!--
	@author Oblx <code@oblx.dev>
	@description Reusable css.gg-inspired 24x24 pure vector icon atom (stroke-width="2", stroke-linecap="square", rem scaling via w-[1em] h-[1em]).
-->
<script lang="ts">
	import { resolveHudIconPaths, type HudIconName } from '@config/icons.registry';

	interface Props {
		name: HudIconName | string;
		sizeRem?: number;
		className?: string;
		ariaLabel?: string;
		testid?: string;
	}

	let {
		name,
		sizeRem,
		className = '',
		ariaLabel,
		testid,
	}: Props = $props();

	let paths = $derived(resolveHudIconPaths(name));
	let styleStr = $derived(sizeRem ? `width: ${sizeRem}rem; height: ${sizeRem}rem;` : undefined);
	let sizeCls = $derived(sizeRem || /\bw-/.test(className) ? '' : 'w-[1em] h-[1em]');
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="square"
	stroke-linejoin="miter"
	aria-hidden={ariaLabel ? undefined : 'true'}
	aria-label={ariaLabel}
	role={ariaLabel ? 'img' : undefined}
	data-testid={testid}
	data-hud-icon={name}
	style={styleStr}
	class={`inline-block shrink-0 align-middle select-none ${sizeCls} ${className}`}
>
	{#each paths as d, idx (idx)}
		<path {d} />
	{/each}
</svg>
