import { getStore } from '@/lib/server.ts';
import type { Bookmaker } from '@/lib/types.ts';
import { LEAGUE_PRIORITY } from '@/lib/criteria.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookmaker = (url.searchParams.get('bookmaker') as Bookmaker | null) || null;
  const run = await getStore().latestRun();
  if (!run) {
    return Response.json({
      ok: true,
      leagues: [],
      message: 'No games loaded yet. Open the home page or refresh first.',
    });
  }

  const bookmakers: Bookmaker[] = bookmaker ? [bookmaker] : ['sportybet', 'betpawa'];
  const counts = new Map<string, { name: string; count: number; nextKickoff: number | null; bookmakers: Set<string> }>();

  for (const b of bookmakers) {
    const games = await getStore().gamesForRun(run.id, b);
    for (const g of games) {
      const name = g.league?.trim() || 'Unknown league';
      const cur = counts.get(name) ?? { name, count: 0, nextKickoff: null, bookmakers: new Set() };
      cur.count += 1;
      cur.bookmakers.add(b);
      if (cur.nextKickoff === null || g.kickoff < cur.nextKickoff) cur.nextKickoff = g.kickoff;
      counts.set(name, cur);
    }
  }

  const priorityIndex = (name: string) => {
    const lower = name.toLowerCase();
    for (let i = 0; i < LEAGUE_PRIORITY.length; i++) {
      if (LEAGUE_PRIORITY[i].some((l) => lower.includes(l.toLowerCase()))) return i;
    }
    return LEAGUE_PRIORITY.length;
  };

  const leagues = [...counts.values()]
    .map((l) => ({
      name: l.name,
      gameCount: l.count,
      nextKickoff: l.nextKickoff,
      bookmakers: [...l.bookmakers],
      priorityGroup: priorityIndex(l.name),
    }))
    .sort((a, b) => a.priorityGroup - b.priorityGroup || b.gameCount - a.gameCount || a.name.localeCompare(b.name));

  return Response.json({
    ok: true,
    runId: run.id,
    totalGames: leagues.reduce((s, l) => s + l.gameCount, 0),
    leagues,
  });
}
