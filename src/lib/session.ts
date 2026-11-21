import { readSessionToken, userForToken, type User } from './auth.ts';
import { getAuthStore } from './auth-store.ts';

export const isSecure = () => process.env.NODE_ENV === 'production';

/** The signed-in user for this request, or null for a guest. Works with Postgres or in-memory fallback. */
export async function currentUser(req: Request): Promise<User | null> {
  try {
    return await userForToken(getAuthStore(), readSessionToken(req.headers.get('cookie')));
  } catch {
    return null;
  }
}

/** State-changing JSON endpoints require a JSON content type (a cross-site form cannot send one without CORS). */
export function requireJson(req: Request): Response | null {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return Response.json({ ok: false, error: 'Content-Type must be application/json', details: {} }, { status: 415 });
  }
  return null;
}

export const jsonError = (error: string, status: number) => Response.json({ ok: false, error, details: {} }, { status });
