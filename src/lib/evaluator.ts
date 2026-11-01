import { VERIFICATION } from './criteria.ts';
import { emptyStateCounts, type DataState, type StateCounts } from './data-state.ts';

export type CriterionStatus = 'pass' | 'fail' | 'unavailable';
export type CriterionResult = {
  id: string;
  label: string;
  status: CriterionStatus;
  detail?: string;
  provisional?: boolean;
  /** Why the data is missing (or 'ok'). Absent on legacy results: unavailable then reads as not_fetched. */
  dataState?: DataState;
  /** Where the value came from, when there is one. */
  provider?: string;
};

export const NO_STATS_PROVIDER_MESSAGE =
  'No stats provider configured, so tier criteria can’t be verified.';

export type PickLabel = 'Verified' | 'Best fit';

export type Evaluation = {
  qualifies: boolean;
  /** Verified only when ≥60 % verifiable AND every verifiable criterion passes. */
  label: PickLabel;
  passed: number;
  verifiable: number;
  total: number;
  /** "N of M criteria verified" – N counts only confirmed passes, never unavailable. */
  verifiedLabel: string;
  reason: string | null;
  provisionalCriteria: string[];
  /** Share of criteria that had real data (pass + fail) / total. Used to rank low-data picks more cautiously. */
  dataCoverage?: number;
  /** How many criteria fall into each data state. */
  stateCounts?: StateCounts;
};

/**
 * Evaluates a pick's criteria results.
 * - Unavailable never counts as a pass.
 * - In best_fit mode a pick that misses the 60 % rule still "qualifies" as Best fit.
 * - In strict mode only Verified picks qualify.
 */
export function evaluateCriteria(
  results: CriterionResult[],
  minFraction: number = VERIFICATION.minVerifiableFraction,
  mode: 'best_fit' | 'strict' = VERIFICATION.mode,
): Evaluation {
  const total = results.length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const verifiable = passed + failed;
  const verifiedLabel = `${passed} of ${total} criteria verified`;
  const provisionalCriteria = results.filter((r) => r.provisional).map((r) => r.id);

  const stateCounts = emptyStateCounts();
  for (const r of results) {
    stateCounts[r.dataState ?? (r.status === 'unavailable' ? 'not_fetched' : 'ok')]++;
  }

  const base = {
    passed,
    verifiable,
    total,
    verifiedLabel,
    provisionalCriteria,
    dataCoverage: total > 0 ? verifiable / total : 0,
    stateCounts,
  };

  if (total === 0) {
    return {
      ...base,
      qualifies: false,
      label: 'Best fit',
      reason: 'No criteria are configured for this market and tier, so it cannot be verified',
    };
  }

  const meetsFraction = verifiable / total >= minFraction;
  const allPass = failed === 0;

  if (meetsFraction && allPass) {
    return {
      ...base,
      qualifies: true,
      label: 'Verified',
      reason: null,
    };
  }

  // Misses Verified rule
  const reason = !meetsFraction
    ? `Only ${verifiable} of ${total} criteria are verifiable (minimum ${Math.round(minFraction * 100)}%)`
    : `${failed} criteria failed`;

  if (mode === 'strict') {
    return {
      ...base,
      qualifies: false,
      label: 'Best fit',
      reason,
    };
  }

  // best_fit: still surface the pick, clearly labeled
  return {
    ...base,
    qualifies: true,
    label: 'Best fit',
    reason,
  };
}
