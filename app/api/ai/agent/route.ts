import { loadAiSnapshot } from '@/lib/run-ai.ts';
import { readGames } from '@/lib/read-games.ts';
import { getStore } from '@/lib/server.ts';
import { requireJson, jsonError } from '@/lib/session.ts';
import { requireAiAccess } from '@/lib/ai-auth.ts';
import { runAiAgent, type AgentRequest } from '@/lib/ai-agent.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ai/agent
 * Structured AI agent backed by server-side deterministic tools (`list_candidates`, `pick_n`,
 * `inspect_slip`, `suggest_swaps`).
 * Requires an authenticated session (401) and configured user API keys (400).
 */
export async function POST(req: Request) {
  const bad = requireJson(req);
  if (bad) return bad;

  const access = await requireAiAccess(req, { requireAiKey: true });
  if (!access.ok) return access.response;

  let body: AgentRequest;
  try {
    body = (await req.json()) as AgentRequest;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body || typeof body !== 'object') {
    return jsonError('Request body must be a JSON object', 400);
  }

  const snap = await loadAiSnapshot();
  if (!snap.ok) {
    return Response.json(snap, { status: snap.details?.code === 'storage_not_configured' ? 503 : 400 });
  }

  const gamesRes = await readGames(getStore()).catch(() => null);
  const latestGames = gamesRes && gamesRes.ok ? gamesRes.games : [];

  const result = await runAiAgent({
    request: body,
    snapshotPicks: snap.picks,
    latestGames,
    llmEnv: access.env,
  });

  return Response.json(result);
}
