<script lang="ts">
	/**
	 * @author Oblx <code@oblx.dev>
	 * @description Chamfered collapsible/floating Edge Drawer organism with Dotted Grip drag/float mechanics for @chronos-ui/svelte.
	 */
	import type { Snippet } from 'svelte';
	import { UI_CORNER_TUPLES, type UiIconName } from '../tokens';
	import UiChamferButton from '../atoms/UiChamferButton.svelte';
	import UiChamferFrame from '../atoms/UiChamferFrame.svelte';
	import UiIcon from '../atoms/UiIcon.svelte';
	import { uiDrawerGrip, uiDrawerMachine, type UiDrawerSide } from '../machines';

	export interface UiEdgeDrawerTab {
		readonly id: string;
		readonly label: string;
		readonly icon: UiIconName;
		readonly badge?: string | number;
	}

	interface Props {
		side: UiDrawerSide;
		title: string;
		tabs: readonly UiEdgeDrawerTab[];
		activeTab: string;
		expanded: boolean;
		isFloating?: boolean;
		railOffsetYRem?: number;
		onToggleExpand: () => void;
		onSelectTab: (id: string) => void;
		onToggleFloat?: () => void;
		onMoveRail?: (offsetYRem: number) => void;
		onMoveDrawer?: (xRem: number, yRem: number) => void;
		children: Snippet;
	}

	let {
		side, title, tabs, activeTab, expanded, isFloating = false, railOffsetYRem = 0,
		onToggleExpand, onSelectTab, onToggleFloat, onMoveRail, onMoveDrawer, children,
	}: Props = $props();
</script>

<aside
	style={!expanded && !isFloating ? `transform: translateY(${railOffsetYRem}rem);` : undefined}
	class="relative flex items-center"
	aria-label={title}
>
	{#if !expanded}
		<UiChamferFrame corners={UI_CORNER_TUPLES.PERIMETER_CHAMFER} chamferPx={10} className="w-[3rem] py-2 flex flex-col items-center gap-1.5">
			<UiChamferButton corners={UI_CORNER_TUPLES.DIAGONAL_CHAMFER} cutPx={5} variant="brass" onclick={onToggleExpand} className="w-[2.125rem] h-[2rem]">
				<UiIcon name={side === 'LEFT' ? 'chevronRight' : 'chevronLeft'} sizeRem={0.875} />
			</UiChamferButton>
			<div
				use:uiDrawerGrip={{
					side,
					mode: 'RAIL',
					getInitialOffsetRem: () => ({ xRem: 1.5, yRem: 6, railOffsetYRem }),
					onToggleFloat: () => (onToggleFloat ? onToggleFloat() : uiDrawerMachine.toggleFloat(side)),
					onMoveRail: (_s, nextY) => (onMoveRail ? onMoveRail(nextY) : uiDrawerMachine.moveRail(side, nextY)),
				}}
			>
				<UiChamferButton
					corners={UI_CORNER_TUPLES.DIAGONAL_CHAMFER}
					cutPx={4}
					active={isFloating}
					variant={isFloating ? 'accent' : 'default'}
					ariaLabel="Drag rail vertically or click to toggle float"
					className="w-[2.125rem] h-[1.5rem] cursor-grab active:cursor-grabbing"
				>
					<UiIcon name="grip" sizeRem={0.875} />
				</UiChamferButton>
			</div>
			{#each tabs as tab (tab.id)}
				<UiChamferButton
					corners={UI_CORNER_TUPLES.DIAGONAL_CHAMFER}
					cutPx={5}
					active={activeTab === tab.id}
					variant={activeTab === tab.id ? 'accent' : 'default'}
					onclick={() => onSelectTab(tab.id)}
					className="w-[2.125rem] h-[2rem]"
				>
					<UiIcon name={tab.icon} sizeRem={0.875} />
				</UiChamferButton>
			{/each}
		</UiChamferFrame>
	{:else}
		<UiChamferFrame corners={UI_CORNER_TUPLES.PERIMETER_CHAMFER} chamferPx={12} className="w-[17.5rem] max-h-[calc(100vh-14.5rem)] flex flex-col overflow-hidden">
			<header class="px-3 py-2 border-b border-[var(--hud-border)] flex items-center justify-between gap-2">
				<span class="font-mono text-xs font-bold uppercase tracking-wider text-[var(--hud-accent-primary)] truncate">{title}</span>
				<div class="flex items-center gap-1">
					<div
						use:uiDrawerGrip={{
							side,
							mode: 'DRAWER',
							onToggleFloat: () => (onToggleFloat ? onToggleFloat() : uiDrawerMachine.toggleFloat(side)),
							onMoveDrawer: (_s, xRem, yRem) => (onMoveDrawer ? onMoveDrawer(xRem, yRem) : uiDrawerMachine.moveFloating(side, xRem, yRem)),
						}}
					>
						<UiChamferButton
							corners={UI_CORNER_TUPLES.DIAGONAL_CHAMFER}
							cutPx={4}
							active={isFloating}
							variant={isFloating ? 'accent' : 'default'}
							ariaLabel="Drag drawer or click to toggle float"
							className="px-1.5 py-0.5 cursor-grab active:cursor-grabbing"
						>
							<UiIcon name="grip" sizeRem={0.8125} />
						</UiChamferButton>
					</div>
					<UiChamferButton corners={UI_CORNER_TUPLES.DIAGONAL_CHAMFER} cutPx={4} onclick={onToggleExpand} className="px-1.5 py-0.5">
						<UiIcon name={side === 'LEFT' ? 'chevronLeft' : 'chevronRight'} sizeRem={0.8125} />
					</UiChamferButton>
				</div>
			</header>
			<div class="flex-1 min-h-0 overflow-y-auto p-2.5">{@render children()}</div>
		</UiChamferFrame>
	{/if}
</aside>
