/**
 * @author Oblx <code@oblx.dev>
 * @description HKDF-SHA256 DEK derivation and AES-256-GCM AEAD encryption for the write-only secrets vault.
 */
import { resolveRuntimeEnv } from '@config/env.schema';
import { CRYPTO_CONSTANTS } from '@config/security.constants';
import { base64UrlToBytes, bytesToBase64Url, csprngBytes, decodeUtf8, encodeUtf8 } from './crypto.primitives';

export interface VaultSecretMetadata {
	readonly secretId: string; readonly label: string; readonly providerKind: string;
	readonly lastFourChars: string; readonly keyVersion: number; readonly rotatedAt: number;
}

export interface VaultEncryptInput {
	readonly ownerId: string; readonly secretId: string; readonly plaintextSecret: string; readonly keyVersion?: number;
}

export interface VaultDecryptInput {
	readonly ownerId: string; readonly secretId: string; readonly ciphertextB64: string; readonly ivB64: string; readonly keyVersion: number;
}

function resolveMasterKekBytes(rawKek?: Uint8Array, envRecord?: Record<string, string | undefined>): Uint8Array {
	if (rawKek) return new Uint8Array(rawKek);
	const env = resolveRuntimeEnv(envRecord);
	if (!env.masterKek && env.strictSecurity) throw new Error('Missing CHRONOS_MASTER_KEK under strict security mode.');
	return encodeUtf8(env.masterKek || CRYPTO_CONSTANTS.KEK_DEV_FALLBACK);
}

export async function deriveVaultDek(keyVersion = 1, rawKek?: Uint8Array, envRecord?: Record<string, string | undefined>): Promise<CryptoKey> {
	const kekBytes = resolveMasterKekBytes(rawKek, envRecord);
	try {
		const baseKey = await crypto.subtle.importKey('raw', new Uint8Array(kekBytes), 'HKDF', false, ['deriveKey']);
		return await crypto.subtle.deriveKey(
			{
				name: 'HKDF',
				hash: 'SHA-256',
				salt: new Uint8Array(encodeUtf8(CRYPTO_CONSTANTS.HKDF_SALT)),
				info: new Uint8Array(encodeUtf8(`${CRYPTO_CONSTANTS.HKDF_INFO_PREFIX}${keyVersion}`)),
			},
			baseKey,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt']
		);
	} finally {
		kekBytes.fill(0);
	}
}

export async function encryptVaultSecret(
	input: VaultEncryptInput,
	rawKek?: Uint8Array,
	envRecord?: Record<string, string | undefined>
): Promise<{ readonly ciphertextB64: string; readonly ivB64: string; readonly lastFourChars: string; readonly keyVersion: number }> {
	const keyVersion = input.keyVersion ?? 1;
	const dek = await deriveVaultDek(keyVersion, rawKek, envRecord);
	const iv = csprngBytes(CRYPTO_CONSTANTS.AES_GCM_IV_BYTES);
	const aad = encodeUtf8(`${input.ownerId}:${input.secretId}:${keyVersion}`);
	const plainBytes = encodeUtf8(input.plaintextSecret);
	try {
	const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), additionalData: new Uint8Array(aad) }, dek, new Uint8Array(plainBytes));
		const trimmed = input.plaintextSecret.trim();
		const lastFourChars = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed.padStart(4, '*');
		return { ciphertextB64: bytesToBase64Url(new Uint8Array(cipherBuf)), ivB64: bytesToBase64Url(iv), lastFourChars, keyVersion };
	} finally {
		plainBytes.fill(0);
		aad.fill(0);
		iv.fill(0);
	}
}

export async function decryptVaultSecretBytes(input: VaultDecryptInput, rawKek?: Uint8Array, envRecord?: Record<string, string | undefined>): Promise<Uint8Array> {
	const dek = await deriveVaultDek(input.keyVersion, rawKek, envRecord);
	const iv = base64UrlToBytes(input.ivB64);
	const cipher = base64UrlToBytes(input.ciphertextB64);
	const aad = encodeUtf8(`${input.ownerId}:${input.secretId}:${input.keyVersion}`);
	try {
		const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), additionalData: new Uint8Array(aad) }, dek, new Uint8Array(cipher));
		return new Uint8Array(plainBuf);
	} finally {
		aad.fill(0);
		iv.fill(0);
		cipher.fill(0);
	}
}

export async function decryptVaultSecret(input: VaultDecryptInput, rawKek?: Uint8Array, envRecord?: Record<string, string | undefined>): Promise<string> {
	const plainBytes = await decryptVaultSecretBytes(input, rawKek, envRecord);
	try {
		return decodeUtf8(plainBytes as unknown as BufferSource);
	} finally {
		plainBytes.fill(0);
	}
}

export function toVaultSecretMetadata(row: {
	readonly id: string; readonly label: string; readonly providerKind: string;
	readonly lastFourChars: string; readonly keyVersion: number; readonly rotatedAt: number;
}): VaultSecretMetadata {
	return { secretId: row.id, label: row.label, providerKind: row.providerKind, lastFourChars: row.lastFourChars, keyVersion: row.keyVersion, rotatedAt: row.rotatedAt };
}
