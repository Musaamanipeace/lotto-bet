/**
 * Server-side API key configuration.
 *
 * Design:
 * - Server owns the primary credentials (env vars).
 * - Clients can still supply their own paid keys via the BYOK panel,
 *   which are passed per-request to API routes.
 * - Resolution order for every external call:
 *   1. Client-supplied key (per-request body/header) — for paid users.
 *   2. Server env var — the app owner's key.
 *   3. None → free tier fallback (odds bands + form + league priority),
 *      never a hard block and never mock data.
 *
 * No keys are ever echoed back to the client in responses.
 */

import { AIProvider } from '@/types';

/** Resolve the API key for a given provider.
 * clientKey is optional and takes priority when present.
 * Falls back to server env var.
 * Returns null if neither is available.
 */
export function resolveAiKey(provider: AIProvider, clientKey?: string): string | null {
  if (clientKey && clientKey.trim()) return clientKey.trim();

  switch (provider) {
    case 'gemini':
      return (process.env.GEMINI_API_KEY || '').trim() || null;
    case 'openrouter':
      return (process.env.OPENROUTER_API_KEY || '').trim() || null;
    case 'mistral':
      return (process.env.MISTRAL_API_KEY || '').trim() || null;
    default:
      return null;
  }
}

/** Resolve server sports-data keys. */
export function resolveSportsKeys(clientTheSportsDbKey?: string, clientApiFootballKey?: string): {
  theSportsDbKey: string | null;
  apiFootballKey: string | null;
  footballDataKey: string | null;
} {
  return {
    theSportsDbKey:
      (clientTheSportsDbKey && clientTheSportsDbKey.trim()) ||
      (process.env.THESPORTSDB_API_KEY || '').trim() ||
      null,
    apiFootballKey:
      (clientApiFootballKey && clientApiFootballKey.trim()) ||
      (process.env.API_FOOTBALL_KEY || '').trim() ||
      null,
    footballDataKey:
      (process.env.FOOTBALL_DATA_API_KEY || '').trim() || null,
  };
}

/** Check if any server AI key is configured. */
export function hasServerAiKey(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.MISTRAL_API_KEY
  );
}

/** Check if any server sports-data key is configured. */
export function hasServerSportsKey(): boolean {
  return Boolean(
    process.env.THESPORTSDB_API_KEY ||
    process.env.API_FOOTBALL_KEY ||
    process.env.FOOTBALL_DATA_API_KEY
  );
}

/** Priority leagues per product requirements. */
export const PRIORITY_LEAGUES = [
  // Europe's Big Five
  'English Premier League',
  'Spanish La Liga',
  'Italian Serie A',
  'German Bundesliga',
  'French Ligue 1',
  // Secondary European
  'English Championship',
  'Dutch Eredivisie',
  'Portuguese Primeira Liga',
  'Belgian Pro League',
  // Americas & Global
  'Major League Soccer',
  'Brazilian Série A',
  'Argentine Liga Profesional',
] as const;

export function leaguePriority(league: string): number {
  const idx = PRIORITY_LEAGUES.findIndex((l) =>
    league.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(league.toLowerCase())
  );
  return idx >= 0 ? idx : PRIORITY_LEAGUES.length;
}
