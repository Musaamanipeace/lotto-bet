import { StandardGame, FilterCriteria, SelectedPick, BookieId, GameMarkets } from '@/types';

/**
 * Normalizes team or league names: converts to lowercase, strips accents/diacritics,
 * and collapses consecutive whitespaces.
 */
export function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Strips non-alphanumeric characters for robust key/ID matching.
 */
export function cleanString(str: string): string {
  if (!str) return '';
  return normalizeTeamName(str).replace(/[^a-z0-9]/g, '');
}

export interface GameEvaluation {
  game: StandardGame;
  normalizedHome: string;
  normalizedAway: string;
  eligiblePicks: SelectedPick[];
  bestPick: SelectedPick | null;
  targetMarkets: GameMarkets;
  selectedCompany: 'ALL' | BookieId;
}

/**
 * Evaluates games against criteria and returns only those that meet company filters,
 * preferred markets, timeframe constraints, and active match status.
 */
export function evaluateAndFilterGames(
  games: StandardGame[],
  criteria: FilterCriteria,
  now: Date = new Date()
): GameEvaluation[] {
  const results: GameEvaluation[] = [];
  const nowMs = now.getTime();
  const maxMs = criteria.timeframeHours ? nowMs + criteria.timeframeHours * 60 * 60 * 1000 : null;

  const normalizedSearch = criteria.searchQuery ? normalizeTeamName(criteria.searchQuery) : '';

  for (const game of games) {
    // 1. Company Filter: check if game is offered by the selected bookmaker
    if (criteria.selectedCompany !== 'ALL') {
      const isOffered = game.bookies && game.bookies.includes(criteria.selectedCompany);
      if (!isOffered) {
        continue;
      }
    }

    // 2. Filter out non-prematch statuses
    if (game.status === 'IN_PLAY' || game.status === 'CANCELLED' || game.status === 'POSTPONED') {
      continue;
    }

    // 3. Validate Kickoff time
    const kickoffMs = new Date(game.kickoffTime).getTime();
    if (isNaN(kickoffMs)) continue;

    // Must be in the future (at least 2 minutes from now)
    if (kickoffMs < nowMs + 2 * 60 * 1000) {
      continue;
    }

    if (maxMs && kickoffMs > maxMs) {
      continue;
    }

    // 4. Normalized Names
    const normHome = normalizeTeamName(game.homeTeam);
    const normAway = normalizeTeamName(game.awayTeam);
    const normLeague = normalizeTeamName(game.league);

    // 5. League Filter
    if (criteria.selectedLeague && criteria.selectedLeague !== 'ALL') {
      if (normalizeTeamName(criteria.selectedLeague) !== normLeague) {
        continue;
      }
    }

    // 6. Search Query Filter
    if (normalizedSearch) {
      const matchHome = normHome.includes(normalizedSearch);
      const matchAway = normAway.includes(normalizedSearch);
      const matchLeague = normLeague.includes(normalizedSearch);
      if (!matchHome && !matchAway && !matchLeague) {
        continue;
      }
    }

    // 7. Choose Markets based on selected company
    const activeMarkets: GameMarkets =
      (criteria.selectedCompany !== 'ALL' && game.companyOdds?.[criteria.selectedCompany]) ||
      game.markets;

    // 8. Market Evaluation
    const eligiblePicks: SelectedPick[] = [];
    const pickBookie: BookieId | undefined =
      criteria.selectedCompany !== 'ALL' ? criteria.selectedCompany : undefined;

    // Double Chance (1X, X2, 12)
    if (criteria.enableDoubleChance && activeMarkets.doubleChance) {
      for (const dc of activeMarkets.doubleChance) {
        if (dc.odd >= criteria.dcMin && dc.odd <= criteria.dcMax) {
          eligiblePicks.push({
            gameId: game.id,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Double Chance',
            pick: dc.pick,
            odd: dc.odd,
            bookie: pickBookie,
          });
        }
      }
    }

    // Home Win (1)
    if (criteria.enableHomeWin && activeMarkets.homeWin) {
      const hw = activeMarkets.homeWin;
      if (hw.odd >= criteria.homeWinMin && hw.odd <= criteria.homeWinMax) {
        eligiblePicks.push({
          gameId: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          league: game.league,
          kickoffTime: game.kickoffTime,
          marketName: 'Home Win',
          pick: '1',
          odd: hw.odd,
          bookie: pickBookie,
        });
      }
    }

    // Over 0.5 Goals
    if (criteria.enableOver05 && activeMarkets.overUnder) {
      const over05 = activeMarkets.overUnder.find((m) => m.pick === 'Over 0.5');
      if (over05 && over05.odd > 1.01) {
        eligiblePicks.push({
          gameId: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          league: game.league,
          kickoffTime: game.kickoffTime,
          marketName: 'Over 0.5',
          pick: 'Over 0.5',
          odd: over05.odd,
          bookie: pickBookie,
        });
      }
    }

    // Under 3.5 Goals
    if (criteria.enableUnder35 && activeMarkets.overUnder) {
      const under35 = activeMarkets.overUnder.find((m) => m.pick === 'Under 3.5');
      if (under35 && under35.odd > 1.05) {
        eligiblePicks.push({
          gameId: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          league: game.league,
          kickoffTime: game.kickoffTime,
          marketName: 'Under 3.5',
          pick: 'Under 3.5',
          odd: under35.odd,
          bookie: pickBookie,
        });
      }
    }

    if (eligiblePicks.length > 0) {
      // Sort by optimal odds (closest to 1.15)
      const sorted = [...eligiblePicks].sort((a, b) => {
        const diffA = Math.abs(a.odd - 1.15);
        const diffB = Math.abs(b.odd - 1.15);
        return diffA - diffB;
      });

      results.push({
        game,
        normalizedHome: normHome,
        normalizedAway: normAway,
        eligiblePicks,
        bestPick: sorted[0],
        targetMarkets: activeMarkets,
        selectedCompany: criteria.selectedCompany,
      });
    }
  }

  // Sort games by kickoff time ascending
  return results.sort(
    (a, b) => new Date(a.game.kickoffTime).getTime() - new Date(b.game.kickoffTime).getTime()
  );
}

/**
 * Fisher-Yates Shuffle Algorithm for unbiased random distribution.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects up to N random games from eligible candidates, picking 1 qualifying market per match.
 */
export function pickRandomSelections(
  evaluations: GameEvaluation[],
  count: number
): SelectedPick[] {
  if (evaluations.length === 0 || count <= 0) return [];

  const shuffled = fisherYatesShuffle(evaluations);
  const selectedGames = shuffled.slice(0, Math.min(count, shuffled.length));

  return selectedGames
    .map((evalItem) => evalItem.bestPick)
    .filter((pick): pick is SelectedPick => pick !== null);
}

/**
 * Computes accumulator total odds from selected picks.
 */
export function calculateAccumulatorOdds(picks: SelectedPick[]): number {
  if (picks.length === 0) return 1.0;
  const raw = picks.reduce((acc, curr) => acc * curr.odd, 1.0);
  return Math.round(raw * 100) / 100;
}
