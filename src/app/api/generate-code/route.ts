import { NextResponse } from 'next/server';
import { BookieId, SelectedPick } from '@/types';
import { convertSelectionsToBookingCode } from '@/lib/codeConverter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const destinationBookie: BookieId = body.destination_bookie || body.destinationBookie || 'sportybet:ke';
    const selections: SelectedPick[] = body.selections || [];

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide at least 1 match selection to generate a bet booking code.',
        },
        { status: 400 }
      );
    }

    if (destinationBookie !== 'sportybet:ke' && destinationBookie !== 'betpawa:ke') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid destination bookie. Supported options: sportybet:ke, betpawa:ke.',
        },
        { status: 400 }
      );
    }

    const response = await convertSelectionsToBookingCode(destinationBookie, selections);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to generate booking code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate booking code due to an internal server error.',
      },
      { status: 500 }
    );
  }
}
