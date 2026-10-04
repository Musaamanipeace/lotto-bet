import { StandardGame, GameMarkets, SportyBetMarket, SportyBetOutcome } from '@/types';
import {
  SPORTYBET_MARKET_IDS,
  SPORTYBET_UPCOMING_EVENTS_URL,
} from './constants';

/** Raw shapes returned by SportyBet pcUpcomingEvents */
interface SportyBetRawOutcome {
  id?: string;
  desc?: string;
  odds?: string | number;
  isActive?: number;
}

interface SportyBetRawMarket {
  id?: string;
  name?: string;
  desc?: string;
  specifier?: string;
  status?: number;
  outcomes?: SportyBetRawOutcome[];
}

interface SportyBetRawEvent {
  eventId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  estimateStartTime?: number;
  matchStatus?: string;
  markets?: SportyBetRawMarket[];
  sport?: {
    category?: {
      name?: string;
      tournament?: { name?: string };
    };
  };
  _tournamentName?: string;
  _categoryName?: string;
}

interface SportyBetRawTournament {
  id?: string;
  name?: string;
  categoryName?: string;
  events?: SportyBetRawEvent[];
}

interface SportyBetApiResponse {
  bizCode?: number;
  message?: string;
  data?: {
    totalNum?: number;
    tournaments?: SportyBetRawTournament[];
  };
}

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Current-Country': 'KE',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.sportybet.com/ke/',
};

/** Markets we care about: 1X2, Double Chance, Over/Under */
const REQUESTED_MARKET_IDS = [
  SPORTYBET_MARKET_IDS.MATCH_WINNER, // 1
  SPORTYBET_MARKET_IDS.DOUBLE_CHANCE, // 10
  SPORTYBET_MARKET_IDS.OVER_UNDER, // 18
  SPORTYBET_MARKET_IDS.BTTS, // 29 GG/NG
].join(',');

function parseOdd(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 1 ? n : 0;
}

function parseSportyMarkets(rawMarkets: SportyBetRawMarket[] | undefined): SportyBetMarket[] {
  if (!rawMarkets?.length) return [];
  return rawMarkets
    .map((m) => {
      const marketId = String(m.id ?? '');
      const name = m.name || m.desc || '';
      const outcomes: SportyBetOutcome[] = (m.outcomes || [])
        .filter((o) => o.isActive !== 0)
        .map((o) => ({
          outcomeId: String(o.id ?? ''),
          name: o.desc || '',
          odd: parseOdd(o.odds),
        }))
        .filter((o) => o.outcomeId && o.odd > 0);
      return {
        marketId,
        name,
        specifier: m.specifier === undefined ? null : m.specifier,
        outcomes,
      };
    })
    .filter((m) => m.marketId && m.outcomes.length > 0);
}

function findOutcomeByDesc(
  markets: SportyBetMarket[],
  marketId: string,
  descIncludes: string
): SportyBetOutcome | undefined {
  const lower = descIncludes.toLowerCase();
  for (const m of markets) {
    if (m.marketId !== marketId) continue;
    const found = m.outcomes.find((o) => o.name.toLowerCase().includes(lower));
    if (found) return found;
  }
  return undefined;
}

/** Double Chance outcomes use many label variants on SportyBet */
function findDoubleChanceOutcome(
  markets: SportyBetMarket[],
  pick: '1X' | 'X2' | '12'
): SportyBetOutcome | undefined {
  const m =
    markets.find((x) => x.marketId === SPORTYBET_MARKET_IDS.DOUBLE_CHANCE) ||
    markets.find((x) => x.name.toLowerCase().includes('double chance'));
  if (!m) return undefined;

  const aliases: Record<string, string[]> = {
    '1X': ['1x', 'home or draw', 'home/draw', '1 or x', '1 or draw'],
    X2: ['x2', 'draw or away', 'draw/away', 'x or 2', 'draw or 2'],
    '12': ['12', 'home or away', 'home/away', '1 or 2', 'home or 2'],
  };
  const keys = aliases[pick] || [pick.toLowerCase()];
  let found = m.outcomes.find((o) => {
    const n = o.name.toLowerCase().replace(/\s+/g, ' ').trim();
    return keys.some((a) => n === a || n.includes(a));
  });
  if (!found) {
    const byId: Record<string, string[]> = {
      '1X': ['9', '1'],
      '12': ['10', '3'],
      X2: ['11', '2'],
    };
    const ids = byId[pick] || [];
    found = m.outcomes.find((o) => ids.includes(o.outcomeId));
  }
  if (!found) {
    const want = pick.toLowerCase();
    found = m.outcomes.find((o) => {
      const compact = o.name.toLowerCase().replace(/[^1x2]/g, '');
      return compact === want;
    });
  }
  return found;
}

