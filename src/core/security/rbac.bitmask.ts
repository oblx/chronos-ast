/**
 * @author Oblx <code@oblx.dev>
 * @description Unsigned u32 bitwise RBAC capability evaluator and global SYSTEM_LOCKDOWN state gate.
 */
import {
	CAPABILITY_REGISTER,
	MUTATION_MASK,
	ROLE_IDS,
	ROLE_MASKS,
	type CapabilityKey,
	type RoleId,
} from '@config/security.constants';

let globalSystemLockdown = false;

export function isSystemLockdownActive(): boolean {
	return globalSystemLockdown;
}

export function setSystemLockdownActive(enabled: boolean): boolean {
	globalSystemLockdown = Boolean(enabled);
	return globalSystemLockdown;
}

export function computeEffectiveMask(
	roleId: RoleId | string,
	grantMask = 0,
	denyMask = 0,
	tokenScopeMask = 0xffffffff,
	lockdownActive: boolean = globalSystemLockdown
): number {
	const rolePreset = ROLE_MASKS[roleId as RoleId] ?? ROLE_MASKS.ROLE_GUEST;
	let effective = (((rolePreset | (grantMask >>> 0)) & ~(denyMask >>> 0)) & (tokenScopeMask >>> 0)) >>> 0;
	if (lockdownActive && roleId !== ROLE_IDS.ADMIN) {
		effective = (effective & ~MUTATION_MASK) >>> 0;
	}
	return effective >>> 0;
}

export function hasCapability(effectiveMask: number, requiredMask: number): boolean {
	const eff = effectiveMask >>> 0;
	const req = requiredMask >>> 0;
	return ((eff & req) >>> 0) === req;
}

export function missingCapabilities(effectiveMask: number, requiredMask: number): readonly CapabilityKey[] {
	const eff = effectiveMask >>> 0;
	const req = requiredMask >>> 0;
	const missing: CapabilityKey[] = [];
	for (const entry of CAPABILITY_REGISTER) {
		if ((req & entry.mask) === entry.mask && (eff & entry.mask) !== entry.mask) {
			missing.push(entry.key);
		}
	}
	return missing;
}

export function decodeMaskCapabilities(effectiveMask: number): readonly CapabilityKey[] {
	const eff = effectiveMask >>> 0;
	return CAPABILITY_REGISTER.filter((c) => (eff & c.mask) === c.mask).map((c) => c.key);
}

export function toMaskHex(mask: number): string {
	return `0x${(mask >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
}
