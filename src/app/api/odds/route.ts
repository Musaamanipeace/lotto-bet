import { NextResponse } from 'next/server';
import { fetchLiveOdds } from '@/lib/oddsFetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchLiveOdds();
    return NextResponse.json({
      success: true,
      count: result.games.length,
      source: result.source,
      timestamp: new Date().toISOString(),
      games: result.games,
    });
  } catch (error) {
    console.error('Failed to fetch odds:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to retrieve match odds at this time.',
      },
      { status: 500 }
    );
  }
}
