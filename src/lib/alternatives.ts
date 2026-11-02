/**
 * Alternative slips for one odds target, plus single-slip leg swapping.
 *
 * The first slip comes from the existing pickTargetOdds pipeline. Every further slip is a parent slip
 * with some legs swapped for equal-or-better picks (any market by default), keeping total odds inside the
 * target band. Deterministic for a given seed, so "load more" is the same call with a larger count.
 * Pure functions: no I/O, no LLM. The deterministic engine decides what qualifies.
 */
import { ACCUMULATOR } from './criteria.ts';
import { pickTargetOdds, type AccumulatorSlip, type AiPick, type TargetTier } from './ai-picks.ts';

export type OddsBand = { min: number; max: number };
export type SwapScope = 'same_market' | 'any';

export type SwapRules = {
  scope: SwapScope;
  /** Allowed fit-score drop vs the leg being replaced (0 = equal or better). */
  fitTolerance: number;
  /** true = replacement fit must be strictly higher than the leg replaced. */
  strictlyBetter: boolean;
  /** Replacement odds must be within [odds / (1 + band), odds x (1 + band)] of the leg replaced. */
  oddsBand: number;
};

export const DEFAULT_RULES: SwapRules = { scope: 'any', fitTolerance: 0.05, strictlyBetter: false, oddsBand: 0.25 };

export type AltOptions = Partial<SwapRules> & {
  band: OddsBand;
  tier?: TargetTier;
  /** Minimum number of legs that must differ from EVERY other slip. */
  minDiffLegs?: number;
  /** Soft cap on the number of slips returned (the first slip counts). */
  maxSlips?: number;
  lockedGameIds?: string[];
  seed?: number;
  maxAttempts?: number;
};

export type AltSlip = AccumulatorSlip & {
  avgFit: number;
  /** Legs that differ from slip #1. */
  diffFromFirst: number;
};

export type AltResult = {
  slips: AltSlip[];
  /** True when the search ran out of qualifying swaps before reaching maxSlips. */
  exhausted: boolean;
  message: string | null;
  band: OddsBand;
};

