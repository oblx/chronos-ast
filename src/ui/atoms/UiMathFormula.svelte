<!--
	@author Oblx <code@oblx.dev>
	@description Pure W3C MathML renderer atom for @chronos-ui/svelte.
-->
<script lang="ts">
	interface Props {
		tex?: string;
		mathmlHtml?: string;
		display?: boolean;
		className?: string;
	}

	let {
		tex = '',
		mathmlHtml = '',
		display = false,
		className = '',
	}: Props = $props();

	function compileSimpleMathMl(raw: string, isBlock: boolean): string {
		const cleaned = raw.trim().replace(/^\$\$?|\$\$?$/g, '');
		const esc = cleaned
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/([A-Za-z0-9)+-]+)\^\{?([A-Za-z0-9+-]+)\}?/g, '<msup><mi>$1</mi><mn>$2</mn></msup>')
			.replace(/([A-Za-z]+)_\{?([A-Za-z0-9+-]+)\}?/g, '<msub><mi>$1</mi><mn>$2</mn></msub>');
		return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${isBlock ? 'block' : 'inline'}"><mrow>${esc}</mrow></math>`;
	}

	let rendered = $derived(mathmlHtml || compileSimpleMathMl(tex, display));
</script>

<span
	data-testid="hud-math-formula"
	data-tex={tex}
	class={`${display ? 'block my-1 text-center' : 'inline-block align-middle'} font-mono text-[var(--hud-accent-primary)] ${className}`}
>
	{@html rendered}
</span>
