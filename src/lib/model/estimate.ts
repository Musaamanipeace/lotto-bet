/**
 * Poisson-v1 market estimates (1X2, double chance, over/under 0.5–5.5, BTTS).
 */
import {
  estimate1x2,
  estimateDoubleChance,
  estimateOverUnder,
  estimateBtts,
  scorelineMatrix,
} from './poisson.ts';

export type MarketEstimate =
  | { marketKey: '1x2'; home: number; draw: number; away: number; lamHome: number; lamAway: number }
  | { marketKey: 'double_chance'; dc1x: number; dcx2: number; dc12: number; lamHome: number; lamAway: number }
  | { marketKey: 'over_under'; line: number; over: number; under: number; lamHome: number; lamAway: number }
  | { marketKey: 'btts'; yes: number; no: number; lamHome: number; lamAway: number };

/**
 * lambda_home = H_avg * attH * defA; lambda_away = A_avg * attA * defH
 * (see strengths.ts; H_avg/A_avg are the league averages.)
 */
export function lambdasFromStrengths(
  home: { attack: number; defence: number },
  away: { attack: number; defence: number },
  avgH: number,
  avgA: number,
): { lamHome: number; lamAway: number } {
  return {
    lamHome: avgH * home.attack * away.defence,
    lamAway: avgA * away.attack * home.defence,
  };
}

/** Estimates for a market from Poisson lambdas. */
export function estimateForMarket(
  marketKey: string,
  lamHome: number,
  lamAway: number,
): MarketEstimate | { reason: string } {
  const m = scorelineMatrix(lamHome, lamAway);
  switch (marketKey) {
    case 'home_win':
    case 'away_win':
    case '1x2': {
      const { home, draw, away } = estimate1x2(m);
      return { marketKey: '1x2', home, draw, away, lamHome, lamAway };
    }
    case 'double_chance':
    case 'dc': {
      const { dc1x, dcx2, dc12 } = estimateDoubleChance(m);
      return { marketKey: 'double_chance', dc1x, dcx2, dc12, lamHome, lamAway };
    }
    case 'over_0_5':
    case 'over_1_5':
    case 'over_2_5':
    case 'over_3_5':
    case 'over_4_5':
    case 'over_5_5': {
      const line = Number(marketKey.replace('over_', ''));
      const { over } = estimateOverUnder(m, line);
      return { marketKey: 'over_under', line, over, under: 1 - over, lamHome, lamAway };
    }
    case 'under_0_5':
    case 'under_1_5':
    case 'under_2_5':
    case 'under_3_5':
    case 'under_4_5':
    case 'under_5_5': {
      const line = Number(marketKey.replace('under_', ''));
      const { under } = estimateOverUnder(m, line);
      return { marketKey: 'over_under', line, over: 1 - under, under, lamHome, lamAway };
    }
    case 'btts': {
      const { yes } = estimateBtts(m);
      return { marketKey: 'btts', yes, no: 1 - yes, lamHome, lamAway };
    }
    default:
      return { reason: `No Poisson model for market "${marketKey}".` };
  }
}
