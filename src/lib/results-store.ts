import { normalizeMatchKey, type MatchScore, type MatchStatus } from './results-evaluator.ts';
import { STORAGE_KEYS, scopedStorageKey } from './client-storage.ts';

const SCORES_LS_KEY = STORAGE_KEYS.RESULTS_SCORES;

// Server-side in-memory cache of resolved scores
const globalScores = new Map<string, MatchScore>();

// Deterministic integer hash from string
export function deterministicScore(home: string, away: string): { homeScore: number; awayScore: number } {
  const str = `${home}__${away}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const homeScore = positive % 4; // 0 to 3
  const awayScore = (positive >> 3) % 4; // 0 to 3
  return { homeScore, awayScore };
}

/**
 * Returns current scores from user-scoped local storage in browser
 */
export function getLocalScores(): Record<string, MatchScore> {
  if (typeof window === 'undefined') return {};
  try {
    const key = scopedStorageKey(SCORES_LS_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves scores to user-scoped local storage in browser
 */
export function saveLocalScores(scores: Record<string, MatchScore>): void {
  if (typeof window === 'undefined') return;
  try {
    const key = scopedStorageKey(SCORES_LS_KEY);
    localStorage.setItem(key, JSON.stringify(scores));
  } catch {
    /* storage full or blocked */
  }
}

/**
 * Register a score override in server memory
 */
export function setServerScore(
  key: string,
  homeScore: number,
  awayScore: number,
  status: MatchStatus = 'FT',
  source: 'manual' | 'api' | 'default' = 'manual'
): MatchScore {
  const scoreObj: MatchScore = {
    homeScore,
    awayScore,
    status,
    updatedAt: Date.now(),
    source,
  };
  globalScores.set(key, scoreObj);
  return scoreObj;
}

/**
 * Retrieve all server scores
 */
export function getServerScores(): Record<string, MatchScore> {
  const result: Record<string, MatchScore> = {};
  for (const [k, v] of globalScores.entries()) {
    result[k] = v;
  }
  return result;
}

/**
 * Record a manual score override (usable on client or server)
 */
export function recordScoreOverride(params: {
  gameId?: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status?: MatchStatus;
}): MatchScore {
  const status = params.status || 'FT';
  const scoreObj: MatchScore = {
    homeScore: params.homeScore,
    awayScore: params.awayScore,
    status,
    updatedAt: Date.now(),
    source: 'manual',
  };

  const key = normalizeMatchKey(params.home, params.away);
  globalScores.set(key, scoreObj);
  if (params.gameId) {
    globalScores.set(params.gameId, scoreObj);
  }

  if (typeof window !== 'undefined') {
    const local = getLocalScores();
    local[key] = scoreObj;
    if (params.gameId) {
      local[params.gameId] = scoreObj;
    }
    saveLocalScores(local);
  }

  return scoreObj;
}
