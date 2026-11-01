/**
 * League name -> football-data.org competition code, for the free-tier domestic leagues.
 * Matching is exact on the normalised name (never "contains"), so "Egypt Premier League"
 * can never be mistaken for the English Premier League. Unknown names return null, and the
 * UI then says "Not covered" instead of guessing.
 */
const ALIASES: Record<string, string[]> = {
  PL: ['england premier league', 'english premier league', 'premier league', 'epl'],
  ELC: ['england championship', 'english championship', 'championship', 'efl championship'],
  PD: ['spain la liga', 'la liga', 'laliga', 'spain laliga', 'spain primera division', 'primera division'],
  SA: ['italy serie a', 'serie a'],
  BL1: ['germany bundesliga', 'bundesliga'],
  FL1: ['france ligue 1', 'ligue 1'],
  DED: ['netherlands eredivisie', 'eredivisie'],
  PPL: ['portugal primeira liga', 'primeira liga', 'portugal liga portugal', 'liga portugal'],
  BSA: ['brazil serie a', 'brasileirao serie a', 'brasileirao', 'brazil brasileirao', 'serie a brazil'],
};

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function competitionCodeFor(league: string | null | undefined): string | null {
  if (!league) return null;
  const n = norm(league);
  for (const [code, names] of Object.entries(ALIASES)) if (names.includes(n)) return code;
  return null;
}

export const FREE_COMPETITION_CODES = Object.keys(ALIASES);
