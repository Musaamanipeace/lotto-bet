import { currentUser } from '@/lib/session.ts';
import { listSavedSlips } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await currentUser(req);
  const slips = listSavedSlips(user?.id ?? null);
  return Response.json({ ok: true, slips, userId: user?.id ?? null });
}
