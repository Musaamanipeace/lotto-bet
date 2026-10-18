/**
 * Re-validate stored AI picks against current odds before show/export (design §9).
 * Never updates silently — flags price changes and disqualified legs.
 */
import { ODDS_BANDS, type PickMarketKey, type Tier } from './criteria.ts';
import type { AiPick } from './ai-picks.ts';
import type { Game } from './types.ts';
import { tierForOdds } from './candidates.ts';

export type RevalidateFlag =
  | { kind: 'price_changed'; oldOdds: number; newOdds: number; stillInBand: true }
  | { kind: 'no_longer_qualifies'; reason: string }
  | { kind: 'market_gone'; reason: string }
  | { kind: 'ok' };

export type RevalidatedPick = AiPick & {
  revalidate: RevalidateFlag;
  currentOdds?: number;
};

/**
 * Check each pick against current games. Odds inside the same tier band → price_changed.
 * Odds left the band or market missing → no_longer_qualifies / market_gone.
 */
export function revalidatePicks(picks: AiPick[], games: Game[]): RevalidatedPick[] {
  const byId = new Map(games.map((g) => [g.id, g]));

  return picks.map((pick) => {
    const game = byId.get(pick.gameId);
    if (!game) {
      return { ...pick, revalidate: { kind: 'market_gone', reason: 'Game no longer in the feed' } };
    }

    const market = game.markets.find((m) => m.nativeId === pick.marketNativeId);
    if (!market) {
      return { ...pick, revalidate: { kind: 'market_gone', reason: 'Market no longer listed' } };
    }

    const outcome = market.outcomes.find((o) => o.nativeId === pick.outcomeNativeId && o.isActive);
    if (!outcome) {
      return {
        ...pick,
        revalidate: { kind: 'no_longer_qualifies', reason: 'Outcome suspended or removed' },
      };
    }

    const newOdds = outcome.odds;
    if (newOdds === pick.odds) {
      return { ...pick, revalidate: { kind: 'ok' }, currentOdds: newOdds };
    }

    const band = ODDS_BANDS[pick.marketKey as PickMarketKey]?.[pick.tier as Tier];
    const stillInBand = band ? newOdds >= band.min && newOdds <= band.max : false;
    // Also accept if it still falls in any tier for this market
    const anyTier = tierForOdds(pick.marketKey as PickMarketKey, newOdds);

    if (stillInBand || anyTier === pick.tier) {
      return {
        ...pick,
        revalidate: { kind: 'price_changed', oldOdds: pick.odds, newOdds, stillInBand: true },
        currentOdds: newOdds,
        odds: newOdds,
        impliedProbability: 1 / newOdds,
      };
    }

    return {
      ...pick,
      revalidate: {
        kind: 'no_longer_qualifies',
        reason: `Odds moved to ${newOdds.toFixed(2)}, outside the ${pick.tier} band`,
      },
      currentOdds: newOdds,
    };
  });
}
