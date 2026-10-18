import { currentUser, requireJson, jsonError } from '@/lib/session.ts';
import { deleteSavedSlip } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  const user = await currentUser(req);
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.id) return jsonError('id is required', 400);
  const ok = deleteSavedSlip(user?.id ?? null, body.id);
  if (!ok) return jsonError('Slip not found', 404);
  return Response.json({ ok: true });
}
