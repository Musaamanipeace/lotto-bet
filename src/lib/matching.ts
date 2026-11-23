/**
 * Team-name similarity for matching SportyBet fixtures to football-data.org standings.
 * Cross-bookmaker game matching was removed with betPawa; only the name helpers remain.
 */
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
