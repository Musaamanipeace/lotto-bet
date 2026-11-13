import { currentUser, jsonError, requireJson } from '@/lib/session.ts';
import {
  SHORTCUT_ALLOWLIST,
  addShortcutDb,
  deleteShortcutDb,
  listShortcutsDb,
  reorderShortcutsDb,
  updateShortcutDb,
} from '@/lib/shortcuts.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to manage shortcuts.', 401);

  try {
    const shortcuts = await listShortcutsDb(user.id);
    return Response.json({ ok: true, shortcuts, allowlist: SHORTCUT_ALLOWLIST });
  } catch (e) {
    return jsonError(`Failed to load shortcuts: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to add shortcuts.', 401);

  let body: { label?: unknown; target?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const res = await addShortcutDb(user.id, body);
  if (!res.ok) return jsonError(res.error, 400);
  const shortcuts = await listShortcutsDb(user.id);
  return Response.json({ ok: true, shortcut: res.shortcut, shortcuts });
}

export async function PATCH(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to update shortcuts.', 401);

  let body: { id?: string; label?: unknown; orderedIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (Array.isArray(body.orderedIds)) {
    const ids = body.orderedIds.filter((x): x is string => typeof x === 'string');
    const res = await reorderShortcutsDb(user.id, ids);
    if (!res.ok) return jsonError(res.error, 400);
    return Response.json({ ok: true, shortcuts: res.shortcuts });
  }

  if (typeof body.id === 'string' && body.id) {
    const res = await updateShortcutDb(user.id, body.id, body.label);
    if (!res.ok) return jsonError(res.error, 400);
    const shortcuts = await listShortcutsDb(user.id);
    return Response.json({ ok: true, shortcut: res.shortcut, shortcuts });
  }

  return jsonError('Provide either orderedIds or id + label.', 400);
}

export async function DELETE(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to delete shortcuts.', 401);

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body?.id) return jsonError('id is required', 400);
  const ok = await deleteShortcutDb(user.id, body.id);
  if (!ok) return jsonError('Shortcut not found', 404);
  const shortcuts = await listShortcutsDb(user.id);
  return Response.json({ ok: true, shortcuts });
}
