import { signUp, sessionCookie } from '@/lib/auth.ts';
import { PgAuthStore } from '@/lib/pg-auth-store.ts';
import { isSecure, jsonError, requireJson } from '@/lib/session.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireJson(req); if (bad) return bad;
  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return jsonError('Request body is not valid JSON', 400); }
  try {
    const r = await signUp(new PgAuthStore(), body?.username, body?.password);
    if (!r.ok) return jsonError(r.error, r.error.includes('taken') ? 409 : 400);
    return Response.json({ ok: true, user: r.user }, { headers: { 'Set-Cookie': sessionCookie(r.token, r.expiresAt, isSecure()) } });
  } catch (e) {
    return jsonError(`Sign-up failed: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
