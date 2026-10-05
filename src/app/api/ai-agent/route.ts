import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { SelectedPick, StandardGame } from '@/types';

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
  userApiKey?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgentRequestBody;
    const { messages = [], activeSlip = [], savedSlips = [], availableMatches = [], userApiKey } = body;

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'No Gemini API key available. Please configure GEMINI_API_KEY in the server environment.',
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format available matches compactly for prompt context
    const matchesSummary = availableMatches.slice(0, 50).map((m) => {
      const picks: { market: string; pick: string; odd: number }[] = [];
      if (m.markets.doubleChance) {
        m.markets.doubleChance.forEach((dc) => picks.push({ market: 'Double Chance', pick: dc.pick, odd: dc.odd }));
      }
      if (m.markets.homeWin) {
        picks.push({ market: 'Home Win', pick: '1', odd: m.markets.homeWin.odd });
      }
      if (m.markets.awayWin) {
        picks.push({ market: 'Away Win', pick: '2', odd: m.markets.awayWin.odd });
      }
      if (m.markets.overUnder) {
        m.markets.overUnder.forEach((ou) => picks.push({ market: 'Over/Under', pick: ou.pick, odd: ou.odd }));
      }
      if (m.markets.btts) {
        m.markets.btts.forEach((b) => picks.push({ market: 'BTTS', pick: b.pick, odd: b.odd }));
      }
      return {
        gameId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league: m.league,
        kickoffTime: m.kickoffTime,
        availablePicks: picks,
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

    const systemInstruction = `You are LottoBet AI Agent, an expert conversational betting strategist and accumulator builder.
Your job is to discuss football matches, analyze risk, build smart betting accumulators, and help users manage and save their betslips.

CONTEXT PROVIDED TO YOU:
1. Current Active Betslip (${activeSlip.length} matches in slip):
${JSON.stringify(activeSlipSummary, null, 2)}

2. User's Saved Betslips:
${JSON.stringify(savedSlips, null, 2)}

3. Live Upcoming Qualifying Matches (${matchesSummary.length} matches currently available with odds):
${JSON.stringify(matchesSummary, null, 2)}

CORE GUIDELINES:
1. Grounding: When suggesting or building betslips, you MUST strictly use matches and odds from the provided Live Upcoming Qualifying Matches list. NEVER invent teams, fake odds, or past matches.
2. Terminology: Remember that games inside the betslip are "in slip" or "matches in slip". The word "pick" refers to candidate selections or market choices (e.g., Double Chance 1X, Over 0.5).
3. Actions: When the user asks you to build, pick, or replace a slip, or when you recommend a specific set of picks, you should include those picks in the JSON structured block.
4. Saving: When the user asks you to save a slip (e.g. "save this as Weekend Bankers"), acknowledge it and output action "save_slip" with the suggested slip name.
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
  "confidenceScore"?: number, // 1 to 10
  "totalEstimatedOdds"?: number
}
If no picks are being proposed or built (e.g. general discussion, tactical analysis), leave "proposedPicks": [].`;

    // Construct history
    const contents = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    const replyText = response.text || '';

    // Extract JSON block if present
    let structuredData: {
      action?: string;
      proposedPicks?: SelectedPick[];
      slipNameToSave?: string;
      confidenceScore?: number;
      totalEstimatedOdds?: number;
    } = {};

    const jsonMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        structuredData = JSON.parse(jsonMatch[1]);
      } catch {
        // Fallback gracefully
      }
    }

    // Clean display text without the raw json block
    const cleanReply = replyText.replace(/```json[\s\S]*?```/, '').trim();

    return NextResponse.json({
      success: true,
      reply: cleanReply || replyText,
      data: structuredData,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error in AI Agent execution';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
