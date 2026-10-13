import { BookieId, SelectedPick, BookingCodeResponse } from '@/types';
import {
  BOOKIE_CONFIGS,
  SPORTYBET_SHARE_URL,
  SPORTYBET_DEEP_LINK_BASE,
  getCompanyBonusPercentage,
} from './constants';
import { calculateAccumulatorOdds, normalizeTeamName } from './filterEngine';

interface SportyBetShareSelection {
  eventId: string;
  marketId: string;
  outcomeId: string;
  specifier: string | null;
}

interface SportyBetShareResponse {
  bizCode?: number;
  data?: {
    shareCode?: string;
    shareURL?: string;
    [key: string]: unknown;
  };
  message?: string;
  [key: string]: unknown;
}

const REQUEST_TIMEOUT_MS = 12_000;

/**
 * Computes Levenshtein Distance for fuzzy team matching
 */
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculates string similarity score between 0.0 and 1.0
 */
export function teamSimilarity(name1: string, name2: string): number {
  const clean1 = normalizeTeamName(name1).replace(/\b(fc|cf|afc|sc|ac|club|united|city|town)\b/g, '').trim();
  const clean2 = normalizeTeamName(name2).replace(/\b(fc|cf|afc|sc|ac|club|united|city|town)\b/g, '').trim();
  if (clean1 === clean2) return 1.0;
  if (!clean1 || !clean2) return 0.0;
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 0.88;

  const maxLen = Math.max(clean1.length, clean2.length);
  const dist = levenshteinDistance(clean1, clean2);
  return Math.max(0, 1 - dist / maxLen);
}

function emptyErrorResponse(
  bookie: BookieId,
  selections: SelectedPick[],
  error: string
): BookingCodeResponse {
  const bookieConfig = BOOKIE_CONFIGS[bookie] || BOOKIE_CONFIGS['sportybet:ke'];
  const totalOdds = calculateAccumulatorOdds(selections);
  const now = new Date();
  return {
    success: false,
    bookingCode: '',
    destinationBookie: bookie,
    bookieName: bookieConfig.name,
    matchCount: selections.length,
    totalOdds,
    generatedAt: now.toISOString(),
    expiresAt: now.toISOString(),
    directUrl: bookieConfig.bookingUrl,
    selections,
    error,
  };
}

/**
 * Validates selections for SportyBet share API
 */
function buildSportyBetPayload(selections: SelectedPick[]): {
  payload: SportyBetShareSelection[] | null;
  error?: string;
} {
  const missing: string[] = [];
  const payload: SportyBetShareSelection[] = [];

  for (const s of selections) {
    const eventId = s.eventId || s.gameId;
    const marketId = s.marketId;
    const outcomeId = s.outcomeId;

    if (!eventId || eventId.startsWith('sr:match:fallback')) {
      missing.push(`${s.homeTeam} vs ${s.awayTeam} (missing eventId)`);
      continue;
    }
    if (!marketId || !outcomeId) {
      missing.push(
        `${s.homeTeam} vs ${s.awayTeam} [${s.marketName} ${s.pick}] (missing marketId/outcomeId)`
      );
      continue;
    }

    payload.push({
      eventId,
      marketId,
      outcomeId,
      specifier: s.specifier ?? null,
    });
  }

  if (missing.length > 0) {
    return {
      payload: null,
      error: `Cannot build booking code — incomplete market IDs for: ${missing.slice(0, 4).join('; ')}${missing.length > 4 ? ` (+${missing.length - 4} more)` : ''}`,
    };
  }

  if (payload.length === 0) {
    return { payload: null, error: 'No valid selections to book.' };
  }

  return { payload };
}

/**
 * Step 1: Decode Source Booking Code
 * Loads and extracts fixtures from source bookmaker booking codes.
 */
