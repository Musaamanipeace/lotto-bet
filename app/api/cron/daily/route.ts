import { handleRefresh } from '@/lib/server.ts';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const GET = (req: Request) => handleRefresh(req, 'daily');
