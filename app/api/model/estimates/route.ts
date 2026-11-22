import { jsonError, requireJson } from '@/lib/session.ts';
import { currentUser } from '@/lib/session.ts';
import { competitionCodeFor } from '@/lib/competitions.ts';
import { FootballDataProvider } from '@/lib/fd-provider.ts';
import { findTeamRow, leagueAverages, strengthForRow, type TableRowInput } from '@/lib/model/strengths.ts';
import { estimateForMarket } from '@/lib/model/estimate.ts';
import { getDecryptedUserKeys } from '@/lib/user-settings-store.ts';

type LegIn = {
  gameId?: string;
  league?: string | null;
  home?: string;
  away?: string;
  marketKey?: string;
};

const echo = (gameId: string | undefined) => (gameId ? { gameId } : {});

type StandingsOut = { total: TableRowInput[]; home: TableRowInput[]; away: TableRowInput[] };

const isFail = (x: unknown): x is { fail: { reason: string } } =>
  typeof x === 'object' && x !== null && 'fail' in x;

type EstimateOut =
  | { gameId?: string; marketKey: string | null; estimate: object; lamHome: number; lamAway: number }
  | { gameId?: string; marketKey: string | null; reason: string };

const provider = new FootballDataProvider();

/**
 * POST /api/model/estimates
 * Input: { legs: [{ league, home, away, marketKey }] }
 * Output: { ok: true, legs: [{ marketKey, estimate? } | { marketKey, reason }] }
 * — football-data.org covers football only; other leagues/sports return a reason.
 */
export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  let body: { legs?: LegIn[] };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  const legs = Array.isArray(body.legs) ? body.legs : [];
  const user = await currentUser(req);
  const storedKeys = user ? await getDecryptedUserKeys(user.id) : {};
  const provider = new FootballDataProvider({
    ...process.env,
    FOOTBALL_DATA_API_KEY: storedKeys.football_data ?? process.env.FOOTBALL_DATA_API_KEY,
    API_FOOTBALL_KEY: storedKeys.api_football ?? process.env.API_FOOTBALL_KEY,
  });

  const out: EstimateOut[] = [];
  for (const leg of legs) {
    const marketKey = typeof leg.marketKey === 'string' ? leg.marketKey : null;
    const legId = typeof leg.gameId === 'string' ? leg.gameId : undefined;
    const league = typeof leg.league === 'string' ? leg.league : null;
    const code = competitionCodeFor(league);
    if (!code) {
      out.push({ ...echo(legId), marketKey, reason: `League "${league ?? 'unknown'}" is not one of the free football-data.org competitions.` });
      continue;
    }
    const st = (await provider.getStandings(code)) as StandingsOut | { fail: { reason: string } };
    if (isFail(st)) {
      out.push({ ...echo(legId), marketKey, reason: st.fail.reason });
      continue;
    }
    const avg = leagueAverages(st.home, st.away);
    if (!avg.ok) {
      out.push({ ...echo(legId), marketKey, reason: avg.reason ?? 'Standings unavailable.' });
      continue;
    }
    const homeRow = leg.home ? findTeamRow(st.total, leg.home) : null;
    const awayRow = leg.away ? findTeamRow(st.total, leg.away) : null;
    if (!homeRow || !awayRow) {
      out.push({ ...echo(legId), marketKey, reason: `Team "${leg.home ?? ''} vs ${leg.away ?? ''}" not matched in the ${code} table.` });
      continue;
    }
    const sHome = strengthForRow(st, avg, homeRow);
    const sAway = strengthForRow(st, avg, awayRow);
    const lamHome = avg.hAvg * sHome.attack * sAway.defence;
    const lamAway = avg.aAvg * sAway.attack * sHome.defence;
    const est = estimateForMarket(marketKey ?? '1x2', lamHome, lamAway);
    if ('reason' in est) {
      out.push({ ...echo(legId), marketKey, reason: est.reason });
    } else {
      out.push({ ...echo(legId), marketKey, estimate: est, lamHome, lamAway });
    }
  }

  return Response.json({ ok: true, legs: out });
}
