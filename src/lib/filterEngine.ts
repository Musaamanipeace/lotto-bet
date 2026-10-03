import { StandardGame, FilterCriteria, SelectedPick, BookieId, GameMarkets, SportyBetMarket } from '@/types';

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

/**
 * Resolve SportyBet marketId / outcomeId / specifier from live markets.
 * Uses official market IDs (1=1X2, 10=Double Chance, 18=Over/Under) rather than
 * brittle name matching against labels like "Home Win".
 */
function findSportyBetIds(
  sportyMarkets: SportyBetMarket[] | undefined,
  marketName: string,
  pickName: string
): { marketId?: string; outcomeId?: string; specifier?: string | null } {
  if (!sportyMarkets || sportyMarkets.length === 0) return {};

  const lowerMarket = marketName.toLowerCase();
  const lowerPick = pickName.toLowerCase().trim();

  // --- Match Winner / Home Win (market 1) ---
  if (
    lowerMarket === 'home win' ||
    lowerMarket === 'match winner' ||
    lowerMarket === '1x2' ||
    lowerPick === '1' ||
    lowerPick === 'x' ||
    lowerPick === '2'
  ) {
    const m = sportyMarkets.find((x) => x.marketId === '1');
    if (m) {
      let outcome: (typeof m.outcomes)[0] | undefined;
      if (lowerPick === '1' || lowerPick === 'home' || lowerMarket === 'home win') {
        outcome =
          m.outcomes.find((o) => o.outcomeId === '1') ||
          m.outcomes.find((o) => o.name.toLowerCase().includes('home'));
      } else if (lowerPick === 'x' || lowerPick === 'draw') {
        outcome =
          m.outcomes.find((o) => o.outcomeId === '2') ||
          m.outcomes.find((o) => o.name.toLowerCase().includes('draw'));
      } else if (lowerPick === '2' || lowerPick === 'away') {
        outcome =
          m.outcomes.find((o) => o.outcomeId === '3') ||
          m.outcomes.find((o) => o.name.toLowerCase().includes('away'));
      }
      if (outcome) {
        return { marketId: m.marketId, outcomeId: outcome.outcomeId, specifier: m.specifier };
      }
    }
  }

  // --- Double Chance (market 10) ---
  // SportyBet labels vary: "1X" / "12" / "X2" OR "Home or Draw" / "Home or Away" / "Draw or Away"
  if (lowerMarket.includes('double chance') || ['1x', 'x2', '12'].includes(lowerPick)) {
    const m =
      sportyMarkets.find((x) => x.marketId === '10') ||
      sportyMarkets.find((x) => x.name.toLowerCase().includes('double chance'));
    if (m) {
      const aliases: Record<string, string[]> = {
        '1x': ['1x', 'home or draw', 'home/draw', '1 or x', '1 or draw'],
        x2: ['x2', 'draw or away', 'draw/away', 'x or 2', 'draw or 2'],
        '12': ['12', 'home or away', 'home/away', '1 or 2', 'home or 2'],
      };
      const keys = aliases[lowerPick] || [lowerPick];
      let outcome = m.outcomes.find((o) => {
        const n = o.name.toLowerCase().replace(/\s+/g, ' ').trim();
        return keys.some((a) => n === a || n.includes(a)) || o.outcomeId === pickName;
      });
      // Common numeric outcomeIds on SportyBet DC: 9=1X, 10=12, 11=X2 (varies by feed)
      if (!outcome) {
        const byId: Record<string, string[]> = {
          '1x': ['9', '1'],
          '12': ['10', '3'],
          x2: ['11', '2'],
        };
        const ids = byId[lowerPick] || [];
        outcome = m.outcomes.find((o) => ids.includes(o.outcomeId));
      }
      // Last resort: match by normalized pick characters only (1, x, 2)
      if (!outcome && lowerPick.length <= 2) {
        outcome = m.outcomes.find((o) => {
          const compact = o.name.toLowerCase().replace(/[^1x2]/g, '');
          return compact === lowerPick || compact === lowerPick.split('').reverse().join('');
        });
      }
      if (outcome) {
        return {
          marketId: m.marketId || '10',
          outcomeId: outcome.outcomeId,
          specifier: m.specifier ?? null,
        };
      }
    }
  }

  // --- Over / Under (market 18) ---
  if (
    lowerMarket.includes('over') ||
    lowerMarket.includes('under') ||
    lowerPick.includes('over') ||
    lowerPick.includes('under')
  ) {
    const isOver = lowerPick.includes('over') || lowerMarket.includes('over 0.5');
    // Extract total from pick e.g. "Over 0.5" / "Under 3.5"
    const totalMatch = lowerPick.match(/(\d+(?:\.\d+)?)/) || lowerMarket.match(/(\d+(?:\.\d+)?)/);
    const total = totalMatch ? totalMatch[1] : isOver ? '0.5' : '3.5';
    const specifier = `total=${total}`;

    const candidates = sportyMarkets.filter((x) => x.marketId === '18');
    const m =
      candidates.find((x) => x.specifier === specifier) ||
      candidates.find((x) => (x.specifier || '').includes(total)) ||
      candidates[0];

    if (m) {
      const label = isOver ? 'over' : 'under';
      const outcome =
        m.outcomes.find((o) => o.name.toLowerCase().includes(label)) ||
        m.outcomes.find((o) => (isOver ? o.outcomeId === '12' : o.outcomeId === '13'));
      if (outcome) {
        return {
          marketId: m.marketId,
          outcomeId: outcome.outcomeId,
          specifier: m.specifier ?? specifier,
        };
      }
    }
  }

  // Generic name fallback (last resort)
  for (const market of sportyMarkets) {
    if (
      market.name.toLowerCase().includes(lowerMarket) ||
      market.marketId === lowerMarket
    ) {
      for (const outcome of market.outcomes) {
        if (
          outcome.name.toLowerCase().includes(lowerPick) ||
          outcome.outcomeId === pickName ||
          outcome.outcomeId === lowerPick
        ) {
          return {
            marketId: market.marketId,
            outcomeId: outcome.outcomeId,
            specifier: market.specifier,
          };
        }
      }
    }
  }

  return {};
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

    // 7b. SportyBet native market data for booking code generation
    const sportyIds = game.sportyMarkets;

    // Optional: only games that already have usable SportyBet market payloads
    if (criteria.requireFullMarketData) {
      const hasBookableMarkets =
        Array.isArray(sportyIds) &&
        sportyIds.length > 0 &&
        sportyIds.some(
          (m) =>
            (m.marketId === '1' || m.marketId === '10' || m.marketId === '18') &&
            m.outcomes.length > 0
        );
      if (!hasBookableMarkets) {
        continue;
      }
    }

    // 8. Market Evaluation
    const eligiblePicks: SelectedPick[] = [];
    const pickBookie: BookieId | undefined =
      criteria.selectedCompany !== 'ALL' ? criteria.selectedCompany : undefined;

    // Double Chance (1X, X2, 12) — only include when SportyBet IDs resolve
    if (criteria.enableDoubleChance && activeMarkets.doubleChance) {
      for (const dc of activeMarkets.doubleChance) {
        if (dc.odd >= criteria.dcMin && dc.odd <= criteria.dcMax) {
          const ids = findSportyBetIds(sportyIds, 'Double Chance', dc.pick);
          if (!ids.marketId || !ids.outcomeId) continue;
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Double Chance',
            pick: dc.pick,
            odd: dc.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Home Win (1)
    if (criteria.enableHomeWin && activeMarkets.homeWin) {
      const hw = activeMarkets.homeWin;
      if (hw.odd >= criteria.homeWinMin && hw.odd <= criteria.homeWinMax) {
        const ids = findSportyBetIds(sportyIds, 'Home Win', hw.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Home Win',
            pick: '1',
            odd: hw.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Over 0.5 Goals
    if (criteria.enableOver05 && activeMarkets.overUnder) {
      const over05 = activeMarkets.overUnder.find((m) => m.pick === 'Over 0.5');
      if (over05 && over05.odd > 1.01) {
        const ids = findSportyBetIds(sportyIds, 'Over 0.5', over05.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Over 0.5',
            pick: 'Over 0.5',
            odd: over05.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Under 3.5 Goals
    if (criteria.enableUnder35 && activeMarkets.overUnder) {
      const under35 = activeMarkets.overUnder.find((m) => m.pick === 'Under 3.5');
      if (under35 && under35.odd > 1.05) {
        const ids = findSportyBetIds(sportyIds, 'Under 3.5', under35.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Under 3.5',
            pick: 'Under 3.5',
            odd: under35.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
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
