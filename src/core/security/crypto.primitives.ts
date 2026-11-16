/**
 * @author Oblx <code@oblx.dev>
 * @description Unified Web Crypto primitive helpers: UTF-8 codec, Hex/Base64URL conversion, CSPRNG, constant-time equality, and HMAC-SHA256.
 */

export const utf8Encoder = new TextEncoder();
export const utf8Decoder = new TextDecoder();

export function encodeUtf8(text: string): Uint8Array<ArrayBuffer> {
	return utf8Encoder.encode(text) as Uint8Array<ArrayBuffer>;
}

export function decodeUtf8(bytes: BufferSource): string {
	return utf8Decoder.decode(bytes);
}

export function csprngBytes(byteLength: number): Uint8Array<ArrayBuffer> {
	return crypto.getRandomValues(new Uint8Array(byteLength));
}

export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
	if (a.byteLength !== b.byteLength) return false;
	let diff = 0;
	for (let i = 0; i < a.byteLength; i++) diff |= a[i]! ^ b[i]!;
	return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	const clean = hex.trim();
	const out = new Uint8Array(Math.floor(clean.length / 2));
	for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
	return out;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
	let bin = '';
	for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(b64u: string): Uint8Array<ArrayBuffer> {
	const pad = '='.repeat((4 - (b64u.length % 4)) % 4);
	const bin = atob(b64u.replace(/-/g, '+').replace(/_/g, '/') + pad);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

export async function hmacSha256Bytes(secretBytes: Uint8Array, payloadBytes: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
	const key = await crypto.subtle.importKey('raw', new Uint8Array(secretBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', key, new Uint8Array(payloadBytes));
	return new Uint8Array(sig);
}
