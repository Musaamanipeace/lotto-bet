import { handleRefresh } from '@/lib/server.ts';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const POST = (req: Request) => handleRefresh(req, 'manual');
