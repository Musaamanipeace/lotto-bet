import { NextResponse } from 'next/server';
import { fetchLiveOdds } from '@/lib/oddsFetcher';
import { enrichGamesWithStats } from '@/lib/statsEnricher';
import { resolveAiKey } from '@/lib/serverConfig';

export const dynamic = 'force-dynamic';

interface OddsQuery {
  timeframeHours?: string;
  clientGeminiKey?: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframeHours = searchParams.get('timeframeHours') || undefined;
    const clientGeminiKey = searchParams.get('clientGeminiKey') || undefined;

    // Resolve AI key for enrichment: client key first, then server env, then none
    const serverAiKey = resolveAiKey('gemini', clientGeminiKey);

    const result = await fetchLiveOdds();

    // Enrich matches with H2H encounters and stats analysis
    await enrichGamesWithStats(result.games, { maxGames: 30, concurrency: 5 }).catch((err) => {
      console.warn('Non-fatal stats enrichment warning:', err);
    });

    return NextResponse.json({
      success: true,
      count: result.games.length,
      source: result.source,
      timestamp: new Date().toISOString(),
      aiKeyConfigured: Boolean(serverAiKey),
      games: result.games,
      bookieStatus: {
        ...(result._meta?.sportybetError ? { 'sportybet:ke': { ok: false, code: result._meta.sportybetError.code, detail: result._meta.sportybetError.detail } } : {}),
        ...(result._meta?.betpawaError ? { 'betpawa:ke': { ok: false, code: result._meta.betpawaError.code, detail: result._meta.betpawaError.detail } } : {}),
      },
    });
  } catch (error) {
    console.error('Failed to fetch odds:', error);
    const msg = error instanceof Error ? error.message : 'Unable to retrieve match odds at this time.';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
