/**
 * football-data.org v4 (free tier). Auth: X-Auth-Token header. Free limit: 10 requests/minute.
 *
 * Standings (one call per competition, cached) give season-to-date overall / home / away tables:
 *   home_win_rate, away_win_rate, unbeaten_home_rate, league_rank, goals_scored_avg, goals_conceded_avg.
 * A team's recent finished matches (one call per team, cached) give last-N metrics:
 *   form_points, rest_days, over_1_5_rate, under_3_5_rate, under_4_5_rate, no_draw_rate.
 *
 * Every miss carries a reason (no key / league not covered / team not matched / budget / HTTP error).
 * There is no retry: a failed request is reported as fetch_failed.
 */
import { MATCHING } from './criteria.ts';
import { competitionCodeFor } from './competitions.ts';
import { teamSimilarity } from './matching.ts';
import { hit, miss, type MetricOutcome, type MetricRequest, type Side, type StatsProvider } from './stats-types.ts';

const NAME = 'football-data.org';

export const FD_STANDINGS_METRICS = new Set([
  'home_win_rate', 'away_win_rate', 'unbeaten_home_rate', 'league_rank', 'goals_scored_avg', 'goals_conceded_avg',
]);
export const FD_MATCH_METRICS = new Set([
  'form_points', 'rest_days', 'over_1_5_rate', 'under_3_5_rate', 'under_4_5_rate', 'no_draw_rate',
]);

type TableRow = {
  position: number; team: { id: number; name: string; shortName?: string };
  playedGames: number; won: number; draw: number; lost: number; goalsFor: number; goalsAgainst: number;
};
type Standings = { total: TableRow[]; home: TableRow[]; away: TableRow[] };
type FdMatch = {
  utcDate: string; status: string;
  homeTeam: { id: number }; awayTeam: { id: number };
  score?: { fullTime?: { home: number | null; away: number | null } };
};
type Fail = { fail: Extract<MetricOutcome, { ok: false }> };
const isFail = (x: unknown): x is Fail => typeof x === 'object' && x !== null && 'fail' in x;

export type FdDeps = {
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  baseUrl?: string;
};

const HOUR = 3_600_000;
const MIN_PLAYED = 3;

export class FootballDataProvider implements StatsProvider {
  readonly name = NAME;
  private key: string | undefined;
  private maxCallsPerRun: number;
  private ratePerMin: number;
  private callsThisRun = 0;
  private stamps: number[] = [];
  private fetchImpl: typeof fetch;
  private now: () => number;
  private sleep: (ms: number) => Promise<void>;
  private baseUrl: string;
  private standingsCache = new Map<string, { at: number; value: Standings | Fail }>();
  private matchesCache = new Map<number, { at: number; value: FdMatch[] | Fail }>();

  constructor(env: NodeJS.ProcessEnv = process.env, deps: FdDeps = {}) {
    this.key = env.FOOTBALL_DATA_API_KEY;
    this.maxCallsPerRun = Number(env.FOOTBALL_DATA_MAX_CALLS_PER_RUN || 60);
    this.ratePerMin = Math.max(1, Number(env.FOOTBALL_DATA_RATE_PER_MIN || 9));
    this.fetchImpl = deps.fetch ?? fetch;
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.baseUrl = deps.baseUrl ?? 'https://api.football-data.org/v4';
  }

  beginRun(): void { this.callsThisRun = 0; }

  supports(metric: string): boolean {
    return FD_STANDINGS_METRICS.has(metric) || FD_MATCH_METRICS.has(metric);
  }

  /** Waits so no more than ratePerMin calls start inside any rolling minute. */
  private async throttle(): Promise<void> {
    for (;;) {
      const t = this.now();
      this.stamps = this.stamps.filter((s) => t - s < 60_000);
      if (this.stamps.length < this.ratePerMin) { this.stamps.push(t); return; }
      await this.sleep(60_000 - (t - this.stamps[0]) + 50);
    }
  }

