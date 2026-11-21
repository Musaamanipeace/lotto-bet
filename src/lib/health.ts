import { fetchBetPawaGames } from './bookmakers/betpawa.ts';
import { fetchSportyGames } from './bookmakers/sportybet.ts';
import { fetchJsonOnce, type FetchImpl } from './http.ts';

export type UpstreamHealth = {
  name: string;
  status: 'ok' | 'failed' | 'not_configured';
  httpStatus?: number;
  error?: string;
  latencyMs?: number;
};

type Env = { FOOTBALL_DATA_API_KEY?: string; API_FOOTBALL_KEY?: string };

async function timed(name: string, run: () => Promise<{ ok: boolean; error?: string; httpStatus?: number }>): Promise<UpstreamHealth> {
  const t0 = Date.now();
  const r = await run();
  return { name, status: r.ok ? 'ok' : 'failed', httpStatus: r.httpStatus, error: r.error, latencyMs: Date.now() - t0 };
}

/** One probe per upstream, one attempt each. Failures are reported verbatim, never hidden. */
export async function runHealthChecks(env: Env, fetchImpl: FetchImpl = fetch): Promise<UpstreamHealth[]> {
  const probeStats = (name: string, key: string | undefined, url: string, header: string): Promise<UpstreamHealth> => {
    if (!key) return Promise.resolve({ name, status: 'not_configured' as const });
    return timed(name, async () => {
      const r = await fetchJsonOnce(fetchImpl, url, { headers: { [header]: key } }, { name });
      return r.ok ? { ok: true, httpStatus: r.status } : { ok: false, error: r.error, httpStatus: r.details.httpStatus };
    });
  };
  return Promise.all([
    timed('SportyBet', async () => {
      const r = await fetchSportyGames({ pageSize: 1 }, fetchImpl);
      return r.ok ? { ok: true } : { ok: false, error: r.error, httpStatus: r.details.httpStatus };
    }),
    timed('betPawa', async () => {
      const r = await fetchBetPawaGames({ take: 1 }, fetchImpl);
      return r.ok ? { ok: true } : { ok: false, error: r.error, httpStatus: r.details.httpStatus };
    }),
    probeStats('football-data.org', env.FOOTBALL_DATA_API_KEY, 'https://api.football-data.org/v4/competitions', 'X-Auth-Token'),
    probeStats('API-Football', env.API_FOOTBALL_KEY, 'https://v3.football.api-sports.io/status', 'x-apisports-key'),
  ]);
}
