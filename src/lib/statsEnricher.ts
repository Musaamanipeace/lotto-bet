import { StandardGame, TeamFormStats, InjuryInfo, MatchInsights } from '@/types';

const THESPORTSDB_KEY = process.env.THESPORTSDB_API_KEY || '3';
const THESPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}`;

/** Optional API-Football key (RapidAPI / api-sports) for injury lists */
const API_FOOTBALL_KEY =
  process.env.API_FOOTBALL_KEY || process.env.FOOTBALL_API_KEY || '';

const FETCH_MS = 6_000;

type CacheEntry<T> = { at: number; data: T | null };
const teamIdCache = new Map<string, CacheEntry<string>>();
const formCache = new Map<string, CacheEntry<TeamFormStats>>();
const injuryCache = new Map<string, CacheEntry<InjuryInfo>>();

const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | null | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    map.delete(key);
    return undefined;
  }
  return hit.data;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, data: T | null) {
  map.set(key, { at: Date.now(), data });
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc|ac|bk|fk|if|club|united|city|town)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveTeamId(teamName: string): Promise<string | null> {
  const key = normalizeName(teamName);
  if (!key) return null;
  const cached = cacheGet(teamIdCache, key);
  if (cached !== undefined) return cached;

  const url = `${THESPORTSDB_BASE}/searchteams.php?t=${encodeURIComponent(teamName)}`;
  const data = (await fetchJson(url)) as { teams?: { idTeam?: string; strTeam?: string }[] } | null;
  const teams = data?.teams || [];
  if (!teams.length) {
    cacheSet(teamIdCache, key, null);
    return null;
  }

  const target = normalizeName(teamName);
  let best = teams[0];
  let bestScore = 0;
  for (const t of teams) {
    const n = normalizeName(t.strTeam || '');
    let s = 0;
    if (n === target) s = 3;
    else if (n.includes(target) || target.includes(n)) s = 2;
    else {
      const tw = new Set(target.split(' '));
      const nw = n.split(' ');
      const overlap = nw.filter((w) => tw.has(w)).length;
      s = overlap / Math.max(tw.size, 1);
    }
    if (s > bestScore) {
      bestScore = s;
      best = t;
    }
  }

  const id = best?.idTeam || null;
  cacheSet(teamIdCache, key, id);
  return id;
}

interface LastEvent {
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string;
  intAwayScore?: string;
  strStatus?: string;
}

async function fetchTeamForm(teamName: string): Promise<TeamFormStats | null> {
  const key = normalizeName(teamName);
  const cached = cacheGet(formCache, key);
  if (cached !== undefined) return cached;

  const teamId = await resolveTeamId(teamName);
  if (!teamId) {
    cacheSet(formCache, key, null);
    return null;
  }

  const url = `${THESPORTSDB_BASE}/eventslast.php?id=${teamId}`;
  const data = (await fetchJson(url)) as { results?: LastEvent[] } | null;
  const events = (data?.results || []).filter(
    (e) => e.intHomeScore != null && e.intAwayScore != null && e.strStatus !== 'Not Started'
  );

  if (!events.length) {
    cacheSet(formCache, key, null);
    return null;
  }

  const sample = events.slice(0, 5);
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let form = '';

  const normTeam = normalizeName(teamName);

  for (const ev of sample) {
    const hg = parseInt(ev.intHomeScore || '0', 10);
    const ag = parseInt(ev.intAwayScore || '0', 10);
    const home = normalizeName(ev.strHomeTeam || '');
    const isHome =
      home === normTeam || home.includes(normTeam) || normTeam.includes(home.split(' ')[0] || '');

    const gf = isHome ? hg : ag;
    const ga = isHome ? ag : hg;
    goalsFor += gf;
    goalsAgainst += ga;

    if (gf > ga) {
      wins++;
      form = 'W' + form;
    } else if (gf === ga) {
      draws++;
      form = 'D' + form;
    } else {
      losses++;
      form = 'L' + form;
    }
  }

  const played = sample.length;
  const pts = wins * 3 + draws;
  const formScore = played > 0 ? pts / (played * 3) : 0.5;

  const stats: TeamFormStats = {
    teamName,
    form: form.slice(-5),
    played,
    wins,
    draws,
    losses,
    formScore,
    goalsFor,
    goalsAgainst,
    avgGoalsFor: goalsFor / played,
    avgGoalsAgainst: goalsAgainst / played,
    source: 'thesportsdb',
  };

  cacheSet(formCache, key, stats);
  return stats;
}

/**
 * Injuries: only when API_FOOTBALL_KEY is set (api-sports.io / RapidAPI).
 * Without a key, returns null so scoring stays neutral.
 */
async function fetchTeamInjuries(teamName: string): Promise<InjuryInfo | null> {
  if (!API_FOOTBALL_KEY) return null;

  const key = normalizeName(teamName);
  const cached = cacheGet(injuryCache, key);
  if (cached !== undefined) return cached;

  // API-Football expects numeric team ids; without a mapped id we skip.
  // Structure is ready for when team id mapping is added via env/API.
  const info: InjuryInfo = {
    teamName,
    players: [],
    severity: 0,
    source: 'api-football-unavailable-mapping',
  };
  cacheSet(injuryCache, key, info);
  return info;
}

function computeEdges(
  home?: TeamFormStats | null,
  away?: TeamFormStats | null,
  homeInj?: InjuryInfo | null,
  awayInj?: InjuryInfo | null
): Pick<MatchInsights, 'formEdge' | 'injuryDrag'> {
  let formEdge = 0.5;
  if (home && away) {
    // Relative form strength (0 = away much stronger, 1 = home much stronger)
    formEdge = (home.formScore + (1 - away.formScore)) / 2;
    // Goal difference signal
    const homeGd = home.avgGoalsFor - home.avgGoalsAgainst;
    const awayGd = away.avgGoalsFor - away.avgGoalsAgainst;
    const gdSignal = 1 / (1 + Math.exp(-(homeGd - awayGd))); // sigmoid ~0–1
    formEdge = formEdge * 0.65 + gdSignal * 0.35;
  } else if (home) {
    formEdge = 0.45 + home.formScore * 0.2;
  } else if (away) {
    formEdge = 0.55 - away.formScore * 0.2;
  }

  const injuryDrag =
    ((homeInj?.severity || 0) + (awayInj?.severity || 0)) / 2;

  return { formEdge, injuryDrag };
}

/**
 * Enrich a list of games with form / stats (and injuries when API key exists).
 * Mutates games in place. Fail-open: missing data leaves insights partial.
 */
export async function enrichGamesWithStats(
  games: StandardGame[],
  options: { concurrency?: number; maxGames?: number } = {}
): Promise<void> {
  const concurrency = options.concurrency ?? 4;
  const maxGames = options.maxGames ?? 40;
  const slice = games.filter((g) => !g.insights?.enrichedAt).slice(0, maxGames);

  let idx = 0;
  async function worker() {
    while (idx < slice.length) {
      const i = idx++;
      const game = slice[i];
      try {
        const [homeForm, awayForm, homeInj, awayInj] = await Promise.all([
          fetchTeamForm(game.homeTeam),
          fetchTeamForm(game.awayTeam),
          fetchTeamInjuries(game.homeTeam),
          fetchTeamInjuries(game.awayTeam),
        ]);

        const { formEdge, injuryDrag } = computeEdges(
          homeForm,
          awayForm,
          homeInj,
          awayInj
        );

        game.insights = {
          homeForm: homeForm || undefined,
          awayForm: awayForm || undefined,
          homeInjuries: homeInj || undefined,
          awayInjuries: awayInj || undefined,
          formEdge,
          injuryDrag,
          enrichedAt: new Date().toISOString(),
        };
      } catch {
        game.insights = {
          formEdge: 0.5,
          injuryDrag: 0,
          enrichedAt: new Date().toISOString(),
        };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, slice.length) }, () => worker());
  await Promise.all(workers);
}

/**
 * How well a market pick aligns with form (0–1 style bonus contribution).
 */
export function formAlignmentBonus(
  marketName: string,
  pick: string,
  insights?: MatchInsights
): number {
  if (!insights?.formEdge && insights?.formEdge !== 0) return 0;
  const edge = insights.formEdge ?? 0.5; // >0.5 home stronger
  const lower = marketName.toLowerCase();
  const p = pick.toLowerCase();

  // Home-leaning picks benefit when formEdge high
  if (lower.includes('home') || p === '1' || p === '1x') {
    return (edge - 0.5) * 0.9;
  }
  // Away-leaning
  if (p === '2' || p === 'x2') {
    return (0.5 - edge) * 0.9;
  }
  // 12 (no draw): reward if either side is solid (not both weak)
  if (p === '12') {
    const homeStrong = (insights.homeForm?.formScore ?? 0.4) > 0.45;
    const awayStrong = (insights.awayForm?.formScore ?? 0.4) > 0.45;
    return homeStrong || awayStrong ? 0.12 : -0.05;
  }
  // Over 0.5: high combined attack
  if (p.includes('over')) {
    const atk =
      ((insights.homeForm?.avgGoalsFor ?? 1) + (insights.awayForm?.avgGoalsFor ?? 1)) / 2;
    return atk > 1.2 ? 0.15 : atk < 0.8 ? -0.1 : 0.05;
  }
  // Under 3.5: low combined expected goals
  if (p.includes('under')) {
    const total =
      (insights.homeForm?.avgGoalsFor ?? 1.2) +
      (insights.awayForm?.avgGoalsFor ?? 1.2);
    return total < 2.4 ? 0.15 : total > 3.2 ? -0.12 : 0.04;
  }
  return 0;
}
