/**
 * Attack/defence strengths from the competition's HOME and AWAY standings
 * tables (poisson-v1):
 *   s_adj = (n * s + k * leagueAvg) / (n + k), k = 6 (provisional)
 * Per team relative to the league average; requires ≥ 5 games in each table.
 */
export type TableRowInput = {
  position: number;
  team: { id: number; name: string; shortName?: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  home?: { played?: number; wins?: number; draws?: number; losses?: number; goalsFor?: number; goalsAgainst?: number };
  away?: { played?: number; wins?: number; draws?: number; losses?: number; goalsFor?: number; goalsAgainst?: number };
};

export type LeagueRow = {
  teamId: number;
  teamName: string;
  played: number;
  position: number;
  homePlayed: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
};

export type StrengthResult = {
  home: { name: string; rank: number };
  away: { name: string; rank: number };
  teamStrength: { name: string; attack: number; defence: number };
  lamHome: number;
  lamAway: number;
};

const MIN_GAMES_PER_TABLE = 5;

export function toLeagueRow(t: TableRowInput): LeagueRow {
  return {
    teamId: t.team.id,
    teamName: t.team.name,
    played: t.playedGames,
    position: t.position,
    homePlayed: t.home?.played ?? 0,
    homeGoalsFor: t.home?.goalsFor ?? 0,
    homeGoalsAgainst: t.home?.goalsAgainst ?? 0,
    awayGoalsFor: t.away?.goalsFor ?? 0,
    awayGoalsAgainst: t.away?.goalsAgainst ?? 0,
  };
}

function mean(v: number[]): number {
  return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
}

function shrinkToward(n: number, s: number, k: number, leagueAvg: number): number {
  return (n * s + k * leagueAvg) / (n + k);
}

/**
 * League averages from the HOME table: H_avg = home goals per home game.
 * From the AWAY table: A_avg = away goals per away game.
 */
export function leagueAverages(
  homeTable: TableRowInput[],
  awayTable: TableRowInput[],
): { hAvg: number; aAvg: number; ok: boolean; reason?: string } {
  if (homeTable.length < MIN_GAMES_PER_TABLE || awayTable.length < MIN_GAMES_PER_TABLE) {
    return {
      hAvg: 0,
      aAvg: 0,
      ok: false,
      reason: `Need at least ${MIN_GAMES_PER_TABLE} games in each standings table; home=${homeTable.length}, away=${awayTable.length}.`,
    };
  }
  const hAvg = mean(homeTable.map((r) => (r.home?.goalsFor ?? r.goalsFor) / Math.max(1, r.home?.played ?? r.playedGames)));
  const aAvg = mean(awayTable.map((r) => (r.away?.goalsFor ?? r.goalsFor) / Math.max(1, r.away?.played ?? r.playedGames)));
  return { hAvg, aAvg, ok: true };
}

import { MATCHING } from '../criteria.ts';
import { teamSimilarity } from '../matching.ts';

/** Matches a team name to a table row; null when the match fails the threshold. */
export function findTeamRow(table: TableRowInput[], name: string): TableRowInput | null {
  let best: TableRowInput | null = null;
  let bestScore = 0;
  for (const row of table) {
    const s = teamSimilarity(name, row.team.name);
    if (s > bestScore) {
      best = row;
      bestScore = s;
    }
  }
  return best && bestScore >= MATCHING.teamSimilarityThreshold ? best : null;
}

/**
 * Attack/defence for one team: attack = goals scored per game (from the
 * AWAY table), defence = goals conceded per game (from the HOME table),
 * shrunk toward the league average. Requires the team in both tables.
 */
export function strengthForRow(
  st: { total: TableRowInput[]; home: TableRowInput[]; away: TableRowInput[] },
  avg: { hAvg: number; aAvg: number },
  totalRow: TableRowInput,
  k = 6,
): { name: string; attack: number; defence: number } {
  const homeRow = st.home.find((r) => r.team.id === totalRow.team.id) ?? totalRow;
  const awayRow = st.away.find((r) => r.team.id === totalRow.team.id) ?? totalRow;
  const attack = shrinkToward(Math.max(1, awayRow.playedGames), awayRow.goalsFor / Math.max(1, awayRow.playedGames), k, avg.aAvg);
  const defence = shrinkToward(Math.max(1, homeRow.playedGames), homeRow.goalsAgainst / Math.max(1, homeRow.playedGames), k, avg.hAvg);
  return { name: totalRow.team.name, attack, defence };
}
