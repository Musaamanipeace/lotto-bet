import { NextRequest, NextResponse } from 'next/server';
import { fetchResultsForDate } from '@/lib/resultsFetcher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;

    const data = await fetchResultsForDate(date);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch match results:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to retrieve match results from credible sources at this time.',
      },
      { status: 500 }
    );
  }
}
