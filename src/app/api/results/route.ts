import { NextRequest, NextResponse } from 'next/server';
import { fetchResultsForDate } from '@/lib/resultsFetcher';
import { resolveSportsKeys } from '@/lib/serverConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const clientTheSportsDbKey = searchParams.get('clientTheSportsDbKey') || undefined;
    const clientApiFootballKey = searchParams.get('clientApiFootballKey') || undefined;

    const { theSportsDbKey, apiFootballKey } = resolveSportsKeys(
      clientTheSportsDbKey,
      clientApiFootballKey
    );

    const data = await fetchResultsForDate(date, { theSportsDbKey, apiFootballKey });

    return NextResponse.json({
      ...data,
      keys: {
        theSportsDbConfigured: Boolean(theSportsDbKey),
        apiFootballConfigured: Boolean(apiFootballKey),
      },
    });
  } catch (error) {
    console.error('Failed to fetch match results:', error);
    const msg = error instanceof Error ? error.message : 'Unable to retrieve match results from credible sources at this time.';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
