/**
 * "Add N picks to the betslip": walks the offered picks in order and adds the first N that can really go on
 * the slip, skipping (and reporting) the rest. Re-validated odds are used when given: a price change inside the
 * band is applied and reported, a suspended or dropped pick is skipped. Never adds silently or beyond the cap.
 */
import type { AiPick } from './ai-picks.ts';
import { aiPickToRow } from './ai-rows.ts';
import type { RevalidateFlag } from './revalidate.ts';
import { addLeg, MAX_LEGS, type Slip } from './slip.ts';

export type Revalidation = { flag: RevalidateFlag; odds: number };

export type AddReport = {
  requested: number;
  added: number;
  skipped: { id: string; label: string; reason: string }[];
  priceChanged: { label: string; from: number; to: number }[];
};

const label = (p: AiPick) => `${p.home} v ${p.away}`;

export function planAdd(
  candidates: AiPick[],
  slip: Slip,
  n: number,
  reval?: Map<string, Revalidation>,
): { slip: Slip; report: AddReport } {
  const want = Math.max(0, Math.floor(n));
  const report: AddReport = { requested: want, added: 0, skipped: [], priceChanged: [] };
  let cur = slip;

  for (const p of candidates) {
    if (report.added >= want) break;
    if (cur.legs.length >= MAX_LEGS) {
      report.skipped.push({ id: p.id, label: label(p), reason: `Slip is full (${MAX_LEGS} legs)` });
      break;
    }
    const rv = reval?.get(p.id);
    if (rv && (rv.flag.kind === 'no_longer_qualifies' || rv.flag.kind === 'market_gone')) {
      report.skipped.push({ id: p.id, label: label(p), reason: rv.flag.reason });
      continue;
    }
    const pick = rv && rv.flag.kind === 'price_changed' ? { ...p, odds: rv.odds, impliedProbability: 1 / rv.odds } : p;
    const row = aiPickToRow(pick);
    if (!row) {
      report.skipped.push({ id: p.id, label: label(p), reason: "This market type can't be added to a slip" });
      continue;
    }
    const r = addLeg(cur, row);
    if (!r.ok) {
      report.skipped.push({ id: p.id, label: label(p), reason: r.error });
      continue;
    }
    cur = r.slip;
    report.added++;
    if (rv && rv.flag.kind === 'price_changed') report.priceChanged.push({ label: label(p), from: p.odds, to: rv.odds });
  }
  return { slip: cur, report };
}

/** One-line summary for a toast. */
export function describeReport(r: AddReport): string {
  const head = r.added === r.requested ? `Added ${r.added}.` : `Added ${r.added} of ${r.requested}.`;
  const bits: string[] = [];
  if (r.priceChanged.length) bits.push(`${r.priceChanged.length} price${r.priceChanged.length > 1 ? 's' : ''} changed`);
  if (r.skipped.length) bits.push(`${r.skipped.length} skipped`);
  return bits.length ? `${head} ${bits.join(', ')}.` : head;
}
