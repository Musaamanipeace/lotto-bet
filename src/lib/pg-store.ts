import pg from 'pg';
import type { GameMatch } from './matching.ts';
import type { RunKind, RunRecord, RunResults, Store } from './store.ts';
import type { Bookmaker, Game } from './types.ts';

let pool: pg.Pool | null = null;
function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return (pool ??= new pg.Pool({ connectionString: url, max: 3 }));
}

export class PgStore implements Store {
  async createRun(kind: RunKind) {
    const r = await getPool().query('INSERT INTO fetch_runs (kind) VALUES ($1) RETURNING id', [kind]);
    return r.rows[0].id as string;
  }
  async finishRun(id: string, results: RunResults) {
    await getPool().query('UPDATE fetch_runs SET finished_at = now(), results = $2 WHERE id = $1', [id, JSON.stringify(results)]);
  }
  async saveGames(runId: string, games: Game[]) {
    if (games.length === 0) return;
    await getPool().query(
      `INSERT INTO games (id, fetch_run_id, bookmaker, native_event_id, home, away, kickoff, league, markets)
       SELECT r.id, $1, r.bookmaker, r."nativeEventId", r.home, r.away, to_timestamp(r.kickoff / 1000.0), r.league, r.markets
       FROM jsonb_to_recordset($2::jsonb) AS r(id text, bookmaker text, "nativeEventId" text, home text, away text, kickoff bigint, league text, markets jsonb)`,
      [runId, JSON.stringify(games)],
    );
  }
  async saveMatches(runId: string, matches: GameMatch[]) {
    if (matches.length === 0) return;
    await getPool().query(
      `INSERT INTO game_matches (fetch_run_id, sporty_game_id, betpawa_game_id, score)
       SELECT $1, r."sportyGameId", r."betpawaGameId", r.score
       FROM jsonb_to_recordset($2::jsonb) AS r("sportyGameId" text, "betpawaGameId" text, score numeric)`,
      [runId, JSON.stringify(matches)],
    );
  }
  async latestRun(): Promise<RunRecord | null> {
    const r = await getPool().query(
      `SELECT id, kind, (extract(epoch from started_at)*1000)::bigint AS s, (extract(epoch from finished_at)*1000)::bigint AS f, results
       FROM fetch_runs WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`);
    const row = r.rows[0];
    return row ? { id: row.id, kind: row.kind, startedAt: Number(row.s), finishedAt: Number(row.f), results: row.results } : null;
  }
  async gamesForRun(runId: string, bookmaker: Bookmaker): Promise<Game[]> {
    const r = await getPool().query(
      `SELECT id, bookmaker, native_event_id, home, away, (extract(epoch from kickoff)*1000)::bigint AS k, league, markets
       FROM games WHERE fetch_run_id = $1 AND bookmaker = $2 ORDER BY kickoff`, [runId, bookmaker]);
    return r.rows.map((x) => ({
      id: x.id, bookmaker: x.bookmaker, nativeEventId: x.native_event_id, home: x.home, away: x.away,
      kickoff: Number(x.k), league: x.league, markets: x.markets, fetchRunId: runId,
    }));
  }
}
