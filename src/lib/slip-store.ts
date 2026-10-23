import { emptySlip, type Slip } from './slip.ts';

/** The working slip lives in the browser so the Builder and AI Picks pages share it. */
export const SLIP_KEY = 'lb_slip_v1';
export const SLIP_EVENT = 'lb-slip-changed';

const isLeg = (x: unknown): boolean => {
  const l = x as Record<string, unknown> | null;
  return !!l && typeof l.gameId === 'string' && typeof l.odds === 'number' && typeof l.home === 'string'
    && typeof l.away === 'string' && typeof l.bookmaker === 'string' && typeof l.kickoff === 'number';
};

/** Reads the stored slip. Anything missing or malformed gives an empty slip, never a crash. */
export function readSlip(): Slip {
  try {
    const raw = localStorage.getItem(SLIP_KEY);
    if (!raw) return emptySlip();
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.legs) || !j.legs.every(isLeg)) return emptySlip();
    const ids = new Set<string>(j.legs.map((l: { gameId: string }) => l.gameId));
    const greyed = Array.isArray(j.greyed) ? j.greyed.filter((g: unknown): g is string => typeof g === 'string' && ids.has(g)) : [];
    return { legs: j.legs, greyed };
  } catch {
    return emptySlip();
  }
}

export function writeSlip(slip: Slip): void {
  try {
    localStorage.setItem(SLIP_KEY, JSON.stringify(slip));
  } catch { /* storage full or blocked: the in-memory slip still works for this page */ }
  window.dispatchEvent(new Event(SLIP_EVENT));
}
