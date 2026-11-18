/**
 * @author Oblx <code@oblx.dev>
 * @description Argon2id password hardening with 16B CSPRNG per-user salt, HMAC-SHA256 server pepper rotation, and constant-time anti-enumeration.
 */
import { resolveRuntimeEnv } from '@config/env.schema';
import { CRYPTO_CONSTANTS } from '@config/security.constants';
import {
	base64UrlToBytes,
	bytesToHex,
	csprngBytes,
	encodeUtf8,
	hexToBytes,
	hmacSha256Bytes,
} from './crypto.primitives';

export function getPepperBytes(version = 1, envRecord?: Record<string, string | undefined>): Uint8Array {
	const env = resolveRuntimeEnv(envRecord);
	const raw = version >= 2 ? env.authPepperV2 : env.authPepperV1;
	if (!raw && env.strictSecurity) {
		throw new Error(`Missing CHRONOS_AUTH_PEPPER_V${version} under strict security mode.`);
	}
	const material = raw || `${CRYPTO_CONSTANTS.PEPPER_DEV_FALLBACK}-v${version}`;
	return encodeUtf8(material).slice(0, CRYPTO_CONSTANTS.PEPPER_BYTES);
}

export async function hmacPepperDigest(password: string, salt: Uint8Array, pepperBytes: Uint8Array): Promise<string> {
	const passBytes = encodeUtf8(password);
	const payload = new Uint8Array(salt.byteLength + passBytes.byteLength);
	payload.set(salt, 0);
	payload.set(passBytes, salt.byteLength);
	const sig = await hmacSha256Bytes(pepperBytes, payload);
	passBytes.fill(0);
	payload.fill(0);
	return bytesToHex(sig);
}

export async function hashPasswordWithSaltAndPepper(
	password: string,
	pepperVersion = 1,
	envRecord?: Record<string, string | undefined>
): Promise<{ readonly saltHex: string; readonly passwordHash: string; readonly pepperVersion: number }> {
	const salt = csprngBytes(CRYPTO_CONSTANTS.SALT_BYTES);
	const pepper = getPepperBytes(pepperVersion, envRecord);
	const env = resolveRuntimeEnv(envRecord);
	try {
		const preHash = await hmacPepperDigest(password, salt, pepper);
		const passwordHash = await Bun.password.hash(preHash, {
			algorithm: 'argon2id',
			memoryCost: env.strictSecurity ? CRYPTO_CONSTANTS.ARGON2_MEMORY_COST : 16384,
			timeCost: env.strictSecurity ? CRYPTO_CONSTANTS.ARGON2_TIME_COST : 2,
		});
		return { saltHex: bytesToHex(salt), passwordHash, pepperVersion };
	} finally {
		pepper.fill(0);
	}
}

export async function verifyPasswordWithConstantTimeDummy(
	password: string,
	record: { readonly saltHex: string | null; readonly passwordHash: string | null; readonly pepperVersion: number } | null | undefined,
	envRecord?: Record<string, string | undefined>
): Promise<boolean> {
	if (!record?.saltHex || !record.passwordHash) {
		await Bun.password.verify(password || 'dummy', CRYPTO_CONSTANTS.DUMMY_ARGON2_HASH).catch(() => false);
		return false;
	}
	const salt = hexToBytes(record.saltHex);
	const pepper = getPepperBytes(record.pepperVersion, envRecord);
	try {
		const preHash = await hmacPepperDigest(password, salt, pepper);
		return await Bun.password.verify(preHash, record.passwordHash);
	} finally {
		pepper.fill(0);
	}
}

export function needsPepperRotation(currentVersion: number, envRecord?: Record<string, string | undefined>): boolean {
	const env = resolveRuntimeEnv(envRecord);
	return Boolean(env.authPepperV2) && currentVersion < 2;
}

export const decodeBase64UrlSafe = base64UrlToBytes;
