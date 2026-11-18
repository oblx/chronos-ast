/**
 * @author Oblx <code@oblx.dev>
 * @description Barrel export for @chronos-ui/svelte semantic tokens, corner geometry, icon registry, and typography.
 */
if (typeof window === 'undefined') {
	const g = globalThis as Record<string, unknown>;
	g.$state ??= Object.assign(<T>(v: T): T => v, { raw: <T>(v: T): T => v });
}


export * from './semantic.tokens';
export * from './corners.geometry';
export * from './icons.registry';
export * from './typography.tokens';