function findOverUnder(
  markets: SportyBetMarket[],
  isOver: boolean,
  total: number
): SportyBetOutcome | undefined {
  const specifier = `total=${total}`;
  const label = isOver ? 'over' : 'under';
  for (const m of markets) {
    if (m.marketId !== SPORTYBET_MARKET_IDS.OVER_UNDER) continue;
    if (m.specifier !== specifier) continue;
    const found = m.outcomes.find((o) => o.name.toLowerCase().includes(label));
    if (found) return found;
  }
  for (const m of markets) {
    if (m.marketId !== SPORTYBET_MARKET_IDS.OVER_UNDER) continue;
    const found = m.outcomes.find(
      (o) =>
        o.name.toLowerCase().includes(label) &&
        (o.name.includes(String(total)) || m.specifier === specifier)
    );
    if (found) return found;
  }
  return undefined;
}

function findBttsOutcomes(markets: SportyBetMarket[]): { gg?: SportyBetOutcome; ng?: SportyBetOutcome } {
  const m =
    markets.find((x) => x.marketId === SPORTYBET_MARKET_IDS.BTTS) ||
    markets.find((x) => {
      const n = x.name.toLowerCase();
      return n.includes('both teams') || n.includes('gg') || n.includes('btts') || n.includes('goal/goal');
    });
  if (!m) return {};
  const gg =
    m.outcomes.find((o) => {
      const n = o.name.toLowerCase();
      return n === 'yes' || n.includes('gg') || n === 'both teams score' || n.includes('both to score');
    }) || m.outcomes.find((o) => o.outcomeId === '74');
  const ng =
    m.outcomes.find((o) => {
      const n = o.name.toLowerCase();
      return n === 'no' || n.includes('ng') || n.includes('not score') || n.includes('no goal');
    }) || m.outcomes.find((o) => o.outcomeId === '76');
  return { gg, ng };
}