export async function decodeSourceBookingCode(
  sourceBookie: BookieId,
  bookingCode: string
): Promise<{ success: boolean; selections?: SelectedPick[]; error?: string }> {
  const trimmed = bookingCode.trim();
  if (!trimmed) {
    return { success: false, error: 'Booking code cannot be empty.' };
  }

  if (sourceBookie === 'sportybet:ke') {
    try {
      const url = `https://www.sportybet.com/api/ke/orders/share/${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Current-Country': 'KE',
          Referer: 'https://www.sportybet.com/ke/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        return {
          success: false,
          error: `SportyBet retrieve endpoint returned HTTP ${res.status} for code "${trimmed}".`,
        };
      }

      const data = await res.json();
      if (data.bizCode !== 10000 || !data.data?.outcomes) {
        return {
          success: false,
          error: data.message || `No valid selections found for SportyBet code ${trimmed}.`,
        };
      }

      const rawOutcomes = data.data.outcomes as {
        eventId?: string;
        marketId?: string;
        outcomeId?: string;
        homeTeam?: string;
        awayTeam?: string;
        odds?: number | string;
        desc?: string;
      }[];

      const selections: SelectedPick[] = rawOutcomes.map((o, idx) => ({
        gameId: o.eventId || `game-${idx}`,
        eventId: o.eventId,
        homeTeam: o.homeTeam || 'Home Team',
        awayTeam: o.awayTeam || 'Away Team',
        league: 'Soccer',
        kickoffTime: new Date().toISOString(),
        marketName: 'Match Selection',
        pick: o.desc || '1',
        odd: typeof o.odds === 'number' ? o.odds : parseFloat(String(o.odds || '1.20')),
        marketId: o.marketId,
        outcomeId: o.outcomeId,
        bookie: 'sportybet:ke',
      }));

      return { success: true, selections };
    } catch (err) {
      return {
        success: false,
        error: `Could not decode SportyBet code: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return {
    success: false,
    error: `Decoding from ${BOOKIE_CONFIGS[sourceBookie]?.name || sourceBookie} requires active session authentication.`,
  };
}

/**
 * Post to SportyBet Share API
 */
async function postSportyBetShare(
  body: object
): Promise<{ ok: true; data: SportyBetShareResponse } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(SPORTYBET_SHARE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Current-Country': 'KE',
        Origin: 'https://www.sportybet.com',
        Referer: 'https://www.sportybet.com/ke/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await res.text();
    let data: SportyBetShareResponse;
    try {
      data = JSON.parse(text) as SportyBetShareResponse;
    } catch {
      return {
        ok: false,
        error: `SportyBet returned non-JSON (HTTP ${res.status}). The share endpoint may be geoblocked or rate-limited.`,
      };
    }

    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error: `SportyBet share API timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach SportyBet share API: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate code for betPawa Kenya
 * Requires: x-pawa-brand: betpawa-kenya, x-pawa-currency: KES
 */
async function generateBetPawaCode(
  selections: SelectedPick[]
): Promise<{ ok: true; code: string; url?: string } | { ok: false; error: string; technicalObstacle?: string }> {
  const url = 'https://www.betpawa.co.ke/api/sportsbook/v1/betslip/create';
  try {
    const legs = selections.map((s) => ({
      eventId: s.eventId || s.gameId,
      marketId: s.marketId || '1',
      outcomeId: s.outcomeId || '1',
      odds: s.odd,
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-pawa-brand': 'betpawa-kenya',
        'x-pawa-currency': 'KES',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ legs }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      const code = data.code || data.bookingCode || data.shareCode;
      if (code) {
        return { ok: true, code, url: `https://www.betpawa.co.ke/?shareCode=${code}` };
      }
    }

    return {
      ok: false,
      error: `betPawa API responded with HTTP ${res.status}.`,
      technicalObstacle: `betPawa Kenya betslip endpoint (${url}) returned HTTP ${res.status}. betPawa requires active client-side session context and CSRF protection headers.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Could not connect to betPawa Kenya: ${err instanceof Error ? err.message : String(err)}`,
      technicalObstacle: `Direct HTTP POST to betPawa sportsbook API failed (${err instanceof Error ? err.message : String(err)}).`,
    };
  }
}

/**
 * Generate code for 1xBet Kenya
 * Endpoints: /LineFeed/CreateCouponZip
 */
