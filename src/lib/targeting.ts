/**
 * Targeted-odds selection. Honours explicit odds instructions from the user
 * ("a 2.0 game", "20 odds", "between 1.4 and 1.6", ...) instead of falling
 * back to the safe-tier pools. Pure functions over a minimal row shape —
 * no I/O. Rows for AiPicks are provided by `toTargetRow()` in ai-picks.ts.
 */
import { ACCUMULATOR, TARGETING, type LegTolerance } from './criteria.ts';

export type TargetRow = {
  id: string;
  gameId: string;
  bookmaker: string;
  home: string;
  away: string;
  odds: number;
  /** Margin-free probability when known (never a model estimate). */
  impliedProbability?: number | null;
  /** Model estimate when the model exists. */
  modelProbability?: number | null;
  /** Criteria coverage 0..1 (passed/verifiable) for tie-breaking. */
  coverage?: number;
  /** Fit score with the implied-probability weight removed (used to rank). */
  fitBiasFree?: number;
  /** Full fit score (fallback for ranking). */
  fitScore?: number;
  /** League priority index (lower = higher priority). */
  leaguePriority?: number;
  /** Pick label: 'Verified' | 'Best fit'. */
  label?: 'Verified' | 'Best fit';
  /** Original pick tier, when the row came from an AiPick. */
  tier?: 'safe' | 'balanced' | 'value';
  /** Original pick, when the row came from an AiPick. */
  pick?: unknown;
};

export type LegWindow = { min: number; max: number };

const EPS = 1e-9;

/** Widening multipliers applied through the steps: [1.08, 1.23, 1.53]. */
function widenMultiplier(steps: readonly LegTolerance[]): number {
  return 1 + steps.reduce((a, b) => a + b, 0);
}

export function windowAround(target: number, multiplier: number): LegWindow {
  return { min: target / multiplier, max: target * multiplier };
}

function inWindow(r: TargetRow, w: LegWindow): boolean {
  return r.odds >= w.min - EPS && r.odds <= w.max + EPS;
}

