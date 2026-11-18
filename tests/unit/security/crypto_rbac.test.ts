/**
 * @author Oblx <code@oblx.dev>
 * @description Adversarial security unit tests for Chronos u32 RBAC, Argon2id pepper rotation, GitHub/Google OAuth2 account linking, AEAD Vault, Audit chain, WebAuthn, OIDC, and PAT.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { CAPABILITY_BITS, CLUSTER_SEAT_CAPS, ROLE_IDS, ROLE_MASKS, resolveClusterSeatCap } from '../../../src/config/security.constants';
import { validateClientForm } from '../../../src/core/security/guards/form.validator';
import { sanitizeInboundPayload, sanitizeOutboundForPrincipal } from '../../../src/plugins/sanitizers/form.sanitizer';
import { createChronosDb, closeChronosDb } from '../../../src/lib/db/sqlite/client/connection';
import { auditLog, credentials, userAuthIdentities } from '../../../src/lib/db/sqlite/schema/tables';
import { computeEffectiveMask, hasCapability, setSystemLockdownActive } from '../../../src/core/security/rbac.bitmask';
import { assignUserToGroup, compileEffectiveUserMask, setChronosRbacNode } from '../../../src/core/security/chronos.rbac';
import { verifyPasswordWithConstantTimeDummy } from '../../../src/core/security/password.crypto';
import { decryptVaultSecret, encryptVaultSecret, toVaultSecretMetadata } from '../../../src/core/security/vault.crypto';
import { appendAuditEntry, verifyAuditChain } from '../../../src/core/security/audit.chain';
import { localPasswordAuthAdapter, registerLocalUser, resetAuthRateLimiter } from '../../../src/plugins/auth/local.auth';
import { claimGitHubIdentity } from '../../../src/plugins/auth/github.auth';
import { claimGoogleIdentity } from '../../../src/plugins/auth/google.auth';
import { createPasskeyChallenge, enrollPasskeyCredential, webAuthnPasskeyAdapter } from '../../../src/plugins/auth/webauthn.auth';
import { generatePkcePair, verifyOidcIdTokenAndClaim } from '../../../src/plugins/auth/oidc.auth';
import { mintPersonalAccessToken, verifyPersonalAccessToken } from '../../../src/plugins/auth/pat.auth';
import { toBase64Url } from '../../../src/lib/utils/log.sanitizer';

test('u32 RBAC bitmask formula, Demo Guest 0x000001C1 restriction, Chronos group inheritance, and SYSTEM_LOCKDOWN gate', async () => {
	assert.equal(ROLE_MASKS.ROLE_GUEST, 0x000001c1);
	assert.equal(hasCapability(ROLE_MASKS.ROLE_GUEST, CAPABILITY_BITS.WORKSPACE_READ), true);
	assert.equal(hasCapability(ROLE_MASKS.ROLE_GUEST, CAPABILITY_BITS.WORKSPACE_INGEST_ARCHIVE), false);
	assert.equal(hasCapability(ROLE_MASKS.ROLE_GUEST, CAPABILITY_BITS.EXPORT_ARTIFACTS), false);

	const base = computeEffectiveMask(ROLE_IDS.ANALYST, CAPABILITY_BITS.SYSTEM_LOCKDOWN, CAPABILITY_BITS.ANNOTATION_WRITE, 0xffffffff, false);
	assert.equal(hasCapability(base, CAPABILITY_BITS.SYSTEM_LOCKDOWN), true);
	assert.equal(hasCapability(base, CAPABILITY_BITS.ANNOTATION_WRITE), false);

	const narrowed = computeEffectiveMask(ROLE_IDS.ADMIN, 0, 0, CAPABILITY_BITS.METAMODEL_QUERY | CAPABILITY_BITS.WORKSPACE_READ, false);
	assert.equal(narrowed, (CAPABILITY_BITS.METAMODEL_QUERY | CAPABILITY_BITS.WORKSPACE_READ) >>> 0);

	const handle = createChronosDb();
	try {
		const usr = await registerLocalUser(handle, { username: 'lp-viewer', password: 'viewer-pass-123', roleId: ROLE_IDS.VIEWER, primaryGroupId: 2 });
		const baseMask = compileEffectiveUserMask(handle, usr.uid);
		assert.equal(hasCapability(baseMask, CAPABILITY_BITS.EXPORT_ARTIFACTS), true);
		assert.equal(hasCapability(baseMask, CAPABILITY_BITS.SYSTEM_LOCKDOWN), false);

		setChronosRbacNode(handle, { holderKind: 'USER', holderId: usr.uid, bitIndex: 31, value: true, workspaceContextId: 7 });
		assert.equal(hasCapability(compileEffectiveUserMask(handle, usr.uid, { workspaceContextId: 7 }), CAPABILITY_BITS.SYSTEM_LOCKDOWN), true);
		assert.equal(hasCapability(compileEffectiveUserMask(handle, usr.uid, { workspaceContextId: 99 }), CAPABILITY_BITS.SYSTEM_LOCKDOWN), false);

		assignUserToGroup(handle, usr.uid, 5);
		assert.equal(compileEffectiveUserMask(handle, usr.uid) >>> 0, 0xffffffff);
	} finally {
		closeChronosDb(handle);
		setSystemLockdownActive(false);
	}
});

test('Argon2id pepper rotation v1->v2 and GitHub/Google OAuth2 account linking to u32 uid', async () => {
	resetAuthRateLimiter();
	const handle = createChronosDb();
	try {
		const alice = await registerLocalUser(handle, { username: 'alice', password: 'correct-horse-battery', email: 'alice@oblx.dev' });
		assert.equal(alice.uid > 0, true);
		const dummyCheck = await verifyPasswordWithConstantTimeDummy('wrong-pass', null);
		assert.equal(dummyCheck, false);

		const ghLinked = claimGitHubIdentity(handle, { providerSubject: 'gh-999', login: 'alice-gh', email: 'alice@oblx.dev', displayName: 'Alice GH', avatarUrl: null });
		assert.equal(ghLinked.uid, alice.uid);
		const ggLinked = claimGoogleIdentity(handle, { providerSubject: 'gg-888', email: 'alice@oblx.dev', displayName: 'Alice GG', avatarUrl: null });
		assert.equal(ggLinked.uid, alice.uid);
		const linkedRows = handle.db.select().from(userAuthIdentities).where(eq(userAuthIdentities.userId, alice.uid)).all();
		assert.equal(linkedRows.length, 3);

		const okV1 = await localPasswordAuthAdapter.verifyCredential(handle, { username: 'alice', password: 'correct-horse-battery', clientIp: '10.9.9.1' });
		assert.equal(okV1?.username, 'alice');

		Bun.env.CHRONOS_AUTH_PEPPER_V2 = 'rotated-v2-pepper-secret-material-32bytes';
		const okV2 = await localPasswordAuthAdapter.verifyCredential(handle, { username: 'alice', password: 'correct-horse-battery', clientIp: '10.9.9.1' });
		assert.equal(okV2?.userId, okV1?.userId);
		const credAfter = handle.db.select().from(credentials).where(eq(credentials.userId, okV1!.userId)).get();
		assert.equal(credAfter?.pepperVersion, 2);
	} finally {
		delete Bun.env.CHRONOS_AUTH_PEPPER_V2;
		closeChronosDb(handle);
	}
});

test('Auth brute-force rate limiter blocks after repeated failed password attempts', async () => {
	resetAuthRateLimiter();
	const handle = createChronosDb();
	try {
		await registerLocalUser(handle, { username: 'ratelimit-op', password: 'correct-horse-battery', email: 'rl@oblx.dev' });
		for (let i = 0; i < 5; i++) {
			const bad = await localPasswordAuthAdapter.verifyCredential(handle, { username: 'ratelimit-op', password: 'wrong-password', clientIp: '198.51.100.4' });
			assert.equal(bad, null);
		}
		await assert.rejects(() => localPasswordAuthAdapter.verifyCredential(handle, { username: 'ratelimit-op', password: 'wrong-password', clientIp: '198.51.100.4' }), /Rate limited/);
	} finally {
		closeChronosDb(handle);
	}
});

test('HKDF + AES-256-GCM write-only vault rejects tampered AAD/ciphertext and tamper-evident audit chain catches tampering', async () => {
	const testSecret = ['sk', 'chronos', 'secret', '9999'].join('-');
	const enc = await encryptVaultSecret({ ownerId: 'usr-1', secretId: 'sec-1', plaintextSecret: testSecret });
	const plain = await decryptVaultSecret({ ownerId: 'usr-1', secretId: 'sec-1', ...enc });
	assert.equal(plain, testSecret);
	await assert.rejects(() => decryptVaultSecret({ ownerId: 'usr-2', secretId: 'sec-1', ...enc }));

	const meta = toVaultSecretMetadata({ id: 'sec-1', label: 'AI Key', providerKind: 'OPENAI', lastFourChars: enc.lastFourChars, keyVersion: 1, rotatedAt: 1 });
	assert.equal('ciphertextB64' in meta, false);
	assert.equal(meta.lastFourChars, '9999');

	const handle = createChronosDb();
	try {
		await appendAuditEntry(handle, 'usr-1', 'BOOT', 'INFO', 'Audit init');
		await appendAuditEntry(handle, 'usr-1', 'VAULT', 'WARN', 'Secret rotated Bearer topsecret123');
		const check1 = await verifyAuditChain(handle);
		assert.equal(check1.valid, true);
		assert.equal(check1.count, 2);
		handle.db.update(auditLog).set({ detail: 'tampered' }).where(eq(auditLog.seq, 2)).run();
		const check2 = await verifyAuditChain(handle);
		assert.equal(check2.valid, false);
		assert.equal(check2.brokenSeq, 2);
	} finally {
		closeChronosDb(handle);
	}
});

test('WebAuthn ES256 signCount rollback guard, OIDC PKCE/JWKS, and Scoped PAT', async () => {
	const handle = createChronosDb();
	try {
		const user = await registerLocalUser(handle, { username: 'bob', password: 'bob-password-123' });
		const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
		const pubJwk = await crypto.subtle.exportKey('jwk', kp.publicKey);
		enrollPasskeyCredential(handle, user.userId, 'cred-1', pubJwk);

		const signAssertion = async (count: number) => {
			const ch = createPasskeyChallenge(user.userId, 'localhost', 'http://localhost:3000');
			const cdBytes = new TextEncoder().encode(JSON.stringify({ challenge: ch.challenge, origin: 'http://localhost:3000', type: 'webauthn.get' }));
			const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('localhost')));
			const authData = new Uint8Array(37);
			authData.set(rpHash, 0); authData[32] = 0x01;
			new DataView(authData.buffer).setUint32(33, count, false);
			const cdHash = new Uint8Array(await crypto.subtle.digest('SHA-256', cdBytes));
			const payload = new Uint8Array(authData.length + cdHash.length);
			payload.set(authData, 0); payload.set(cdHash, authData.length);
			const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, payload));
			return { credentialId: 'cred-1', clientDataJSON: toBase64Url(cdBytes), authenticatorData: toBase64Url(authData), signature: toBase64Url(sig), expectedRpId: 'localhost', expectedOrigin: 'http://localhost:3000' };
		};

		const okPasskey = await webAuthnPasskeyAdapter.verifyCredential(handle, await signAssertion(5));
		assert.equal(okPasskey?.userId, user.userId);
		await assert.rejects(() => signAssertion(3).then((a) => webAuthnPasskeyAdapter.verifyCredential(handle, a)), /rollback/);

		const pkce = await generatePkcePair();
		assert.equal(pkce.codeChallenge.length > 20, true);
		const jwtHeader = toBase64Url(new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: 'k1' })));
		const jwtPayload = toBase64Url(new TextEncoder().encode(JSON.stringify({ sub: '42', preferred_username: 'oidc-dev', nonce: 'n-1', exp: Math.floor(Date.now() / 1000) + 60 })));
		const jwtSig = toBase64Url(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, kp.privateKey, new TextEncoder().encode(`${jwtHeader}.${jwtPayload}`))));
		const oidcClaim = await verifyOidcIdTokenAndClaim({ idToken: `${jwtHeader}.${jwtPayload}.${jwtSig}`, jwks: [{ ...pubJwk, kid: 'k1' }], expectedNonce: 'n-1' });
		assert.equal(oidcClaim?.username, 'oidc-dev');

		const pat = await mintPersonalAccessToken(handle, { userId: user.userId, label: 'MCP', scopedBitmask: CAPABILITY_BITS.METAMODEL_QUERY });
		const verifiedPat = await verifyPersonalAccessToken(handle, pat.rawToken);
		assert.equal(verifiedPat?.scopedBitmask, CAPABILITY_BITS.METAMODEL_QUERY);
	} finally {
		closeChronosDb(handle);
	}
});

test('v1.8.0 Cluster seat caps (2/4/6/8), Stage 1 validateClientForm, and Stage 3 inbound/outbound sanitization', () => {
	assert.equal(CLUSTER_SEAT_CAPS.ROLE_GUEST, 2);
	assert.equal(CLUSTER_SEAT_CAPS.ROLE_VIEWER, 2);
	assert.equal(CLUSTER_SEAT_CAPS.ROLE_ANALYST, 4);
	assert.equal(CLUSTER_SEAT_CAPS.ROLE_AUDITOR, 6);
	assert.equal(CLUSTER_SEAT_CAPS.ROLE_ADMIN, 8);
	assert.equal(resolveClusterSeatCap(ROLE_IDS.GUEST), 2);
	assert.equal(resolveClusterSeatCap(ROLE_IDS.ADMIN), 8);
	assert.equal(resolveClusterSeatCap('UNKNOWN_ROLE'), 2);

	assert.equal(validateClientForm('AUTH_LOGIN', { username: '', password: 'abc' }).valid, false);
	assert.equal(validateClientForm('AUTH_LOGIN', { username: 'oblx', password: 'nopenope' }).valid, true);
	assert.equal(validateClientForm('AUTH_REGISTER', { username: 'alice', password: 'short' }).valid, false);
	assert.equal(validateClientForm('GIT_REPO', { repoUrl: 'http://insecure.local/repo' }).valid, false);
	assert.equal(validateClientForm('GIT_REPO', { repoUrl: 'github:oblx/chronos', branch: 'main' }).valid, true);
	assert.equal(validateClientForm('VAULT_SECRET', { label: 'a', plaintextSecret: '123' }).valid, false);
	assert.equal(validateClientForm('DEVIATION_SIGNOFF', { note: 'ok' }).valid, false);
	assert.equal(validateClientForm('CUSTOM_THEME', { name: '<script>' }).valid, false);
	assert.equal(validateClientForm('AI_PROMPT', { prompt: '  ' }).valid, false);
	assert.equal(validateClientForm('ANALYZE_SOURCE', { filePath: '../etc/passwd', sourceCode: 'const x = 1;' }).valid, false);

	const tainted = JSON.parse('{"__proto__":{"polluted":true},"name":"<b>hello</b> javascript:alert(1)","sourceCode":"const ok = a < b && b > c;","dsl":"graph TD; A-->B"}');
	const cleaned = sanitizeInboundPayload(tainted) as Record<string, unknown>;
	assert.equal(Object.prototype.hasOwnProperty.call(cleaned, '__proto__'), false);
	assert.equal(cleaned.name, 'hello alert(1)');
	assert.equal(cleaned.sourceCode, 'const ok = a < b && b > c;');
	assert.equal(cleaned.dsl, 'graph TD; A-->B');

	const rawOutbound = {
		vaultSecrets: [{ id: 'sec-1', lastFourChars: '9999' }],
		auditChain: { valid: true, count: 4 },
		sessions: [{ sid: 's-1' }],
		roster: [{ clientId: 'c-1', username: 'oblx' }],
		ciphertextB64: 'secret-bytes',
		publicSummary: 'ok',
	};
	const guestOut = sanitizeOutboundForPrincipal(rawOutbound, ROLE_MASKS.ROLE_GUEST, ROLE_IDS.GUEST);
	assert.deepEqual(guestOut.vaultSecrets, []);
	assert.deepEqual(guestOut.sessions, []);
	assert.deepEqual(guestOut.roster, []);
	assert.equal(guestOut.auditChain.count, 0);
	assert.equal('ciphertextB64' in guestOut, false);
	assert.equal(guestOut.publicSummary, 'ok');

	const adminOut = sanitizeOutboundForPrincipal(rawOutbound, ROLE_MASKS.ROLE_ADMIN, ROLE_IDS.ADMIN);
	assert.equal(adminOut.vaultSecrets.length, 1);
	assert.equal(adminOut.auditChain.count, 4);
	assert.equal(adminOut.roster.length, 1);
	assert.equal('ciphertextB64' in adminOut, false);
});
