import type { Result } from './result.ts';

/**
 * Stats providers plug in here. A metric the provider cannot supply must come back as
 * { ok: true, value: null } (unavailable) or a failure, never an estimate.
 */
export type MetricRequest = { metric: string; teamIds?: string[]; window?: number; fixtureId?: string };
export interface StatsProvider {
  readonly name: string;
  supports(metric: string): boolean;
  fetchMetric(req: MetricRequest): Promise<Result<{ value: number | null }>>;
}
export const configuredProviders = (): StatsProvider[] => []; // none implemented yet
