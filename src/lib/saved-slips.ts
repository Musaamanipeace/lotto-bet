/**
 * Saved slips: in-process store (and user-scoped client localStorage mirror).
 * Anonymous clients cannot read or modify user slips.
 */
import type { PickRow } from './filters.ts';
import type { Bookmaker } from './types.ts';
import { STORAGE_KEYS, scopedStorageKey } from './client-storage.ts';
import { defaultSlipName } from './slip.ts';

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

/**
 * Lists saved slips for an authenticated user.
 * Anonymous clients (`userId === null`) read nothing (`[]`).
 */
export function listSavedSlips(userId: string | null): SavedSlip[] {
  if (!userId) return [];
  return [...(byUser.get(userId) ?? [])].sort((a, b) => b.createdAt - a.createdAt);
}

export function saveSlip(input: {
  id?: string;
  userId: string | null;
  name: string;
  bookmaker: Bookmaker;
  legs: PickRow[];
  totalOdds: number;
  combinedImplied: number | null;
}): SavedSlip {
  const slipName = input.name.trim() || defaultSlipName();
  if (!input.userId) {
    // Ephemeral return for unauthenticated caller; never stored in shared server map
    return {
      id: input.id || `saved-${Date.now()}-${++clock}`,
      userId: null,
      name: slipName,
      bookmaker: input.bookmaker,
      legs: input.legs,
      totalOdds: input.totalOdds,
      combinedImplied: input.combinedImplied,
      createdAt: Date.now(),
      shared: false,
    };
  }

  const list = byUser.get(input.userId) ?? [];
  if (input.id) {
    const existingIdx = list.findIndex((s) => s.id === input.id && s.userId === input.userId);
    if (existingIdx >= 0) {
      const updated: SavedSlip = {
        ...list[existingIdx],
        name: slipName,
        bookmaker: input.bookmaker,
        legs: input.legs,
        totalOdds: input.totalOdds,
        combinedImplied: input.combinedImplied,
      };
      list[existingIdx] = updated;
      byUser.set(input.userId, list);
      return updated;
    }
  }

  const slip: SavedSlip = {
    id: input.id || `saved-${Date.now()}-${++clock}`,
    userId: input.userId,
    name: slipName,
    bookmaker: input.bookmaker,
    legs: input.legs,
    totalOdds: input.totalOdds,
    combinedImplied: input.combinedImplied,
    createdAt: Date.now(),
    shared: false,
  };
  list.unshift(slip);
  byUser.set(input.userId, list.slice(0, 100)); // cap
  return slip;
}

export function updateSavedSlip(
  userId: string | null,
  id: string,
  patch: Partial<Pick<SavedSlip, 'name' | 'legs' | 'totalOdds' | 'combinedImplied'>>,
): SavedSlip | null {
  if (!userId) return null;
  const list = byUser.get(userId) ?? [];
  const idx = list.findIndex((s) => s.id === id && s.userId === userId);
  if (idx < 0) return null;
  const updated: SavedSlip = {
    ...list[idx],
    ...(patch.name !== undefined ? { name: patch.name.trim() || list[idx].name } : {}),
    ...(patch.legs !== undefined ? { legs: patch.legs } : {}),
    ...(patch.totalOdds !== undefined ? { totalOdds: patch.totalOdds } : {}),
    ...(patch.combinedImplied !== undefined ? { combinedImplied: patch.combinedImplied } : {}),
  };
  list[idx] = updated;
  byUser.set(userId, list);
  return updated;
}

export function deleteSavedSlip(userId: string | null, id: string): boolean {
  if (!userId) return false;
  const list = byUser.get(userId) ?? [];
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  byUser.set(userId, next);
  // also remove from public if present
  const idx = publicFeed.findIndex((s) => s.id === id);
  if (idx >= 0) publicFeed.splice(idx, 1);
  return true;
}

export function shareSlip(userId: string | null, id: string, note?: string): SavedSlip | null {
  if (!userId) return null;
  const list = byUser.get(userId) ?? [];
  const slip = list.find((s) => s.id === id && s.userId === userId);
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
  if (!userId) return false;
  const list = byUser.get(userId) ?? [];
  const slip = list.find((s) => s.id === id && s.userId === userId);
  if (slip) slip.shared = false;
  const idx = publicFeed.findIndex((s) => s.id === id);
  if (idx >= 0) publicFeed.splice(idx, 1);
  return !!slip;
}

export function listCommunitySlips(limit = 50): SavedSlip[] {
  return publicFeed.slice(0, limit);
}

export function getSavedSlip(userId: string | null, id: string): SavedSlip | null {
  if (!userId) return null;
  return (byUser.get(userId) ?? []).find((s) => s.id === id && s.userId === userId) ?? null;
}

export function resetSavedSlipsForTests(): void {
  byUser.clear();
  publicFeed.length = 0;
}

/** Browser helper: reads user-scoped saved slips from localStorage. */
export function loadLocalSavedSlips<T = SavedSlip>(): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = scopedStorageKey(STORAGE_KEYS.SAVED_SLIPS);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Browser helper: writes user-scoped saved slips to localStorage. */
export function saveLocalSavedSlips<T = SavedSlip>(slips: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = scopedStorageKey(STORAGE_KEYS.SAVED_SLIPS);
    localStorage.setItem(key, JSON.stringify(slips.slice(0, 50)));
  } catch {
    /* ignore quota */
  }
}

/** Browser helper: upserts a single saved slip in user-scoped localStorage. */
export function upsertLocalSavedSlip<T extends { id: string }>(slip: T): void {
  const prev = loadLocalSavedSlips<T>();
  const idx = prev.findIndex((s) => s.id === slip.id);
  const next = idx >= 0 ? prev.map((s, i) => (i === idx ? slip : s)) : [slip, ...prev];
  saveLocalSavedSlips(next);
}
