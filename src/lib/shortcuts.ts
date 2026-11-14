import { ensureShortcutsTable } from './pg-schema.ts';
import { queryAsUser } from './pg-store.ts';

export const MAX_SHORTCUTS = 8;
export const MAX_SHORTCUT_LABEL = 24;

export type AllowlistedTool = {
  target: string;
  defaultLabel: string;
  icon: string;
  description: string;
};

export const SHORTCUT_ALLOWLIST: readonly AllowlistedTool[] = [
  { target: '/', defaultLabel: 'Builder', icon: '⚡', description: 'Main slip builder' },
  { target: '/#filters', defaultLabel: 'Filters', icon: '🎚️', description: 'Jump to unified filters' },
  { target: '/#available-games', defaultLabel: 'Games', icon: '⚽', description: 'Jump to games carousel' },
  { target: '/ai-picks', defaultLabel: 'AI Picks', icon: '✨', description: 'AI picks & N-pick builder' },
  { target: '/my-picks', defaultLabel: 'My Picks', icon: '🎯', description: 'Signed-in slip workspace' },
  { target: '/saved-slips', defaultLabel: 'Saved Slips', icon: '📋', description: 'Saved account slips' },
  { target: '/results', defaultLabel: 'Results', icon: '📊', description: 'Settled slip results' },
  { target: '/community', defaultLabel: 'Community', icon: '🌐', description: 'Shared community slips' },
  { target: '/leagues', defaultLabel: 'Leagues', icon: '🏆', description: 'Active competitions' },
  { target: '/chat', defaultLabel: 'AI Chat', icon: '💬', description: 'AI slip assistant' },
] as const;

const ALLOWLIST_TARGETS = new Set(SHORTCUT_ALLOWLIST.map((t) => t.target));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UserShortcut = {
  id: string;
  userId: string;
  label: string;
  target: string;
  icon: string;
  position: number;
  createdAt: number;
};

export function isValidShortcutTarget(target: unknown): target is string {
  if (typeof target !== 'string') return false;
  const t = target.trim();
  if (!t.startsWith('/') || t.startsWith('//')) return false;
  if (t.toLowerCase().includes('javascript:')) return false;
  return ALLOWLIST_TARGETS.has(t);
}

export function normalizeShortcutLabel(rawLabel: unknown, target?: string): { ok: true; label: string } | { ok: false; error: string } {
  const fallback = SHORTCUT_ALLOWLIST.find((a) => a.target === target)?.defaultLabel;
  const raw = typeof rawLabel === 'string' && rawLabel.trim().length > 0 ? rawLabel.trim() : fallback ?? '';
  if (!raw) return { ok: false, error: 'Shortcut label is required.' };
  if (raw.length > MAX_SHORTCUT_LABEL) {
    return { ok: false, error: `Shortcut label must be at most ${MAX_SHORTCUT_LABEL} characters.` };
  }
  return { ok: true, label: raw };
}

export function validateShortcutInput(input: { label?: unknown; target?: unknown }):
  | { ok: true; label: string; target: string; icon: string }
  | { ok: false; error: string } {
  if (!isValidShortcutTarget(input.target)) {
    return { ok: false, error: 'Shortcut target is not on the internal allowlist.' };
  }
  const target = input.target.trim();
  const labelRes = normalizeShortcutLabel(input.label, target);
  if (!labelRes.ok) return labelRes;
  const meta = SHORTCUT_ALLOWLIST.find((a) => a.target === target);
  return {
    ok: true,
    label: labelRes.label,
    target,
    icon: meta?.icon ?? '🔖',
  };
}

// In-memory per-user fallback store
const g = globalThis as unknown as { __lottoMemShortcuts?: Map<string, UserShortcut[]> };
const memShortcuts = (g.__lottoMemShortcuts ??= new Map<string, UserShortcut[]>());
let memSeq = 0;
const usePg = () => Boolean(process.env.DATABASE_URL);

