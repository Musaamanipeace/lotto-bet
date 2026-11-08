import { fail, ok, type Result } from './result.ts';
import { queryAsUser } from './pg-store.ts';
import {
  MAX_SHORTCUTS,
  SHORTCUT_ALLOWLIST,
  MemoryShortcutStore,
  isValidShortcutTarget,
  validateShortcutLabel,
  type ShortcutStore,
  type UserShortcut,
} from './shortcuts.ts';

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