const TIER_POOL: Record<TargetTier, AiPick['tier'][]> = {
  lower: ['safe'],
  average: ['safe', 'balanced'],
  higher: ['safe', 'balanced', 'value'],
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const oddsOf = (picks: AiPick[]) => picks.reduce((a, p) => a * p.odds, 1);
export const signature = (picks: AiPick[]) => picks.map((p) => p.id).sort().join('|');
const mid = (b: OddsBand) => Math.sqrt(b.min * b.max);
const inBand = (odds: number, b: OddsBand) => odds >= b.min && odds <= b.max;
const logDist = (odds: number, b: OddsBand) => Math.abs(Math.log(odds / mid(b)));

/** Slip object compatible with the existing SlipCard / AccumulatorSlip shape. */
export function buildSlip(picks: AiPick[], first?: AiPick[]): AltSlip {
  const boosterCount = picks.filter((p) => p.tier === 'value').length;
  const sig = signature(picks);
  let h = 2166136261;
  for (let i = 0; i < sig.length; i++) h = Math.imul(h ^ sig.charCodeAt(i), 16777619) >>> 0;
  const firstIds = new Set((first ?? picks).map((p) => p.id));
  return {
    id: `alt_${h.toString(36)}_${picks.length}`,
    picks,
    totalOdds: oddsOf(picks),
    combinedImpliedProbability: picks.reduce((a, p) => a * p.impliedProbability, 1),
    riskLabel: picks.length > 0 && boosterCount / picks.length <= ACCUMULATOR.lowerRiskBoosterCap ? 'lower risk' : 'higher risk',
    coreCount: picks.length - boosterCount,
    boosterCount,
    createdAt: 0,
    avgFit: picks.length ? picks.reduce((a, p) => a + p.fitScore, 0) / picks.length : 0,
    diffFromFirst: picks.filter((p) => !firstIds.has(p.id)).length,
  };
}

/** Can `cand` replace `out`? Same-or-better fit, similar odds, and (optionally) the same market. */
function eligible(cand: AiPick, out: AiPick, rules: SwapRules): boolean {
  if (cand.id === out.id) return false;
  if (rules.scope === 'same_market' && cand.marketKey !== out.marketKey) return false;
  const floor = out.fitScore - rules.fitTolerance;
  if (cand.fitScore < floor) return false;
  if (rules.strictlyBetter && cand.fitScore <= out.fitScore) return false;
  // Never silently downgrade a Verified leg to Best fit.
  if (out.evaluation.label === 'Verified' && cand.evaluation.label !== 'Verified') return false;
  const lo = out.odds / (1 + rules.oddsBand);
  const hi = out.odds * (1 + rules.oddsBand);
  return cand.odds >= lo && cand.odds <= hi;
}

export type SwapOutcome = { picks: AiPick[]; swaps: { out: AiPick; in: AiPick }[] };

/**
 * Replace `victims` (by pick id) with eligible picks from `pool`. One pick per game is kept; a victim's own game may
 * come back with a different market. Returns null when any victim has no eligible replacement.
 * With `band`, the replacement that keeps total odds closest to the band's centre is preferred.
 */
export function swapLegs(
  current: AiPick[],
  victimIds: string[],
  pool: AiPick[],
  rules: SwapRules,
  rng: () => number,
  opts: { band?: OddsBand; exclude?: Set<string> } = {},
): SwapOutcome | null {
  const victims = new Set(victimIds);
  const kept = current.filter((p) => !victims.has(p.id));
  const used = new Set(kept.map((p) => p.gameId));
  const usedIds = new Set(current.map((p) => p.id));
  let total = oddsOf(kept);
  const result = [...kept];
  const swaps: SwapOutcome['swaps'] = [];
  const order = current.filter((p) => victims.has(p.id)).sort(() => rng() - 0.5);

  for (const out of order) {
    const cands = pool.filter(
      (c) => !used.has(c.gameId) && !usedIds.has(c.id) && !opts.exclude?.has(c.id) && eligible(c, out, rules),
    );
    if (cands.length === 0) return null;
    // Rank: nearest total to the target centre (when there is a band), then higher fit. Random among the best few.
    cands.sort((a, b) => {
      if (opts.band) {
        const da = Math.abs(Math.log((total * a.odds) / mid(opts.band)));
        const db = Math.abs(Math.log((total * b.odds) / mid(opts.band)));
        if (da !== db) return da - db;
      }
      return b.fitScore - a.fitScore;
    });
    const choice = cands[Math.floor(rng() * Math.min(6, cands.length))];
    result.push(choice);
    used.add(choice.gameId);
    usedIds.add(choice.id);
    total *= choice.odds;
    swaps.push({ out, in: choice });
  }
  return { picks: result, swaps };
}

/** Nudges a slip's total into the band by single swaps (no fit/odds-band rules; base slip only). */
function tuneIntoBand(picks: AiPick[], pool: AiPick[], band: OddsBand, locked: Set<string>): AiPick[] {
  let cur = [...picks];
  for (let i = 0; i < 60 && !inBand(oddsOf(cur), band); i++) {
    const total = oddsOf(cur);
    const base = logDist(total, band);
    let best: { idx: number; cand: AiPick; d: number } | null = null;
    cur.forEach((leg, idx) => {
      if (locked.has(leg.gameId)) return;
      const rest = total / leg.odds;
      for (const c of pool) {
        if (c.id === leg.id || cur.some((x, j) => j !== idx && x.gameId === c.gameId)) continue;
        if (cur.some((x) => x.id === c.id)) continue;
        const d = logDist(rest * c.odds, band);
        if (d < base - 1e-9 && (!best || d < best.d)) best = { idx, cand: c, d };
      }
    });
    if (!best) break;
    const b = best as { idx: number; cand: AiPick };
    cur = cur.map((x, j) => (j === b.idx ? b.cand : x));
  }
  return cur;
}

/** Many slips landing inside `band`, as different from each other as the swap rules allow. */
export function generateAlternatives(ranked: AiPick[], opts: AltOptions): AltResult {
  const rules: SwapRules = {
    scope: opts.scope ?? DEFAULT_RULES.scope,
    fitTolerance: opts.fitTolerance ?? DEFAULT_RULES.fitTolerance,
    strictlyBetter: opts.strictlyBetter ?? DEFAULT_RULES.strictlyBetter,
    oddsBand: opts.oddsBand ?? DEFAULT_RULES.oddsBand,
  };
  const { band } = opts;
  const tier: TargetTier = opts.tier ?? 'higher';
  const minDiff = Math.max(1, opts.minDiffLegs ?? 2);
  const maxSlips = Math.max(1, opts.maxSlips ?? 200);
  const locked = new Set(opts.lockedGameIds ?? []);
  const rng = mulberry32(opts.seed ?? 1);
  const allowed = new Set(TIER_POOL[tier]);
  const pool = ranked.filter((p) => allowed.has(p.tier));

  const base = pickTargetOdds(ranked, mid(band), tier);
  if (!base.slip || base.slip.picks.length === 0) {
    return { slips: [], exhausted: true, message: base.message ?? 'No qualifying picks available.', band };
  }
  const tuned = tuneIntoBand(base.slip.picks, pool, band, locked);
  const firstTotal = oddsOf(tuned);
  if (!inBand(firstTotal, band)) {
    return {
      slips: [],
      exhausted: true,
      message: `The closest slip the qualifying picks can make is ${firstTotal.toFixed(2)} odds, outside ${band.min}–${band.max}.`,
      band,
    };
  }

  const first = buildSlip(tuned);
  const slips: AltSlip[] = [first];
  const sigs = new Set([signature(tuned)]);
  const diffAll = (a: AiPick[], b: AiPick[]) => {
    const ids = new Set(b.map((p) => p.id));
    return a.filter((p) => !ids.has(p.id)).length;
  };

  const maxAttempts = opts.maxAttempts ?? 6000;
  const failLimit = 400;
  let attempts = 0;
  let failures = 0;
  while (slips.length < maxSlips && attempts < maxAttempts && failures < failLimit) {
    attempts++;
    const parent = slips[Math.floor(rng() * slips.length)];
    const movable = parent.picks.filter((p) => !locked.has(p.gameId));
    if (movable.length < minDiff) { failures++; continue; }
    const k = Math.min(movable.length, minDiff + Math.floor(rng() * 3));
    // Favour swapping weaker legs: sort ascending by fit, pick from the weaker half with a random tail.
    const sorted = [...movable].sort((a, b) => a.fitScore - b.fitScore);
    const victims = new Set<string>();
    while (victims.size < k) {
      const i = Math.floor(Math.pow(rng(), 1.6) * sorted.length);
      victims.add(sorted[i].id);
    }
    const out = swapLegs(parent.picks, [...victims], pool, rules, rng, { band });
    if (!out || !inBand(oddsOf(out.picks), band)) { failures++; continue; }
    const sig = signature(out.picks);
    if (sigs.has(sig)) { failures++; continue; }
    if (slips.some((s) => diffAll(out.picks, s.picks) < minDiff)) { failures++; continue; }
    sigs.add(sig);
    slips.push(buildSlip(out.picks, first.picks));
    failures = 0;
  }

  const exhausted = slips.length < maxSlips;
  return {
    slips,
    exhausted,
    message: exhausted
      ? `Pool exhausted: ${slips.length} distinct slips found. Widen the odds range, lower the legs-that-must-differ, or allow more leagues for more.`
      : null,
    band,
  };
}

/** Swap chosen legs (or the weakest N) of one slip. Locked and excluded picks are respected. */
export function swapInSlip(
  slipPicks: AiPick[],
  pool: AiPick[],
  o: {
    replaceIds?: string[];
    weakest?: number;
    lockedGameIds?: string[];
    excludeIds?: string[];
    band?: OddsBand;
    seed?: number;
  } & Partial<SwapRules>,
): { ok: true; picks: AiPick[]; swaps: SwapOutcome['swaps'] } | { ok: false; error: string } {
  const rules: SwapRules = {
    scope: o.scope ?? DEFAULT_RULES.scope,
    fitTolerance: o.fitTolerance ?? DEFAULT_RULES.fitTolerance,
    strictlyBetter: o.strictlyBetter ?? DEFAULT_RULES.strictlyBetter,
    oddsBand: o.oddsBand ?? DEFAULT_RULES.oddsBand,
  };
  const locked = new Set(o.lockedGameIds ?? []);
  const movable = slipPicks.filter((p) => !locked.has(p.gameId));
  let victims = (o.replaceIds ?? []).filter((id) => movable.some((p) => p.id === id));
  if (victims.length === 0 && o.weakest) {
    victims = [...movable].sort((a, b) => a.fitScore - b.fitScore).slice(0, o.weakest).map((p) => p.id);
  }
  if (victims.length === 0) return { ok: false, error: 'Nothing to swap: every selected leg is locked, or no legs were chosen.' };

  const rng = mulberry32(o.seed ?? 1);
  const exclude = new Set(o.excludeIds ?? []);
  const res = swapLegs(slipPicks, victims, pool, rules, rng, { band: o.band, exclude });
  if (!res) return { ok: false, error: 'No more qualifying replacements for those legs. Widen the filters, the odds tolerance, or allow any market.' };
  return { ok: true, picks: res.picks, swaps: res.swaps };
}