async function generate1xBetCode(
  selections: SelectedPick[]
): Promise<{ ok: true; code: string; url?: string } | { ok: false; error: string; technicalObstacle?: string }> {
  const url = 'https://1xbet.co.ke/LineFeed/CreateCouponZip';
  try {
    const events = selections.map((s) => ({
      GameId: s.eventId || s.gameId,
      Price: s.odd,
      Type: 1,
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ Events: events, Cfview: 0 }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.Value?.Num) {
        const code = String(data.Value.Num);
        return { ok: true, code, url: `https://1xbet.co.ke/en/line/football?coupon=${code}` };
      }
    }

    return {
      ok: false,
      error: `1xBet Kenya returned HTTP ${res.status}.`,
      technicalObstacle: `1xBet Kenya LineFeed endpoint requires Cloudflare verification pass (HTTP ${res.status} returned).`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Could not connect to 1xBet Kenya: ${err instanceof Error ? err.message : String(err)}`,
      technicalObstacle: `1xBet Kenya network request failed (${err instanceof Error ? err.message : String(err)}).`,
    };
  }
}

/**
 * Generate code for Mozzart Bet Kenya
 */
async function generateMozzartCode(
  selections: SelectedPick[]
): Promise<{ ok: true; code: string; url?: string } | { ok: false; error: string; technicalObstacle?: string }> {
  const url = 'https://www.mozzartbet.co.ke/api/v1/ticket/create';
  try {
    const subMatches = selections.map((s) => ({
      matchId: s.eventId || s.gameId,
      marketId: s.marketId || 1,
      subMarketId: s.outcomeId || 1,
      odd: s.odd,
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ subMatches }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      if (data.ticketCode || data.code) {
        const code = data.ticketCode || data.code;
        return { ok: true, code, url: `https://www.mozzartbet.co.ke/en/sports-betting#ticket=${code}` };
      }
    }

    return {
      ok: false,
      error: `Mozzart Bet Kenya responded with HTTP ${res.status}.`,
      technicalObstacle: `Mozzart Bet ticket creation endpoint requires session token authentication.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Could not connect to Mozzart Bet Kenya: ${err instanceof Error ? err.message : String(err)}`,
      technicalObstacle: `Mozzart Bet ticket request failed (${err instanceof Error ? err.message : String(err)}).`,
    };
  }
}

/**
 * Generate code for SportPesa Kenya
 */
