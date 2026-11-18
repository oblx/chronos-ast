<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Modal Header adapter delegating to @chronos-ui/svelte UiModalHeader.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { UiModalHeader } from '@ui';

	interface Props {
		title: string;
		subtitle?: string;
		preventDismiss?: boolean;
		dismissRemainingMs?: number;
		onClose: () => void;
		tabs?: Snippet;
	}

	let { title, subtitle = '', preventDismiss = false, dismissRemainingMs = 0, onClose, tabs }: Props = $props();
</script>

<UiModalHeader {title} {subtitle} {preventDismiss} {dismissRemainingMs} cornerStyle={hudWire.cornerStyle} {onClose} {tabs} />
