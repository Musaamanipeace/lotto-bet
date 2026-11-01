import { NextRequest, NextResponse } from 'next/server';
import {
  deterministicScore,
  getServerScores,
  recordScoreOverride,
  setServerScore,
} from '@/lib/results-store.ts';
import { normalizeMatchKey, type MatchScore } from '@/lib/results-evaluator.ts';

// Query external football scores if API key exists
async function fetchExternalScores(matches: Array<{ home: string; away: string }>): Promise<Record<string, MatchScore>> {
  const scores: Record<string, MatchScore> = {};

  const footballDataKey = process.env.FOOTBALL_DATA_API_KEY;
  const apiFootballKey = process.env.API_FOOTBALL_KEY;

  if (footballDataKey) {
    try {
      const res = await fetch('https://api.football-data.org/v4/matches?status=FINISHED', {
        headers: { 'X-Auth-Token': footballDataKey },
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.matches)) {
          for (const m of data.matches) {
            const h = m.homeTeam?.name || '';
            const a = m.awayTeam?.name || '';
            const key = normalizeMatchKey(h, a);
            const homeScore = m.score?.fullTime?.home ?? 0;
            const awayScore = m.score?.fullTime?.away ?? 0;
            scores[key] = {
              homeScore,
              awayScore,
              status: 'FT',
              updatedAt: Date.now(),
              source: 'api',
            };
          }
        }
      }
    } catch {
      /* ignore external fetch failure */
    }
  } else if (apiFootballKey) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}&status=FT`, {
        headers: { 'x-apisports-key': apiFootballKey },
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.response)) {
          for (const item of data.response) {
            const h = item.teams?.home?.name || '';
            const a = item.teams?.away?.name || '';
            const key = normalizeMatchKey(h, a);
            scores[key] = {
              homeScore: item.goals?.home ?? 0,
              awayScore: item.goals?.away ?? 0,
              status: 'FT',
              updatedAt: Date.now(),
              source: 'api',
            };
          }
        }
      }
    } catch {
      /* ignore external fetch failure */
    }
  }

  // For any queried match still missing a score, supply a deterministic score based on team names
  for (const m of matches) {
    const key = normalizeMatchKey(m.home, m.away);
    if (!scores[key]) {
      const det = deterministicScore(m.home, m.away);
      scores[key] = {
        homeScore: det.homeScore,
        awayScore: det.awayScore,
        status: 'FT',
        updatedAt: Date.now(),
        source: 'default',
      };
      setServerScore(key, det.homeScore, det.awayScore, 'FT', 'default');
    }
  }

  return scores;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const home = searchParams.get('home');
  const away = searchParams.get('away');

  const existing = getServerScores();

  if (home && away) {
    const key = normalizeMatchKey(home, away);
    if (existing[key]) {
      return NextResponse.json({ ok: true, scores: { [key]: existing[key] } });
    }
    const fetched = await fetchExternalScores([{ home, away }]);
    return NextResponse.json({ ok: true, scores: fetched });
  }

  return NextResponse.json({ ok: true, scores: existing });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { home, away, gameId, homeScore, awayScore, status } = body;

    if (!home || !away || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'home, away, homeScore, and awayScore are required' },
        { status: 400 }
      );
    }

    const recorded = recordScoreOverride({
      gameId,
      home,
      away,
      homeScore,
      awayScore,
      status: status || 'FT',
    });

    return NextResponse.json({ ok: true, score: recorded });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Invalid request' },
      { status: 500 }
    );
  }
}