/** Model-vs-implied disparity in points (higher = model more optimistic). */
function modelDisparity(r: TargetRow): number | null {
  if (r.modelProbability === undefined || r.modelProbability === null) return null;
  return (r.modelProbability - (r.impliedProbability ?? 0)) * 100;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Rank inside the window for per-leg picks: fit score without the
 * implied-probability bias, then criteria coverage, then model disparity
 * (higher is better, rows with a model first), then league priority, then
 * odds closest to the target.
 */
function rankDesc(a: TargetRow, b: TargetRow, target?: number): number {
  const fa = a.fitBiasFree ?? a.fitScore ?? 0;
  const fb = b.fitBiasFree ?? b.fitScore ?? 0;
  if (fa !== fb) return fb - fa;

  const ca = a.coverage ?? 0;
  const cb = b.coverage ?? 0;
  if (ca !== cb) return cb - ca;

  const ma = modelDisparity(a);
  const mb = modelDisparity(b);
  if (ma !== mb && (ma !== null || mb !== null)) return (mb ?? -Infinity) - (ma ?? -Infinity);

  const la = a.leaguePriority ?? Number.MAX_SAFE_INTEGER;
  const lb = b.leaguePriority ?? Number.MAX_SAFE_INTEGER;
  let d = la - lb;
  if (d !== 0) return d;

  if (target !== undefined) {
    const pa = Math.abs(Math.log(a.odds / target));
    const pb = Math.abs(Math.log(b.odds / target));
    if (pa !== pb) return pa - pb;
  }
  return a.id.localeCompare(b.id);
}

/** Best single row in `rows`: top of the bias-free ranking, deduped by game. */
export function pickBest(rows: TargetRow[], target: number): TargetRow | null {
  const sorted = [...rows].sort((a, b) => rankDesc(a, b, target));
  const seen = new Set<string>();
  for (const r of sorted) {
    if (seen.has(r.gameId)) continue;
    seen.add(r.gameId);
    return r;
  }
  return null;
}

export type PerLegResult = {
  pick: TargetRow | null;
  window: LegWindow;
  stepIndex: number;
  message?: string;
};

/**
 * Per-leg targeting: take picks whose odds sit inside the window around the
 * target. If none, widen the window through the tolerance steps and report
 * it. Never returns a different, safer slip silently.
 */
export function selectPerLeg(rows: TargetRow[], target: number): PerLegResult {
  const steps = TARGETING.legToleranceSteps;
  for (let i = 0; i < steps.length; i++) {
    const w = windowAround(target, widenMultiplier(steps.slice(0, i + 1)));
    const inW = rows.filter((r) => inWindow(r, w));
    if (inW.length > 0) {
      const pick = pickBest(inW, target);
      return {
        pick,
        window: w,
        stepIndex: i,
        message:
          i > 0 ? `nothing within ${fmt(target)} ± ${Math.round(steps[i] * 100)}%; using ${fmt(pick!.odds)}` : undefined,
      };
    }
  }

  // Widened even past the last step: report the closest pick instead.
  const sorted = [...rows].sort((a, b) => Math.abs(Math.log(a.odds / target)) - Math.abs(Math.log(b.odds / target)));
  const best = sorted[0];
  const w = windowAround(target, widenMultiplier(steps));
  return {
    pick: best,
    window: w,
    stepIndex: steps.length,
    message: `no pick within ${fmt(w.min)}–${fmt(w.max)}; closest is ${best ? fmt(best.odds) : 'none'}`,
  };
}

/** Per-leg pick inside an explicit [min, max] window (range instruction). */
export function selectPerLegWindow(rows: TargetRow[], min: number, max: number): PerLegResult {
  const sorted = [...rows].filter((r) => r.odds >= min - EPS && r.odds <= max + EPS);
  return { pick: pickBest(sorted, (min + max) / 2), window: { min, max }, stepIndex: -1 };
}

/**
 * Leg count for a total target: use the user's N when given, else the first
 * N in `defaultLegRange` whose per-leg average `target^(1/N)` falls in
 * `preferredLegOdds`, else the N whose average is closest to that range.
 */
export function legsForTarget(target: number, userN?: number): number {
  if (userN !== undefined && Number.isFinite(userN) && userN >= 1) {
    return Math.min(Math.floor(userN), ACCUMULATOR.maxLegs);
  }
  const [lo, hi] = TARGETING.defaultLegRange;
  let best = lo;
  let bestDist = Infinity;
  for (let n = lo; n <= hi; n++) {
    const avg = target ** (1 / n);
    const [pLo, pHi] = TARGETING.preferredLegOdds;
    if (avg >= pLo && avg <= pHi) return n;
    const dist = Math.min(avg - pLo, pHi - avg);
    if (dist < bestDist) {
      bestDist = dist;
      best = n;
    }
  }
  return best;
}

const BEAM_WIDTH = 10;

function product(set: TargetRow[]): number {
  return set.reduce((a, r) => a * r.odds, 1);
}

/**
 * One-bookmaker beam search over the top candidates by (bias-free) fit score,
 * keeping the running product within tolerance of the target. One pick per
 * game. Followed by a one-leg swap to close the gap.
 */
function beamSearchBookmaker(rows: TargetRow[], target: number, n: number): TargetRow[] | null {
  // Union of the top by fit and the top by odds for beam diversity.
  const sorted = [...rows].sort((a, b) => rankDesc(a, b, target));
  const byOdds = [...rows].sort((a, b) => b.odds - a.odds);
  const pool = [
    ...new Map([
      ...sorted.slice(0, BEAM_WIDTH + 2).map((r) => [r.id, r] as const),
      ...byOdds.slice(0, BEAM_WIDTH + 2).map((r) => [r.id, r] as const),
    ]).values(),
  ];

  type Beam = { set: TargetRow[]; p: number };
  let beam: Beam[] = [{ set: [], p: 1 }];

  for (let i = 0; i < n && beam.length > 0; i++) {
    const left = n - i - 1;
    const next: Beam[] = [];
    for (const cur of beam) {
      for (const r of pool) {
        if (cur.set.some((p) => p.gameId === r.gameId)) continue;
        const p = cur.p * r.odds;
        // Skip only when we can no longer plausibly approach the target.
        if (p * Math.pow(TARGETING.preferredLegOdds[0], left) > target * (1 + TARGETING.totalTolerance + 0.25)) continue;
        next.push({ set: [...cur.set, r], p });
      }
    }
    if (next.length === 0) break;
    const gap = (set: TargetRow[], p: number) => {
      const g = Math.abs(Math.log(p / target));
      const last = set[set.length - 1];
      return g || (last ? rankDesc(last, set[0], target) : 0) || 0;
    };
    next.sort((a, b) => (Math.abs(Math.log(a.p / target)) - Math.abs(Math.log(b.p / target))) || gap(a.set, a.p) - gap(b.set, b.p));
    beam = next.slice(0, BEAM_WIDTH);
  }

  if (beam.length === 0) return null;

  let best = beam[0];
  for (const cur of beam) {
    if (Math.abs(Math.log(cur.p / target)) < Math.abs(Math.log(best.p / target))) best = cur;
  }

  // One-leg swap to close the gap.
  for (const leg of best.set) {
    for (const r of pool) {
      if (best.set.some((p) => p.id === leg.id)) continue;
      const without = best.p / leg.odds;
      const next = without * r.odds;
      if (Math.abs(Math.log(next / target)) < Math.abs(Math.log(best.p / target))) {
        best = { set: best.set.map((p) => (p.id === leg.id ? r : p)), p: next };
      }
    }
  }

  return best.set;
}

/** Beam search restricted to one bookmaker per slip. */
function beamSearch(rows: TargetRow[], target: number, n: number): TargetRow[] | null {
  const bookmakers = [...new Set(rows.map((r) => r.bookmaker))];
  let best: TargetRow[] | null = null;
  for (const bm of bookmakers) {
    const r = beamSearchBookmaker(rows.filter((x) => x.bookmaker === bm), target, n);
    if (!r) continue;
    if (!best || Math.abs(Math.log(product(r) / target)) < Math.abs(Math.log(product(best) / target))) best = r;
  }
  return best;
}

export type TargetSlipResult = {
  picks: TargetRow[];
  achieved: number;
  gap: number;
  /** Chosen or user-supplied leg count. */
  legs: number;
  /** True when |achieved - target| / target <= totalTolerance. */
  reached: boolean;
  message?: string;
  /** True when the slip is the closest reachable, not a target match. */
  unreachable?: boolean;
};

/**
 * Total-odds targeting: build a slip whose total is within
 * `TARGETING.totalTolerance` of the target, using a leg count in
 * `preferredLegOdds` (or the user's). Unreachable targets return the closest
 * slip with a plain message — never a safer slip silently.
 */
export function targetSlip(rows: TargetRow[], target: number, opts: { legs?: number } = {}): TargetSlipResult {
  const n = legsForTarget(target, opts.legs);
  const beam = beamSearch(rows, target, n);

  if (!beam || beam.length === 0) {
    // Closest reachable slip: top picks by bias-free ranking, one per game.
    const sorted = [...rows].sort(rankDesc);
    const seen = new Set<string>();
    const picks: TargetRow[] = [];
    for (const r of sorted) {
      if (picks.length >= n || picks.length >= ACCUMULATOR.maxLegs) break;
      if (seen.has(r.gameId)) continue;
      seen.add(r.gameId);
      picks.push(r);
    }
    if (picks.length === 0) {
      return { picks: [], achieved: 1, gap: 1 - target, legs: 0, reached: false, unreachable: true, message: 'No qualifying picks available.' };
    }
    const achieved = product(picks);
    const message = `The best reachable total with the current pool is ${fmt(achieved)} using ${picks.length} legs.`;
    return { picks, achieved, gap: achieved / target - 1, legs: picks.length, reached: false, unreachable: true, message };
  }

  const achieved = product(beam);
  const reached = Math.abs(achieved - target) / target <= TARGETING.totalTolerance;
  const message =
    !reached ? `The best reachable total with the current pool is ${fmt(achieved)} using ${beam.length} legs.` : undefined;
  return { picks: beam, achieved, gap: achieved / target - 1, legs: beam.length, reached, message };
}

/**
 * Combined entry point: per-leg target, explicit [min, max] range, or total
 * target. `kind` tells the caller which mode applied.
 */
export function targetOdds(
  rows: TargetRow[],
  target: number,
  opts: { min?: number; max?: number; legs?: number } = {},
): TargetSlipResult & { kind: 'per_leg' | 'total'; window?: LegWindow } {
  if (opts.min !== undefined && opts.max !== undefined) {
    const r = selectPerLegWindow(rows, opts.min, opts.max);
    const picks = r.pick ? [r.pick] : [];
    return {
      kind: 'per_leg',
      window: r.window,
      picks,
      achieved: picks.length > 0 ? product(picks) : 1,
      gap: 0,
      legs: picks.length,
      reached: picks.length > 0,
      message: r.message,
    };
  }
  return { kind: 'total', ...targetSlip(rows, target, opts) };
}

/** Range targeting: one pick inside [min, max], best by bias-free fit. */
export function targetSlipRange(rows: TargetRow[], min: number, max: number): { picks: TargetRow[]; achieved: number; legs: number; message?: string } {
  const r = selectPerLegWindow(rows, min, max);
  const picks = r.pick ? [r.pick] : [];
  return { picks, achieved: picks.length > 0 ? picks[0].odds : 1, legs: picks.length, message: r.message };
}
