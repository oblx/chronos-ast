<!--
	@author Oblx <code@oblx.dev>
	@description Ogygia SSR/SPA Island hydration boundary component for Svelte 5.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id?: string;
		label?: string;
		children: Snippet;
	}

	let {
		id = 'chronos-island-root',
		label = 'ISLAND_HYDRATED',
		children,
	}: Props = $props();
</script>

<section
	data-ogygia-island={id}
	data-hydration-state={label}
	class="relative w-full h-full flex flex-col overflow-hidden"
>
	{@render children()}
</section>
