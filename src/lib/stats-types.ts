import type { MissingState } from './data-state.ts';

export type Side = 'home' | 'away' | 'both';

export type MetricRequest = {
  metric: string;
  teamIds?: string[];
  window?: number;
  fixtureId?: string;
  league?: string;
  home?: string;
  away?: string;
  /** Which team the criterion is about. 'both' averages the two teams. */
  side?: Side;
  /** Kickoff, epoch ms (used for rest days). */
  kickoff?: number;
};

export type MetricOutcome =
  | { ok: true; value: number; provider: string; note?: string }
  | { ok: false; state: MissingState; reason: string; provider?: string };

export const hit = (value: number, provider: string, note?: string): MetricOutcome => ({ ok: true, value, provider, note });
export const miss = (state: MissingState, reason: string, provider?: string): MetricOutcome => ({ ok: false, state, reason, provider });

export interface StatsProvider {
  readonly name: string;
  supports(metric: string): boolean;
  /**
   * Called once at the start of an AI generation run (resets per-run request budgets).
   * maxWaitMs caps how long the provider may sleep for rate limits during this run; when a wait
   * would exceed it the metric is reported as not_fetched instead of blocking the request.
   */
  beginRun?(opts?: { maxWaitMs?: number }): void;
  fetch(req: MetricRequest): Promise<MetricOutcome>;
}

