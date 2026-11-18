<!--
	@author Oblx <code@oblx.dev>
	@description Chronos v1.9.6 Spotlight Veil adapter delegating to @chronos-ui/svelte UiSpotlightVeil.
-->
<script lang="ts">
	import { hudWire } from '@client/state/hud.wire.svelte';
	import { UiSpotlightVeil, uiSpotlightMachine } from '@ui';

	function handleNextStep(): void {
		if (hudWire.tourActive) {
			if (hudWire.tutorialStep >= 5) hudWire.completeTourAndOpenAuth();
			else hudWire.advanceTourStep(hudWire.tutorialStep + 1);
		} else {
			hudWire.clearSpotlight();
		}
	}
</script>

{#if hudWire.spotlightTarget || uiSpotlightMachine.active}
	<UiSpotlightVeil
		cornerStyle={hudWire.cornerStyle}
		onNextStep={handleNextStep}
		onSkipTour={() => hudWire.skipTourAndUnfoldHud()}
		onClose={() => hudWire.clearSpotlight()}
	/>
{/if}
