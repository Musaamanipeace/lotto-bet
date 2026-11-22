import { jsonError } from '@/lib/session.ts';
import { competitionCodeFor } from '@/lib/competitions.ts';
import { FootballDataProvider } from '@/lib/fd-provider.ts';
import { findTeamRow, leagueAverages, strengthForRow, toLeagueRow, type TableRowInput } from '@/lib/model/strengths.ts';
import { readGames } from '@/lib/read-games.ts';
import { getStore } from '@/lib/server.ts';

type StandingsOut = { total: TableRowInput[]; home: TableRowInput[]; away: TableRowInput[] };

const provider = new FootballDataProvider();
const isFail = (x: unknown): x is { fail: { reason: string } } =>
  typeof x === 'object' && x !== null && 'fail' in x;

/**
 * GET /api/stats/fixture?gameId=...
 * Server-resolves the game by ID and returns per-team season-to-date stats
 * (league rank, goals, played). Used by the betslip expansion.
 */
export async function GET(req: Request) {
  const gameId = new URL(req.url).searchParams.get('gameId');
  if (!gameId) return jsonError('gameId is required', 400);

  const gamesRes = await readGames(getStore()).catch(() => null);
  const games = gamesRes && gamesRes.ok ? gamesRes.games : [];
  const game = games.find((g) => g.id === gameId);
  if (!game) return jsonError('Game not found', 404);

  const code = competitionCodeFor(game.league);
  if (!code) {
    return Response.json({ ok: true, gameId, game, missing: { reason: `League "${game.league ?? 'unknown'}" is not covered by football-data.org.` } });
  }

  const st = (await provider.getStandings(code)) as StandingsOut | { fail: { reason: string } };
  if (isFail(st)) {
    return Response.json({ ok: true, gameId, game, missing: { reason: st.fail.reason } });
  }
  const avg = leagueAverages(st.home, st.away);
  if (!avg.ok) {
    return Response.json({ ok: true, gameId, game, missing: { reason: avg.reason } });
  }
  const homeRow = findTeamRow(st.total, game.home);
  const awayRow = findTeamRow(st.total, game.away);
  if (!homeRow || !awayRow) {
    return Response.json({
      ok: true,
      gameId,
      game,
      missing: { reason: `Team "${game.home}" or "${game.away}" could not be matched in the ${code} table.` },
    });
  }
  const sHome = strengthForRow(st, avg, homeRow);
  const sAway = strengthForRow(st, avg, awayRow);

  const teamInfo = (row: TableRowInput, strength: { name: string; attack: number; defence: number }) => ({
    name: strength.name,
    rank: row.position,
    played: row.playedGames,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalsScoredAvg: row.goalsFor / Math.max(1, row.playedGames),
    goalsConcededAvg: row.goalsAgainst / Math.max(1, row.playedGames),
    attack: strength.attack,
    defence: strength.defence,
  });

  return Response.json({
    ok: true,
    gameId,
    game: { home: game.home, away: game.away, league: game.league, kickoff: game.kickoff },
    home: teamInfo(homeRow, sHome),
    away: teamInfo(awayRow, sAway),
    averages: avg,
  });
}
