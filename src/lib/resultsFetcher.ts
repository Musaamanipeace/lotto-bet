import { SelectedPick } from '@/types';
import { normalizeTeamName } from './filterEngine';

export interface MatchResult {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  status: 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'IN_PLAY';
  homeScore: number | null;
  awayScore: number | null;
  winner: '1' | 'X' | '2' | null;
  totalGoals: number | null;
  btts: boolean | null;
  source: string;
}

export type LegResultStatus = 'WON' | 'LOST' | 'PENDING' | 'VOID';

export interface LegEvaluationResult {
  status: LegResultStatus;
  explanation: string;
  result?: MatchResult;
}

export interface SlipEvaluationResult {
  slipId: string;
  status: 'WON' | 'LOST' | 'PENDING';
  legsWon: number;
  legsLost: number;
  legsPending: number;
  legs: {
    pick: SelectedPick;
    evaluation: LegEvaluationResult;
  }[];
}

const THESPORTSDB_KEY = process.env.THESPORTSDB_API_KEY || '3';
const THESPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}`;

/**
 * Normalizes string for fuzzy match comparison
 */
function cleanTeam(name: string): string {
  return normalizeTeamName(name)
    .replace(/\b(fc|cf|afc|sc|ac|bk|fk|if|club|united|city|town)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if two team names refer to the same team
 */
function teamsMatch(nameA: string, nameB: string): boolean {
  const a = cleanTeam(nameA);
  const b = cleanTeam(nameB);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

/**
 * Fetch soccer match results for a given date from free credible sources (TheSportsDB & ESPN)
 */
export async function fetchResultsForDate(dateStr?: string): Promise<{
  success: boolean;
  date: string;
  source: string;
  results: MatchResult[];
}> {
  // Default to yesterday in UTC
  let targetDate = dateStr;
  if (!targetDate) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    targetDate = yesterday.toISOString().split('T')[0];
  }

  const results: MatchResult[] = [];

  try {
    // 1. TheSportsDB free eventsday endpoint
    const url = `${THESPORTSDB_BASE}/eventsday.php?d=${targetDate}&s=Soccer`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    } as RequestInit & { next?: { revalidate?: number } });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.events)) {
        for (const ev of data.events) {
          const homeScore = ev.intHomeScore !== null && ev.intHomeScore !== '' ? parseInt(ev.intHomeScore, 10) : null;
          const awayScore = ev.intAwayScore !== null && ev.intAwayScore !== '' ? parseInt(ev.intAwayScore, 10) : null;
          const isFinished = ev.strStatus === 'Match Finished' || ev.strStatus === 'FT' || (homeScore !== null && awayScore !== null);

          let winner: '1' | 'X' | '2' | null = null;
          let totalGoals: number | null = null;
          let btts: boolean | null = null;

          if (homeScore !== null && awayScore !== null) {
            totalGoals = homeScore + awayScore;
            btts = homeScore > 0 && awayScore > 0;
            if (homeScore > awayScore) winner = '1';
            else if (homeScore < awayScore) winner = '2';
            else winner = 'X';
          }

          results.push({
            id: `tsdb-${ev.idEvent || results.length}`,
            homeTeam: ev.strHomeTeam || 'Home',
            awayTeam: ev.strAwayTeam || 'Away',
            league: ev.strLeague || 'International',
            date: ev.strTimestamp || `${targetDate}T00:00:00`,
            status: isFinished ? 'FINISHED' : (ev.strStatus === 'Postponed' ? 'POSTPONED' : 'IN_PLAY'),
            homeScore,
            awayScore,
            winner,
            totalGoals,
            btts,
            source: 'TheSportsDB (Free Verified Feed)',
          });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching from TheSportsDB:', err);
  }

  // 2. Fetch top leagues from ESPN if count is low
  if (results.length < 8) {
    const leagues = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions', 'uefa.europa'];
    const espnDate = targetDate.replace(/-/g, '');
    for (const lg of leagues) {
      try {
        const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard?dates=${espnDate}`;
        const res = await fetch(espnUrl, {
          headers: { Accept: 'application/json' },
          next: { revalidate: 300 },
        } as RequestInit & { next?: { revalidate?: number } });
        if (!res.ok) continue;
        const data = await res.json();
        const events = data?.events || [];
        for (const ev of events) {
          const comp = ev.competitions?.[0];
          if (!comp) continue;
          const home = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === 'home');
          const away = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === 'away');
          if (!home || !away) continue;

          const homeScore = home.score !== undefined ? parseInt(home.score, 10) : null;
          const awayScore = away.score !== undefined ? parseInt(away.score, 10) : null;
          const isFinished = comp.status?.type?.completed === true || (homeScore !== null && awayScore !== null);

          let winner: '1' | 'X' | '2' | null = null;
          let totalGoals: number | null = null;
          let btts: boolean | null = null;

          if (homeScore !== null && awayScore !== null) {
            totalGoals = homeScore + awayScore;
            btts = homeScore > 0 && awayScore > 0;
            if (homeScore > awayScore) winner = '1';
            else if (homeScore < awayScore) winner = '2';
            else winner = 'X';
          }

          results.push({
            id: `espn-${ev.id || results.length}`,
            homeTeam: home.team?.name || home.team?.displayName || 'Home',
            awayTeam: away.team?.name || away.team?.displayName || 'Away',
            league: data.leagues?.[0]?.name || lg.toUpperCase(),
            date: comp.date || `${targetDate}T00:00:00`,
            status: isFinished ? 'FINISHED' : 'IN_PLAY',
            homeScore,
            awayScore,
            winner,
            totalGoals,
            btts,
            source: 'ESPN Sports Feed',
          });
        }
      } catch {
        // Skip individual ESPN errors
      }
    }
  }

  return {
    success: true,
    date: targetDate,
    source: 'TheSportsDB & ESPN Feeds (Free Credible Sources)',
    results,
  };
}

