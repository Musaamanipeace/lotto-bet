import { candidateRows, deriveFilterOptions, type Filter } from '@/lib/filters.ts';
import { PgStore } from '@/lib/pg-store.ts';
import { readGames } from '@/lib/read-games.ts';
import type { Bookmaker, MarketKind } from '@/lib/types.ts';

export const dynamic = 'force-dynamic';

const num = (v: string | null) => (v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const b = q.get('bookmaker');
  if (b !== null && b !== 'sportybet' && b !== 'betpawa') {
    return Response.json({ ok: false, error: `Unknown bookmaker "${b}"`, details: {} }, { status: 400 });
  }
  try {
    const r = await readGames(new PgStore(), (b as Bookmaker | null) ?? undefined);
    if (!r.ok) return Response.json(r, { status: r.details.httpStatus ?? 502 });
    const kind = q.get('market') as MarketKind | null;
    const filter: Filter = {
      leagues: q.get('leagues')?.split(',').filter(Boolean),
      dateFrom: num(q.get('dateFrom')), dateTo: num(q.get('dateTo')),
      oddsMin: num(q.get('oddsMin')), oddsMax: num(q.get('oddsMax')),
      market: kind ? { kind, line: num(q.get('line')) } : undefined,
    };
    const rows = candidateRows(r.games, filter);
    return Response.json({ ok: true, runId: r.runId, dataAsOf: new Date(r.dataAsOf).toISOString(), count: rows.length, options: deriveFilterOptions(r.games), errors: r.errors, rows });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e), details: {} }, { status: 500 });
  }
}
