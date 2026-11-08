import { fail, ok, type Result } from './result.ts';
import { queryAsUser } from './pg-store.ts';
import { STORAGE_KEYS, scopedStorageKey } from './client-storage.ts';

export const MAX_SHORTCUTS = 8;
export const MAX_SHORTCUT_LABEL_LEN = 24;

export type AllowedShortcutDef = {
  target: string;
  label: string;
  icon: string;
  desc: string;
};

/**
 * Hardcoded allowlist of internal app routes and sections.
 * Free-text URLs, external links, or `javascript:` URIs are strictly rejected.
 */
export const SHORTCUT_ALLOWLIST: readonly AllowedShortcutDef[] = [
  { target: '/', label: 'Slip Builder', icon: '📝', desc: 'Main football slip builder' },
  { target: '/#filters', label: 'Market Filters', icon: '🎛️', desc: 'Jump to unified market & odds filters' },
  { target: '/#available-games', label: 'Available Games', icon: '⚽', desc: 'Jump to games carousel' },
  { target: '/ai-picks', label: 'AI Picks', icon: '✦', desc: 'Algorithmic market recommendations' },
  { target: '/my-picks', label: 'My Picks', icon: '🎯', desc: 'Your personal picks workspace' },
  { target: '/saved-slips', label: 'Saved Slips', icon: '📋', desc: 'Your saved & auto-saved slips' },
  { target: '/results', label: 'Results Tracker', icon: '📊', desc: 'Settled slips & score tracker' },
  { target: '/community', label: 'Community', icon: '👥', desc: 'Shared slips feed' },
  { target: '/leagues', label: 'Active Leagues', icon: '🏆', desc: 'Filter by active competitions' },
  { target: '/chat', label: 'AI Chat', icon: '💬', desc: 'AI assistant for picks & rules' },
] as const;

const ALLOWED_TARGETS = new Set<string>(SHORTCUT_ALLOWLIST.map((x) => x.target));

export type UserShortcut = {
  id: string;
  userId: string;
  label: string;
  target: string;
  icon: string | null;
  position: number;
  createdAt: number;
};

/**
 * Validates that a target is strictly a safe internal path from SHORTCUT_ALLOWLIST.
 * Rejects external URLs, protocol-relative URLs (`//`), `javascript:`, `data:`, etc.
 */
export function isValidShortcutTarget(target: unknown): target is string {
  if (typeof target !== 'string') return false;
  const trimmed = target.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:') ||
    lower.includes('vbscript:') ||
    lower.includes('http:') ||
    lower.includes('https:')
  ) {
    return false;
  }
  return ALLOWED_TARGETS.has(trimmed);
}

export function validateShortcutLabel(labelRaw: unknown): Result<{ label: string }> {
  if (typeof labelRaw !== 'string') return fail('Label is required');
  const trimmed = labelRaw.trim();
  if (trimmed.length === 0) return fail('Shortcut label cannot be empty');
  if (trimmed.length > MAX_SHORTCUT_LABEL_LEN) {
    return fail(`Shortcut label must be at most ${MAX_SHORTCUT_LABEL_LEN} characters`);
  }
  return ok({ label: trimmed });
}

export interface ShortcutStore {
  list(userId: string | null): Promise<UserShortcut[]>;
  add(userId: string | null, input: { target: unknown; label?: unknown; icon?: unknown }): Promise<Result<{ shortcut: UserShortcut }>>;
  rename(userId: string | null, id: string, newLabel: unknown): Promise<Result<{ shortcut: UserShortcut }>>;
  remove(userId: string | null, id: string): Promise<Result<{ deletedId: string }>>;
  reorder(userId: string | null, orderedIds: string[]): Promise<Result<{ shortcuts: UserShortcut[] }>>;
}

let memClock = 0;

/**
 * In-memory per-user ShortcutStore that enforces strict RLS semantics:
 * - Anonymous users (`userId === null`) cannot read or mutate any rows.
 * - Authenticated user A can only read, update, reorder, or delete user A's own rows.
 */
export class MemoryShortcutStore implements ShortcutStore {
  private byUser = new Map<string, UserShortcut[]>();

  async list(userId: string | null): Promise<UserShortcut[]> {
    if (!userId) return [];
    const rows = this.byUser.get(userId) ?? [];
    return [...rows].sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
  }

