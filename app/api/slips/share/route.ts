import { currentUser, requireJson, jsonError } from '@/lib/session.ts';
import { shareSlipDb, unshareSlipDb } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to share slips', 401);
  let body: { id?: string; note?: string; unshare?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.id) return jsonError('id is required', 400);
  if (body.unshare) {
    await unshareSlipDb(user.id, body.id);
    return Response.json({ ok: true, shared: false });
  }
  const slip = await shareSlipDb(user.id, body.id, body.note);
  if (!slip) return jsonError('Slip not found', 404);
  return Response.json({ ok: true, slip });
}
