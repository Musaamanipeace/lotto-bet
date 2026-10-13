import { NextResponse } from 'next/server';
import { executeAiRouter } from '@/lib/aiRouter';
import { AIProvider } from '@/types';

export const dynamic = 'force-dynamic';

interface AnalyzeBody {
  prompt?: string;
  provider?: AIProvider | 'openai' | 'compatible';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  context?: {
    currentSelections?: unknown[];
    savedSlips?: unknown[];
    availableGamesSample?: unknown[];
  };
}

/**
 * AI analysis endpoint utilizing multi-provider BYOK routing (Gemini, OpenRouter, Mistral)
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    const prompt = (body.prompt || '').trim();
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is empty.' }, { status: 400 });
    }

    // Map provider to one of the 3 supported BYOK providers
    let mappedProvider: AIProvider = 'gemini';
    if (body.provider === 'openrouter') mappedProvider = 'openrouter';
    else if (body.provider === 'mistral') mappedProvider = 'mistral';
    else if (body.provider === 'gemini') mappedProvider = 'gemini';
    else if (body.provider === 'openai') mappedProvider = 'openrouter'; // openrouter routes openai models seamlessly

    const systemInstruction = `You are a football betting assistant for Kenyan and African accumulators (SportyBet, BetPawa, 1xBet, Mozzart, SportPesa).
You receive the user's current slip, optional saved historical slips (with won/lost/open status), and a sample of available fixtures.
Give practical analysis: identify weak or risky legs, suggest better alternative markets with statistical rationale, and outline risk notes.
Be concise and disciplined. Never invent fake matches or impossible odds.
Do not encourage reckless gambling; emphasize bankroll discipline when relevant.`;

    const userContent = `${prompt}\n\n--- CONTEXT JSON ---\n${JSON.stringify(body.context || {}, null, 2)}`;

    const routerResult = await executeAiRouter({
      provider: mappedProvider,
      apiKey: body.apiKey,
      model: body.model,
      systemInstruction,
      messages: [{ role: 'user', content: userContent }],
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
      analysis: routerResult.reply,
      provider: routerResult.provider,
      model: routerResult.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
