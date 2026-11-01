import type { PickRow } from './filters.ts';
import type { MarketKind } from './types.ts';

export type MatchStatus = 'FT' | 'AET' | 'PEN' | 'LIVE' | 'POSTPONED' | 'CANCELLED';

export type MatchScore = {
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  updatedAt: number;
  source: 'api' | 'manual' | 'default';
};

export type LegOutcome = 'won' | 'lost' | 'void' | 'pending';

export type SlipSettlementStatus = 'won' | 'lost' | 'pending' | 'void';

export type EvaluatedLeg = {
  gameId: string;
  home: string;
  away: string;
  pick: string;
  odds: number;
  marketKind: MarketKind | null;
  score?: MatchScore;
  outcome: LegOutcome;
  reason: string;
};

export type EvaluatedSlip = {
  id: string;
  name: string;
  bookmaker: string;
  createdAt: number;
  totalOdds: number;
  combinedImplied: number | null;
  status: SlipSettlementStatus;
  isCompleted: boolean;
  wonCount: number;
  lostCount: number;
  pendingCount: number;
  voidCount: number;
  totalLegs: number;
  legs: EvaluatedLeg[];
};

/**
 * Standardize match key for score lookups
 */
export function normalizeMatchKey(home: string, away: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  return `${norm(home)}__${norm(away)}`;
}

/**
 * Parses numeric goal line from specifier ("total=2.5"), line property, or pick description ("Over 2.5")
 */
