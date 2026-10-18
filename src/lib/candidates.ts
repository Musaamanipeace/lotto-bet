/**
 * Map live game markets → PickMarketKey and produce AI candidates inside odds bands.
 * Deterministic only; no LLM involvement.
 */
import { ODDS_BANDS, type PickMarketKey, type Tier, TIERS } from './criteria.ts';
import type { PickRow } from './filters.ts';
import { candidateRows } from './filters.ts';
import type { Game } from './types.ts';

/** Which (marketKind, outcomeKey, line) maps to which PickMarketKey. */
export function marketKeyFor(row: PickRow): PickMarketKey | null {
  const { marketKind, outcomeKey, line } = row;
  if (marketKind === '1x2') {
    if (outcomeKey === 'home') return 'home_win';
    if (outcomeKey === 'away') return 'away_win';
    return null;
  }
  if (marketKind === 'double_chance') {
    // Outcomes not yet verified on either bookmaker – no candidates until identified.
    return null;
  }
  if (marketKind === 'over_under' && line !== null) {
    if (outcomeKey === 'over' && line === 0.5) return 'over_0_5';
    if (outcomeKey === 'over' && line === 1.5) return 'over_1_5';
    if (outcomeKey === 'under' && line === 3.5) return 'under_3_5';
    if (outcomeKey === 'under' && line === 4.5) return 'under_4_5';
    return null;
  }
  // Cards / corners markets are not yet identified in types (MarketKind has no cards).
  return null;
}

/** Lowest-risk tier whose band contains the odds; null if outside every band. */
export function tierForOdds(marketKey: PickMarketKey, odds: number): Tier | null {
  // Prefer Safe → Balanced → Value when edges overlap.
  for (const tier of TIERS) {
    const band = ODDS_BANDS[marketKey][tier];
    if (odds >= band.min && odds <= band.max) return tier;
  }
  return null;
}

export type RawCandidate = {
  row: PickRow;
  marketKey: PickMarketKey;
  tier: Tier;
};

/**
 * Every usable pick row that sits inside a tier band for its mapped market.
 * One candidate per (game, marketKey, tier) – lower-risk tier wins on edge overlap
 * because tierForOdds walks Safe first.
 */
export function generateCandidates(games: Game[], bookmaker?: Game['bookmaker']): RawCandidate[] {
  const rows = candidateRows(games, bookmaker ? { bookmaker } : {});
  const out: RawCandidate[] = [];
  const seen = new Set<string>(); // gameId:marketKey

  for (const row of rows) {
    if (row.implied === null) continue; // need margin-removed probability
    const marketKey = marketKeyFor(row);
    if (!marketKey) continue;
    const tier = tierForOdds(marketKey, row.odds);
    if (!tier) continue;
    const key = `${row.gameId}:${marketKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ row, marketKey, tier });
  }
  return out;
}
