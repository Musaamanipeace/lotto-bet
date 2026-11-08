import { currentUser, jsonError, requireJson } from '@/lib/session.ts';
import { getShortcutStore } from '@/lib/shortcuts.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await currentUser(req);
    if (!user) return Response.json({ ok: true, shortcuts: [] });
    const shortcuts = await getShortcutStore().list(user.id);
    return Response.json({ ok: true, shortcuts });
  } catch (e) {
    return jsonError(`Failed to fetch shortcuts: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  try {
    const user = await currentUser(req);
    if (!user) return jsonError('Sign in to manage shortcuts', 401);
    const body = await req.json();
    const res = await getShortcutStore().add(user.id, {
      target: body?.target,
      label: body?.label,
      icon: body?.icon,
    });
    if (!res.ok) return jsonError(res.error, 400);
    return Response.json({ ok: true, shortcut: res.shortcut });
  } catch (e) {
    return jsonError(`Failed to create shortcut: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

export async function PATCH(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  try {
    const user = await currentUser(req);
    if (!user) return jsonError('Sign in to manage shortcuts', 401);
    const body = await req.json();

    if (Array.isArray(body?.orderedIds)) {
      const res = await getShortcutStore().reorder(user.id, body.orderedIds);
      if (!res.ok) return jsonError(res.error, 400);
      return Response.json({ ok: true, shortcuts: res.shortcuts });
    }

    if (typeof body?.id === 'string' && body?.label !== undefined) {
      const res = await getShortcutStore().rename(user.id, body.id, body.label);
      if (!res.ok) return jsonError(res.error, 400);
      return Response.json({ ok: true, shortcut: res.shortcut });
    }

    return jsonError('Provide either { id, label } to rename or { orderedIds } to reorder', 400);
  } catch (e) {
    return jsonError(`Failed to update shortcut: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}

export async function DELETE(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  try {
    const user = await currentUser(req);
    if (!user) return jsonError('Sign in to manage shortcuts', 401);
    const body = await req.json();
    if (typeof body?.id !== 'string') return jsonError('Shortcut id is required', 400);
    const res = await getShortcutStore().remove(user.id, body.id);
    if (!res.ok) return jsonError(res.error, 404);
    return Response.json({ ok: true, deletedId: res.deletedId });
  } catch (e) {
    return jsonError(`Failed to delete shortcut: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
