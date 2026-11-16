<script lang="ts">
	/**
	 * @author Oblx <code@oblx.dev>
	 * @description Anti-regression Svelte 5 component re-export wrapper for ViewportHUD
	 */
	import ViewportHUD from './perimeter/ViewportHUD.svelte';
	let props = $props();
</script>

<ViewportHUD {...props} />
