import { currentUser, requireJson, jsonError } from '@/lib/session.ts';
import { saveSlip } from '@/lib/saved-slips.ts';
import type { Bookmaker } from '@/lib/types.ts';
import type { PickRow } from '@/lib/filters.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;
  const user = await currentUser(req);
  let body: {
    name?: string;
    bookmaker?: Bookmaker;
    legs?: PickRow[];
    totalOdds?: number;
    combinedImplied?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.bookmaker || !Array.isArray(body.legs) || body.legs.length === 0) {
    return jsonError('bookmaker and non-empty legs are required', 400);
  }
  if (typeof body.totalOdds !== 'number' || body.totalOdds <= 1) {
    return jsonError('totalOdds must be a number greater than 1', 400);
  }
  const slip = saveSlip({
    userId: user?.id ?? null,
    name: body.name ?? '',
    bookmaker: body.bookmaker,
    legs: body.legs,
    totalOdds: body.totalOdds,
    combinedImplied: body.combinedImplied ?? null,
  });
  return Response.json({ ok: true, slip });
}
