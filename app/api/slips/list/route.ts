import { currentUser, jsonError } from '@/lib/session.ts';
import { listSavedSlipsDb } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to view saved slips', 401);
  const slips = await listSavedSlipsDb(user.id);
  return Response.json({ ok: true, slips, userId: user.id });
}
