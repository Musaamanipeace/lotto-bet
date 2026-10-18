import { NextResponse } from 'next/server';
import { runHealthChecks } from '@/lib/health.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const upstreams = await runHealthChecks(process.env);
  const anyFailed = upstreams.some((u) => u.status === 'failed');
  return NextResponse.json({ checkedAt: new Date().toISOString(), upstreams }, { status: anyFailed ? 502 : 200 });
}
