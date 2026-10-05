import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AnalyzeBody {
  prompt?: string;
  provider?: 'openai' | 'gemini' | 'compatible';
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
 * Proxies to the user's own LLM API key. No server-side key required.
 * Supports OpenAI-compatible chat completions and Gemini generateContent.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    const apiKey = (body.apiKey || '').trim();
    const prompt = (body.prompt || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provide your own LLM API key in account settings.' },
        { status: 400 }
      );
    }
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is empty.' }, { status: 400 });
    }

    const system = `You are a football betting assistant for SportyBet Kenya accumulators.
You receive the user's current slip, optional saved historical slips (with won/lost/open status), and a sample of available fixtures.
Give practical analysis: weak legs, better replacements if data supports it, risk notes.
Be concise. If suggesting replacements, list them clearly with reason.
Never invent live odds — only use data provided in the context JSON.
Do not encourage reckless gambling; mention bankroll discipline briefly when relevant.`;

    const userContent = `${prompt}\n\n--- CONTEXT JSON ---\n${JSON.stringify(body.context || {}, null, 2)}`;

    const provider = body.provider || 'openai';
    const model = body.model || (provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini');

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${system}\n\n${userContent}` }] }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return NextResponse.json(
          {
            success: false,
            error: data?.error?.message || `Gemini error HTTP ${res.status}`,
          },
          { status: 422 }
        );
      }
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
        '';
      return NextResponse.json({ success: true, analysis: text, provider, model });
    }

    // OpenAI-compatible
    const base = (body.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error?.message || `LLM error HTTP ${res.status}`,
        },
        { status: 422 }
      );
    }
    const text = data?.choices?.[0]?.message?.content || '';
    return NextResponse.json({ success: true, analysis: text, provider, model });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

