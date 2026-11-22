import { requireJson, jsonError } from '@/lib/session.ts';
import { requireAiAccess } from '@/lib/ai-auth.ts';
import { callLlm } from '@/lib/llm/index.ts';
import { getAiSnapshot } from '@/lib/ai-store.ts';
import { applyFilterState, normalizeFilterState, type FilterState } from '@/lib/filter-state.ts';
import { toolPickN, toolSuggestSwaps, type AgentAction, type SlipLegSummary } from '@/lib/ai-agent.ts';
import { extractActions, type ValidatedAction } from '@/lib/agent-actions.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `You are the Lotto Bet assistant. Hard rules:
- Never say a slip will win, is likely to win, or is safe to win. "Safe" is only a tier name (lower risk relative to other tiers).
- Only discuss picks that appear in the provided AI picks context. Never invent odds, teams, or stats.
- Criteria verification and bookmaker implied probability are separate; never merge them into a win chance.
- Keep replies concise (2–5 sentences).`;

const ACTION_SYSTEM = `You turn user requests into structured app actions. Reply ONLY with JSON: {"actions":[{"name":"...","args":{...}}]}. Only choose actions the user clearly asked for. Never invent names or values.`;

/** Pulls the JSON object out of a possibly fenced/noisy LLM response. */
function parseLooseJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const access = await requireAiAccess(req, { requireAiKey: true });
  if (!access.ok) return access.response;

  let body: {
    message?: string;
    slipSummary?: string;
    slipLegs?: SlipLegSummary[];
    filterState?: Partial<FilterState> | null;
    history?: { role: string; content: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  const message = (body.message ?? '').trim();
  if (!message) return jsonError('message is required', 400);
  if (message.length > 2000) return jsonError('message too long (max 2000)', 400);

  const snap = await getAiSnapshot().catch(() => null);
  const filterState = normalizeFilterState(body.filterState);
  const filteredPicks = snap ? applyFilterState(snap.picks, filterState, { pastGraceMs: 5 * 60_000 }) : [];
  const snapIds = new Set((snap?.picks ?? []).map((p) => p.id));

  // Build deterministic structured actions when user asks to add picks or swap legs
  const actions: Array<AgentAction | ValidatedAction> = [];
  const slipLegs = Array.isArray(body.slipLegs) ? body.slipLegs : [];
  const excludedGames = new Set(slipLegs.map((l) => l.gameId));
  const numMatch = message.match(/\b(\d{1,2})\b/);

  if (snap && /\b(swap|replace|weak|review)\b/i.test(message) && slipLegs.length > 0) {
    const out = toolSuggestSwaps(slipLegs, snap.picks, filterState, { count: 3 });
    for (const s of out.swaps) {
      if (snapIds.has(s.inPickId)) actions.push(s);
    }
  } else if (snap && /\b(add|pick|build|suggest|select|give)\b/i.test(message) && filteredPicks.length > 0) {
    const n = numMatch ? Math.min(20, Math.max(1, Number(numMatch[1]))) : 5;
    const picked = toolPickN(snap.picks, filterState, { n, excludeGameIds: excludedGames });
    const valid = picked.picks.filter((p) => snapIds.has(p.id));
    if (valid.length > 0) {
      actions.push({
        type: 'add_picks',
        picks: valid,
        requested: n,
        shortfall: Math.max(0, n - valid.length),
        totalOdds: valid.reduce((a, p) => a * p.odds, 1),
        tier: 'average',
      });
    }
  }

  // Structured actions via LLM JSON mode (Section 4): providers without tool
  // calling return actions as JSON; invalid entries are dropped with a visible
  // message and never executed.
  let actionErrors: string[] = [];
  if (snap && /\b(save|apply|delete|rename|clear|grey|lock|swap|template|book code|share)\b/i.test(message)) {
    const jr = await callLlm(
      {
        system: ACTION_SYSTEM,
        prompt: `User: ${message}\nActive filters: bookmaker=${filterState.bookmaker}, leagues=${filterState.leagues.length || 'all'}`,
        json: true,
      },
      access.env,
    );
    if (jr.ok && jr.text.trim()) {
      const { actions: newActions, errors } = extractActions(parseLooseJson(jr.text));
      actions.push(...newActions);
      actionErrors = errors;
    } else {
      const failMsg = !jr.ok ? (jr.error ?? 'unknown error') : 'empty response';
      actionErrors = [`Structured action extraction failed: ${failMsg}`];
    }
  }

  const pickSample = filteredPicks
    .slice(0, 25)
    .map(
      (p) =>
        `- id=${p.id} | ${p.home} vs ${p.away} | ${p.marketKey} | odds ${p.odds.toFixed(2)} | ${p.evaluation.label} | ${p.evaluation.verifiedLabel} | tier ${p.tier}`,
    )
    .join('\n');

  const context = [
    `User: ${access.user.username}`,
    `Active filter bookmaker=${filterState.bookmaker}, withinHours=${filterState.withinHours ?? 'any'}, leagues=${filterState.leagues.length || 'all'}`,
    `AI snapshot: ${snap ? `${filteredPicks.length} matching active filters (${snap.picks.length} total)` : 'none — ask user to refresh games / regenerate AI'}`,
    snap?.statsNote ? `Stats note: ${snap.statsNote}` : '',
    body.slipSummary ? `Current slip: ${body.slipSummary}` : 'Current slip: empty or unknown',
    actions.length > 0 ? `Prepared structured actions count: ${actions.length}` : '',
    'Matching AI picks (closed set — only these IDs are valid):',
    pickSample || '(no matching picks)',
  ]
    .filter(Boolean)
    .join('\n');

  const history = (body.history ?? [])
    .slice(-8)
    .map((h) => `${h.role}: ${h.content}`)
    .join('\n');

  const prompt = `${context}\n\nConversation:\n${history}\nuser: ${message}\nassistant:`;

  const r = await callLlm(
    {
      system: SYSTEM,
      prompt,
    },
    access.env,
  );

  if (!r.ok) {
    // If deterministic actions were prepared, still return ok with actions + warning rather than dropping actions
    if (actions.length > 0) {
      return Response.json({
        ok: true,
        reply: `Prepared ${actions.length} structured slip action(s) matching your active filters (LLM summary unavailable: ${r.error}).`,
        actions,
        action: actions[0] ?? null,
        llmWarning: r.error,
      });
    }
    return Response.json(
      {
        ok: false,
        error: r.error,
        details: r.details,
        attempts: r.details.attempts ?? [],
        message: 'AI call failed. Please check your chosen model or API key in Settings.',
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    reply: actionErrors.length > 0 ? `${r.text.trim()}${actionErrors.map((e) => ` (${e})`).join(' ')}` : r.text.trim(),
    actions,
    action: actions[0] ?? null,
    provider: r.provider,
    model: r.model,
    attempts: r.attempts,
    actionErrors,
  });
}
