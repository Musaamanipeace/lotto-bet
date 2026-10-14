import { NextResponse } from 'next/server';
import { BookieId, SelectedPick } from '@/types';
import { convertSelectionsToBookingCode } from '@/lib/codeConverter';
import { BOOKIE_CONFIGS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const SUPPORTED_BOOKIES = Object.keys(BOOKIE_CONFIGS) as BookieId[];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const destinationBookie: BookieId =
      body.destination_bookie || body.destinationBookie || 'sportybet:ke';
    const selections: SelectedPick[] = body.selections || [];

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide at least 1 match selection to generate a booking code.',
        },
        { status: 400 }
      );
    }

    if (!SUPPORTED_BOOKIES.includes(destinationBookie)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported destination bookie "${destinationBookie}". Known options: ${SUPPORTED_BOOKIES.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    // All configured bookies are attempted via convertSelectionsToBookingCode.
    // Only SportyBet has a working public share endpoint today; the others return
    // structured technical-obstacle errors (auth / WAF / ID-space mismatch).
    // No mock success paths and no hardcoded fake codes.
    const response = await convertSelectionsToBookingCode(destinationBookie, selections);
    if (!response.success) {
      return NextResponse.json(response, { status: 422 });
    }
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

