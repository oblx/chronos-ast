/**
 * @author Oblx <code@oblx.dev>
 * @description Chronos Project Compare snapshot delta engine computing PercentChanged churn, Diff-prefixed metric deltas, and COMPARE_STATUS tags.
 */
import { COMPARE_CHURN_WEIGHTS, COMPARE_STATUS, type CompareStatus } from '@config/constants';
import { LEXICAL_CONSTANTS } from '@config/metamodel.constants';
import { computeTarjanScc } from '@core/graph/scc.tarjan';
import type { WorkspaceSnapshot } from './workspace.indexer';

export type EntityDiffStatus = CompareStatus;

export interface EntityDeltaRecord {
	readonly qualifiedName: string;
	readonly kind: string;
	readonly status: EntityDiffStatus;
	readonly deltaLoc: number;
	readonly deltaCyclomatic: number;
	readonly deltaHalstead: number;
	readonly deltaInstability: number;
	readonly diffLoc: number;
	readonly diffCyclomatic: number;
	readonly diffInstability: number;
	readonly percentChanged: number;
}

export interface SnapshotDiffReport {
	readonly addedCount: number;
	readonly removedCount: number;
	readonly modifiedCount: number;
	readonly totalDeltaLoc: number;
	readonly totalDeltaCyclomatic: number;
	readonly newlyFormedCycleCount: number;
	readonly percentChanged: number;
	readonly entityDeltas: Readonly<Record<string, EntityDeltaRecord>>;
	readonly edgeStatusById: Readonly<Record<number, CompareStatus>>;
}

export function computePercentChangedChurn(
	addedLines: number,
	removedLines: number,
	changedLines: number,
	currentLines: number,
	previousLines: number
): number {
	const numerator =
		COMPARE_CHURN_WEIGHTS.ADDED_WEIGHT * Math.max(0, addedLines) +
		COMPARE_CHURN_WEIGHTS.REMOVED_WEIGHT * Math.max(0, removedLines) +
		COMPARE_CHURN_WEIGHTS.CHANGED_WEIGHT * Math.max(0, changedLines);
	const denominator = Math.max(1, currentLines + previousLines);
	return Math.min(1, Number((numerator / denominator).toFixed(4)));
}

export function diffWorkspaceSnapshots(
	baseline: WorkspaceSnapshot,
	target: WorkspaceSnapshot
): SnapshotDiffReport {
	const sep = LEXICAL_CONSTANTS.QUALIFIED_SEPARATOR;
	const baseMap = new Map(baseline.nodes.map((n) => [`${n.kind}${sep}${n.qualifiedName}`, n]));
	const targetMap = new Map(target.nodes.map((n) => [`${n.kind}${sep}${n.qualifiedName}`, n]));
	const entityDeltas: Record<string, EntityDeltaRecord> = {};

	let [addedCount, removedCount, modifiedCount, totalDeltaLoc, totalDeltaCyclomatic] = [0, 0, 0, 0, 0];
	let [addedLines, removedLines, changedLines, currentLines, previousLines] = [0, 0, 0, 0, 0];

	for (const [, bNode] of baseMap) previousLines += bNode.loc;
	for (const [, tNode] of targetMap) currentLines += tNode.loc;

	for (const [key, tNode] of targetMap) {
		const bNode = baseMap.get(key);
		if (!bNode) {
			addedCount++;
			addedLines += tNode.loc;
			totalDeltaLoc += tNode.loc;
			totalDeltaCyclomatic += tNode.cyclomatic;
			entityDeltas[tNode.qualifiedName] = {
				qualifiedName: tNode.qualifiedName, kind: tNode.kind, status: COMPARE_STATUS.ADDED,
				deltaLoc: tNode.loc, deltaCyclomatic: tNode.cyclomatic, deltaHalstead: tNode.halsteadVolume, deltaInstability: tNode.instability,
				diffLoc: tNode.loc, diffCyclomatic: tNode.cyclomatic, diffInstability: tNode.instability,
				percentChanged: computePercentChangedChurn(tNode.loc, 0, 0, tNode.loc, 0),
			};
			continue;
		}
		const [dLoc, dCyc, dHal, dInst] = [tNode.loc - bNode.loc, tNode.cyclomatic - bNode.cyclomatic, tNode.halsteadVolume - bNode.halsteadVolume, tNode.instability - bNode.instability];
		const isMod = dLoc !== 0 || dCyc !== 0 || dHal !== 0 || dInst !== 0;
		const entChangedLines = isMod ? Math.max(1, Math.abs(dLoc)) : 0;
		if (isMod) { modifiedCount++; changedLines += entChangedLines; }
		totalDeltaLoc += dLoc;
		totalDeltaCyclomatic += dCyc;
		entityDeltas[tNode.qualifiedName] = {
			qualifiedName: tNode.qualifiedName, kind: tNode.kind, status: isMod ? COMPARE_STATUS.MODIFIED : COMPARE_STATUS.UNCHANGED,
			deltaLoc: dLoc, deltaCyclomatic: dCyc, deltaHalstead: dHal, deltaInstability: dInst,
			diffLoc: dLoc, diffCyclomatic: dCyc, diffInstability: dInst,
			percentChanged: computePercentChangedChurn(Math.max(0, dLoc), Math.max(0, -dLoc), entChangedLines, tNode.loc, bNode.loc),
		};
	}

	for (const [key, bNode] of baseMap) {
		if (!targetMap.has(key)) {
			removedCount++;
			removedLines += bNode.loc;
			totalDeltaLoc -= bNode.loc;
			totalDeltaCyclomatic -= bNode.cyclomatic;
			entityDeltas[bNode.qualifiedName] = {
				qualifiedName: bNode.qualifiedName, kind: bNode.kind, status: COMPARE_STATUS.REMOVED,
				deltaLoc: -bNode.loc, deltaCyclomatic: -bNode.cyclomatic, deltaHalstead: -bNode.halsteadVolume, deltaInstability: -bNode.instability,
				diffLoc: -bNode.loc, diffCyclomatic: -bNode.cyclomatic, diffInstability: -bNode.instability,
				percentChanged: computePercentChangedChurn(0, bNode.loc, 0, 0, bNode.loc),
			};
		}
	}

	const baseById = new Map(baseline.nodes.map((n) => [n.id, n.qualifiedName]));
	const targetById = new Map(target.nodes.map((n) => [n.id, n.qualifiedName]));
	const baseEdgeKeys = new Set(baseline.edges.map((e) => `${e.kind}:${baseById.get(e.sourceEntityId)}->${baseById.get(e.targetEntityId)}`));
	const edgeStatusById: Record<number, CompareStatus> = {};
	for (const e of target.edges) {
		const k = `${e.kind}:${targetById.get(e.sourceEntityId)}->${targetById.get(e.targetEntityId)}`;
		edgeStatusById[e.id] = baseEdgeKeys.has(k) ? COMPARE_STATUS.UNCHANGED : COMPARE_STATUS.ADDED;
	}

	const baseScc = computeTarjanScc(baseline.nodes, baseline.edges);
	const targetScc = computeTarjanScc(target.nodes, target.edges);
	const newlyFormedCycleCount = Math.max(0, targetScc.cyclicClusters.length - baseScc.cyclicClusters.length);
	const percentChanged = computePercentChangedChurn(addedLines, removedLines, changedLines, currentLines, previousLines);

	return { addedCount, removedCount, modifiedCount, totalDeltaLoc, totalDeltaCyclomatic, newlyFormedCycleCount, percentChanged, entityDeltas, edgeStatusById };
}