export function listShortcuts(userId: string | null): UserShortcut[] {
  if (!userId) return [];
  return [...(memShortcuts.get(userId) ?? [])].sort((a, b) => a.position - b.position);
}

export function addShortcut(
  userId: string | null,
  input: { label?: unknown; target?: unknown },
): { ok: true; shortcut: UserShortcut } | { ok: false; error: string } {
  if (!userId) return { ok: false, error: 'Sign in required.' };
  const valid = validateShortcutInput(input);
  if (!valid.ok) return valid;

  const list = [...(memShortcuts.get(userId) ?? [])];
  if (list.length >= MAX_SHORTCUTS) {
    return { ok: false, error: `Maximum ${MAX_SHORTCUTS} shortcuts allowed.` };
  }
  if (list.some((s) => s.target === valid.target)) {
    return { ok: false, error: 'This tool is already in your shortcuts bar.' };
  }

  const shortcut: UserShortcut = {
    id: `sc-${Date.now()}-${++memSeq}`,
    userId,
    label: valid.label,
    target: valid.target,
    icon: valid.icon,
    position: list.length,
    createdAt: Date.now(),
  };
  list.push(shortcut);
  memShortcuts.set(userId, list);
  return { ok: true, shortcut };
}

export function updateShortcut(
  userId: string | null,
  id: string,
  labelRaw: unknown,
): { ok: true; shortcut: UserShortcut } | { ok: false; error: string } {
  if (!userId) return { ok: false, error: 'Sign in required.' };
  const list = [...(memShortcuts.get(userId) ?? [])];
  const idx = list.findIndex((s) => s.id === id && s.userId === userId);
  if (idx < 0) return { ok: false, error: 'Shortcut not found.' };
  const labelRes = normalizeShortcutLabel(labelRaw);
  if (!labelRes.ok) return labelRes;
  list[idx] = { ...list[idx], label: labelRes.label };
  memShortcuts.set(userId, list);
  return { ok: true, shortcut: list[idx] };
}

export function deleteShortcut(userId: string | null, id: string): boolean {
  if (!userId) return false;
  const list = memShortcuts.get(userId) ?? [];
  const next = list
    .filter((s) => !(s.id === id && s.userId === userId))
    .map((s, idx) => ({ ...s, position: idx }));
  if (next.length === list.length) return false;
  memShortcuts.set(userId, next);
  return true;
}

export function reorderShortcuts(
  userId: string | null,
  orderedIds: string[],
): { ok: true; shortcuts: UserShortcut[] } | { ok: false; error: string } {
  if (!userId) return { ok: false, error: 'Sign in required.' };
  const list = memShortcuts.get(userId) ?? [];
  const byId = new Map(list.map((s) => [s.id, s]));
  const reordered: UserShortcut[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      seen.add(id);
      reordered.push({ ...item, position: reordered.length });
    }
  }
  for (const item of list) {
    if (!seen.has(item.id)) {
      reordered.push({ ...item, position: reordered.length });
    }
  }
  memShortcuts.set(userId, reordered);
  return { ok: true, shortcuts: reordered };
}

export function resetShortcutsForTests(): void {
  memShortcuts.clear();
}

type PgShortcutRow = {
  id: string;
  user_id: string;
  label: string;
  target: string;
  icon: string | null;
  position: number;
  created_ms: string | number;
};

function rowToShortcut(r: PgShortcutRow): UserShortcut {
  const meta = SHORTCUT_ALLOWLIST.find((a) => a.target === r.target);
  return {
    id: r.id,
    userId: r.user_id,
    label: r.label,
    target: r.target,
    icon: r.icon || meta?.icon || '🔖',
    position: Number(r.position),
    createdAt: Number(r.created_ms),
  };
}

export async function listShortcutsDb(userId: string | null): Promise<UserShortcut[]> {
  if (!userId) return [];
  if (!usePg()) return listShortcuts(userId);
  await ensureShortcutsTable();
  const r = await queryAsUser<PgShortcutRow>(
    userId,
    `SELECT id, user_id, label, target, icon, position, (extract(epoch from created_at)*1000)::bigint AS created_ms
     FROM user_shortcuts
     WHERE user_id = $1
     ORDER BY position ASC, created_at ASC`,
    [userId],
  );
  return r.rows.map(rowToShortcut);
}

