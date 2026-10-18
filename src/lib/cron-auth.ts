import { timingSafeEqual } from 'node:crypto';
import { fail, ok, type Result } from './result.ts';

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Fails closed if the secret is unset. */
export function checkCronAuth(authHeader: string | null, secret: string | undefined): Result & { status?: number } {
  if (!secret) return { ...fail('CRON_SECRET is not configured; refusing to run'), status: 500 };
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authHeader ?? '');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ...fail('Unauthorized'), status: 401 };
  return ok({});
}
