/**
 * @author Oblx <code@oblx.dev>
 * @description Svelte 5 mount entry point for Project Chronos Tactical HUD.
 */
import { mount } from 'svelte';
import '@client/app.css';
import RootPage from '@client/routes/+page.svelte';

const target = document.getElementById('app');
if (target) {
	mount(RootPage, { target });
}
