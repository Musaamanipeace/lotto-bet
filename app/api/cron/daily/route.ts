import { handleRefresh } from '@/lib/server.ts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Daily cron: fetch games then generate AI picks (via handleRefresh). */
export const GET = (req: Request) => handleRefresh(req, 'daily');
export const POST = (req: Request) => handleRefresh(req, 'daily');
