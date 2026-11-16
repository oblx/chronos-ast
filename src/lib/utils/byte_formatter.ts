/**
 * @author Oblx <code@oblx.dev>
 * @description Pure byte size, duration, and FNV-1a checksum formatting utilities.
 */

const BYTE_UNITS = ['B', 'KiB', 'MiB', 'GiB'] as const;
const KIB_STEP = 1024;
const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const HEX_RADIX = 16;
const PAD_WIDTH = 8;

export function formatBytes(bytes: number, decimals = 1): string {
	if (bytes <= 0) return `0 ${BYTE_UNITS[0]}`;
	const unitIndex = Math.min(
		BYTE_UNITS.length - 1,
		Math.floor(Math.log(bytes) / Math.log(KIB_STEP))
	);
	const scaled = bytes / Math.pow(KIB_STEP, unitIndex);
	return `${scaled.toFixed(unitIndex === 0 ? 0 : decimals)} ${BYTE_UNITS[unitIndex]}`;
}

export function computeDeterministicChecksum(input: string): string {
	let hash = FNV_OFFSET_BASIS;
	for (let i = 0; i < input.length; i++) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, FNV_PRIME);
	}
	return (hash >>> 0).toString(HEX_RADIX).padStart(PAD_WIDTH, '0');
}

export function formatScaledRatio(scaledValue: number, scale = 1000): string {
	return (scaledValue / scale).toFixed(3);
}
