import { NextResponse } from 'next/server';
import { runHealthChecks } from '@/lib/health.ts';

export const dynamic = 'force-dynamic';

export async function GET() {
  const upstreams = await runHealthChecks({
    FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY,
    API_FOOTBALL_KEY: process.env.API_FOOTBALL_KEY,
  });
  const anyFailed = upstreams.some((u) => u.status === 'failed');
  return NextResponse.json(
    { checkedAt: new Date().toISOString(), upstreams },
    { status: anyFailed ? 502 : 200 },
  );
}