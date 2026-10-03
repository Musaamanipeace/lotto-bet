import { BookieId, SelectedPick, BookingCodeResponse } from '@/types';
import {
  BOOKIE_CONFIGS,
  SPORTYBET_SHARE_URL,
  SPORTYBET_DEEP_LINK_BASE,
  getCompanyBonusPercentage,
} from './constants';
import { calculateAccumulatorOdds } from './filterEngine';

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

const SHARE_TIMEOUT_MS = 12_000;

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
 * Validate every selection has the SportyBet IDs required by the share API.
 * Missing IDs produce invalid codes — fail early instead of guessing.
 */
function buildSelectionsPayload(selections: SelectedPick[]): {
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
      missing.push(`${s.homeTeam} vs ${s.awayTeam} (missing or demo eventId)`);
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
      error: `Cannot build booking code — incomplete market data for: ${missing.slice(0, 5).join('; ')}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ''}`,
    };
  }

  if (payload.length === 0) {
    return { payload: null, error: 'No valid selections to book.' };
  }

  return { payload };
}

async function postShare(
  body: object
): Promise<{ ok: true; data: SportyBetShareResponse } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHARE_TIMEOUT_MS);

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
        error: `SportyBet returned non-JSON (HTTP ${res.status}). The share endpoint may be blocked from this server IP.`,
      };
    }

    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error: `SportyBet share API timed out after ${SHARE_TIMEOUT_MS / 1000}s. Try fewer legs or retry shortly.`,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach SportyBet share API: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call SportyBet share API. No local/fake code generation — only real codes or errors.
 */
export async function convertSelectionsToBookingCode(
  bookie: BookieId,
  selections: SelectedPick[]
): Promise<BookingCodeResponse> {
  if (!Array.isArray(selections) || selections.length === 0) {
    return emptyErrorResponse(bookie, selections, 'Please select at least one match.');
  }

  if (bookie !== 'sportybet:ke') {
    return emptyErrorResponse(bookie, selections, 'Only SportyBet Kenya is supported.');
  }

  const { payload, error: buildError } = buildSelectionsPayload(selections);
  if (!payload) {
    return emptyErrorResponse(bookie, selections, buildError || 'Invalid selections.');
  }

  const bookieConfig = BOOKIE_CONFIGS[bookie];
  const totalOdds = calculateAccumulatorOdds(selections);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // SportyBet web client uses `selections`; older docs used `outcomes` — try both
  const bodyVariants: object[] = [{ selections: payload }, { outcomes: payload }];

  let lastError = 'SportyBet share API did not return a booking code.';

  for (const body of bodyVariants) {
    const result = await postShare(body);
    if (!result.ok) {
      lastError = result.error;
      continue;
    }

    const data = result.data;
    if (data.bizCode === 10000 && data.data?.shareCode) {
      const code = data.data.shareCode;
      const deepLink = data.data.shareURL || `${SPORTYBET_DEEP_LINK_BASE}${code}`;
      const bonusPct = getCompanyBonusPercentage(bookie, selections.length);

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
