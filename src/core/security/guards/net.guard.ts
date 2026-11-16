/**
 * @author Oblx <code@oblx.dev>
 * @description Zero-Node SSRF defense enforcing HTTPS-only egress, Bun.dns.lookup private/loopback/metadata CIDR blocklists, and manual redirect hop validation.
 */
import { HTTP_SECURITY_CONSTANTS } from '@config/security.constants';

function parseIpv4Octets(ip: string): readonly number[] | null {
	const parts = ip.split('.');
	if (parts.length !== 4) return null;
	const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : -1));
	return nums.every((n) => n >= 0 && n <= 255) ? nums : null;
}

export function isPrivateOrReservedIpv4(ip: string): boolean {
	const octets = parseIpv4Octets(ip);
	if (!octets) return false;
	const [a, b] = octets as [number, number, number, number];
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 192 && b === 0 && (octets[2] === 0 || octets[2] === 2)) return true;
	if (a >= 224) return true;
	return false;
}

export function isPrivateOrReservedIp(rawIp: string): boolean {
	const ip = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, '');
	if (isPrivateOrReservedIpv4(ip)) return true;
	if (ip === '::' || ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
	if (ip.startsWith('::ffff:')) return isPrivateOrReservedIp(ip.slice(7));
	if (ip.startsWith('fe80:') || ip.startsWith('fe90:') || ip.startsWith('fea0:') || ip.startsWith('feb0:')) return true;
	if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('ff')) return true;
	return false;
}

export async function validateOutboundUrl(
	rawUrl: string,
	options: { readonly allowRelativeSameOrigin?: boolean; readonly allowInsecureLocalDev?: boolean; readonly allowLoopback?: boolean } = {}
): Promise<{ readonly url: string; readonly isRelative: boolean }> {
	const trimmed = rawUrl.trim();
	if (options.allowRelativeSameOrigin && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
		return { url: trimmed, isRelative: true };
	}
	let parsed: URL;
	try {
		parsed = new URL(trimmed);
	} catch {
		throw new Error('SSRF guard rejected malformed URL.');
	}
	if (parsed.username || parsed.password) {
		throw new Error('SSRF guard rejected URL containing embedded credentials.');
	}
	const host = parsed.hostname.toLowerCase();
	const cleanHost = host.replace(/^\[|\]$/g, '');
	const isLoopbackHost = cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '::1';
	const allowHttp = options.allowInsecureLocalDev === true || (options.allowLoopback === true && isLoopbackHost);
	if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
		throw new Error(`SSRF guard blocked disallowed scheme: ${parsed.protocol}`);
	}
	if ((host === 'localhost' && !(options.allowLoopback === true)) || host.endsWith('.local') || host.endsWith('.internal')) {
		throw new Error(`SSRF guard blocked internal hostname: ${host}`);
	}
	if (isPrivateOrReservedIp(host) && !(options.allowLoopback === true && isLoopbackHost)) {
		throw new Error(`SSRF guard blocked private/reserved IP literal: ${host}`);
	}
	if (typeof Bun !== 'undefined' && typeof Bun.dns?.lookup === 'function') {
		const records = await Bun.dns.lookup(host).catch(() => []);
		for (const rec of records) {
			const recLoop = rec.address === '127.0.0.1' || rec.address === '::1' || rec.address === '0:0:0:0:0:0:0:1';
			if (isPrivateOrReservedIp(rec.address) && !(options.allowLoopback === true && isLoopbackHost && recLoop)) {
				throw new Error(`SSRF guard blocked DNS resolution to private IP: ${rec.address}`);
			}
		}
	}
	return { url: parsed.toString(), isRelative: false };
}

export async function safeFetchWithRedirectGuard(
	rawUrl: string,
	init: RequestInit = {}
): Promise<Response> {
	let currentUrl = (await validateOutboundUrl(rawUrl)).url;
	for (let hop = 0; hop <= HTTP_SECURITY_CONSTANTS.MAX_REDIRECT_HOPS; hop++) {
		const res = await fetch(currentUrl, { ...init, redirect: 'manual' });
		if (res.status < 300 || res.status >= 400) return res;
		const location = res.headers.get('location');
		if (!location) return res;
		const nextResolved = new URL(location, currentUrl).toString();
		currentUrl = (await validateOutboundUrl(nextResolved)).url;
	}
	throw new Error(`SSRF guard aborted fetch after exceeding ${HTTP_SECURITY_CONSTANTS.MAX_REDIRECT_HOPS} redirect hops.`);
}
