<!--
	@author Oblx <code@oblx.dev>
	@description Root layout shell for Chronos Svelte 5 HUD.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import '@client/app.css';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children()}
