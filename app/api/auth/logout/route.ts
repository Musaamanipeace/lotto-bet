import { clearedSessionCookie, logOut, readSessionToken } from '@/lib/auth.ts';
import { PgAuthStore } from '@/lib/pg-auth-store.ts';
import { isSecure, jsonError, requireJson } from '@/lib/session.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const bad = requireJson(req); if (bad) return bad;
  try {
    await logOut(new PgAuthStore(), readSessionToken(req.headers.get('cookie')));
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearedSessionCookie(isSecure()) } });
  } catch (e) {
    return jsonError(`Log-out failed: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
