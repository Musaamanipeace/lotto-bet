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

export interface FetchResultsOptions {
  theSportsDbKey?: string | null;
  apiFootballKey?: string | null;
  footballDataKey?: string | null;
}

const THESPORTSDB_KEY = process.env.THESPORTSDB_API_KEY || '3';
const THESPORTSDB_BASE = (key: string) => `https://www.thesportsdb.com/api/v1/json/${key}`;
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

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
 * Fetch match results for a date from football-data.org (free fallback)
 * Covers: PL, BL, SA, L1, PD, CL, EL, FL1 (Championship), DED (Eredivisie), PPL, BSA, etc.
 * Not covered: Belgium, MLS, Argentina on free tier.
 */
async function fetchFootballDataResults(dateStr: string, apiKey?: string | null): Promise<MatchResult[]> {
  if (!apiKey) return [];

  const results: MatchResult[] = [];
  const dateFormatted = dateStr.replace(/-/g, '');

  // Competitions we care about (football-data.org competition codes)
  const competitions = [
    'PL', // Premier League
    'BL', // Bundesliga
    'SA', // Serie A
    'PD', // La Liga
    'FL1', // Ligue 1
    'CL', // Champions League
    'EL', // Europa League
    'DED', // Eredivisie
    'PPL', // Primeira Liga
    'BSA', // Brasileiro Serie A
  ];

  for (const comp of competitions) {
    try {
      const url = `${FOOTBALL_DATA_BASE}/competitions/${comp}/matches?dateFrom=${dateFormatted}&dateTo=${dateFormatted}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'X-Auth-Token': apiKey,
        },
        next: { revalidate: 300 },
      } as RequestInit & { next?: { revalidate?: number } });

      if (!res.ok) continue;
      const data = await res.json();
      const matches = data?.matches || [];

      for (const m of matches) {
        const homeScore = m.score?.fullTime?.home !== null && m.score?.fullTime?.home !== undefined ? m.score.fullTime.home : null;
        const awayScore = m.score?.fullTime?.away !== null && m.score?.fullTime?.away !== undefined ? m.score.fullTime.away : null;
        const isFinished = m.status === 'FINISHED' || m.status === 'POSTPONED' || (homeScore !== null && awayScore !== null);

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
          id: `fd-${m.id || results.length}`,
          homeTeam: m.homeTeam?.name || 'Home',
          awayTeam: m.awayTeam?.name || 'Away',
          league: m.competition?.name || comp,
          date: m.utcDate || `${dateStr}T00:00:00`,
          status: isFinished ? (m.status === 'POSTPONED' ? 'POSTPONED' : 'FINISHED') : 'IN_PLAY',
          homeScore,
          awayScore,
          winner,
          totalGoals,
          btts,
          source: 'football-data.org (Free)',
        });
      }
    } catch {
      // Skip individual competition errors
    }
  }

  return results;
}

/**
 * Fetch soccer match results for a given date from free credible sources.
 * Order: TheSportsDB → football-data.org → ESPN
 */
export async function fetchResultsForDate(
  dateStr?: string,
  options?: FetchResultsOptions
): Promise<{
  success: boolean;
  date: string;
  source: string;
  results: MatchResult[];
}> {
  let targetDate = dateStr;
  if (!targetDate) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    targetDate = yesterday.toISOString().split('T')[0];
  }

  const results: MatchResult[] = [];
  const sources: string[] = [];

  // 1. TheSportsDB free eventsday endpoint
  const tsdbKey = options?.theSportsDbKey || THESPORTSDB_KEY;
  try {
    const url = `${THESPORTSDB_BASE(tsdbKey)}/eventsday.php?d=${targetDate}&s=Soccer`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    } as RequestInit & { next?: { revalidate?: number } });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.events)) {
        sources.push('TheSportsDB (Free Verified Feed)');
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

  // 2. football-data.org fallback if results are low or TheSportsDB failed
  if (results.length < 8 || sources.length === 0) {
    const fdResults = await fetchFootballDataResults(targetDate, options?.footballDataKey || process.env.FOOTBALL_DATA_API_KEY || undefined);
    if (fdResults.length > 0) {
      sources.push('football-data.org (Free Fallback)');
      for (const r of fdResults) {
        // Avoid duplicates with TheSportsDB
        const exists = results.find(
          (e) =>
            teamsMatch(e.homeTeam, r.homeTeam) && teamsMatch(e.awayTeam, r.awayTeam)
        );
        if (!exists) {
          results.push({ ...r, source: 'football-data.org (Free Fallback)' });
        }
      }
    }
  }

  // 3. Fetch top leagues from ESPN if count is still low
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
    source: sources.length > 0 ? sources.join(' + ') : 'No sources available',
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
