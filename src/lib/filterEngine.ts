import { StandardGame, FilterCriteria, SelectedPick, BookieId, GameMarkets, SportyBetMarket, PlayerAvailability } from '@/types';

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

  // --- BTTS / GG-NG (market 29) ---
  if (
    lowerMarket.includes('btts') ||
    lowerMarket.includes('both teams') ||
    lowerMarket === 'gg' ||
    lowerMarket === 'ng' ||
    lowerPick === 'gg' ||
    lowerPick === 'ng' ||
    lowerPick === 'yes' ||
    lowerPick === 'no'
  ) {
    const m =
      sportyMarkets.find((x) => x.marketId === '29') ||
      sportyMarkets.find((x) => {
        const n = x.name.toLowerCase();
        return n.includes('both teams') || n.includes('gg') || n.includes('btts');
      });
    if (m) {
      const wantGg = lowerPick === 'gg' || lowerPick === 'yes' || lowerMarket.includes('gg');
      const wantNg = lowerPick === 'ng' || lowerPick === 'no';
      let outcome = m.outcomes.find((o) => {
        const n = o.name.toLowerCase();
        if (wantNg) return n === 'no' || n.includes('ng') || n.includes('not');
        return n === 'yes' || n.includes('gg') || n.includes('both');
      });
      if (!outcome) {
        outcome = m.outcomes.find((o) =>
          wantNg ? o.outcomeId === '76' : o.outcomeId === '74'
        );
      }
      if (outcome) {
        return { marketId: m.marketId || '29', outcomeId: outcome.outcomeId, specifier: m.specifier ?? null };
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

    // 1b. Cashout Filter: filter matches that explicitly support Cashout
    if (criteria.cashoutOnly && !game.cashoutAvailable) {
      continue;
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
    if (criteria.selectedLeagues && criteria.selectedLeagues.length > 0) {
      if (!criteria.selectedLeagues.some((lg) => normalizeTeamName(lg) === normLeague)) {
        continue;
      }
    }

    // 5b. Exclusion Triggers: discard if key player (GK, CB, top scorer/creator)
    // ruled out within 2 hours of kick-off
    const kickoffIn2h = kickoffMs - 2 * 60 * 60 * 1000;
    const keyPlayerOut = (avail: PlayerAvailability[] | undefined) =>
      avail?.some(
        (p) =>
          p.isKeyPlayer &&
          (p.status === 'INJURED' || p.status === 'SUSPENDED') &&
          p.ruledOutAt &&
          new Date(p.ruledOutAt).getTime() >= kickoffIn2h &&
          new Date(p.ruledOutAt).getTime() <= kickoffMs
      );
    if (keyPlayerOut(game.playerAvailability?.home) || keyPlayerOut(game.playerAvailability?.away)) {
      continue;
    }

    // 5c. Fixture Fatigue Boundary: avoid "Safe" accumulator legs on teams
    // playing their 3rd match within a 7-day period
    const fatigueCutoff = kickoffMs - 7 * 24 * 60 * 60 * 1000;
    const recentMatchCount = (matches: { date: string; opponent: string }[] | undefined) =>
      matches?.filter((m) => {
        const d = new Date(m.date).getTime();
        return d >= fatigueCutoff && d <= kickoffMs;
      }).length || 0;
    const homeFatigue = recentMatchCount(game.recentMatches?.home);
    const awayFatigue = recentMatchCount(game.recentMatches?.away);
    // If either team has 2+ matches in last 7 days, they are on their 3rd match → fatigue
    if (homeFatigue >= 2 || awayFatigue >= 2) {
      // Only exclude "Safe" market picks (low odds, high confidence). Let the
      // caller decide which market tier this applies to by tagging the game.
      game.abnormalOddsFlag = game.abnormalOddsFlag ?? false;
      // Mark fatigue so upper layers can deprioritize safe legs on these teams
      (game as unknown as { _fatigue?: boolean })._fatigue = true;
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
            (m.marketId === '1' || m.marketId === '10' || m.marketId === '18' || m.marketId === '29') &&
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

    // Require SportyBet IDs only when user asked for bookable-only slips
    const mustHaveIds = criteria.requireFullMarketData;
    const pushPick = (
      base: Omit<SelectedPick, 'marketId' | 'outcomeId' | 'specifier' | 'bookie'>,
      ids: { marketId?: string; outcomeId?: string; specifier?: string | null }
    ) => {
      if (mustHaveIds && (!ids.marketId || !ids.outcomeId)) return;
      eligiblePicks.push({
        ...base,
        marketId: ids.marketId,
        outcomeId: ids.outcomeId,
        specifier: ids.specifier,
        bookie: pickBookie,
      });
    };

    // Double Chance (1X, 12, X2)
    if (criteria.enableDoubleChance && activeMarkets.doubleChance) {
      const allow1X = criteria.enableDc1X !== false;
      const allow12 = criteria.enableDc12 !== false;
      const allowX2 = criteria.enableDcX2 !== false;

      for (const dc of activeMarkets.doubleChance) {
        const p = (dc.pick || '').toUpperCase().trim();
        if (p === '1X' && !allow1X) continue;
        if (p === '12' && !allow12) continue;
        if (p === 'X2' && !allowX2) continue;

        if (dc.odd >= criteria.dcMin && dc.odd <= criteria.dcMax) {
          const ids = findSportyBetIds(sportyIds, 'Double Chance', dc.pick);
          pushPick(
            {
              gameId: game.id,
              eventId: game.eventId,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              league: game.league,
              kickoffTime: game.kickoffTime,
              marketName: 'Double Chance',
              pick: dc.pick,
              odd: dc.odd,
            },
            ids
          );
        }
      }
    }

    // Home Win (1)
    if (criteria.enableHomeWin && activeMarkets.homeWin) {
      const hw = activeMarkets.homeWin;
      if (hw.odd >= criteria.homeWinMin && hw.odd <= criteria.homeWinMax) {
        const ids = findSportyBetIds(sportyIds, 'Home Win', hw.pick);
        pushPick(
          {
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Home Win',
            pick: '1',
            odd: hw.odd,
          },
          ids
        );
      }
    }

    // Away Win (2)
    if (criteria.enableAwayWin && activeMarkets.awayWin) {
      const aw = activeMarkets.awayWin;
      if (aw.odd >= criteria.awayWinMin && aw.odd <= criteria.awayWinMax) {
        const ids = findSportyBetIds(sportyIds, 'Away Win', aw.pick);
        pushPick(
          {
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Away Win',
            pick: '2',
            odd: aw.odd,
          },
          ids
        );
      }
    }

    // Over goals — multi-selection (0.5 and 1.5 simultaneously) + odds range
    if (criteria.enableOver && activeMarkets.overUnder) {
      const activeOverLines: ('0.5' | '1.5')[] =
        Array.isArray(criteria.overGoalLines) && criteria.overGoalLines.length > 0
          ? criteria.overGoalLines
          : criteria.overGoalLine
            ? [criteria.overGoalLine]
            : ['0.5', '1.5'];
      const oMin = criteria.overMin ?? 1.01;
      const oMax = criteria.overMax ?? 10;

      for (const line of activeOverLines) {
        const overPick = activeMarkets.overUnder.find((m) => m.pick === `Over ${line}`);
        if (overPick && overPick.odd >= oMin && overPick.odd <= oMax) {
          const ids = findSportyBetIds(sportyIds, `Over ${line}`, overPick.pick);
          pushPick(
            {
              gameId: game.id,
              eventId: game.eventId,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              league: game.league,
              kickoffTime: game.kickoffTime,
              marketName: `Over ${line}`,
              pick: `Over ${line}`,
              odd: overPick.odd,
            },
            ids
          );
        }
      }
    }

    // Under goals — multi-selection (3.5 and 4.5 simultaneously) + odds range
    if (criteria.enableUnder && activeMarkets.overUnder) {
      const activeLines: ('3.5' | '4.5')[] =
        Array.isArray(criteria.underGoalLines) && criteria.underGoalLines.length > 0
          ? criteria.underGoalLines
          : criteria.underGoalLine
            ? [criteria.underGoalLine]
            : ['3.5'];
      const uMin = criteria.underMin ?? 1.05;
      const uMax = criteria.underMax ?? 10;

      for (const line of activeLines) {
        const underPick = activeMarkets.overUnder.find((m) => m.pick === `Under ${line}`);
        if (underPick && underPick.odd >= uMin && underPick.odd <= uMax) {
          const ids = findSportyBetIds(sportyIds, `Under ${line}`, underPick.pick);
          pushPick(
            {
              gameId: game.id,
              eventId: game.eventId,
              homeTeam: game.homeTeam,
              awayTeam: game.awayTeam,
              league: game.league,
              kickoffTime: game.kickoffTime,
              marketName: `Under ${line}`,
              pick: `Under ${line}`,
              odd: underPick.odd,
            },
            ids
          );
        }
      }
    }

    // Both teams to score (BTTS) — multi-selection (GG and NGG simultaneously) + odds range
    if (criteria.enableBtts && activeMarkets.btts) {
      const bMin = criteria.bttsMin ?? 1.01;
      const bMax = criteria.bttsMax ?? 10;
      const activeSelections: string[] =
        Array.isArray(criteria.bttsSelections) && criteria.bttsSelections.length > 0
          ? criteria.bttsSelections
          : ['GG', 'NGG'];

      for (const bt of activeMarkets.btts) {
        if (bt.odd < bMin || bt.odd > bMax) continue;
        const normPick = bt.pick.toUpperCase();
        const isGg = normPick === 'GG' || normPick === 'YES';
        const isNg = normPick === 'NG' || normPick === 'NGG' || normPick === 'NO';

        const matchesFilter =
          (isGg && activeSelections.includes('GG')) ||
          (isNg && (activeSelections.includes('NGG') || activeSelections.includes('NG')));

        if (!matchesFilter) continue;

        const ids = findSportyBetIds(sportyIds, 'BTTS', bt.pick);
        pushPick(
          {
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'BTTS',
            pick: bt.pick,
            odd: bt.odd,
          },
          ids
        );
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
 * Balanced Favoritism Random Selection Scheme for Guests and balanced slips:
 * - Strictly favors high-probability outcomes for the majority of the betslip (~70-75% of legs)
 * - Automatically blends in higher-odds value selections (~25-30% of legs) based on active user filters
 *   (e.g., Under 3.5/4.5 Goals, GG/NGG, value 1X2).
 * - Avoids duplicate matches in the generated slip.
 */
export function pickRandomSelections(
  evaluations: GameEvaluation[],
  count: number
): SelectedPick[] {
  if (evaluations.length === 0 || count <= 0) return [];

  const needed = Math.min(count, evaluations.length);
  if (needed === 1) {
    const sorted = [...evaluations].sort((a, b) => {
      const oddA = a.bestPick?.odd ?? 99;
      const oddB = b.bestPick?.odd ?? 99;
      return oddA - oddB;
    });
    const top = sorted.slice(0, Math.min(3, sorted.length));
    const chosen = fisherYatesShuffle(top)[0]?.bestPick;
    return chosen ? [chosen] : [];
  }

  const highProbTarget = Math.max(1, Math.ceil(needed * 0.70));
  const usedGameIds = new Set<string>();
  const selectedPicks: SelectedPick[] = [];

  // Categorize candidate picks across available evaluations
  const highProbPool: { evalItem: GameEvaluation; pick: SelectedPick }[] = [];
  const valuePool: { evalItem: GameEvaluation; pick: SelectedPick }[] = [];

  for (const ev of evaluations) {
    for (const p of ev.eligiblePicks) {
      const isValueMarket =
        p.marketName.includes('Under') ||
        p.marketName.includes('BTTS') ||
        p.marketName.includes('GG') ||
        p.odd >= 1.48;

      if (isValueMarket && p.odd >= 1.42 && p.odd <= 2.45) {
        valuePool.push({ evalItem: ev, pick: p });
      }

      if (
        p.odd <= 1.45 ||
        p.marketName === 'Double Chance' ||
        p.marketName === 'Over 0.5' ||
        p.marketName === 'Under 4.5'
      ) {
        highProbPool.push({ evalItem: ev, pick: p });
      }
    }
  }

  // 1. Pick majority high-probability banker outcomes
  const shuffledHigh = fisherYatesShuffle(highProbPool);
  // Sort with stochastic jitter towards safer odds
  shuffledHigh.sort((a, b) => a.pick.odd - b.pick.odd + (Math.random() - 0.5) * 0.2);

  for (const item of shuffledHigh) {
    if (selectedPicks.length >= highProbTarget) break;
    if (!usedGameIds.has(item.evalItem.game.id)) {
      usedGameIds.add(item.evalItem.game.id);
      selectedPicks.push(item.pick);
    }
  }

  // 2. Blend in higher-odds value selections based on active filters (Under 3.5/4.5, GG/NGG)
  const shuffledValue = fisherYatesShuffle(valuePool);
  for (const item of shuffledValue) {
    if (selectedPicks.length >= needed) break;
    if (!usedGameIds.has(item.evalItem.game.id)) {
      usedGameIds.add(item.evalItem.game.id);
      selectedPicks.push(item.pick);
    }
  }

  // 3. Fallback fill if needed
  if (selectedPicks.length < needed) {
    const remainingEvals = fisherYatesShuffle(
      evaluations.filter((ev) => !usedGameIds.has(ev.game.id))
    );
    for (const ev of remainingEvals) {
      if (selectedPicks.length >= needed) break;
      const pick = ev.bestPick || ev.eligiblePicks[0];
      if (pick) {
        usedGameIds.add(ev.game.id);
        selectedPicks.push(pick);
      }
    }
  }

  return selectedPicks;
}

/**
 * Section 3B: AI Pick (Educated Analysis) Logic
 * Evaluates up to last 5 H2H encounters with relevance filtering (ignoring obsolete historical matches),
 * applies educated fallback via recent form/momentum and home advantage, and executes a favoritism scheme
 * detecting abnormally high value odds where bookmaker pricing deviates.
 */
function scoreEvaluation(ev: GameEvaluation, usedLeagues: Set<string>): number {
  const pick = ev.bestPick;
  if (!pick) return -Infinity;

  const game = ev.game;
  const ideal = 1.15;
  const oddScore = 1 / (1 + Math.abs(pick.odd - ideal) * 6);
  const idBonus = pick.marketId && pick.outcomeId ? 0.3 : 0;

  // Base market safety ranking
  const marketScores: Record<string, number> = {
    'Double Chance': 0.30,
    'Home Win': 0.22,
    'Over 0.5': 0.22,
    'Under 3.5': 0.22,
    'Under 4.5': 0.20,
    'Over 1.5': 0.18,
    'BTTS': 0.16,
    'Away Win': 0.12,
  };
  const marketBonus = marketScores[pick.marketName] || 0.15;

  // 1. Head-to-Head (H2H) analysis (up to 5 recent relevant matches)
  let h2hScore = 0;
  if (game.h2hRecent5 && game.h2hRecent5.length > 0) {
    // Relevance filter: ignore obsolete historical matches (relevance flag)
    const relevantH2H = game.h2hRecent5.filter((m) => m.relevant);
    if (relevantH2H.length > 0) {
      const normHome = normalizeTeamName(game.homeTeam);
      let homeWins = 0;
      let awayWins = 0;
      let draws = 0;
      for (const m of relevantH2H) {
        const mHome = normalizeTeamName(m.homeTeam);
        const homeIsCurrentHome = mHome.includes(normHome) || normHome.includes(mHome);
        if (m.home_score > m.away_score) {
          if (homeIsCurrentHome) homeWins++; else awayWins++;
        } else if (m.away_score > m.home_score) {
          if (homeIsCurrentHome) awayWins++; else homeWins++;
        } else {
          draws++;
        }
      }
      const count = relevantH2H.length;
      if (pick.marketName === 'Home Win' || pick.pick === '1' || pick.pick === '1X') {
        h2hScore = ((homeWins + (pick.pick === '1X' ? draws * 0.7 : 0)) / count) * 0.45;
      } else if (pick.marketName === 'Away Win' || pick.pick === '2' || pick.pick === 'X2') {
        h2hScore = ((awayWins + (pick.pick === 'X2' ? draws * 0.7 : 0)) / count) * 0.45;
      } else if (pick.marketName.includes('Over') || pick.marketName === 'BTTS') {
        const totalGoals = relevantH2H.reduce((acc, m) => acc + m.home_score + m.away_score, 0);
        const avgGoals = totalGoals / count;
        h2hScore = avgGoals >= 2.0 ? 0.25 : -0.1;
      }
    }
  }

  // 2. Educated Fallback: Form edge, goal momentum & non-mathematical team advantage
  const homeAdvantage = 0.12; // non-mathematical team advantage (home turf)
  const formEdge = game.insights?.formEdge ?? 0.5;
  let formBonus = 0;
  if (pick.marketName === 'Home Win' || pick.pick === '1X') {
    formBonus = (formEdge - 0.5 + homeAdvantage) * 0.5;
  } else if (pick.marketName === 'Away Win' || pick.pick === 'X2') {
    formBonus = (0.5 - formEdge) * 0.5;
  }

  // 3. Favoritism Scheme & Value Odds Detection
  // Check if bookmaker pricing deviates favorably from recent performance trends
  let valueBonus = 0;
  const impliedProb = 1 / pick.odd;
  const estimatedProb = 0.5 + (formEdge - 0.5) * 0.4 + (h2hScore > 0 ? 0.1 : 0);
  if (estimatedProb > impliedProb + 0.12 && pick.odd >= 1.25) {
    game.abnormalOddsFlag = true;
    valueBonus = 0.35; // Value pick boost
  }

  // Cashout availability preference
  const cashoutBonus = game.cashoutAvailable ? 0.12 : 0;

  const league = (game.league || '').toLowerCase();
  const diversity = usedLeagues.has(league) ? -0.35 : 0.18;
  const jitter = Math.random() * 0.05;

  return oddScore + idBonus + marketBonus + h2hScore + formBonus + valueBonus + cashoutBonus + diversity + jitter;
}

/**
 * AI-style selection: ranks eligible games by score, picks top N with league diversity.
 * Skips gameIds already on the slip when excludeGameIds is provided.
 */
export function pickSmartSelections(
  evaluations: GameEvaluation[],
  count: number,
  excludeGameIds: Set<string> | Set<unknown> = new Set()
): SelectedPick[] {
  if (evaluations.length === 0 || count <= 0) return [];

  const pool = evaluations.filter(
    (ev) => ev.bestPick && !excludeGameIds.has(ev.game.id)
  );
  if (pool.length === 0) return [];

  const selected: SelectedPick[] = [];
  const usedLeagues = new Set<string>();
  const remaining = [...pool];

  while (selected.length < count && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = scoreEvaluation(remaining[i], usedLeagues);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    if (chosen.bestPick) {
      selected.push(chosen.bestPick);
      usedLeagues.add((chosen.game.league || '').toLowerCase());
    }
  }

  return selected;
}

/**
 * Merge new picks into the slip without duplicating the same match (gameId).
 */
export function mergePicksIntoSlip(
  existing: SelectedPick[],
  incoming: SelectedPick[]
): SelectedPick[] {
  const byGame = new Map<string, SelectedPick>();
  for (const p of existing) byGame.set(p.gameId, p);
  for (const p of incoming) {
    if (!byGame.has(p.gameId)) byGame.set(p.gameId, p);
  }
  return Array.from(byGame.values());
}

/**
 * Computes accumulator total odds from selected picks.
 */
export function calculateAccumulatorOdds(picks: SelectedPick[]): number {
  if (picks.length === 0) return 1.0;
  const raw = picks.reduce((acc, curr) => acc * curr.odd, 1.0);
  return Math.round(raw * 100) / 100;
}

/**
 * Rates a pick's accumulator quality / safety.
 * Higher score = safer, higher-preference banker leg.
 * Lower score = riskier, more volatile leg that a bettor can "do without".
 */
export function scorePickPreference(pick: SelectedPick): number {
  const ideal = 1.15;
  const oddDistance = Math.abs(pick.odd - ideal);
  const oddScore = 1 / (1 + oddDistance * 6);
  const bookableBonus = pick.marketId && pick.outcomeId ? 0.3 : 0;
  const marketScores: Record<string, number> = {
    'Double Chance': 0.45,
    'Over 0.5': 0.4,
    'Under 3.5': 0.35,
    'Home Win': 0.25,
    'Under 4.5': 0.25,
    'Over 1.5': 0.2,
    'BTTS': 0.15,
    'Away Win': 0.1,
  };
  const marketScore = marketScores[pick.marketName] || 0.15;
  return oddScore + bookableBonus + marketScore;
}

/**
 * Remove N "least preferred" (highest risk / lowest quality) picks.
 * Discards the games the bettor can "do without", retaining the safest bankers.
 */
export function removeLeastPreferredPicks(
  picks: SelectedPick[],
  countToRemove: number
): SelectedPick[] {
  if (countToRemove <= 0) return picks;
  if (picks.length <= countToRemove) return [];

  // Score each pick keeping track of original index
  const scored = picks.map((p, originalIdx) => ({
    pick: p,
    score: scorePickPreference(p),
    originalIdx,
  }));

  // Sort ascending by score so the weakest / least preferred are first
  scored.sort((a, b) => a.score - b.score);

  // Take the indices of the countToRemove least preferred picks
  const toRemoveIndices = new Set(scored.slice(0, countToRemove).map((item) => item.originalIdx));

  // Return the remaining picks in their original order
  return picks.filter((_, idx) => !toRemoveIndices.has(idx));
}

