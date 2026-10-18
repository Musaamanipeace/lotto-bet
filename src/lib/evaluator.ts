import { VERIFICATION } from './criteria.ts';

export type CriterionStatus = 'pass' | 'fail' | 'unavailable';
export type CriterionResult = { id: string; label: string; status: CriterionStatus; detail?: string };

export const NO_STATS_PROVIDER_MESSAGE = 'No stats provider configured, so tier criteria can’t be verified.';

export type Evaluation = {
  qualifies: boolean;
  passed: number;
  verifiable: number;
  total: number;
  /** "N of M criteria verified": N counts criteria confirmed as passing, never unavailable ones. */
  label: string;
  reason: string | null;
};

export function evaluateCriteria(results: CriterionResult[], minFraction: number = VERIFICATION.minVerifiableFraction): Evaluation {
  const total = results.length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const verifiable = passed + failed;
  const label = `${passed} of ${total} criteria verified`;
  const base = { passed, verifiable, total, label };
  if (total === 0) return { ...base, qualifies: false, reason: 'No criteria are configured for this market and tier, so it cannot be verified' };
  if (verifiable / total < minFraction) {
    return { ...base, qualifies: false, reason: `Only ${verifiable} of ${total} criteria are verifiable (minimum ${Math.round(minFraction * 100)}%)` };
  }
  if (failed > 0) return { ...base, qualifies: false, reason: `${failed} criteria failed` };
  return { ...base, qualifies: true, reason: null };
}
