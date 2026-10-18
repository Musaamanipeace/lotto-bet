import { checkCronAuth } from '@/lib/cron-auth.ts';
export const dynamic = 'force-dynamic';

// No lineup provider is implemented yet, so this reports that explicitly instead of pretending to run.
export async function GET(req: Request) {
  const auth = checkCronAuth(req.headers.get('authorization'), process.env.CRON_SECRET);
  if (!auth.ok) return Response.json(auth, { status: auth.status ?? 401 });
  return Response.json({ ok: false, error: 'No lineup provider configured; lineup checks cannot run', details: {} }, { status: 501 });
}