  async add(
    userId: string | null,
    input: { target: unknown; label?: unknown; icon?: unknown },
  ): Promise<Result<{ shortcut: UserShortcut }>> {
    if (!userId) return fail('Authentication required');
    if (!isValidShortcutTarget(input.target)) {
      return fail('Invalid shortcut target: must be an internal route from the allowlist');
    }
    const target = input.target.trim();
    const def = SHORTCUT_ALLOWLIST.find((x) => x.target === target)!;
    const labelRes = validateShortcutLabel(input.label ?? def.label);
    if (!labelRes.ok) return labelRes;

    const current = await this.list(userId);
    if (current.length >= MAX_SHORTCUTS) {
      return fail(`Maximum of ${MAX_SHORTCUTS} shortcuts reached. Remove one to add another.`);
    }
    if (current.some((s) => s.target === target)) {
      return fail('A shortcut for this route already exists');
    }

    const icon = typeof input.icon === 'string' && input.icon.trim().length <= 8 ? input.icon.trim() : def.icon;
    const shortcut: UserShortcut = {
      id: `sc-${Date.now()}-${++memClock}`,
      userId,
      label: labelRes.label,
      target,
      icon,
      position: current.length,
      createdAt: Date.now(),
    };
    this.byUser.set(userId, [...current, shortcut]);
    return ok({ shortcut });
  }

  async rename(userId: string | null, id: string, newLabel: unknown): Promise<Result<{ shortcut: UserShortcut }>> {
    if (!userId) return fail('Authentication required');
    const v = validateShortcutLabel(newLabel);
    if (!v.ok) return v;
    const current = await this.list(userId);
    const idx = current.findIndex((s) => s.id === id && s.userId === userId);
    if (idx < 0) return fail('Shortcut not found');
    const shortcut: UserShortcut = { ...current[idx], label: v.label };
    current[idx] = shortcut;
    this.byUser.set(userId, current);
    return ok({ shortcut });
  }

  async remove(userId: string | null, id: string): Promise<Result<{ deletedId: string }>> {
    if (!userId) return fail('Authentication required');
    const current = await this.list(userId);
    const next = current.filter((s) => !(s.id === id && s.userId === userId));
    if (next.length === current.length) return fail('Shortcut not found');
    const reindexed = next.map((s, idx) => ({ ...s, position: idx }));
    this.byUser.set(userId, reindexed);
    return ok({ deletedId: id });
  }

  async reorder(userId: string | null, orderedIds: string[]): Promise<Result<{ shortcuts: UserShortcut[] }>> {
    if (!userId) return fail('Authentication required');
    const current = await this.list(userId);
    if (!Array.isArray(orderedIds)) return fail('orderedIds must be an array');
    const byId = new Map(current.map((s) => [s.id, s]));
    const next: UserShortcut[] = [];
    for (const id of orderedIds) {
      const found = byId.get(id);
      if (found) {
        next.push(found);
        byId.delete(id);
      }
    }
    for (const remaining of byId.values()) {
      next.push(remaining);
    }
    const reindexed = next.map((s, idx) => ({ ...s, position: idx }));
    this.byUser.set(userId, reindexed);
    return ok({ shortcuts: reindexed });
  }
}

export class PgShortcutStore implements ShortcutStore {
  async list(userId: string | null): Promise<UserShortcut[]> {
    if (!userId) return [];
    const r = await queryAsUser<{
      id: string;
      user_id: string;
      label: string;
      target: string;
      icon: string | null;
      position: number;
      created_ms: string;
    }>(
      userId,
      `SELECT id, user_id, label, target, icon, position, (extract(epoch from created_at)*1000)::bigint AS created_ms
       FROM user_shortcuts
       WHERE user_id = $1
       ORDER BY position ASC, created_at ASC`,
      [userId],
    );
    return r.rows.map((x) => ({
      id: x.id,
      userId: x.user_id,
      label: x.label,
      target: x.target,
      icon: x.icon,
      position: Number(x.position),
      createdAt: Number(x.created_ms),
    }));
  }