export async function addShortcutDb(
  userId: string | null,
  input: { label?: unknown; target?: unknown },
): Promise<{ ok: true; shortcut: UserShortcut } | { ok: false; error: string }> {
  if (!userId) return { ok: false, error: 'Sign in required.' };
  if (!usePg()) return addShortcut(userId, input);

  const valid = validateShortcutInput(input);
  if (!valid.ok) return valid;

  const existing = await listShortcutsDb(userId);
  if (existing.length >= MAX_SHORTCUTS) {
    return { ok: false, error: `Maximum ${MAX_SHORTCUTS} shortcuts allowed.` };
  }
  if (existing.some((s) => s.target === valid.target)) {
    return { ok: false, error: 'This tool is already in your shortcuts bar.' };
  }

  const r = await queryAsUser<PgShortcutRow>(
    userId,
    `INSERT INTO user_shortcuts (user_id, label, target, icon, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, label, target, icon, position, (extract(epoch from created_at)*1000)::bigint AS created_ms`,
    [userId, valid.label, valid.target, valid.icon, existing.length],
  );
  return { ok: true, shortcut: rowToShortcut(r.rows[0]) };
}

export async function updateShortcutDb(
  userId: string | null,
  id: string,
  labelRaw: unknown,
): Promise<{ ok: true; shortcut: UserShortcut } | { ok: false; error: string }> {
  if (!userId) return { ok: false, error: 'Sign in required.' };
  if (!usePg()) return updateShortcut(userId, id, labelRaw);
  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid shortcut ID.' };

  const labelRes = normalizeShortcutLabel(labelRaw);
  if (!labelRes.ok) return labelRes;

  await ensureShortcutsTable();
  const r = await queryAsUser<PgShortcutRow>(
    userId,
    `UPDATE user_shortcuts
     SET label = $3
     WHERE id = $1 AND user_id = $2
     RETURNING id, user_id, label, target, icon, position, (extract(epoch from created_at)*1000)::bigint AS created_ms`,
    [id, userId, labelRes.label],
  );
  if (!r.rows[0]) return { ok: false, error: 'Shortcut not found.' };
  return { ok: true, shortcut: rowToShortcut(r.rows[0]) };
}

export async function deleteShortcutDb(userId: string | null, id: string): Promise<boolean> {
  if (!userId) return false;
  if (!usePg()) return deleteShortcut(userId, id);
  if (!UUID_RE.test(id)) return false;

  await ensureShortcutsTable();
  const r = await queryAsUser(
    userId,
    `DELETE FROM user_shortcuts WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return (r.rowCount ?? 0) > 0;
}

export async function reorderShortcutsDb(
  userId: string | null,
  orderedIds: string[],
): Promise<{ ok: true; shortcuts: UserShortcut[] } | { ok: false; error: string }> {
  if (!userId) return { ok: false, error: 'Sign in required.' };
  if (!usePg()) return reorderShortcuts(userId, orderedIds);

  const existing = await listShortcutsDb(userId);
  const byId = new Map(existing.map((s) => [s.id, s]));
  const finalOrder: UserShortcut[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const item = byId.get(id);
    if (item && !seen.has(id)) {
      seen.add(id);
      finalOrder.push(item);
    }
  }
  for (const item of existing) {
    if (!seen.has(item.id)) finalOrder.push(item);
  }

  for (let i = 0; i < finalOrder.length; i++) {
    await queryAsUser(
      userId,
      `UPDATE user_shortcuts SET position = $3 WHERE id = $1 AND user_id = $2`,
      [finalOrder[i].id, userId, i],
    );
    finalOrder[i] = { ...finalOrder[i], position: i };
  }

  return { ok: true, shortcuts: finalOrder };
}
