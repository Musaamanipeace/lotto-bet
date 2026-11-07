/**
 * Central registry of all browser persistence keys used by Lotto Bet.
 * Used for complete cleanup on sign-out and for auditability.
 *
 * Rules:
 * - Never store API keys / secrets in localStorage (see client-settings.ts).
 * - All user-specific data must be cleared on logout.
 * - Preference keys that are not sensitive may stay, but we clear everything for safety.
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
   * IMPORTANT: As of the security hardening, this key no longer stores API keys.
   * Only non-secret prefs (model, provider, timeout) are persisted.
   */
  CLIENT_AI_SETTINGS: 'lb_client_ai_settings_v1',
  /** UI preference: whether the top hub is collapsed. */
  TOP_HUB_COLLAPSED: 'lb_top_hub_collapsed',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** All keys that must be removed on sign-out. */
export const ALL_USER_STORAGE_KEYS: readonly string[] = Object.values(STORAGE_KEYS);

/**
 * Removes every known app key from localStorage (and sessionStorage for good measure).
 * Safe to call on the server (no-op) or when storage is blocked.
 */
export function clearAllUserStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of ALL_USER_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    // Defensive: also wipe any legacy or future lb_* keys we might have missed.
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('lb_') || k.startsWith('lotto-bet'))) {
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
 * Returns true if any of the known user keys still exist (useful for tests).
 */
export function hasAnyUserStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return ALL_USER_STORAGE_KEYS.some((k) => localStorage.getItem(k) !== null);
  } catch {
    return false;
  }
}
