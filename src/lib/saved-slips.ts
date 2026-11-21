/**
 * Saved slips: Postgres (`slips` via `queryAsUser` with strict RLS) when `DATABASE_URL` is set,
 * with an in-process memory store fallback for local dev/tests without a database.
 * Anonymous clients (`userId === null`) can NEVER read or modify user slips.
 */
import type { PickRow } from './filters.ts';
import type { Bookmaker } from './types.ts';
import { STORAGE_KEYS, scopedStorageKey } from './client-storage.ts';
import { defaultSlipName } from './slip.ts';
import { ensureSavedSlipsColumns } from './pg-schema.ts';
import { queryAsUser, getPool } from './pg-store.ts';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const usePg = () => Boolean(process.env.DATABASE_URL);

/**
 * Lists saved slips for an authenticated user (sync memory store).
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
  byUser.set(input.userId, list.slice(0, 100));
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

type PgSlipRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  destination: Bookmaker | null;
  selections: PickRow[];
  total_odds: string | number;
  combined_implied: string | number | null;
  created_ms: string | number;
  shared: boolean | null;
  share_note: string | null;
};

function rowToSavedSlip(row: PgSlipRow): SavedSlip {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name?.trim() || defaultSlipName(),
    bookmaker: row.destination ?? 'sportybet',
    legs: Array.isArray(row.selections) ? row.selections : [],
    totalOdds: Number(row.total_odds),
    combinedImplied: row.combined_implied !== null ? Number(row.combined_implied) : null,
    createdAt: Number(row.created_ms),
    shared: Boolean(row.shared),
    shareNote: row.share_note ?? undefined,
  };
}

/** Async Postgres-backed saved slips list (strict RLS via `queryAsUser`), with memory fallback. */
export async function listSavedSlipsDb(userId: string | null): Promise<SavedSlip[]> {
  if (!userId) return [];
  if (!usePg()) return listSavedSlips(userId);
  await ensureSavedSlipsColumns();
  const r = await queryAsUser<PgSlipRow>(
    userId,
    `SELECT id, user_id, name, destination, selections, total_odds, combined_implied,
            (extract(epoch from created_at)*1000)::bigint AS created_ms, shared, share_note
     FROM slips
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId],
  );
  return r.rows.map(rowToSavedSlip);
}

export async function saveSlipDb(input: {
  id?: string;
  userId: string | null;
  name: string;
  bookmaker: Bookmaker;
  legs: PickRow[];
  totalOdds: number;
  combinedImplied: number | null;
}): Promise<SavedSlip> {
  if (!input.userId || !usePg()) {
    return saveSlip(input);
  }
  await ensureSavedSlipsColumns();
  const slipName = input.name.trim() || defaultSlipName();
  const validUuid = input.id && UUID_RE.test(input.id) ? input.id : null;

  if (validUuid) {
    const upd = await queryAsUser<PgSlipRow>(
      input.userId,
      `UPDATE slips
       SET name = $2, destination = $3, selections = $4::jsonb, total_odds = $5, combined_implied = $6
       WHERE id = $1 AND user_id = $7
       RETURNING id, user_id, name, destination, selections, total_odds, combined_implied,
                 (extract(epoch from created_at)*1000)::bigint AS created_ms, shared, share_note`,
      [
        validUuid,
        slipName,
        input.bookmaker,
        JSON.stringify(input.legs),
        input.totalOdds,
        input.combinedImplied,
        input.userId,
      ],
    );
    if (upd.rows[0]) return rowToSavedSlip(upd.rows[0]);
  }

  const ins = await queryAsUser<PgSlipRow>(
    input.userId,
    `INSERT INTO slips (user_id, name, destination, selections, total_odds, combined_implied)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, user_id, name, destination, selections, total_odds, combined_implied,
               (extract(epoch from created_at)*1000)::bigint AS created_ms, shared, share_note`,
    [
      input.userId,
      slipName,
      input.bookmaker,
      JSON.stringify(input.legs),
      input.totalOdds,
      input.combinedImplied,
    ],
  );
  return rowToSavedSlip(ins.rows[0]);
}

export async function deleteSavedSlipDb(userId: string | null, id: string): Promise<boolean> {
  if (!userId) return false;
  if (!usePg()) return deleteSavedSlip(userId, id);
  if (!UUID_RE.test(id)) return false;
  const r = await queryAsUser(
    userId,
    `DELETE FROM slips WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function shareSlipDb(
  userId: string | null,
  id: string,
  note?: string,
): Promise<SavedSlip | null> {
  if (!userId) return null;
  if (!usePg()) return shareSlip(userId, id, note);
  if (!UUID_RE.test(id)) return null;
  await ensureSavedSlipsColumns();
  const cleanNote = note?.trim() || null;
  const r = await queryAsUser<PgSlipRow>(
    userId,
    `UPDATE slips
     SET shared = true, share_note = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, name, destination, selections, total_odds, combined_implied,
               (extract(epoch from created_at)*1000)::bigint AS created_ms, shared, share_note`,
    [id, userId, cleanNote],
  );
  return r.rows[0] ? rowToSavedSlip(r.rows[0]) : null;
}

export async function unshareSlipDb(userId: string | null, id: string): Promise<boolean> {
  if (!userId) return false;
  if (!usePg()) return unshareSlip(userId, id);
  if (!UUID_RE.test(id)) return false;
  await ensureSavedSlipsColumns();
  const r = await queryAsUser(
    userId,
    `UPDATE slips SET shared = false WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function listCommunitySlipsDb(userId: string, limit = 50): Promise<SavedSlip[]> {
  if (!usePg()) return listCommunitySlips(limit);
  await ensureSavedSlipsColumns();
  const r = await queryAsUser<PgSlipRow>(
    userId,
    `SELECT id, user_id, name, destination, selections, total_odds, combined_implied,
            (extract(epoch from created_at)*1000)::bigint AS created_ms, shared, share_note
     FROM slips
     WHERE shared = true AND user_id IS NOT NULL
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return r.rows.map(rowToSavedSlip);
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

// Keep unused import suppressed only if getPool isn't referenced elsewhere
void getPool;
