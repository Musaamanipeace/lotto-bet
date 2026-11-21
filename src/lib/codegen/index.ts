import type { PickRow } from '../filters.ts';
import { OUTCOME_KEYS } from '../outcomes.ts';
import { fail, ok, type Failure, type Result } from '../result.ts';
import type { BetPawaScriptResult } from './betpawa.ts';
import type { SportyCodeResult } from './sportybet.ts';

export type Destination = 'sportybet' | 'betpawa';
export type CodegenDeps = {
  sportybet: (legs: PickRow[]) => Promise<SportyCodeResult>;
  betpawa: (legs: PickRow[]) => Promise<BetPawaScriptResult>;
};

/**
 * Destination-driven: ONLY the selected destination's generator runs. There is no automatic
 * fallback. "Generate SportyBet code instead" is just this function called again by the user
 * with destination = 'sportybet'.
 */
export async function generateCode(destination: Destination, legs: PickRow[], deps: CodegenDeps): Promise<SportyCodeResult | BetPawaScriptResult | Failure> {
  if (destination === 'sportybet') return deps.sportybet(legs);
  if (destination === 'betpawa') return deps.betpawa(legs);
  return fail(`Unknown destination "${String(destination)}"`);
}

const KINDS = ['1x2', 'double_chance', 'over_under', 'btts'];
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Client-supplied legs are untrusted: validate shape before they reach any generator. */
export function parseLegs(input: unknown): Result<{ legs: PickRow[] }> {
  if (!Array.isArray(input) || input.length === 0) return fail('legs must be a non-empty array');
  if (input.length > 50) return fail('A slip can have at most 50 legs');
  const legs: PickRow[] = [];
  for (const [i, x] of input.entries()) {
    const r = x as Record<string, unknown>;
    const bad = (why: string) => fail(`Leg ${i + 1} is invalid: ${why}`);
    if (typeof r !== 'object' || r === null) return bad('not an object');
    if (r.bookmaker !== 'sportybet' && r.bookmaker !== 'betpawa') return bad('unknown bookmaker');
    if (![r.gameId, r.nativeEventId, r.home, r.away, r.pick, r.marketNativeId, r.outcomeNativeId].every(str)) return bad('missing id/team/pick field');
    if (typeof r.specifier !== 'string') return bad('missing specifier');
    if (!KINDS.includes(r.marketKind as string)) return bad('unknown marketKind');
    if (typeof r.odds !== 'number' || !(r.odds > 1)) return bad('odds must be a number greater than 1');
    if (typeof r.kickoff !== 'number') return bad('missing kickoff');
    if (r.line !== null && typeof r.line !== 'number') return bad('line must be a number or null');
    if (r.outcomeKey !== null && !OUTCOME_KEYS.includes(r.outcomeKey as never)) return bad('unknown outcomeKey');
    legs.push({ ...(r as unknown as PickRow), league: typeof r.league === 'string' ? r.league : null, implied: typeof r.implied === 'number' ? r.implied : null });
  }
  return ok({ legs });
}
