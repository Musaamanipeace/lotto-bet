/**
 * Model-vs-market disparity flags (5.2): sign convention is
 * `model probability minus implied probability` — positive means the model
 * rates the pick higher than the market. Flagging is provisional:
 * - Probability between 15% and 85%: flag at a gap of 5 points (notice) or
 *   10 points (strong).
 * - Outside that range: compare the chance of losing (1 - probability);
 *   flag when the model's loss chance is >= 1.5x (notice) or >= 2x (strong),
 *   in either direction.
 */
export const DISPARITY = {
  midLo: 0.15,
  midHi: 0.85,
  midGapNotice: 5,
  midGapStrong: 10,
  extRatioNotice: 1.5,
  extRatioStrong: 2,
} as const;

export type DisparityResult = {
  /** Model probability (0..1) when known, else null. */
  modelProbability: number | null;
  /** modelProbability - impliedProbability, in points; positive = model optimistic. Null when not computable. */
  points: number | null;
  sign: 'positive' | 'negative' | null;
  flagged: { notice: boolean; strong: boolean };
  label: 'Check' | 'Check!' | null;
  reason: string | null;
};

export function disparityOf(modelProbability: number | null | undefined, impliedProbability: number | null): DisparityResult {
  if (modelProbability === null || modelProbability === undefined) {
    return { modelProbability: null, points: null, sign: null, flagged: { notice: false, strong: false }, label: null, reason: 'Not covered' };
  }
  const mp = modelProbability;
  const ip = impliedProbability ?? mp;
  const points = (mp - ip) * 100;

  const p = ip; // market probability
  const lossMarket = 1 - p;
  const lossModel = 1 - mp;
  const eps = 1e-9;
  let notice = false;
  let strong = false;

  if (p >= DISPARITY.midLo - eps && p <= DISPARITY.midHi + eps) {
    const gap = Math.abs(points);
    strong = gap >= DISPARITY.midGapStrong - eps;
    notice = gap >= DISPARITY.midGapNotice - eps;
  } else if (lossMarket > 0) {
    const ratio = lossModel / lossMarket;
    strong = ratio >= DISPARITY.extRatioStrong;
    notice = strong || ratio >= DISPARITY.extRatioNotice;
  } else if (lossModel > 0) {
    // p is already certain and the model disagrees: flag strongly.
    strong = true;
  }

  return {
    modelProbability: mp,
    points,
    sign: points > 0 ? 'positive' : points < 0 ? 'negative' : null,
    flagged: { notice, strong },
    label: strong ? 'Check!' : notice ? 'Check' : null,
    reason: null,
  };
}
