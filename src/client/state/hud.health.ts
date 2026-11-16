/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos v1.6.2 Workspace Health Grade Evaluator.
 */

export interface WorkspaceHealth {
	readonly grade: string;
	readonly label: string;
}

export function computeWorkspaceHealthGrade(violationsCount: number, entityCount: number): WorkspaceHealth {
	if (entityCount === 0) return { grade: '—', label: 'Idle' };
	const r = violationsCount / Math.max(1, entityCount);
	if (r === 0) return { grade: 'A+', label: 'Optimal' };
	if (r <= 0.15) return { grade: 'A', label: 'Nominal' };
	if (r <= 0.35) return { grade: 'B', label: 'Guarded' };
	if (r <= 0.65) return { grade: 'C', label: 'Elevated' };
	return { grade: 'D', label: 'Critical' };
}
