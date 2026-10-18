import type { MarketSelector, PickRow } from './filters.ts';
import { combinedProbability, slipTotalOdds } from './math.ts';
import { fail, ok, type Result } from './result.ts';
import type { Bookmaker } from './types.ts';

export const MAX_LEGS = 50;

/** `greyed` holds gameIds excluded from the totals preview; greyed legs stay in the slip. */
export type Slip = { legs: PickRow[]; greyed: string[] };
export const emptySlip = (): Slip => ({ legs: [], greyed: [] });

export const marketKeyOf = (r: Pick<PickRow, 'marketKind' | 'line'>) => `${r.marketKind}:${r.line ?? ''}`;
export const selectorKey = (s: MarketSelector) => `${s.kind}:${s.line ?? ''}`;

export const slipBookmaker = (s: Slip): Bookmaker | null => s.legs[0]?.bookmaker ?? null;

/** One leg per game; one source bookmaker per slip (odds are never mixed across bookmakers). */
export function addLeg(slip: Slip, row: PickRow): Result<{ slip: Slip }> {
  if (slip.legs.length >= MAX_LEGS) return fail(`A slip can have at most ${MAX_LEGS} legs`);
  const b = slipBookmaker(slip);
  if (b !== null && b !== row.bookmaker) return fail(`This slip uses ${b} picks; clear it before adding ${row.bookmaker} picks`);
  if (slip.legs.some((l) => l.gameId === row.gameId)) return fail(`${row.home} v ${row.away} is already in the slip`);
  return ok({ slip: { ...slip, legs: [...slip.legs, row] } });
}

/** Adds in order and reports exactly which were refused and why. */
export function addMany(slip: Slip, rows: PickRow[]) {
  let cur = slip;
  const refused: { row: PickRow; reason: string }[] = [];
  let added = 0;
  for (const row of rows) {
    const r = addLeg(cur, row);
    if (r.ok) { cur = r.slip; added++; } else refused.push({ row, reason: r.error });
  }
  return { slip: cur, added, refused };
}

export function removeLeg(slip: Slip, gameId: string): Slip {
  return { legs: slip.legs.filter((l) => l.gameId !== gameId), greyed: slip.greyed.filter((g) => g !== gameId) };
}

/** Removes the `n` most recently added legs of one market. Reports how many were really removed. */
export function removeFromMarket(slip: Slip, market: MarketSelector, n: number): Result<{ slip: Slip; removed: number; requested: number }> {
  if (!Number.isInteger(n) || n < 1) return fail('Enter a whole number of games to remove (at least 1)');
  const key = selectorKey(market);
  const victims = new Set(slip.legs.filter((l) => marketKeyOf(l) === key).slice(-n).map((l) => l.gameId));
  const next: Slip = { legs: slip.legs.filter((l) => !victims.has(l.gameId)), greyed: slip.greyed.filter((g) => !victims.has(g)) };
  return ok({ slip: next, removed: victims.size, requested: n });
}

export function toggleGrey(slip: Slip, gameId: string): Slip {
  if (!slip.legs.some((l) => l.gameId === gameId)) return slip;
  const on = slip.greyed.includes(gameId);
  return { ...slip, greyed: on ? slip.greyed.filter((g) => g !== gameId) : [...slip.greyed, gameId] };
}

/** Greys (or un-greys) every leg of a market. Nothing is removed. */
export function greyMarket(slip: Slip, market: MarketSelector, on: boolean): Slip {
  const key = selectorKey(market);
  const ids = slip.legs.filter((l) => marketKeyOf(l) === key).map((l) => l.gameId);
  const rest = slip.greyed.filter((g) => !ids.includes(g));
  return { ...slip, greyed: on ? [...rest, ...ids] : rest };
}

export type SlipTotals = {
  legCount: number; activeCount: number; greyedCount: number;
  totalOdds: Result<{ total: number }>;
  /** Product of margin-free leg probabilities; null (with reason) unless every active leg has one. */
  combined: { ok: true; probability: number } | { ok: false; reason: string };
};

export function slipTotals(slip: Slip): SlipTotals {
  const active = slip.legs.filter((l) => !slip.greyed.includes(l.gameId));
  const missing = active.filter((l) => l.implied === null).length;
  let combined: SlipTotals['combined'];
  if (active.length === 0) combined = { ok: false, reason: 'No active legs' };
  else if (missing > 0) combined = { ok: false, reason: `Implied probability unavailable for ${missing} of ${active.length} legs` };
  else {
    const r = combinedProbability(active.map((l) => l.implied as number));
    combined = r.ok ? { ok: true, probability: r.probability } : { ok: false, reason: r.error };
  }
  return { legCount: slip.legs.length, activeCount: active.length, greyedCount: slip.legs.length - active.length, totalOdds: slipTotalOdds(active.map((l) => l.odds)), combined };
}

/** Markets present in the slip, in first-added order, for the remove/grey dropdowns. */
export function marketsInSlip(slip: Slip): { key: string; selector: MarketSelector; count: number }[] {
  const out = new Map<string, { key: string; selector: MarketSelector; count: number }>();
  for (const l of slip.legs) {
    const key = marketKeyOf(l);
    const cur = out.get(key);
    if (cur) cur.count++;
    else out.set(key, { key, selector: { kind: l.marketKind, ...(l.line !== null ? { line: l.line } : {}) }, count: 1 });
  }
  return [...out.values()];
}
