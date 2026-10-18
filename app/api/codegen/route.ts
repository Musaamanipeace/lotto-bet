import { prepareBetPawaScript } from '@/lib/codegen/betpawa.ts';
import { generateCode, parseLegs, type Destination } from '@/lib/codegen/index.ts';
import { generateSportyBetCode } from '@/lib/codegen/sportybet.ts';
import { currentUser, jsonError, requireJson } from '@/lib/session.ts';

export const dynamic = 'force-dynamic';

// Requires a signed-in session (stage 5). Still add rate limiting before a public deploy.
export async function POST(req: Request) {
  const notJson = requireJson(req); if (notJson) return notJson;
  try {
    if (!(await currentUser(req))) return jsonError('Sign in to generate booking codes', 401);
  } catch (e) {
    return jsonError(`Could not check the session: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: 'Request body is not valid JSON', details: {} }, { status: 400 }); }
  const { destination, legs } = (body ?? {}) as { destination?: string; legs?: unknown };
  if (destination !== 'sportybet' && destination !== 'betpawa') {
    return Response.json({ ok: false, error: 'destination must be "sportybet" or "betpawa"', details: {} }, { status: 400 });
  }
  const parsed = parseLegs(legs);
  if (!parsed.ok) return Response.json(parsed, { status: 400 });
  const result = await generateCode(destination as Destination, parsed.legs, {
    sportybet: (l) => generateSportyBetCode(l),
    betpawa: (l) => prepareBetPawaScript(l),
  });
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
