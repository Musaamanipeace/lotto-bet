import { currentUser, jsonError } from '@/lib/session.ts';
import { listCommunitySlipsDb } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return jsonError('Sign in to view community slips', 401);
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const slips = await listCommunitySlipsDb(user.id, limit);
  return Response.json({
    ok: true,
    slips,
    message:
      slips.length === 0
        ? 'No shared slips yet. Save a slip and share it from Saved Slips.'
        : null,
  });
}
