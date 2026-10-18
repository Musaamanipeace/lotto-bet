import { listCommunitySlips } from '@/lib/saved-slips.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const slips = listCommunitySlips(limit);
  return Response.json({
    ok: true,
    slips,
    message:
      slips.length === 0
        ? 'No shared slips yet. Save a slip and share it from Saved Slips.'
        : null,
  });
}
