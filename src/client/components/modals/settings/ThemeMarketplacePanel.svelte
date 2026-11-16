<!--
	@author Oblx <code@oblx.dev>
	@description Custom Theme Studio Live Tuner & Multiplayer Community Theme Marketplace sub-tabs (v2.5.0).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { API_ROUTES } from '@config/constants';
	import { CHAMFER_CORNERS, HUD_THEME_PRESETS } from '@config/hud.tokens';
	import { COMMUNITY_SHOWCASE_PRESETS, DARK_SYNTAX_DEFAULTS } from '@config/themes/presets.registry';
	import { clientDagKernel, hudWire, validateClientForm } from '@client/state';
	import HudChamferButton from '@client/components/atoms/HudChamferButton.svelte';

	interface CommunityThemeCard {
		readonly id: number; readonly slug: string; readonly name: string; readonly authorHandle: string;
		readonly polarity: 'DARK' | 'LIGHT'; readonly isBuiltIn?: boolean; readonly favoritesCount: number;
		readonly favorited?: boolean; readonly tokens: Record<string, string | number>;
	}

	let subTab = $state<'STUDIO' | 'MARKETPLACE'>('MARKETPLACE'), filterMode = $state<'ALL' | 'DARK' | 'LIGHT' | 'FAVORITES'>('ALL');
	let customName = $state('Obsidian Neon Custom'), customPolarity = $state<'DARK' | 'LIGHT'>('DARK');
	let bgCanvas = $state(HUD_THEME_PRESETS.OBSIDIAN_CYBER.bgCanvas), bgPanel = $state(HUD_THEME_PRESETS.OBSIDIAN_CYBER.bgPanel);
	let accentPrimary = $state(HUD_THEME_PRESETS.OBSIDIAN_CYBER.accentPrimary), accentSecondary = $state(HUD_THEME_PRESETS.OBSIDIAN_CYBER.accentSecondary);
	let syntaxKeyword = $state(DARK_SYNTAX_DEFAULTS.syntaxKeyword), syntaxString = $state(DARK_SYNTAX_DEFAULTS.syntaxString), statusBanner = $state(''), formError = $state(''), shakeForm = $state(false);
	function triggerShake(): void { shakeForm = true; setTimeout(() => (shakeForm = false), 300); }

	let gallery = $state<CommunityThemeCard[]>(COMMUNITY_SHOWCASE_PRESETS.map((p, idx) => ({
		id: idx + 1, slug: p.slug, name: p.name, authorHandle: p.authorHandle, polarity: p.polarity,
		isBuiltIn: true, favoritesCount: p.favoritesCount, favorited: false,
		tokens: { ...HUD_THEME_PRESETS[p.baseId], bgCanvas: p.bgCanvas, bgPanel: p.bgPanel, accentPrimary: p.accentPrimary, accentSecondary: p.accentSecondary },
	})));
	const filteredGallery = $derived(gallery.filter((item) => filterMode === 'DARK' ? item.polarity === 'DARK' : filterMode === 'LIGHT' ? item.polarity === 'LIGHT' : filterMode === 'FAVORITES' ? Boolean(item.favorited) : true));

	async function loadCommunityGallery(): Promise<void> {
		const res = await clientDagKernel.requestJson<{ themes?: Array<CommunityThemeCard & { tokensJson?: string }>; favoriteThemeIds?: number[] }>(API_ROUTES.THEMES, { sourceZone: 'APP_MODAL', intentKind: 'THEMES_LOAD' });
		if (res.ok && Array.isArray(res.data.themes) && res.data.themes.length > 0) {
			const favSet = new Set(res.data.favoriteThemeIds ?? []);
			gallery = res.data.themes.map((t) => ({ ...t, favorited: favSet.has(t.id), tokens: t.tokens ?? JSON.parse(t.tokensJson ?? '{}') }));
		}
	}
	function buildCustomTokenMap(): Record<string, string | number> {
		const b = HUD_THEME_PRESETS[hudWire.activeThemeId];
		return {
			bgCanvas, bgPanel, bgSurface: b.bgSurface, borderHairline: b.borderHairline, textPrimary: b.textPrimary, textMuted: b.textMuted,
			accentPrimary, accentSecondary, brassFrame: b.brassFrame, statusNominal: b.statusNominal, statusWarning: b.statusWarning,
			statusDanger: b.statusDanger, gridLine: b.gridLine, coreGradientColor: b.coreGradientColor, midGradientColor: b.midGradientColor,
			edgeGradientColor: b.edgeGradientColor, syntaxKeyword, syntaxControl: b.syntaxControl, syntaxType: b.syntaxType,
			syntaxFn: b.syntaxFn, syntaxString, syntaxNumber: b.syntaxNumber, syntaxComment: b.syntaxComment, syntaxOperator: b.syntaxOperator,
		};
	}
	function applyLiveStudioTokens(): boolean {
		formError = '';
		const v = validateClientForm('CUSTOM_THEME', { name: customName });
		if (!v.valid) { formError = v.error; triggerShake(); return false; }
		const slug = customName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		hudWire.applyCommunityThemeTokens(slug, customName, customPolarity, buildCustomTokenMap());
		statusBanner = `Applied "${customName}" live.`;
		return true;
	}
	async function publishCustomTheme(): Promise<void> {
		if (!applyLiveStudioTokens()) return;
		const tokens = buildCustomTokenMap();
		const res = await clientDagKernel.requestJson<{ error?: string }>(API_ROUTES.THEMES, { method: 'POST', body: { name: customName, polarity: customPolarity, tokens }, sourceZone: 'APP_MODAL', intentKind: 'THEME_PUBLISH' });
		if (!res.ok) { formError = res.data.error ?? 'Publish rejected.'; triggerShake(); return; }
		statusBanner = `Published "${customName}" to Community Gallery!`;
		await loadCommunityGallery(); subTab = 'MARKETPLACE';
	}
	async function toggleFavorite(card: CommunityThemeCard): Promise<void> {
		const res = await clientDagKernel.requestJson(API_ROUTES.THEME_FAVORITE, { method: 'POST', body: { themeId: card.id }, sourceZone: 'APP_MODAL', intentKind: 'THEME_FAVORITE' });
		if (res.ok) await loadCommunityGallery();
	}
	onMount(() => { void loadCommunityGallery(); });
