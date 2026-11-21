import type { AuthStore } from './auth.ts';
import { PgAuthStore } from './pg-auth-store.ts';
import { getMemoryAuthStore } from './memory-auth-store.ts';

export function getAuthStore(): AuthStore {
  if (process.env.DATABASE_URL) {
    try {
      return new PgAuthStore();
    } catch {
      return getMemoryAuthStore();
    }
  }
  return getMemoryAuthStore();
}
