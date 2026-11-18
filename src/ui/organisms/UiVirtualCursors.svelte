<!--
	@author Oblx <code@oblx.dev>
	@description Domain-agnostic multiplayer SVG virtual cursor overlay (v1.9.6).
-->
<script lang="ts">
	export interface UiRemoteCursor {
		readonly id: string;
		readonly label: string;
		readonly color: string;
		readonly x: number;
		readonly y: number;
	}

	interface Props {
		cursors?: readonly UiRemoteCursor[];
	}

	let { cursors = [] }: Props = $props();
</script>

{#if cursors.length > 0}
	<div class="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
		{#each cursors as cursor (cursor.id)}
			<div
				class="absolute flex items-center gap-1 transition-transform duration-100"
				style={`transform: translate3d(${cursor.x}px, ${cursor.y}px, 0);`}
			>
				<svg viewBox="0 0 16 16" class="w-4 h-4" fill={cursor.color}>
					<polygon points="0,0 14,6 8,9 6,15" />
				</svg>
				<span
					class="px-1.5 py-0.5 text-[0.625rem] font-mono font-bold text-black"
					style={`background: ${cursor.color};`}
				>
					{cursor.label}
				</span>
			</div>
		{/each}
	</div>
{/if}
