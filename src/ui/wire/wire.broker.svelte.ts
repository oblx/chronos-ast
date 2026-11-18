/**
 * @author Oblx <code@oblx.dev>
 * @description Generic Svelte 5 Runes event DAG broker (createUiWireBroker) with middleware next() hooks, 256-slot ring buffer, and BroadcastChannel sync.
 */
import { DEFAULT_UI_WIRE_RING_CAPACITY, UiWireRingBuffer } from './wire.ring';
import type { UiWireBrokerOptions, UiWireEnvelope, UiWireMiddleware, UiWireSubscriber } from './wire.types';

export function createUiWireBroker(options: UiWireBrokerOptions = {}) {
	const ring = new UiWireRingBuffer(options.ringCapacity ?? DEFAULT_UI_WIRE_RING_CAPACITY);
	const middlewares: UiWireMiddleware[] = [];
	const subscribers = new Set<UiWireSubscriber>();
	let seq = 1;
	let traces = $state.raw<readonly UiWireEnvelope[]>([]);
	let lastEnvelope = $state.raw<UiWireEnvelope | null>(null);
	let channel: BroadcastChannel | null = null;

	if (typeof BroadcastChannel !== 'undefined' && options.channelName) {
		try {
			channel = new BroadcastChannel(options.channelName);
			channel.onmessage = (ev: MessageEvent<UiWireEnvelope>) => {
				if (!ev.data || typeof ev.data.intentKind !== 'string') return;
				traces = ring.push(ev.data);
				lastEnvelope = ev.data;
				for (const sub of subscribers) sub(ev.data);
			};
		} catch {}
	}

	function dispatch<TPayload = Record<string, unknown>>(input: {
		readonly intentKind: string;
		readonly sourceZone?: string;
		readonly payload?: TPayload;
		readonly broadcast?: boolean;
	}): UiWireEnvelope<TPayload> {
		const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
		const traceId = `ui-${String(seq).padStart(6, '0')}`;
		const hlcTimestamp = `${Date.now()}:${seq++}`;
		const base: UiWireEnvelope<TPayload> = {
			traceId,
			intentKind: input.intentKind,
			sourceZone: input.sourceZone ?? 'UI_ROOT',
			payload: (input.payload ?? {}) as TPayload,
			hlcTimestamp,
			durationMicros: 1,
			status: 'OK',
		};
		let idx = -1;
		const runChain = (i: number): void => {
			if (i <= idx) return;
			idx = i;
			const mw = middlewares[i];
			if (mw) mw(base as UiWireEnvelope, () => runChain(i + 1));
		};
		runChain(0);
		const elapsed = typeof performance !== 'undefined' ? Math.max(1, Math.round((performance.now() - t0) * 1000)) : 1;
		const finalized: UiWireEnvelope<TPayload> = { ...base, durationMicros: elapsed };
		traces = ring.push(finalized as UiWireEnvelope);
		lastEnvelope = finalized as UiWireEnvelope;
		for (const sub of subscribers) sub(finalized as UiWireEnvelope);
		if (input.broadcast && channel) {
			try { channel.postMessage(finalized); } catch {}
		}
		return finalized;
	}

	return {
		get traces() { return traces; },
		get lastEnvelope() { return lastEnvelope; },
		use(mw: UiWireMiddleware): () => void {
			middlewares.push(mw);
			return () => {
				const i = middlewares.indexOf(mw);
				if (i >= 0) middlewares.splice(i, 1);
			};
		},
		subscribe(fn: UiWireSubscriber): () => void {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
		dispatch,
		emit<TPayload = Record<string, unknown>>(intentKind: string, sourceZone = 'UI_ROOT', payload?: TPayload): UiWireEnvelope<TPayload> {
			return dispatch({ intentKind, sourceZone, payload });
		},
		clear(): void {
			traces = ring.clear();
			lastEnvelope = null;
		},
		dispose(): void {
			try { channel?.close(); } catch {}
			channel = null;
			subscribers.clear();
		},
	};
}

export const uiWireBroker = createUiWireBroker();