  private async get(path: string): Promise<{ data: unknown } | Fail> {
    if (!this.key) return { fail: miss('not_fetched', 'FOOTBALL_DATA_API_KEY is not set.', NAME) as never };
    if (this.callsThisRun >= this.maxCallsPerRun) {
      return { fail: miss('not_fetched', `Per-run request budget reached (${this.maxCallsPerRun}); Big Five leagues are fetched first.`, NAME) as never };
    }
    this.callsThisRun++;
    await this.throttle();
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, { headers: { 'X-Auth-Token': this.key } });
    } catch (e) {
      return { fail: miss('fetch_failed', `Network error: ${e instanceof Error ? e.message : String(e)}`, NAME) as never };
    }
    if (res.status === 429) return { fail: miss('fetch_failed', 'Rate limited by football-data.org (HTTP 429).', NAME) as never };
    if (res.status === 401 || res.status === 400) return { fail: miss('fetch_failed', `football-data.org rejected the API key (HTTP ${res.status}).`, NAME) as never };
    if (res.status === 403) return { fail: miss('not_offered', 'Not included in the free football-data.org plan (HTTP 403).', NAME) as never };
    if (res.status === 404) return { fail: miss('not_covered', 'football-data.org has no data for this (HTTP 404).', NAME) as never };
    if (!res.ok) return { fail: miss('fetch_failed', `football-data.org returned HTTP ${res.status}.`, NAME) as never };
    try {
      return { data: await res.json() };
    } catch {
      return { fail: miss('fetch_failed', 'football-data.org returned a response that is not valid JSON.', NAME) as never };
    }
  }

  private async getStandings(code: string): Promise<Standings | Fail> {
    const hitCache = this.standingsCache.get(code);
    const ttl = hitCache && isFail(hitCache.value) ? 10 * 60_000 : 6 * HOUR;
    if (hitCache && this.now() - hitCache.at < ttl) return hitCache.value;
    const r = await this.get(`/competitions/${code}/standings`);
    let value: Standings | Fail;
    if (isFail(r)) value = r;
    else {
      const arr = ((r.data as { standings?: { type: string; table: TableRow[] }[] }).standings) ?? [];
      const pick = (t: string) => arr.find((s) => s.type === t)?.table ?? [];
      const s: Standings = { total: pick('TOTAL'), home: pick('HOME'), away: pick('AWAY') };
      value = s.total.length ? s : { fail: miss('not_covered', `football-data.org returned no table for ${code}.`, NAME) as never };
    }
    // A budget / missing-key miss is not a property of the data: never cache it, the next run may succeed.
    if (!(isFail(value) && value.fail.state === 'not_fetched')) this.standingsCache.set(code, { at: this.now(), value });
    return value;
  }

  private async getMatches(teamId: number): Promise<FdMatch[] | Fail> {
    const c = this.matchesCache.get(teamId);
    const ttl = c && isFail(c.value) ? 10 * 60_000 : 6 * HOUR;
    if (c && this.now() - c.at < ttl) return c.value;
    const r = await this.get(`/teams/${teamId}/matches?status=FINISHED&limit=10`);
    const value: FdMatch[] | Fail = isFail(r) ? r : (((r.data as { matches?: FdMatch[] }).matches) ?? []);
    if (!(isFail(value) && value.fail.state === 'not_fetched')) this.matchesCache.set(teamId, { at: this.now(), value });
    return value;
  }

  private findTeam(table: TableRow[], name: string): TableRow | null {
    let best: TableRow | null = null;
    let bestScore = 0;
    for (const row of table) {
      const s = Math.max(teamSimilarity(name, row.team.name), row.team.shortName ? teamSimilarity(name, row.team.shortName) : 0);
      if (s > bestScore) { best = row; bestScore = s; }
    }
    return best && bestScore >= MATCHING.teamSimilarityThreshold ? best : null;
  }

  async fetch(req: MetricRequest): Promise<MetricOutcome> {
    if (!this.key) return miss('not_fetched', 'FOOTBALL_DATA_API_KEY is not set.', NAME);
    const code = competitionCodeFor(req.league);
    if (!code) {
      return miss('not_covered', `League "${req.league ?? 'unknown'}" is not one of the free football-data.org competitions.`, NAME);
    }
    const intrinsic: Side | null =
      req.metric === 'home_win_rate' || req.metric === 'unbeaten_home_rate' ? 'home'
      : req.metric === 'away_win_rate' ? 'away' : null;
    const side: Side = intrinsic ?? req.side ?? 'both';
    const names: { which: 'home' | 'away'; name: string }[] = [];
    if (side !== 'away' && req.home) names.push({ which: 'home', name: req.home });
    if (side !== 'home' && req.away) names.push({ which: 'away', name: req.away });
    if (names.length === 0 || (side === 'both' && names.length < 2)) {
      return miss('not_fetched', 'Team names were not passed to the stats provider.', NAME);
    }

    const st = await this.getStandings(code);
    if (isFail(st)) return st.fail;

    const values: number[] = [];
    let note = '';
    for (const { name } of names) {
      const row = this.findTeam(st.total, name);
      if (!row) return miss('not_covered', `Team "${name}" could not be matched in the ${code} table.`, NAME);
      const v = FD_STANDINGS_METRICS.has(req.metric)
        ? this.standingsValue(req.metric, st, row)
        : await this.matchValue(req, row.team.id);
      if (typeof v !== 'number') return v;
      values.push(v);
    }
    note = FD_STANDINGS_METRICS.has(req.metric) ? 'season-to-date' : `last ${Math.max(1, req.window ?? 5)} matches`;
    const value = req.metric === 'rest_days' ? Math.min(...values) : values.reduce((a, b) => a + b, 0) / values.length;
    return hit(Math.round(value * 1000) / 1000, NAME, note);
  }

  private standingsValue(metric: string, st: Standings, total: TableRow): number | MetricOutcome {
    const byTeam = (rows: TableRow[]) => rows.find((r) => r.team.id === total.team.id);
    const need = (row: TableRow | undefined, label: string): TableRow | MetricOutcome => {
      if (!row) return miss('not_covered', `No ${label} table row for ${total.team.name}.`, NAME);
      if (row.playedGames < MIN_PLAYED) return miss('not_covered', `${total.team.name} has played only ${row.playedGames} ${label} matches (need ${MIN_PLAYED}).`, NAME);
      return row;
    };
    if (metric === 'league_rank') return total.position;
    if (metric === 'home_win_rate' || metric === 'unbeaten_home_rate') {
      const r = need(byTeam(st.home), 'home');
      if ('ok' in r) return r;
      return (metric === 'home_win_rate' ? r.won : r.won + r.draw) / r.playedGames;
    }
    if (metric === 'away_win_rate') {
      const r = need(byTeam(st.away), 'away');
      if ('ok' in r) return r;
      return r.won / r.playedGames;
    }
    const r = need(total, 'league');
    if ('ok' in r) return r;
    return (metric === 'goals_scored_avg' ? r.goalsFor : r.goalsAgainst) / r.playedGames;
  }

  private async matchValue(req: MetricRequest, teamId: number): Promise<number | MetricOutcome> {
    const ms = await this.getMatches(teamId);
    if (isFail(ms)) return ms.fail;
    const window = Math.min(10, Math.max(1, req.window ?? 5));
    const finished = ms
      .filter((m) => m.status === 'FINISHED' && m.score?.fullTime?.home != null && m.score?.fullTime?.away != null)
      .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
    const last = finished.slice(-window);
    if (last.length < Math.min(window, 3)) {
      return miss('not_covered', `Only ${last.length} finished matches found for this team (need ${Math.min(window, 3)}).`, NAME);
    }
    const goals = (m: FdMatch) => (m.score!.fullTime!.home as number) + (m.score!.fullTime!.away as number);
    const share = (f: (m: FdMatch) => boolean) => last.filter(f).length / last.length;
    switch (req.metric) {
      case 'form_points': {
        const five = finished.slice(-5);
        if (five.length < 3) return miss('not_covered', `Only ${five.length} finished matches found for form.`, NAME);
        return five.reduce((pts, m) => {
          const home = m.homeTeam.id === teamId;
          const mine = m.score!.fullTime![home ? 'home' : 'away'] as number;
          const theirs = m.score!.fullTime![home ? 'away' : 'home'] as number;
          return pts + (mine > theirs ? 3 : mine === theirs ? 1 : 0);
        }, 0);
      }
      case 'rest_days': {
        const lastDate = Date.parse(finished[finished.length - 1].utcDate);
        const ref = req.kickoff ?? this.now();
        return Math.max(0, Math.round(((ref - lastDate) / 86_400_000) * 10) / 10);
      }
      case 'over_1_5_rate': return share((m) => goals(m) >= 2);
      case 'under_3_5_rate': return share((m) => goals(m) <= 3);
      case 'under_4_5_rate': return share((m) => goals(m) <= 4);
      case 'no_draw_rate': return share((m) => m.score!.fullTime!.home !== m.score!.fullTime!.away);
      default: return miss('not_fetched', `Metric ${req.metric} is not implemented.`, NAME);
    }
  }
}