/**
 * Evaluates a single pick against available match results
 */
export function evaluatePickResult(pick: SelectedPick, results: MatchResult[]): LegEvaluationResult {
  // Find matching match
  const match = results.find(
    (m) =>
      (teamsMatch(m.homeTeam, pick.homeTeam) && teamsMatch(m.awayTeam, pick.awayTeam)) ||
      (teamsMatch(m.homeTeam, pick.awayTeam) && teamsMatch(m.awayTeam, pick.homeTeam))
  );

  if (!match) {
    return {
      status: 'PENDING',
      explanation: 'Result not yet recorded or match scheduled',
    };
  }

  if (match.status === 'POSTPONED' || match.status === 'CANCELLED') {
    return {
      status: 'VOID',
      explanation: `Match ${match.status.toLowerCase()}`,
      result: match,
    };
  }

  if (match.status !== 'FINISHED' || match.homeScore === null || match.awayScore === null) {
    return {
      status: 'PENDING',
      explanation: 'Match currently in progress',
      result: match,
    };
  }

  const { homeScore, awayScore, totalGoals } = match;
  const p = pick.pick.trim().toUpperCase();
  const market = (pick.marketName || '').toLowerCase();

  // Double Chance: 1X, X2, 12
  if (market.includes('double chance') || ['1X', 'X2', '12'].includes(p)) {
    if (p === '1X') {
      const won = homeScore >= awayScore;
      return {
        status: won ? 'WON' : 'LOST',
        explanation: won ? `1X Hit (${homeScore}-${awayScore} FT)` : `Lost: Away win (${homeScore}-${awayScore} FT)`,
        result: match,
      };
    }
    if (p === 'X2') {
      const won = awayScore >= homeScore;
      return {
        status: won ? 'WON' : 'LOST',
        explanation: won ? `X2 Hit (${homeScore}-${awayScore} FT)` : `Lost: Home win (${homeScore}-${awayScore} FT)`,
        result: match,
      };
    }
    if (p === '12') {
      const won = homeScore !== awayScore;
      return {
        status: won ? 'WON' : 'LOST',
        explanation: won ? `12 Hit (${homeScore}-${awayScore} FT)` : `Lost: Draw (${homeScore}-${awayScore} FT)`,
        result: match,
      };
    }
  }

  // Home Win (1)
  if (market.includes('home') || p === '1') {
    const won = homeScore > awayScore;
    return {
      status: won ? 'WON' : 'LOST',
      explanation: won ? `Home win (${homeScore}-${awayScore} FT)` : `Lost: Did not win (${homeScore}-${awayScore} FT)`,
      result: match,
    };
  }

  // Away Win (2)
  if (market.includes('away') || p === '2') {
    const won = awayScore > homeScore;
    return {
      status: won ? 'WON' : 'LOST',
      explanation: won ? `Away win (${homeScore}-${awayScore} FT)` : `Lost: Did not win (${homeScore}-${awayScore} FT)`,
      result: match,
    };
  }

  // Over Goals
  if (p.includes('OVER') || market.includes('over')) {
    const line = p.includes('1.5') ? 1.5 : 0.5;
    const won = (totalGoals ?? 0) > line;
    return {
      status: won ? 'WON' : 'LOST',
      explanation: won ? `Over ${line} Hit (${totalGoals} goals, ${homeScore}-${awayScore} FT)` : `Lost: Only ${totalGoals} goals (${homeScore}-${awayScore} FT)`,
      result: match,
    };
  }

  // Under Goals
  if (p.includes('UNDER') || market.includes('under')) {
    const line = p.includes('4.5') ? 4.5 : 3.5;
    const won = (totalGoals ?? 0) < line;
    return {
      status: won ? 'WON' : 'LOST',
      explanation: won ? `Under ${line} Hit (${totalGoals} goals, ${homeScore}-${awayScore} FT)` : `Lost: ${totalGoals} goals exceeded ceiling (${homeScore}-${awayScore} FT)`,
      result: match,
    };
  }

  // Both Teams To Score (GG / NG)
  if (market.includes('btts') || p === 'GG' || p === 'NG') {
    const bttsHit = homeScore > 0 && awayScore > 0;
    if (p === 'GG') {
      return {
        status: bttsHit ? 'WON' : 'LOST',
        explanation: bttsHit ? `GG Hit (${homeScore}-${awayScore} FT)` : `Lost: Both teams did not score (${homeScore}-${awayScore} FT)`,
        result: match,
      };
    } else {
      return {
        status: !bttsHit ? 'WON' : 'LOST',
        explanation: !bttsHit ? `NG Hit (${homeScore}-${awayScore} FT)` : `Lost: Both teams scored (${homeScore}-${awayScore} FT)`,
        result: match,
      };
    }
  }

  return {
    status: 'PENDING',
    explanation: `Evaluation pending for ${pick.pick} (${homeScore}-${awayScore} FT)`,
    result: match,
  };
}

/**
 * Evaluates an entire saved betslip against available results
 */
export function evaluateSavedSlip(slipId: string, picks: SelectedPick[], results: MatchResult[]): SlipEvaluationResult {
  const legs = picks.map((pick) => ({
    pick,
    evaluation: evaluatePickResult(pick, results),
  }));

  const legsWon = legs.filter((l) => l.evaluation.status === 'WON').length;
  const legsLost = legs.filter((l) => l.evaluation.status === 'LOST').length;
  const legsPending = legs.filter((l) => l.evaluation.status === 'PENDING' || l.evaluation.status === 'VOID').length;

  let status: 'WON' | 'LOST' | 'PENDING' = 'PENDING';
  if (legsLost > 0) {
    status = 'LOST';
  } else if (legsWon === legs.length && legs.length > 0) {
    status = 'WON';
  }

  return {
    slipId,
    status,
    legsWon,
    legsLost,
    legsPending,
    legs,
  };
}
