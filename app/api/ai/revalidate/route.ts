import { ensureAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';
import { readGames } from '@/lib/read-games.ts';
import { revalidatePicks } from '@/lib/revalidate.ts';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/revalidate { pickIds }
 * Re-checks picks against the latest odds before they go on a betslip. Reports price changes,
 * suspended outcomes and dropped markets; never updates silently.
 */
export async function POST(req: Request) {
  let b: { pickIds?: unknown };
  try { b = (await req.json()) as { pickIds?: unknown }; } catch { return Response.json({ ok: false, error: 'Body must be JSON' }, { status: 400 }); }
  const ids = Array.isArray(b.pickIds) ? b.pickIds.filter((x): x is string => typeof x === 'string').slice(0, 500) : [];
  if (ids.length === 0) return Response.json({ ok: false, error: 'pickIds is required' }, { status: 400 });

  const snap = await ensureAiSnapshot(getStore());
  if (!snap.ok) return Response.json(snap, { status: 400 });
  const games = await readGames(getStore());
  if (!games.ok) return Response.json(games, { status: 400 });

  const byId = new Map(snap.picks.map((p) => [p.id, p]));
  const found = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
  const missing = ids.filter((id) => !byId.has(id));
  const results = revalidatePicks(found, games.games);

  return Response.json({
    ok: true,
    dataAsOf: games.dataAsOf,
    results: results.map((p) => ({ id: p.id, flag: p.revalidate, odds: p.odds, pick: p })),
    missing,
  });
}