function extractLine(leg: Partial<PickRow> & { pick?: string; specifier?: string; line?: number | null }): number | null {
  if (typeof leg.line === 'number' && !Number.isNaN(leg.line)) {
    return leg.line;
  }
  if (leg.specifier) {
    const match = leg.specifier.match(/total=([\d.]+)/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  if (leg.pick) {
    const match = leg.pick.match(/(?:over|under)\s*([\d.]+)/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * Evaluates the outcome of a single leg given the match score.
 */
export function evaluateLegOutcome(
  leg: Partial<PickRow> & { home: string; away: string; pick: string; odds: number; gameId?: string },
  score?: MatchScore
): { outcome: LegOutcome; reason: string } {
  if (!score) {
    return { outcome: 'pending', reason: 'Awaiting match score' };
  }

  if (score.status === 'POSTPONED' || score.status === 'CANCELLED') {
    return { outcome: 'void', reason: `Match ${score.status.toLowerCase()}` };
  }

  // If match is still LIVE or HT, it's not final yet
  if (score.status === 'LIVE') {
    return { outcome: 'pending', reason: `Match live (${score.homeScore}-${score.awayScore})` };
  }

  const { homeScore, awayScore } = score;
  const totalGoals = homeScore + awayScore;
  const pickLower = (leg.pick || '').trim().toLowerCase();
  const outcomeKey = leg.outcomeKey ? String(leg.outcomeKey).toLowerCase() : null;
  const kind = leg.marketKind ?? null;

  // 1X2 Market evaluation
  if (kind === '1x2' || pickLower === '1' || pickLower === 'x' || pickLower === '2' || pickLower.includes('home win') || pickLower.includes('away win') || pickLower.includes('draw')) {
    const isHome = outcomeKey === 'home' || pickLower === '1' || pickLower === 'home' || pickLower.includes('home');
    const isDraw = outcomeKey === 'draw' || pickLower === 'x' || pickLower === 'draw';
    const isAway = outcomeKey === 'away' || pickLower === '2' || pickLower === 'away' || pickLower.includes('away');

    if (isHome) {
      return homeScore > awayScore
        ? { outcome: 'won', reason: `Home win confirmed (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Home did not win (${homeScore}-${awayScore})` };
    }
    if (isDraw) {
      return homeScore === awayScore
        ? { outcome: 'won', reason: `Draw confirmed (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Match did not end in draw (${homeScore}-${awayScore})` };
    }
    if (isAway) {
      return awayScore > homeScore
        ? { outcome: 'won', reason: `Away win confirmed (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Away did not win (${homeScore}-${awayScore})` };
    }
  }

  // Double Chance Market
  if (kind === 'double_chance' || /1x|x2|12/i.test(pickLower)) {
    if (pickLower.includes('1x') || outcomeKey === '1x' || pickLower.includes('home or draw')) {
      return homeScore >= awayScore
        ? { outcome: 'won', reason: `Home win or draw (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Away won (${homeScore}-${awayScore})` };
    }
    if (pickLower.includes('x2') || outcomeKey === 'x2' || pickLower.includes('draw or away')) {
      return awayScore >= homeScore
        ? { outcome: 'won', reason: `Away win or draw (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Home won (${homeScore}-${awayScore})` };
    }
    if (pickLower.includes('12') || outcomeKey === '12' || pickLower.includes('home or away')) {
      return homeScore !== awayScore
        ? { outcome: 'won', reason: `Decisive winner (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Match ended in draw (${homeScore}-${awayScore})` };
    }
  }

  // Over / Under Market
  if (kind === 'over_under' || pickLower.includes('over') || pickLower.includes('under')) {
    const line = extractLine(leg);
    const isOver = outcomeKey === 'over' || pickLower.includes('over');
    const isUnder = outcomeKey === 'under' || pickLower.includes('under');

    if (line !== null) {
      if (isOver) {
        return totalGoals > line
          ? { outcome: 'won', reason: `${totalGoals} goals > ${line} line (${homeScore}-${awayScore})` }
          : { outcome: 'lost', reason: `${totalGoals} goals ≤ ${line} line (${homeScore}-${awayScore})` };
      }
      if (isUnder) {
        return totalGoals < line
          ? { outcome: 'won', reason: `${totalGoals} goals < ${line} line (${homeScore}-${awayScore})` }
          : { outcome: 'lost', reason: `${totalGoals} goals ≥ ${line} line (${homeScore}-${awayScore})` };
      }
    }
  }

  // Both Teams To Score (BTTS)
  if (kind === 'btts' || pickLower.includes('btts') || pickLower === 'yes' || pickLower === 'no') {
    const isYes = outcomeKey === 'yes' || pickLower === 'yes' || pickLower.includes('btts yes');
    const isNo = outcomeKey === 'no' || pickLower === 'no' || pickLower.includes('btts no');

    if (isYes) {
      return homeScore > 0 && awayScore > 0
        ? { outcome: 'won', reason: `Both teams scored (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Both teams did not score (${homeScore}-${awayScore})` };
    }
    if (isNo) {
      return homeScore === 0 || awayScore === 0
        ? { outcome: 'won', reason: `At least one team kept clean sheet (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Both teams scored (${homeScore}-${awayScore})` };
    }
  }

  // Fallback heuristic based on pick label if kind wasn't explicitly tagged
  if (pickLower.includes('win')) {
    if (pickLower.includes(leg.home.toLowerCase()) || pickLower.startsWith('1')) {
      return homeScore > awayScore
        ? { outcome: 'won', reason: `Home win confirmed (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Home did not win (${homeScore}-${awayScore})` };
    }
    if (pickLower.includes(leg.away.toLowerCase()) || pickLower.startsWith('2')) {
      return awayScore > homeScore
        ? { outcome: 'won', reason: `Away win confirmed (${homeScore}-${awayScore})` }
        : { outcome: 'lost', reason: `Away did not win (${homeScore}-${awayScore})` };
    }
  }

  return { outcome: 'pending', reason: 'Unmapped market rule' };
}

/**
 * Evaluates an entire accumulator slip given a dictionary/map of match scores.
 */
export function evaluateSlip(
  slip: {
    id: string;
    name: string;
    bookmaker: string;
    createdAt: number;
    totalOdds: number;
    combinedImplied: number | null;
    legs: Array<Partial<PickRow> & { home: string; away: string; pick: string; odds: number; gameId?: string }>;
  },
  scores: Map<string, MatchScore> | Record<string, MatchScore>
): EvaluatedSlip {
  const getScore = (leg: { home: string; away: string; gameId?: string }): MatchScore | undefined => {
    if (scores instanceof Map) {
      if (leg.gameId && scores.has(leg.gameId)) return scores.get(leg.gameId);
      const key = normalizeMatchKey(leg.home, leg.away);
      if (scores.has(key)) return scores.get(key);
    } else {
      if (leg.gameId && scores[leg.gameId]) return scores[leg.gameId];
      const key = normalizeMatchKey(leg.home, leg.away);
      if (scores[key]) return scores[key];
    }
    return undefined;
  };

  const evaluatedLegs: EvaluatedLeg[] = slip.legs.map((leg) => {
    const score = getScore(leg);
    const { outcome, reason } = evaluateLegOutcome(leg, score);
    return {
      gameId: leg.gameId || normalizeMatchKey(leg.home, leg.away),
      home: leg.home,
      away: leg.away,
      pick: leg.pick,
      odds: leg.odds,
      marketKind: leg.marketKind ?? null,
      score,
      outcome,
      reason,
    };
  });

  const wonCount = evaluatedLegs.filter((l) => l.outcome === 'won').length;
  const lostCount = evaluatedLegs.filter((l) => l.outcome === 'lost').length;
  const voidCount = evaluatedLegs.filter((l) => l.outcome === 'void').length;
  const pendingCount = evaluatedLegs.filter((l) => l.outcome === 'pending').length;
  const totalLegs = evaluatedLegs.length;

  let status: SlipSettlementStatus = 'pending';
  let isCompleted = false;

  // In an accumulator:
  // If ANY leg is lost, the whole slip is lost immediately (settled as lost).
  if (lostCount > 0) {
    status = 'lost';
    isCompleted = true;
  } else if (wonCount + voidCount === totalLegs && totalLegs > 0) {
    // If all legs are either won or void, and no leg is pending or lost:
    status = voidCount === totalLegs ? 'void' : 'won';
    isCompleted = true;
  } else {
    // Still has pending legs and no lost legs yet
    status = 'pending';
    isCompleted = false;
  }

  return {
    id: slip.id,
    name: slip.name,
    bookmaker: slip.bookmaker,
    createdAt: slip.createdAt,
    totalOdds: slip.totalOdds,
    combinedImplied: slip.combinedImplied,
    status,
    isCompleted,
    wonCount,
    lostCount,
    pendingCount,
    voidCount,
    totalLegs,
    legs: evaluatedLegs,
  };
}
