import { emptySlip, type Slip } from './slip.ts';
import { STORAGE_KEYS, scopedStorageKey } from './client-storage.ts';

/** The working slip lives in the browser (user-scoped when signed in) so Builder and AI Picks share it. */
export const SLIP_KEY = STORAGE_KEYS.SLIP;
export const SLIP_EVENT = 'lb-slip-changed';

const isLeg = (x: unknown): boolean => {
  const l = x as Record<string, unknown> | null;
  return !!l && typeof l.gameId === 'string' && typeof l.odds === 'number' && typeof l.home === 'string'
    && typeof l.away === 'string' && typeof l.bookmaker === 'string' && typeof l.kickoff === 'number';
};

/** Reads the stored slip. Anything missing or malformed gives an empty slip, never a crash. */
export function readSlip(): Slip {
  try {
    const key = scopedStorageKey(SLIP_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return emptySlip();
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.legs) || !j.legs.every(isLeg)) return emptySlip();
    const ids = new Set<string>(j.legs.map((l: { gameId: string }) => l.gameId));
    const greyed = Array.isArray(j.greyed) ? j.greyed.filter((g: unknown): g is string => typeof g === 'string' && ids.has(g)) : [];
    const out: Slip = { legs: j.legs, greyed };
    if (typeof j.id === 'string' && j.id) out.id = j.id;
    if (typeof j.name === 'string' && j.name) out.name = j.name;
    return out;
  } catch {
    return emptySlip();
  }
}

export function writeSlip(slip: Slip): void {
  try {
    const key = scopedStorageKey(SLIP_KEY);
    localStorage.setItem(key, JSON.stringify(slip));
  } catch { /* storage full or blocked: the in-memory slip still works for this page */ }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(SLIP_EVENT));
  }
}