function mapEvent(raw: SportyBetRawEvent, tournamentName: string, categoryName: string): StandardGame | null {
  const eventId = raw.eventId || '';
  const homeTeam = raw.homeTeamName || '';
  const awayTeam = raw.awayTeamName || '';
  if (!eventId || !homeTeam || !awayTeam) return null;

  const kickoffTime = raw.estimateStartTime
    ? new Date(raw.estimateStartTime).toISOString()
    : new Date().toISOString();

  const league =
    tournamentName ||
    raw.sport?.category?.tournament?.name ||
    categoryName ||
    raw.sport?.category?.name ||
    'Soccer';

  const sportyMarkets = parseSportyMarkets(raw.markets);

  const homeOutcome =
    findOutcomeByDesc(sportyMarkets, SPORTYBET_MARKET_IDS.MATCH_WINNER, 'home') ||
    sportyMarkets
      .find((m) => m.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER)
      ?.outcomes.find((o) => o.outcomeId === '1');
  const drawOutcome =
    findOutcomeByDesc(sportyMarkets, SPORTYBET_MARKET_IDS.MATCH_WINNER, 'draw') ||
    sportyMarkets
      .find((m) => m.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER)
      ?.outcomes.find((o) => o.outcomeId === '2');
  const awayOutcome =
    findOutcomeByDesc(sportyMarkets, SPORTYBET_MARKET_IDS.MATCH_WINNER, 'away') ||
    sportyMarkets
      .find((m) => m.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER)
      ?.outcomes.find((o) => o.outcomeId === '3');

  const dc1x = findDoubleChanceOutcome(sportyMarkets, '1X');
  const dcX2 = findDoubleChanceOutcome(sportyMarkets, 'X2');
  const dc12 = findDoubleChanceOutcome(sportyMarkets, '12');

  const dcOutcomes: { pick: '1X' | 'X2' | '12'; odd: number }[] = [];
  if (dc1x) dcOutcomes.push({ pick: '1X', odd: dc1x.odd });
  if (dcX2) dcOutcomes.push({ pick: 'X2', odd: dcX2.odd });
  if (dc12) dcOutcomes.push({ pick: '12', odd: dc12.odd });

  const over05 = findOverUnder(sportyMarkets, true, 0.5);
  const over15 = findOverUnder(sportyMarkets, true, 1.5);
  const under35 = findOverUnder(sportyMarkets, false, 3.5);
  const under45 = findOverUnder(sportyMarkets, false, 4.5);
  const { gg: ggOutcome, ng: ngOutcome } = findBttsOutcomes(sportyMarkets);

  const ouPicks: { pick: string; odd: number }[] = [];
  if (over05) ouPicks.push({ pick: 'Over 0.5', odd: over05.odd });
  if (over15) ouPicks.push({ pick: 'Over 1.5', odd: over15.odd });
  if (under35) ouPicks.push({ pick: 'Under 3.5', odd: under35.odd });
  if (under45) ouPicks.push({ pick: 'Under 4.5', odd: under45.odd });

  const baseMarkets: GameMarkets = {
    doubleChance: dcOutcomes.length > 0 ? dcOutcomes : undefined,
    homeWin: homeOutcome ? { pick: '1', odd: homeOutcome.odd } : undefined,
    draw: drawOutcome ? { pick: 'X', odd: drawOutcome.odd } : undefined,
    awayWin: awayOutcome ? { pick: '2', odd: awayOutcome.odd } : undefined,
    overUnder: ouPicks.length > 0 ? ouPicks : undefined,
    btts: (() => {
      const arr: { pick: 'GG' | 'NG'; odd: number }[] = [];
      if (ggOutcome) arr.push({ pick: 'GG', odd: ggOutcome.odd });
      if (ngOutcome) arr.push({ pick: 'NG', odd: ngOutcome.odd });
      return arr.length ? arr : undefined;
    })(),
  };

  return {
    id: eventId,
    eventId,
    homeTeam,
    awayTeam,
    league,
    kickoffTime,
    status: 'SCHEDULED',
    bookies: ['sportybet:ke'],
    markets: baseMarkets,
    companyOdds: {
      'sportybet:ke': baseMarkets,
    },
    sportyMarkets,
  };
}

async function fetchPage(
  pageNum: number,
  pageSize: number,
  timelineHours: number
): Promise<SportyBetRawEvent[]> {
  const url = new URL(SPORTYBET_UPCOMING_EVENTS_URL);
  url.searchParams.set('sportId', 'sr:sport:1');
  url.searchParams.set('marketId', REQUESTED_MARKET_IDS);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('pageNum', String(pageNum));
  url.searchParams.set('timeline', String(timelineHours));
  url.searchParams.set('todayGames', 'false');
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`SportyBet upcoming events API returned ${response.status}`);
  }

  const data: SportyBetApiResponse = await response.json();
  if (data.bizCode !== undefined && data.bizCode !== 10000) {
    throw new Error(`SportyBet API bizCode ${data.bizCode}: ${data.message || 'unknown'}`);
  }

  const tournaments = data.data?.tournaments || [];
  const events: SportyBetRawEvent[] = [];
  for (const t of tournaments) {
    for (const e of t.events || []) {
      e._tournamentName = t.name || '';
      e._categoryName = t.categoryName || '';
      events.push(e);
    }
  }
  return events;
}

export async function fetchLiveOdds(): Promise<{
  games: StandardGame[];
  source: 'api';
}> {
  // Fetch a few pages in parallel (pageSize 50 × 3 ≈ 150 events) — no N+1 detail calls
  const pageSize = 50;
  const timelineHours = 48;
  const pageCount = 3;

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => fetchPage(i + 1, pageSize, timelineHours))
  );

  const allGames: StandardGame[] = [];
  const seen = new Set<string>();

  for (const events of pages) {
    for (const raw of events) {
      const mapped = mapEvent(raw, raw._tournamentName || '', raw._categoryName || '');
      if (mapped && !seen.has(mapped.id)) {
        seen.add(mapped.id);
        allGames.push(mapped);
      }
    }
  }

  if (allGames.length === 0) {
    throw new Error('No upcoming events found from SportyBet API');
  }

  return { games: allGames, source: 'api' };
}
