/**
 * @author Oblx <code@oblx.dev>
 * @description Bi-Directional OASIS SARIF 2.1.0 Bridge mapping external SAST/linter findings onto Chronos entities and exporting CHR-001..015.
 */
import { APP_METADATA } from '@config/constants';
import { CODECHECK_RULES_REGISTRY, RULE_SEVERITIES, type RuleSeverity } from '@config/registries/rules.registry';
import type { GraphEntityNode } from '@core/graph/graph_traversal';
import type { CodeCheckViolation } from '@core/metrics/codecheck.engine';

export interface Sarif210Location {
	readonly physicalLocation?: {
		readonly artifactLocation?: { readonly uri?: string };
		readonly region?: { readonly startLine?: number; readonly startColumn?: number };
	};
}

export interface Sarif210Result {
	readonly ruleId?: string;
	readonly level?: 'error' | 'warning' | 'note';
	readonly message?: { readonly text?: string };
	readonly locations?: readonly Sarif210Location[];
}

export interface Sarif210Log {
	readonly $schema: string;
	readonly version: '2.1.0';
	readonly runs: ReadonlyArray<{
		readonly tool: {
			readonly driver: {
				readonly name: string;
				readonly version?: string;
				readonly rules?: ReadonlyArray<{
					readonly id: string;
					readonly name: string;
					readonly shortDescription: { readonly text: string };
					readonly help?: { readonly text: string };
				}>;
			};
		};
		readonly results: readonly Sarif210Result[];
	}>;
}

const SARIF_SCHEMA_URL = 'https://json.schemastore.org/sarif-2.1.0.json';

function mapSeverityToSarifLevel(sev: RuleSeverity): 'error' | 'warning' | 'note' {
	if (sev === RULE_SEVERITIES.BLOCKER || sev === RULE_SEVERITIES.CRITICAL) return 'error';
	if (sev === RULE_SEVERITIES.WARN) return 'warning';
	return 'note';
}

function mapSarifLevelToSeverity(level?: string): RuleSeverity {
	if (level === 'error') return RULE_SEVERITIES.CRITICAL;
	if (level === 'warning') return RULE_SEVERITIES.WARN;
	return RULE_SEVERITIES.INFO;
}

export function exportSarif210Report(violations: readonly CodeCheckViolation[]): Sarif210Log {
	return {
		$schema: SARIF_SCHEMA_URL,
		version: '2.1.0',
		runs: [
			{
				tool: {
					driver: {
						name: APP_METADATA.NAME,
						version: APP_METADATA.VERSION,
						rules: CODECHECK_RULES_REGISTRY.map((r) => ({
							id: r.id,
							name: r.code,
							shortDescription: { text: r.title },
							help: { text: r.remediationHint },
						})),
					},
				},
				results: violations.map((v) => ({
					ruleId: v.ruleId,
					level: mapSeverityToSarifLevel(v.severity),
					message: { text: `${v.message} — ${v.remediationHint}` },
					locations: [
						{
							physicalLocation: {
								artifactLocation: { uri: v.qualifiedName.split('::')[0] ?? v.qualifiedName },
								region: { startLine: v.line, startColumn: 1 },
							},
						},
					],
				})),
			},
		],
	};
}

export function importSarif210Diagnostics(
	rawSarifJson: string,
	nodes: readonly GraphEntityNode[]
): readonly CodeCheckViolation[] {
	const parsed = JSON.parse(rawSarifJson) as Partial<Sarif210Log>;
	const imported: CodeCheckViolation[] = [];
	const fallbackNode = nodes[0];
	if (!fallbackNode || !Array.isArray(parsed.runs)) return imported;

	for (const run of parsed.runs) {
		const toolName = run.tool?.driver?.name ?? 'EXTERNAL_SARIF';
		for (const res of run.results ?? []) {
			const loc = res.locations?.[0]?.physicalLocation;
			const rawUri = (loc?.artifactLocation?.uri ?? '').replace(/^file:\/\//, '').replace(/^\.\//, '');
			const line = loc?.region?.startLine ?? 1;
			const matchedNode =
				nodes.find((n) => n.qualifiedName.startsWith(rawUri) && n.qualifiedName.includes('::')) ??
				nodes.find((n) => n.qualifiedName === rawUri) ??
				fallbackNode;

			imported.push({
				ruleId: res.ruleId ?? 'SARIF-EXT',
				ruleCode: res.ruleId ?? 'SARIF_FINDING',
				severity: mapSarifLevelToSeverity(res.level),
				entityId: matchedNode.id,
				entityName: matchedNode.name,
				qualifiedName: matchedNode.qualifiedName,
				line,
				message: res.message?.text ?? 'External SARIF diagnostic finding',
				remediationHint: `Imported from ${toolName} (${rawUri || matchedNode.qualifiedName}:L${line})`,
				sourceTool: toolName,
			});
		}
	}
	return imported;
}
