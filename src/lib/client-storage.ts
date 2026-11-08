/**
 * Central registry of all browser persistence keys used by Lotto Bet.
 * Used for user-scoped namespacing, complete cleanup on sign-out, and auditability.
 *
 * Rules:
 * - Never store API keys / secrets in localStorage or the database (see client-settings.ts).
 * - All user-specific data is namespaced by user ID (`<key>:<userId>`) and cleared on sign-out.
 * - On sign-out, localStorage, sessionStorage, IndexedDB, in-memory state, and Service Worker caches are wiped.
 */

export const STORAGE_KEYS = {
  /** Active working slip (shared between Builder and AI Picks). */
  SLIP: 'lb_slip_v1',
  /** Saved slips list (mirrored from server / local). */
  SAVED_SLIPS: 'lb_saved_slips_v1',
  /** Custom filter templates. */
  FILTER_TEMPLATES: 'lb_filter_templates_v1',
  /** Local score overrides for results. */
  RESULTS_SCORES: 'lb_results_scores_v1',
  /**
   * Client AI settings.
   * IMPORTANT: Never stores API keys or secrets.
   * Only non-secret prefs (selectedModel, provider, timeoutSeconds) are persisted.
   */
  CLIENT_AI_SETTINGS: 'lb_client_ai_settings_v1',
  /** UI preference: whether the top hub is collapsed. */
  TOP_HUB_COLLAPSED: 'lb_top_hub_collapsed',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** All base keys that must be removed on sign-out. */
export const ALL_USER_STORAGE_KEYS: readonly string[] = Object.values(STORAGE_KEYS);

export const SIGNOUT_EVENT = 'lb-auth-signout';

let currentStorageUserId: string | null = null;

/** Sets the current authenticated user ID for namespacing client storage. */
export function setActiveStorageUserId(userId: string | null): void {
  currentStorageUserId = userId;
}

/** Gets the current authenticated user ID used for namespacing client storage. */
export function getActiveStorageUserId(): string | null {
  return currentStorageUserId;
}

/**
 * Returns a user-namespaced storage key when a user ID is active (either passed explicitly
 * or set via `setActiveStorageUserId`), or the base key when anonymous.
 */
export function scopedStorageKey(baseKey: string, userId: string | null = currentStorageUserId): string {
  return userId ? `${baseKey}:${userId}` : baseKey;
}

/**
 * Removes every known app key (both unscoped and user-scoped) from localStorage and sessionStorage.
 * Safe to call on the server (no-op) or when storage is blocked.
 */
export function clearAllUserStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of ALL_USER_STORAGE_KEYS) {
      localStorage.removeItem(key);
      if (currentStorageUserId) {
        localStorage.removeItem(`${key}:${currentStorageUserId}`);
      }
    }
    // Also wipe any scoped `lb_*:<userId>`, legacy `lb_*`, or `lotto-bet*` keys.
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('lb_') ||
          k.startsWith('lotto-bet') ||
          k.startsWith('sb-') ||
          ALL_USER_STORAGE_KEYS.some((base) => k === base || k.startsWith(`${base}:`)))
      ) {
        toRemove.push(k);
      }
    }
    for (const k of toRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    /* storage may be blocked (private mode, quota, etc.) */
  }

  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

/**
 * Clears all IndexedDB databases created in this origin.
 */
export async function clearAllIndexedDB(): Promise<void> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') return;
  try {
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .map((db) => db.name)
          .filter((name): name is string => Boolean(name))
          .map(
            (name) =>
              new Promise<void>((resolve) => {
                const req = indexedDB.deleteDatabase(name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              }),
          ),
      );
    }
  } catch {
    /* ignore */
  }
}

/**
 * Clears all Service Worker CacheStorage entries and notifies any active Service Worker.
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_CACHE' });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Complete client-side sign-out cleanup:
 * 1. Resets active user ID namespace
 * 2. Wipes localStorage and sessionStorage
 * 3. Wipes IndexedDB
 * 4. Wipes Service Worker caches
 * 5. Dispatches `lb-auth-signout` event so in-memory stores/hooks reset immediately
 */
export async function performFullSignOutCleanup(): Promise<void> {
  clearAllUserStorage();
  setActiveStorageUserId(null);
  clearAllUserStorage();
  await Promise.all([clearAllIndexedDB(), clearServiceWorkerCaches()]);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new Event(SIGNOUT_EVENT));
      window.dispatchEvent(new Event('lb-slip-changed'));
    } catch {
      /* ignore in minimal test mocks */
    }
  }
}

/**
 * Returns true if any of the known user keys (unscoped or scoped) still exist in localStorage.
 */
export function hasAnyUserStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (const k of ALL_USER_STORAGE_KEYS) {
      if (localStorage.getItem(k) !== null) return true;
      if (currentStorageUserId && localStorage.getItem(`${k}:${currentStorageUserId}`) !== null) return true;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('lb_') || k.startsWith('lotto-bet') || k.startsWith('sb-'))) return true;
    }
    return false;
  } catch {
    return false;
  }
}
