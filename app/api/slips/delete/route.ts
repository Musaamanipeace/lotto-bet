import { currentUser, requireJson, jsonError } from '@/lib/session.ts';
import { deleteSavedSlipDb } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to delete slips', 401);
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.id) return jsonError('id is required', 400);
  const ok = await deleteSavedSlipDb(user.id, body.id);
  if (!ok) return jsonError('Slip not found', 404);
  return Response.json({ ok: true });
}
