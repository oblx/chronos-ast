/**
 * @author Oblx <code@oblx.dev>
 * @description Fixed-capacity 256-slot telemetry ring buffer for @chronos-ui/svelte wire broker.
 */
import type { UiWireEnvelope } from './wire.types';

export const DEFAULT_UI_WIRE_RING_CAPACITY = 256 as const;

export class UiWireRingBuffer {
	private readonly capacity: number;
	private readonly items: UiWireEnvelope[] = [];

	constructor(capacity: number = DEFAULT_UI_WIRE_RING_CAPACITY) {
		this.capacity = Math.max(16, capacity);
	}

	push(envelope: UiWireEnvelope): readonly UiWireEnvelope[] {
		this.items.unshift(envelope);
		if (this.items.length > this.capacity) {
			this.items.length = this.capacity;
		}
		return [...this.items];
	}

	snapshot(): readonly UiWireEnvelope[] {
		return [...this.items];
	}

	clear(): readonly UiWireEnvelope[] {
		this.items.length = 0;
		return [];
	}
}
