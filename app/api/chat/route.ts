import { requireJson, jsonError, currentUser } from '@/lib/session.ts';
import { callLlm } from '@/lib/llm/index.ts';
import { getAiSnapshot } from '@/lib/ai-store.ts';
import { ensureAiSnapshot } from '@/lib/run-ai.ts';
import { getStore } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';

const SYSTEM = `You are the Lotto Bet assistant. Hard rules:
- Never say a slip will win, is likely to win, or is safe to win. "Safe" is only a tier name (lower risk relative to other tiers).
- Only discuss picks that appear in the provided AI picks context. Never invent odds, teams, or stats.
- Criteria verification and bookmaker implied probability are separate; never merge them into a win chance.
- If the user asks to add/remove games, reply with a structured action block the app can run — do not claim you placed a bet.
- If data is missing, say so clearly. No fabricated content.
- Keep replies concise (2–6 sentences) unless listing picks.

When suggesting actions, end with a single line in this exact format when applicable:
ACTION: add_games n=<number> market=<market_key_or_any>
ACTION: explain_pick id=<pick_id>
ACTION: none
`;

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  let body: { message?: string; slipSummary?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  const message = (body.message ?? '').trim();
  if (!message) return jsonError('message is required', 400);
  if (message.length > 2000) return jsonError('message too long (max 2000)', 400);

  await ensureAiSnapshot(getStore()).catch(() => null);
  const snap = getAiSnapshot();
  const user = await currentUser(req);

  const pickSample = (snap?.picks ?? [])
    .slice(0, 25)
    .map(
      (p) =>
        `- id=${p.id} | ${p.home} vs ${p.away} | ${p.marketKey} | odds ${p.odds.toFixed(2)} | ${p.evaluation.label} | ${p.evaluation.verifiedLabel} | tier ${p.tier}`,
    )
    .join('\n');

  const context = [
    `User: ${user?.username ?? 'guest'}`,
    `AI snapshot: ${snap ? `${snap.picks.length} picks (${snap.verifiedCount} Verified, ${snap.bestFitCount} Best fit)` : 'none — ask user to refresh games / regenerate AI'}`,
    snap?.statsNote ? `Stats note: ${snap.statsNote}` : '',
    body.slipSummary ? `Current slip: ${body.slipSummary}` : 'Current slip: empty or unknown',
    'Sample AI picks (closed set — only these IDs are valid):',
    pickSample || '(no picks)',
  ]
    .filter(Boolean)
    .join('\n');

  const history = (body.history ?? [])
    .slice(-8)
    .map((h) => `${h.role}: ${h.content}`)
    .join('\n');

  const prompt = `${context}\n\nConversation:\n${history}\nuser: ${message}\nassistant:`;

  const r = await callLlm({
    system: SYSTEM,
    prompt,
    
  });

  if (!r.ok) {
    return Response.json(
      {
        ok: false,
        error: r.error,
        details: r.details,
        message: 'LLM call failed. Check API keys (GEMINI_API_KEY / OPENROUTER_API_KEY).',
      },
      { status: 502 },
    );
  }

  // Parse optional ACTION line
  let action: { type: string; n?: number; market?: string; id?: string } | null = null;
  const actionMatch = r.text.match(/ACTION:\s*(add_games|explain_pick|none)([^\n]*)/i);
  if (actionMatch) {
    const type = actionMatch[1].toLowerCase();
    const rest = actionMatch[2] ?? '';
    if (type === 'add_games') {
      const n = Number((rest.match(/n=(\d+)/) || [])[1] || 0);
      const market = (rest.match(/market=([a-z0-9_]+)/) || [])[1];
      action = { type: 'add_games', n: n || undefined, market: market === 'any' ? undefined : market };
    } else if (type === 'explain_pick') {
      const id = (rest.match(/id=([^\s]+)/) || [])[1];
      action = { type: 'explain_pick', id };
    } else {
      action = { type: 'none' };
    }
  }

  const reply = r.text.replace(/\n?ACTION:.*$/im, '').trim();

  return Response.json({
    ok: true,
    reply,
    action,
    provider: r.provider,
    model: r.model,
  });
}
