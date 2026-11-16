/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-dependency native fetch AI bridge supporting optional OpenAI-compatible provider_url and provider_bearer.
 */
import {
	resolveOptionalAiConfig,
	type OptionalAiProviderConfig,
} from '../config/ai.config';

export interface AiBridgeStatus {
	readonly transport: 'NATIVE_FETCH';
	readonly isConfigured: boolean;
	readonly providerUrl: string;
	readonly hasBearer: boolean;
}

export interface NativeAiCompletionClient {
	readonly complete: (prompt: string) => Promise<string | null>;
}

export function createChronosAiRegistry(config?: OptionalAiProviderConfig): {
	readonly status: AiBridgeStatus;
	readonly client: NativeAiCompletionClient;
} {
	const resolved = resolveOptionalAiConfig(config);
	const client: NativeAiCompletionClient = {
		async complete(prompt: string): Promise<string | null> {
			if (!resolved.enabled) return null;
			const headers: Record<string, string> = { 'content-type': 'application/json' };
			if (resolved.bearerToken) headers.authorization = `Bearer ${resolved.bearerToken}`;
			const res = await fetch(resolved.endpointUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
			});
			if (!res.ok) return null;
			const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
			return data.choices?.[0]?.message?.content ?? null;
		},
	};
	return {
		status: {
			transport: 'NATIVE_FETCH',
			isConfigured: resolved.enabled,
			providerUrl: resolved.endpointUrl,
			hasBearer: resolved.bearerToken.length > 0,
		},
		client,
	};
}
