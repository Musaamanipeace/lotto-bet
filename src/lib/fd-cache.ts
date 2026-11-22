/**
 * Read-through cache for the football-data provider. Default stays
 * in-memory so existing tests pass; a `FdCache` instance can be injected via
 * `FdDeps.cache` so standings and team matches survive across serverless
 * instances.
 */
export type FdCache = {
  get<T>(key: string): { at: number; value: T } | null;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
};

export function createMemoryFdCache(ttlMs = 30 * 60_000): FdCache {
  const m = new Map<string, { at: number; value: unknown }>();
  return {
    get(key) {
      const hit = m.get(key);
      if (!hit) return null;
      if (Date.now() - hit.at > ttlMs) {
        m.delete(key);
        return null;
      }
      return hit as { at: number; value: never };
    },
    set(key, value) {
      m.set(key, { at: Date.now(), value });
    },
    delete(key) {
      m.delete(key);
    },
  };
}
