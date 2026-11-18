/**
 * @author Oblx <code@oblx.dev>
 * @description Standalone package manifest metadata for @chronos-ui/svelte zero-domain micro-frontend framework.
 */

export const UI_PACKAGE_MANIFEST = {
	name: '@chronos-ui/svelte',
	version: '1.9.7',
	license: 'MIT',
	author: 'Oblx <code@oblx.dev>',
	type: 'module',
	sideEffects: false,
	exports: {
		'.': './src/ui/index.ts',
		'./tokens': './src/ui/tokens/index.ts',
		'./wire': './src/ui/wire/index.ts',
		'./machines': './src/ui/machines/index.ts',
		'./atoms': './src/ui/atoms/index.ts',
		'./molecules': './src/ui/molecules/index.ts',
		'./organisms': './src/ui/organisms/index.ts',
		'./modals': './src/ui/modals/index.ts',
	},
	peerDependencies: {
		svelte: '^5.0.0',
	},
	zeroDomainGuarantee: true,
	zeroDomainDependencies: true,
} as const;

export const UI_MANIFEST = UI_PACKAGE_MANIFEST;


