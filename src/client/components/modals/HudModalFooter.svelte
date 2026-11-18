<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Modal Footer adapter delegating to @chronos-ui/svelte UiModalFooter.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { UiModalFooter } from '@ui';

	interface Props {
		metaText?: string;
		meta?: Snippet;
		actions?: Snippet;
	}

	let { metaText = '', meta, actions }: Props = $props();
</script>

<UiModalFooter {metaText} {meta} {actions} />
