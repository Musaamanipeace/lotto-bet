/**
 * Why a piece of data is missing. Shown to the user so "unavailable" is never ambiguous.
 * - not_offered:    the data source / plan cannot supply it at all (xG on free data, paid-only stats).
 * - not_covered:    the source offers it, but not for this league or team (or it could not be matched).
 * - not_fetched:    it was never requested (no API key, request budget reached, integration missing).
 * - fetch_failed:   it was requested and the request failed (rate limit, timeout, rejected key).
 * - not_configured: the criterion itself has no metric or threshold yet.
 */
export type DataState = 'ok' | 'not_offered' | 'not_covered' | 'not_fetched' | 'fetch_failed' | 'not_configured';

export type MissingState = Exclude<DataState, 'ok'>;

export const DATA_STATE_LABEL: Record<DataState, string> = {
  ok: 'Data used',
  not_offered: 'Not offered on free data',
  not_covered: 'Not covered',
  not_fetched: 'Not fetched',
  fetch_failed: 'Fetch failed',
  not_configured: 'Not configured',
};

export const DATA_STATE_HELP: Record<DataState, string> = {
  ok: 'Real data was fetched and compared with the threshold.',
  not_offered: 'The data source or plan cannot supply this stat (it would need a paid plan or does not exist).',
  not_covered: 'The source offers this stat, but not for this league or team.',
  not_fetched: 'This stat was never requested (no API key, request budget reached, or not wired up yet).',
  fetch_failed: 'A request was made but failed (rate limit, network error, or the key was rejected).',
  not_configured: 'This criterion has no metric or threshold set yet.',
};

export const MISSING_STATES: MissingState[] = ['not_offered', 'not_covered', 'not_fetched', 'fetch_failed', 'not_configured'];

export type StateCounts = Record<DataState, number>;

export const emptyStateCounts = (): StateCounts => ({
  ok: 0, not_offered: 0, not_covered: 0, not_fetched: 0, fetch_failed: 0, not_configured: 0,
});

export type CoverageData = {
  criteriaTotal: number;
  byState: StateCounts;
  topReasons: { state: DataState; reason: string; count: number }[];
  candidatesTotal: number;
  candidatesWithData: number;
  providers: string[];
};

export type CoverageReport = CoverageData;

export const emptyCoverageReport = (): CoverageData => ({
  criteriaTotal: 0,
  byState: emptyStateCounts(),
  topReasons: [],
  candidatesTotal: 0,
  candidatesWithData: 0,
  providers: [],
});
