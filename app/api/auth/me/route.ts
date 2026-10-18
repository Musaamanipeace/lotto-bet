import { currentUser, jsonError } from '@/lib/session.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    return Response.json({ ok: true, user: await currentUser(req) });
  } catch (e) {
    // A DB failure is reported as an error, never silently shown as "signed out".
    return jsonError(`Could not check the session: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
}
