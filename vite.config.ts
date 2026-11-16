/**
 * @author Oblx <code@oblx.dev>
 * @description Vite configuration for Svelte 5 + Tailwind v4 + Bun Security & Metamodel API server.
 */
import tailwindcss from '@tailwindcss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, type Plugin } from 'vite';

function chronosBunApiPlugin(isBuild: boolean): Plugin {
	return {
		name: 'chronos-bun-metamodel-api',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = req.url ?? '';
				if (!url.startsWith('/api/')) {
					return next();
				}
				const routerPath = `${process.cwd()}/src/server/http/router.ts`;
				const guardPath = `${process.cwd()}/src/server/http/middleware.ts`;
				const { handleMetamodelApiRequest } = await import(/* @vite-ignore */ routerPath);
				const { buildSecurityResponseHeaders } = await import(/* @vite-ignore */ guardPath);

				const chunks: Uint8Array[] = [];
				if (req.method === 'POST' || req.method === 'DELETE' || req.method === 'PUT') {
					for await (const chunk of req) {
						chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
					}
				}
				const totalLen = chunks.reduce((acc, c) => acc + c.byteLength, 0);
				const merged = new Uint8Array(totalLen);
				let offset = 0;
				for (const c of chunks) { merged.set(c, offset); offset += c.byteLength; }
				const bodyText = new TextDecoder().decode(merged);

				const result = await handleMetamodelApiRequest(url, req.method ?? 'GET', bodyText, req.headers);
				res.statusCode = result.status;
				res.setHeader('Content-Type', 'application/json; charset=utf-8');
				for (const [k, v] of Object.entries(buildSecurityResponseHeaders())) {
					res.setHeader(k, String(v));
				}
				if (result.setCookies && result.setCookies.length > 0) {
					res.setHeader('Set-Cookie', [...result.setCookies]);
				}
				res.end(JSON.stringify(result.payload));
			});
		},
		closeBundle() {
			if (isBuild) setTimeout(() => process.exit(0), 50);
		},
	};
}

export default defineConfig(({ command }) => {
	const isBuild = command === 'build';
	const rootDir = process.cwd();
	return {
		plugins: [svelte(), tailwindcss(), chronosBunApiPlugin(isBuild)],
		resolve: {
			dedupe: ['svelte'],
			alias: {
				'@': `${rootDir}/src`,
				'@config': `${rootDir}/src/config`,
				'@client': `${rootDir}/src/client`,
				'@core': `${rootDir}/src/core`,
				'@lib': `${rootDir}/src/lib`,
				'@plugins': `${rootDir}/src/plugins`,
				'@server': `${rootDir}/src/server`,
				'@workers': `${rootDir}/src/workers`,
				ogygia: `${rootDir}/src/lib/ogygia/index.ts`,
			},
		},
		optimizeDeps: {
			include: ['svelte', 'svelte/internal/client', 'svelte/internal/disclose-version', 'svelte/internal/flags/legacy', 'svelte/legacy', 'svelte/store', 'svelte/transition'],
			exclude: ['lucide-svelte'],
		},
		server: {
			hmr: process.env.DISABLE_HMR !== 'true',
			watch: process.env.DISABLE_HMR === 'true' ? null : {},
		},
	};
});