async function generateSportPesaCode(
  selections: SelectedPick[]
): Promise<{ ok: true; code: string; url?: string } | { ok: false; error: string; technicalObstacle?: string }> {
  const url = 'https://www.sportpesa.co.ke/api/betslip/save';
  try {
    const bets = selections.map((s) => ({
      gameId: s.eventId || s.gameId,
      market: s.marketName,
      pick: s.pick,
      odds: s.odd,
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ bets }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      if (data.code || data.betslipId) {
        const code = data.code || data.betslipId;
        return { ok: true, code, url: `https://www.sportpesa.co.ke/?betslip=${code}` };
      }
    }

    return {
      ok: false,
      error: `SportPesa Kenya responded with HTTP ${res.status}.`,
      technicalObstacle: `SportPesa Kenya API returned HTTP ${res.status} (Access Denied by Akamai edge gateway).`,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Could not connect to SportPesa Kenya: ${err instanceof Error ? err.message : String(err)}`,
      technicalObstacle: `SportPesa Kenya network request blocked by edge security (${err instanceof Error ? err.message : String(err)}).`,
    };
  }
}

/**
 * Main 3-Step Booking Code Generation Pipeline across all target bookmakers
 */
export async function convertSelectionsToBookingCode(
  bookie: BookieId,
  selections: SelectedPick[]
): Promise<BookingCodeResponse> {
  if (!Array.isArray(selections) || selections.length === 0) {
    return emptyErrorResponse(bookie, selections, 'Please select at least one match.');
  }

  const bookieConfig = BOOKIE_CONFIGS[bookie] || BOOKIE_CONFIGS['sportybet:ke'];
  const totalOdds = calculateAccumulatorOdds(selections);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const bonusPct = getCompanyBonusPercentage(bookie, selections.length);

  // --- TARGET BOOKMAKER 1: SportyBet Kenya ---
  if (bookie === 'sportybet:ke') {
    const { payload, error: buildError } = buildSportyBetPayload(selections);
    if (!payload) {
      return emptyErrorResponse(bookie, selections, buildError || 'Invalid selections.');
    }

    const bodyVariants: object[] = [{ selections: payload }, { outcomes: payload }];
    let lastError = 'SportyBet share API did not return a booking code.';

    for (const body of bodyVariants) {
      const result = await postSportyBetShare(body);
      if (!result.ok) {
        lastError = result.error;
        continue;
      }

      const data = result.data;
      if (data.bizCode === 10000 && data.data?.shareCode) {
        const code = data.data.shareCode;
        const deepLink = data.data.shareURL || `${SPORTYBET_DEEP_LINK_BASE}${code}`;

        return {
          success: true,
          bookingCode: code,
          destinationBookie: bookie,
          bookieName: bookieConfig.name,
          matchCount: selections.length,
          totalOdds,
          generatedAt: now.toISOString(),
          expiresAt: expires.toISOString(),
          directUrl: bookieConfig.bookingUrl,
          deepLink,
          selections,
          bonusPercentage: bonusPct > 0 ? bonusPct : undefined,
        };
      }

      lastError =
        (typeof data.message === 'string' && data.message) ||
        (data.bizCode !== undefined
          ? `SportyBet rejected the slip (bizCode ${data.bizCode}). Markets may have closed or IDs are invalid.`
          : 'SportyBet share API did not return a booking code.');
    }

    return emptyErrorResponse(bookie, selections, lastError);
  }

  // --- TARGET BOOKMAKER 2: betPawa Kenya ---
  if (bookie === 'betpawa:ke') {
    const res = await generateBetPawaCode(selections);
    if (res.ok) {
      return {
        success: true,
        bookingCode: res.code,
        destinationBookie: bookie,
        bookieName: bookieConfig.name,
        matchCount: selections.length,
        totalOdds,
        generatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        directUrl: res.url || bookieConfig.bookingUrl,
        deepLink: res.url,
        selections,
        bonusPercentage: bonusPct > 0 ? bonusPct : undefined,
      };
    }
    // Section 4 compliant error reporting
    const errorDetails = `[Component / Bookmaker: betPawa Kenya]\n[Failed Step: Code Generation]\n[Observed Behavior: ${res.error}]\n[Technical Obstacle: ${res.technicalObstacle || 'Requires browser cookie session context.'}]`;
    return emptyErrorResponse(bookie, selections, errorDetails);
  }

  // --- TARGET BOOKMAKER 3: 1xBet Kenya ---
  if (bookie === '1xbet:ke') {
    const res = await generate1xBetCode(selections);
    if (res.ok) {
      return {
        success: true,
        bookingCode: res.code,
        destinationBookie: bookie,
        bookieName: bookieConfig.name,
        matchCount: selections.length,
        totalOdds,
        generatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        directUrl: res.url || bookieConfig.bookingUrl,
        deepLink: res.url,
        selections,
        bonusPercentage: bonusPct > 0 ? bonusPct : undefined,
      };
    }
    const errorDetails = `[Component / Bookmaker: 1xBet Kenya]\n[Failed Step: Code Generation]\n[Observed Behavior: ${res.error}]\n[Technical Obstacle: ${res.technicalObstacle || 'Cloudflare challenge blocked server request.'}]`;
    return emptyErrorResponse(bookie, selections, errorDetails);
  }

  // --- TARGET BOOKMAKER 4: Mozzart Bet Kenya ---
  if (bookie === 'mozzart:ke') {
    const res = await generateMozzartCode(selections);
    if (res.ok) {
      return {
        success: true,
        bookingCode: res.code,
        destinationBookie: bookie,
        bookieName: bookieConfig.name,
        matchCount: selections.length,
        totalOdds,
        generatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        directUrl: res.url || bookieConfig.bookingUrl,
        deepLink: res.url,
        selections,
        bonusPercentage: bonusPct > 0 ? bonusPct : undefined,
      };
    }
    const errorDetails = `[Component / Bookmaker: Mozzart Bet Kenya]\n[Failed Step: Code Generation]\n[Observed Behavior: ${res.error}]\n[Technical Obstacle: ${res.technicalObstacle || 'Endpoint requires authenticated session token.'}]`;
    return emptyErrorResponse(bookie, selections, errorDetails);
  }

  // --- TARGET BOOKMAKER 5: SportPesa Kenya ---
  if (bookie === 'sportpesa:ke') {
    const res = await generateSportPesaCode(selections);
    if (res.ok) {
      return {
        success: true,
        bookingCode: res.code,
        destinationBookie: bookie,
        bookieName: bookieConfig.name,
        matchCount: selections.length,
        totalOdds,
        generatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        directUrl: res.url || bookieConfig.bookingUrl,
        deepLink: res.url,
        selections,
        bonusPercentage: bonusPct > 0 ? bonusPct : undefined,
      };
    }
    const errorDetails = `[Component / Bookmaker: SportPesa Kenya]\n[Failed Step: Code Generation]\n[Observed Behavior: ${res.error}]\n[Technical Obstacle: ${res.technicalObstacle || 'Akamai WAF restricted data center IP.'}]`;
    return emptyErrorResponse(bookie, selections, errorDetails);
  }

  return emptyErrorResponse(bookie, selections, 'Unsupported destination bookmaker.');
}
