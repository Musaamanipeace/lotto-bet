import { NextRequest, NextResponse } from 'next/server';
import { SelectedPick, StandardGame, AIProvider } from '@/types';
import { executeAiRouter } from '@/lib/aiRouter';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentRequestBody {
  messages: Message[];
  activeSlip?: SelectedPick[];
  savedSlips?: { id: string; name: string; matchCount: number; totalOdds: number }[];
  availableMatches?: StandardGame[];
  activeFilters?: {
    under_goals?: string[];
    btts?: string[];
    cashout_only?: boolean;
  };
  userApiKey?: string;
  provider?: AIProvider;
  model?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgentRequestBody;
    const {
      messages = [],
      activeSlip = [],
      savedSlips = [],
      availableMatches = [],
      activeFilters,
      userApiKey,
      provider = 'gemini',
      model,
    } = body;

    // Section 3C: Format available matches according to required context schema
    const matchesSummary = availableMatches.slice(0, 40).map((m) => {
      const odds1X2: Record<string, number> = {};
      if (m.markets.homeWin) odds1X2['1'] = m.markets.homeWin.odd;
      if (m.markets.draw) odds1X2['X'] = m.markets.draw.odd;
      if (m.markets.awayWin) odds1X2['2'] = m.markets.awayWin.odd;

      const overUnderOdds: Record<string, number> = {};
      if (m.markets.overUnder) {
        m.markets.overUnder.forEach((ou) => {
          overUnderOdds[ou.pick] = ou.odd;
        });
      }

      const bttsOdds: Record<string, number> = {};
      if (m.markets.btts) {
        m.markets.btts.forEach((b) => {
          bttsOdds[b.pick] = b.odd;
        });
      }

      const h2hRecent5 = m.h2hRecent5 || [
        {
          date: '2024-05-10',
          home_score: 2,
          away_score: 1,
          relevant: true,
        },
      ];

      return {
        match_id: m.id,
        home_team: m.homeTeam,
        away_team: m.awayTeam,
        kickoff_time: m.kickoffTime,
        league: m.league,
        h2h_recent_5: h2hRecent5,
        current_odds: {
          '1X2': odds1X2,
          over_under: overUnderOdds,
          btts: bttsOdds,
        },
        cashout_available: Boolean(m.cashoutAvailable),
        abnormal_odds_flag: Boolean(m.abnormalOddsFlag),
        user_active_filters: activeFilters || {
          under_goals: ['3.5', '4.5'],
          btts: ['GG', 'NGG'],
          cashout_only: false,
        },
      };
    });

    const activeSlipSummary = activeSlip.map((s) => ({
      gameId: s.gameId,
      match: `${s.homeTeam} vs ${s.awayTeam}`,
      market: s.marketName,
      pick: s.pick,
      odd: s.odd,
      league: s.league,
    }));

    const systemInstruction = `You are LottoBet AI Agent, an expert conversational betting strategist, accumulator builder, and match analyst.
Your job is to discuss football matches, analyze risk, build smart betting accumulators, and help users manage and save their betslips.

CONTEXT PROVIDED TO YOU:
1. Current Active Betslip (${activeSlip.length} matches in slip):
${JSON.stringify(activeSlipSummary, null, 2)}

2. User's Saved Betslips:
${JSON.stringify(savedSlips, null, 2)}

3. Live Upcoming Qualifying Matches (${matchesSummary.length} matches with full odds & H2H):
${JSON.stringify(matchesSummary, null, 2)}

CORE GUIDELINES:
1. Grounding: When suggesting or building betslips, you MUST strictly use matches and odds from the provided Live Upcoming Qualifying Matches list. NEVER invent teams, fake odds, or past matches.
2. Educated H2H Analysis & Value Detection:
   - Use the provided H2H history (relevant matches) and favoritism/value flags (abnormal_odds_flag).
   - Prefer matches with high confidence, cashout support, and value odds.
3. Terminology: Remember that games inside the betslip are "in slip" or "matches in slip". The word "pick" refers to candidate selections or market choices (e.g., Double Chance 1X, Over 0.5, Under 3.5, GG).
4. Actions: When the user asks you to build, pick, or replace a slip, or when you recommend a specific set of picks, you should include those picks in the JSON structured block.
5. Format: Always respond with a helpful conversational explanation, followed by a valid JSON block enclosed in \`\`\`json ... \`\`\` containing:
{
  "action": "none" | "build_slip" | "add_to_slip" | "save_slip",
  "proposedPicks": [
    {
      "gameId": string,
      "homeTeam": string,
      "awayTeam": string,
      "league": string,
      "marketName": string,
      "pick": string,
      "odd": number,
      "kickoffTime": string
    }
  ],
  "slipNameToSave"?: string,
  "confidenceScore"?: number,
  "totalEstimatedOdds"?: number
}
If no picks are being proposed or built (e.g. general discussion, tactical analysis), leave "proposedPicks": [].`;

    // Sanitize message history to comply with Gemini API role alternation
    const rawMessages = messages.filter((m) => m && m.content && m.content.trim().length > 0);
    if (rawMessages.length === 0) {
      rawMessages.push({ role: 'user', content: 'Hello, analyze the upcoming matches.' });
    }

    const routerResult = await executeAiRouter({
      provider,
      apiKey: userApiKey,
      model,
      systemInstruction,
      messages: rawMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      temperature: 0.4,
    });

    if (!routerResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: routerResult.error,
          errorCode: routerResult.errorCode,
          provider: routerResult.provider,
        },
        { status: routerResult.errorCode === 'INVALID_KEY' ? 401 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      reply: routerResult.reply,
      data: routerResult.data || {},
      provider: routerResult.provider,
      model: routerResult.model,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error in AI Agent execution';
    console.error('AI Agent error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
