/**
 * @author Oblx <code@oblx.dev>
 * @description Optional AI provider configuration using the standard 'ai' SDK with provider_url and provider_bearer.
 */
import { ENV_DEFAULTS } from '@config/env.schema';

export interface OptionalAiProviderConfig {
	readonly provider_url?: string;
	readonly provider_bearer?: string;
}

export interface NormalizedAiConfig {
	readonly enabled: boolean;
	readonly endpointUrl: string;
	readonly bearerToken: string;
}

export function resolveOptionalAiConfig(
	input?: OptionalAiProviderConfig
): NormalizedAiConfig {
	const rawUrl = (input?.provider_url ?? ENV_DEFAULTS.PROVIDER_URL).trim();
	const rawBearer = (
		input?.provider_bearer ?? ENV_DEFAULTS.PROVIDER_BEARER
	).trim();
	return {
		enabled: rawUrl.length > 0,
		endpointUrl: rawUrl,
		bearerToken: rawBearer,
	};
}
