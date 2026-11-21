import { MATCHING } from './criteria.ts';
import type { Game } from './types.ts';

const NOISE = new Set(['fc', 'cf', 'afc', 'sc', 'ac', 'as', 'cd', 'ud', 'sv', 'fk']);

export function normalizeTeam(name: string): string {
  const base = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ');
  const tokens = base.split(/\s+/).filter((t) => t && !NOISE.has(t));
  return (tokens.length ? tokens : base.split(/\s+/).filter(Boolean)).join(' ');
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) ?? 0) + 1); }
  return m;
}

/** Sørensen–Dice coefficient on character bigrams of the normalised names, in [0, 1]. */
export function teamSimilarity(a: string, b: string): number {
  const x = normalizeTeam(a), y = normalizeTeam(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bx = bigrams(x), by = bigrams(y);
  let overlap = 0;
  for (const [g, n] of bx) overlap += Math.min(n, by.get(g) ?? 0);
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

export type GameMatch = { sportyGameId: string; betpawaGameId: string; score: number; homeScore: number; awayScore: number };

export function matchGames(sporty: Game[], betpawa: Game[], threshold: number = MATCHING.teamSimilarityThreshold) {
  const candidates: GameMatch[] = [];
  for (const s of sporty) for (const p of betpawa) {
    const homeScore = teamSimilarity(s.home, p.home);
    const awayScore = teamSimilarity(s.away, p.away);
    if (homeScore >= threshold && awayScore >= threshold) {
      candidates.push({ sportyGameId: s.id, betpawaGameId: p.id, score: (homeScore + awayScore) / 2, homeScore, awayScore });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const usedS = new Set<string>(), usedP = new Set<string>(), matches: GameMatch[] = [];
  for (const c of candidates) {
    if (usedS.has(c.sportyGameId) || usedP.has(c.betpawaGameId)) continue;
    usedS.add(c.sportyGameId); usedP.add(c.betpawaGameId); matches.push(c);
  }
  // Unmatched games stay unmatched. They are never forced.
  return {
    matches,
    unmatchedSporty: sporty.filter((g) => !usedS.has(g.id)).map((g) => g.id),
    unmatchedBetpawa: betpawa.filter((g) => !usedP.has(g.id)).map((g) => g.id),
  };
}
