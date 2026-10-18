/**
 * Saved slips: in-process store (and client localStorage mirror).
 * Without Postgres this is process-local; with user id it scopes per user.
 */
import type { PickRow } from './filters.ts';
import type { Bookmaker } from './types.ts';

export type SavedSlip = {
  id: string;
  userId: string | null;
  name: string;
  bookmaker: Bookmaker;
  legs: PickRow[];
  totalOdds: number;
  combinedImplied: number | null;
  createdAt: number;
  /** When shared to community */
  shared: boolean;
  shareNote?: string;
};

const byUser = new Map<string, SavedSlip[]>();
const publicFeed: SavedSlip[] = [];
let clock = 0;

function key(userId: string | null) {
  return userId ?? '__anon__';
}

export function listSavedSlips(userId: string | null): SavedSlip[] {
  return [...(byUser.get(key(userId)) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
}

export function saveSlip(input: {
  userId: string | null;
  name: string;
  bookmaker: Bookmaker;
  legs: PickRow[];
  totalOdds: number;
  combinedImplied: number | null;
}): SavedSlip {
  const slip: SavedSlip = {
    id: `saved-${Date.now()}-${++clock}`,
    userId: input.userId,
    name: input.name.trim() || `Slip ${new Date().toLocaleString()}`,
    bookmaker: input.bookmaker,
    legs: input.legs,
    totalOdds: input.totalOdds,
    combinedImplied: input.combinedImplied,
    createdAt: Date.now(),
    shared: false,
  };
  const k = key(input.userId);
  const list = byUser.get(k) ?? [];
  list.unshift(slip);
  byUser.set(k, list.slice(0, 100)); // cap
  return slip;
}

export function deleteSavedSlip(userId: string | null, id: string): boolean {
  const k = key(userId);
  const list = byUser.get(k) ?? [];
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  byUser.set(k, next);
  // also remove from public if present
  const idx = publicFeed.findIndex((s) => s.id === id);
  if (idx >= 0) publicFeed.splice(idx, 1);
  return true;
}

export function shareSlip(userId: string | null, id: string, note?: string): SavedSlip | null {
  const list = byUser.get(key(userId)) ?? [];
  const slip = list.find((s) => s.id === id);
  if (!slip) return null;
  slip.shared = true;
  slip.shareNote = note?.trim() || undefined;
  if (!publicFeed.some((s) => s.id === id)) {
    publicFeed.unshift({ ...slip });
    if (publicFeed.length > 200) publicFeed.pop();
  } else {
    const i = publicFeed.findIndex((s) => s.id === id);
    if (i >= 0) publicFeed[i] = { ...slip };
  }
  return slip;
}

export function unshareSlip(userId: string | null, id: string): boolean {
  const list = byUser.get(key(userId)) ?? [];
  const slip = list.find((s) => s.id === id);
  if (slip) slip.shared = false;
  const idx = publicFeed.findIndex((s) => s.id === id);
  if (idx >= 0) publicFeed.splice(idx, 1);
  return !!slip;
}

export function listCommunitySlips(limit = 50): SavedSlip[] {
  return publicFeed.slice(0, limit);
}

export function getSavedSlip(userId: string | null, id: string): SavedSlip | null {
  return (byUser.get(key(userId)) ?? []).find((s) => s.id === id) ?? null;
}
