/**
 * @author Oblx <code@oblx.dev>
 * @description Hexagonal AuthSourcePort interface and verified identity claim contract.
 */
import type { AuthSourceKind, PrincipalKind, RoleId } from '@config/security.constants';
import type { ChronosDatabaseHandle } from '@lib/db/sqlite/client/connection';

export interface VerifiedIdentityClaim {
	readonly userId: string;
	readonly uid?: number;
	readonly username: string;
	readonly principalKind: PrincipalKind;
	readonly authSource: AuthSourceKind;
	readonly roleId: RoleId | string;
	readonly grantMask: number;
	readonly denyMask: number;
	readonly scopedBitmask?: number;
}

export interface AuthSourcePort<TChallengeInput = unknown, TVerifyInput = unknown> {
	readonly sourceKind: AuthSourceKind;
	initiateChallenge?(handle: ChronosDatabaseHandle, input: TChallengeInput): Promise<unknown>;
	verifyCredential(handle: ChronosDatabaseHandle, input: TVerifyInput): Promise<VerifiedIdentityClaim | null>;
}