</script>

<div class="border border-[var(--hud-border)] bg-[var(--hud-bg)]/55 p-2.5 mb-3">
	<div class="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--hud-border)]">
		<div class="flex items-center gap-1.5 font-mono text-[10px]">
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.TOP_RIGHT} cutPx={5} active={subTab === 'MARKETPLACE'} onclick={() => (subTab = 'MARKETPLACE')} className="px-2.5 py-1">Community Marketplace ({gallery.length})</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.BOTTOM_LEFT} cutPx={5} active={subTab === 'STUDIO'} onclick={() => (subTab = 'STUDIO')} className="px-2.5 py-1">Theme Studio &amp; Live Tuner</HudChamferButton>
		</div>
		{#if formError}<span role="alert" class="font-mono text-[10px] text-[var(--hud-danger)]">{formError}</span>{:else if statusBanner}<span class="font-mono text-[10px] text-[var(--hud-nominal)]">{statusBanner}</span>{/if}
	</div>

	{#if subTab === 'MARKETPLACE'}
		<div class="flex items-center gap-1.5 mb-2 font-mono text-[10px]">
			{#each (['ALL', 'DARK', 'LIGHT', 'FAVORITES'] as const) as f (f)}
				<button type="button" onclick={() => (filterMode = f)} class="px-2 py-0.5 border cursor-pointer {filterMode === f ? 'border-[var(--hud-accent-primary)] text-[var(--hud-accent-primary)] bg-[var(--hud-accent-primary)]/10' : 'border-[var(--hud-border)] text-[var(--hud-muted)]'}">{f === 'FAVORITES' ? 'Favorites ★' : f}</button>
			{/each}
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
			{#each filteredGallery as item (item.slug)}
				<div class="p-2 border {hudWire.activeCommunitySlug === item.slug ? 'border-[var(--hud-accent-primary)] bg-[var(--hud-accent-primary)]/10' : 'border-[var(--hud-border)] bg-[var(--hud-surface)]/45'} flex flex-col justify-between gap-1.5">
					<div>
						<div class="flex items-center justify-between gap-1"><span class="font-mono text-[10px] font-bold text-[var(--hud-text)] truncate">{item.name}</span><span class="font-mono text-[9px] text-[var(--hud-muted)]">@{item.authorHandle}</span></div>
						<div class="flex items-center gap-1 mt-1">
							{#each ['bgCanvas', 'bgPanel', 'accentPrimary', 'accentSecondary', 'syntaxKeyword'] as key (key)}
								<span class="w-3.5 h-2.5 border border-[var(--hud-border)]" style="background:{String(item.tokens[key] ?? 'var(--hud-accent)')}"></span>
							{/each}
							<span class="ml-auto font-mono text-[9px] px-1 bg-[var(--hud-bg)] text-[var(--syntax-keyword)]">fn =&gt; &#123;&#125;</span>
						</div>
					</div>
					<div class="flex items-center justify-between gap-1 pt-1 border-t border-[var(--hud-border)]/50 font-mono text-[9px]">
						<button type="button" onclick={() => hudWire.applyCommunityThemeTokens(item.slug, item.name, item.polarity, item.tokens)} class="px-2 py-0.5 border border-[var(--hud-accent-primary)]/60 text-[var(--hud-accent-primary)] hover:bg-[var(--hud-accent-primary)]/15 cursor-pointer">Apply</button>
						<button type="button" onclick={() => toggleFavorite(item)} class="px-1.5 py-0.5 border border-[var(--hud-border)] text-[var(--hud-accent-secondary)] cursor-pointer">★ {item.favoritesCount}</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class={`grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] ${shakeForm ? 'hud-form-shake' : ''}`}>
			<label class="flex flex-col gap-0.5 text-[var(--hud-muted)]">Theme Name<input type="text" bind:value={customName} maxlength="48" class="px-2 py-1 bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-text)]" /></label>
			<label class="flex flex-col gap-0.5 text-[var(--hud-muted)]">Polarity<select bind:value={customPolarity} class="px-2 py-1 bg-[var(--hud-surface)] border border-[var(--hud-border)] text-[var(--hud-text)]"><option value="DARK">DARK</option><option value="LIGHT">LIGHT</option></select></label>
			<label class="flex items-center justify-between gap-1 px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/40"><span>bgCanvas</span><input type="color" bind:value={bgCanvas} /></label>
			<label class="flex items-center justify-between gap-1 px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/40"><span>bgPanel</span><input type="color" bind:value={bgPanel} /></label>
			<label class="flex items-center justify-between gap-1 px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/40"><span>accentPrimary</span><input type="color" bind:value={accentPrimary} /></label>
			<label class="flex items-center justify-between gap-1 px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/40"><span>accentSecondary</span><input type="color" bind:value={accentSecondary} /></label>
			<label class="flex items-center justify-between gap-1 px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/40"><span>syntaxKeyword</span><input type="color" bind:value={syntaxKeyword} /></label>
			<label class="flex items-center justify-between gap-1 px-2 py-1 border border-[var(--hud-border)] bg-[var(--hud-surface)]/40"><span>syntaxString</span><input type="color" bind:value={syntaxString} /></label>
		</div>
		<div class="flex items-center justify-end gap-2 mt-2">
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={5} variant="accent" onclick={applyLiveStudioTokens} className="px-2.5 py-1 font-mono text-[10px]">Apply Locally</HudChamferButton>
			<HudChamferButton chamferCorner={CHAMFER_CORNERS.DIAGONAL_PAIR} cutPx={5} variant="brass" onclick={publishCustomTheme} className="px-2.5 py-1 font-mono text-[10px]">Publish to Community Gallery →</HudChamferButton>
		</div>
	{/if}
</div>