  async add(
    userId: string | null,
    input: { target: unknown; label?: unknown; icon?: unknown },
  ): Promise<Result<{ shortcut: UserShortcut }>> {
    if (!userId) return fail('Authentication required');
    if (!isValidShortcutTarget(input.target)) {
      return fail('Invalid shortcut target: must be an internal route from the allowlist');
    }
    const target = input.target.trim();
    const def = SHORTCUT_ALLOWLIST.find((x) => x.target === target)!;
    const labelRes = validateShortcutLabel(input.label ?? def.label);
    if (!labelRes.ok) return labelRes;

    const current = await this.list(userId);
    if (current.length >= MAX_SHORTCUTS) {
      return fail(`Maximum of ${MAX_SHORTCUTS} shortcuts reached. Remove one to add another.`);
    }
    if (current.some((s) => s.target === target)) {
      return fail('A shortcut for this route already exists');
    }

    const icon = typeof input.icon === 'string' && input.icon.trim().length <= 8 ? input.icon.trim() : def.icon;
    const r = await queryAsUser<{
      id: string;
      user_id: string;
      label: string;
      target: string;
      icon: string | null;
      position: number;
      created_ms: string;
    }>(
      userId,
      `INSERT INTO user_shortcuts (user_id, label, target, icon, position)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, label, target, icon, position, (extract(epoch from created_at)*1000)::bigint AS created_ms`,
      [userId, labelRes.label, target, icon, current.length],
    );
    const x = r.rows[0];
    return ok({
      shortcut: {
        id: x.id,
        userId: x.user_id,
        label: x.label,
        target: x.target,
        icon: x.icon,
        position: Number(x.position),
        createdAt: Number(x.created_ms),
      },
    });
  }

  async rename(userId: string | null, id: string, newLabel: unknown): Promise<Result<{ shortcut: UserShortcut }>> {
    if (!userId) return fail('Authentication required');
    const v = validateShortcutLabel(newLabel);
    if (!v.ok) return v;
    const r = await queryAsUser<{
      id: string;
      user_id: string;
      label: string;
      target: string;
      icon: string | null;
      position: number;
      created_ms: string;
    }>(
      userId,
      `UPDATE user_shortcuts
       SET label = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, label, target, icon, position, (extract(epoch from created_at)*1000)::bigint AS created_ms`,
      [v.label, id, userId],
    );
    if (r.rows.length === 0) return fail('Shortcut not found');
    const x = r.rows[0];
    return ok({
      shortcut: {
        id: x.id,
        userId: x.user_id,
        label: x.label,
        target: x.target,
        icon: x.icon,
        position: Number(x.position),
        createdAt: Number(x.created_ms),
      },
    });
  }

  async remove(userId: string | null, id: string): Promise<Result<{ deletedId: string }>> {
    if (!userId) return fail('Authentication required');
    const r = await queryAsUser<{ id: string }>(
      userId,
      `DELETE FROM user_shortcuts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId],
    );
    if (r.rows.length === 0) return fail('Shortcut not found');
    return ok({ deletedId: id });
  }

  async reorder(userId: string | null, orderedIds: string[]): Promise<Result<{ shortcuts: UserShortcut[] }>> {
    if (!userId) return fail('Authentication required');
    for (let i = 0; i < orderedIds.length; i++) {
      await queryAsUser(
        userId,
        `UPDATE user_shortcuts SET position = $1 WHERE id = $2 AND user_id = $3`,
        [i, orderedIds[i], userId],
      );
    }
    const shortcuts = await this.list(userId);
    return ok({ shortcuts });
  }
}

const g = globalThis as unknown as {
  __lottoMemoryShortcuts?: MemoryShortcutStore;
  __lottoPgShortcuts?: PgShortcutStore;
};

export function getShortcutStore(): ShortcutStore {
  if (process.env.DATABASE_URL) {
    return (g.__lottoPgShortcuts ??= new PgShortcutStore());
  }
  return (g.__lottoMemoryShortcuts ??= new MemoryShortcutStore());
}

/** Browser helper: reads user-scoped shortcuts from localStorage. */
export function loadLocalShortcuts(): UserShortcut[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = scopedStorageKey(STORAGE_KEYS.USER_SHORTCUTS);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserShortcut[]) : [];
  } catch {
    return [];
  }
}

/** Browser helper: writes user-scoped shortcuts to localStorage. */
export function saveLocalShortcuts(shortcuts: UserShortcut[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = scopedStorageKey(STORAGE_KEYS.USER_SHORTCUTS);
    localStorage.setItem(key, JSON.stringify(shortcuts.slice(0, MAX_SHORTCUTS)));
  } catch {
    /* ignore */
  }
}
