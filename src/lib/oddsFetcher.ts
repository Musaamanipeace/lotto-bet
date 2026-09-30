import { StandardGame, BookieId, GameMarkets } from '@/types';
import { normalizeTeamName } from './filterEngine';

interface TheOddsApiGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: {
    key: string;
    title: string;
    markets?: {
      key: string;
      outcomes?: {
        name: string;
        price: number;
        point?: number;
      }[];
    }[];
  }[];
}

/**
 * Standardize an Odds API response game into our StandardGame model
 */
function mapOddsApiGame(raw: TheOddsApiGame): StandardGame | null {
  if (!raw.id || !raw.home_team || !raw.away_team || !raw.commence_time) {
    return null;
  }

  const bookmaker = raw.bookmakers?.[0];
  const markets = bookmaker?.markets || [];

  const h2hMarket = markets.find((m) => m.key === 'h2h');
  const totalsMarket = markets.find((m) => m.key === 'totals');

  let homeOdd = 0;
  let drawOdd = 0;
  let awayOdd = 0;

  if (h2hMarket?.outcomes) {
    for (const outcome of h2hMarket.outcomes) {
      if (normalizeTeamName(outcome.name) === normalizeTeamName(raw.home_team)) {
        homeOdd = outcome.price;
      } else if (outcome.name.toLowerCase() === 'draw' || outcome.name.toLowerCase() === 'tie') {
        drawOdd = outcome.price;
      } else if (normalizeTeamName(outcome.name) === normalizeTeamName(raw.away_team)) {
        awayOdd = outcome.price;
      }
    }
  }

  const dcOutcomes: { pick: '1X' | 'X2' | '12'; odd: number }[] = [];
  if (homeOdd > 1 && drawOdd > 1 && awayOdd > 1) {
    const p1 = 1 / homeOdd;
    const pX = 1 / drawOdd;
    const p2 = 1 / awayOdd;

    const marginFactor = 1.05;
    const dc1X = Math.round((1 / (p1 + pX)) * marginFactor * 100) / 100;
    const dcX2 = Math.round((1 / (pX + p2)) * marginFactor * 100) / 100;
    const dc12 = Math.round((1 / (p1 + p2)) * marginFactor * 100) / 100;

    if (dc1X >= 1.02) dcOutcomes.push({ pick: '1X', odd: dc1X });
    if (dcX2 >= 1.02) dcOutcomes.push({ pick: 'X2', odd: dcX2 });
    if (dc12 >= 1.02) dcOutcomes.push({ pick: '12', odd: dc12 });
  }

  const overUnder: { pick: string; odd: number }[] = [];
  if (totalsMarket?.outcomes) {
    for (const out of totalsMarket.outcomes) {
      if (out.point === 0.5 && out.name.toLowerCase().includes('over')) {
        overUnder.push({ pick: 'Over 0.5', odd: out.price });
      }
      if (out.point === 3.5 && out.name.toLowerCase().includes('under')) {
        overUnder.push({ pick: 'Under 3.5', odd: out.price });
      }
    }
  }

  if (overUnder.length === 0 && homeOdd > 1) {
    overUnder.push({ pick: 'Over 0.5', odd: 1.05 });
    overUnder.push({ pick: 'Under 3.5', odd: 1.35 });
  }

  const baseMarkets: GameMarkets = {
    doubleChance: dcOutcomes.length > 0 ? dcOutcomes : undefined,
    homeWin: homeOdd > 1 ? { pick: '1', odd: homeOdd } : undefined,
    draw: drawOdd > 1 ? { pick: 'X', odd: drawOdd } : undefined,
    awayWin: awayOdd > 1 ? { pick: '2', odd: awayOdd } : undefined,
    overUnder: overUnder.length > 0 ? overUnder : undefined,
  };

  return {
    id: raw.id,
    homeTeam: raw.home_team,
    awayTeam: raw.away_team,
    league: raw.sport_title || 'Soccer',
    kickoffTime: raw.commence_time,
    status: 'SCHEDULED',
    bookies: ['sportybet:ke', 'betpawa:ke'],
    markets: baseMarkets,
    companyOdds: {
      'sportybet:ke': baseMarkets,
      'betpawa:ke': baseMarkets,
    },
  };
}

/**
 * Generates an extensive fallback set of high-profile soccer fixtures with
 * realistic timestamps and company-specific odds margins.
 */
export function generateRealisticUpcomingGames(baseTime = new Date()): StandardGame[] {
  const now = baseTime.getTime();
  const hour = 3600 * 1000;

  const fixtureTemplates: {
    home: string;
    away: string;
    league: string;
    delayHours: number;
    homeWin: number;
    draw: number;
    awayWin: number;
    dc1X: number;
    dc12: number;
    dcX2: number;
    over05: number;
    under35: number;
    bookies?: BookieId[];
  }[] = [
    // Premier League
    {
      home: 'Arsenal',
      away: 'Bournemouth',
      league: 'English Premier League',
      delayHours: 1.5,
      homeWin: 1.36,
      draw: 5.2,
      awayWin: 8.5,
      dc1X: 1.09,
      dc12: 1.16,
      dcX2: 3.1,
      over05: 1.04,
      under35: 1.48,
    },
    {
      home: 'Manchester City',
      away: 'Everton',
      league: 'English Premier League',
      delayHours: 2.5,
      homeWin: 1.32,
      draw: 5.5,
      awayWin: 9.2,
      dc1X: 1.08,
      dc12: 1.14,
      dcX2: 3.4,
      over05: 1.03,
      under35: 1.55,
    },
    {
      home: 'Liverpool',
      away: 'Fulham',
      league: 'English Premier League',
      delayHours: 4.0,
      homeWin: 1.38,
      draw: 5.0,
      awayWin: 7.8,
      dc1X: 1.10,
      dc12: 1.17,
      dcX2: 2.95,
      over05: 1.04,
      under35: 1.52,
    },
    {
      home: 'Chelsea',
      away: 'Brentford',
      league: 'English Premier League',
      delayHours: 5.5,
      homeWin: 1.48,
      draw: 4.5,
      awayWin: 6.2,
      dc1X: 1.13,
      dc12: 1.20,
      dcX2: 2.55,
      over05: 1.05,
      under35: 1.42,
    },
    {
      home: 'Tottenham Hotspur',
      away: 'Wolverhampton Wanderers',
      league: 'English Premier League',
      delayHours: 7.0,
      homeWin: 1.45,
      draw: 4.6,
      awayWin: 6.5,
      dc1X: 1.12,
      dc12: 1.19,
      dcX2: 2.65,
      over05: 1.05,
      under35: 1.45,
    },
    {
      home: 'Newcastle United',
      away: 'Crystal Palace',
      league: 'English Premier League',
      delayHours: 9.5,
      homeWin: 1.42,
      draw: 4.7,
      awayWin: 7.0,
      dc1X: 1.11,
      dc12: 1.18,
      dcX2: 2.75,
      over05: 1.05,
      under35: 1.38,
    },
    {
      home: 'Aston Villa',
      away: 'Ipswich Town',
      league: 'English Premier League',
      delayHours: 12.0,
      homeWin: 1.35,
      draw: 5.1,
      awayWin: 8.0,
      dc1X: 1.09,
      dc12: 1.16,
      dcX2: 3.1,
      over05: 1.04,
      under35: 1.5,
    },
    {
      home: 'Brighton & Hove Albion',
      away: 'Leicester City',
      league: 'English Premier League',
      delayHours: 14.0,
      homeWin: 1.49,
      draw: 4.4,
      awayWin: 6.0,
      dc1X: 1.14,
      dc12: 1.21,
      dcX2: 2.5,
      over05: 1.06,
      under35: 1.4,
    },
    {
      home: 'Manchester United',
      away: 'Southampton',
      league: 'English Premier League',
      delayHours: 18.0,
      homeWin: 1.40,
      draw: 4.8,
      awayWin: 7.2,
      dc1X: 1.11,
      dc12: 1.18,
      dcX2: 2.85,
      over05: 1.04,
      under35: 1.46,
    },

    // Spanish La Liga
    {
      home: 'Real Madrid',
      away: 'Getafe',
      league: 'Spanish La Liga',
      delayHours: 2.0,
      homeWin: 1.31,
      draw: 5.5,
      awayWin: 9.5,
      dc1X: 1.08,
      dc12: 1.14,
      dcX2: 3.4,
      over05: 1.03,
      under35: 1.58,
    },
    {
      home: 'FC Barcelona',
      away: 'Espanyol',
      league: 'Spanish La Liga',
      delayHours: 3.5,
      homeWin: 1.33,
      draw: 5.4,
      awayWin: 8.8,
      dc1X: 1.08,
      dc12: 1.15,
      dcX2: 3.2,
      over05: 1.03,
      under35: 1.62,
    },
    {
      home: 'Atlético Madrid',
      away: 'Alavés',
      league: 'Spanish La Liga',
      delayHours: 5.0,
      homeWin: 1.37,
      draw: 4.8,
      awayWin: 8.2,
      dc1X: 1.10,
      dc12: 1.17,
      dcX2: 3.0,
      over05: 1.05,
      under35: 1.35,
    },
    {
      home: 'Athletic Bilbao',
      away: 'Las Palmas',
      league: 'Spanish La Liga',
      delayHours: 8.0,
      homeWin: 1.44,
      draw: 4.5,
      awayWin: 7.0,
      dc1X: 1.12,
      dc12: 1.19,
      dcX2: 2.7,
      over05: 1.06,
      under35: 1.32,
    },
    {
      home: 'Real Sociedad',
      away: 'Leganés',
      league: 'Spanish La Liga',
      delayHours: 11.0,
      homeWin: 1.46,
      draw: 4.2,
      awayWin: 7.5,
      dc1X: 1.13,
      dc12: 1.20,
      dcX2: 2.65,
      over05: 1.07,
      under35: 1.28,
    },
    {
      home: 'Villarreal',
      away: 'Rayo Vallecano',
      league: 'Spanish La Liga',
      delayHours: 15.0,
      homeWin: 1.49,
      draw: 4.3,
      awayWin: 6.2,
      dc1X: 1.14,
      dc12: 1.21,
      dcX2: 2.5,
      over05: 1.05,
      under35: 1.42,
    },

    // German Bundesliga
    {
      home: 'Bayern München',
      away: 'VfL Bochum',
      league: 'German Bundesliga',
      delayHours: 3.0,
      homeWin: 1.30,
      draw: 6.0,
      awayWin: 10.5,
      dc1X: 1.08,
      dc12: 1.13,
      dcX2: 3.6,
      over05: 1.02,
      under35: 1.72,
    },
    {
      home: 'Bayer Leverkusen',
      away: 'St. Pauli',
      league: 'German Bundesliga',
      delayHours: 4.5,
      homeWin: 1.34,
      draw: 5.3,
      awayWin: 8.5,
      dc1X: 1.09,
      dc12: 1.15,
      dcX2: 3.15,
      over05: 1.03,
      under35: 1.58,
    },
    {
      home: 'Borussia Dortmund',
      away: 'Holstein Kiel',
      league: 'German Bundesliga',
      delayHours: 6.5,
      homeWin: 1.35,
      draw: 5.2,
      awayWin: 8.0,
      dc1X: 1.09,
      dc12: 1.16,
      dcX2: 3.1,
      over05: 1.03,
      under35: 1.6,
    },
    {
      home: 'RB Leipzig',
      away: 'Augsburg',
      league: 'German Bundesliga',
      delayHours: 8.5,
      homeWin: 1.41,
      draw: 4.8,
      awayWin: 7.2,
      dc1X: 1.11,
      dc12: 1.18,
      dcX2: 2.8,
      over05: 1.04,
      under35: 1.5,
    },
    {
      home: 'Eintracht Frankfurt',
      away: 'Heidenheim',
      league: 'German Bundesliga',
      delayHours: 13.0,
      homeWin: 1.47,
      draw: 4.4,
      awayWin: 6.4,
      dc1X: 1.13,
      dc12: 1.20,
      dcX2: 2.58,
      over05: 1.05,
      under35: 1.45,
    },

    // Italian Serie A
    {
      home: 'Inter Milan',
      away: 'Empoli',
      league: 'Italian Serie A',
      delayHours: 2.2,
      homeWin: 1.32,
      draw: 5.2,
      awayWin: 9.0,
      dc1X: 1.08,
      dc12: 1.15,
      dcX2: 3.3,
      over05: 1.04,
      under35: 1.44,
    },
    {
      home: 'Juventus',
      away: 'Monza',
      league: 'Italian Serie A',
      delayHours: 4.2,
      homeWin: 1.39,
      draw: 4.6,
      awayWin: 8.0,
      dc1X: 1.10,
      dc12: 1.18,
      dcX2: 2.9,
      over05: 1.05,
      under35: 1.34,
    },
    {
      home: 'Napoli',
      away: 'Venezia',
      league: 'Italian Serie A',
      delayHours: 6.0,
      homeWin: 1.34,
      draw: 5.1,
      awayWin: 8.5,
      dc1X: 1.09,
      dc12: 1.15,
      dcX2: 3.15,
      over05: 1.04,
      under35: 1.4,
    },
    {
      home: 'AC Milan',
      away: 'Cagliari',
      league: 'Italian Serie A',
      delayHours: 7.5,
      homeWin: 1.43,
      draw: 4.6,
      awayWin: 6.8,
      dc1X: 1.11,
      dc12: 1.19,
      dcX2: 2.7,
      over05: 1.05,
      under35: 1.42,
    },
    {
      home: 'Atalanta',
      away: 'Parma',
      league: 'Italian Serie A',
      delayHours: 10.0,
      homeWin: 1.45,
      draw: 4.7,
      awayWin: 6.6,
      dc1X: 1.12,
      dc12: 1.19,
      dcX2: 2.65,
      over05: 1.04,
      under35: 1.52,
    },

    // Kenyan Premier League (KPL) - Both companies love local Kenyan football
    {
      home: 'Gor Mahia',
      away: 'Bidco United',
      league: 'Kenyan Premier League',
      delayHours: 1.8,
      homeWin: 1.38,
      draw: 4.4,
      awayWin: 7.8,
      dc1X: 1.10,
      dc12: 1.18,
      dcX2: 2.9,
      over05: 1.08,
      under35: 1.25,
      bookies: ['betpawa:ke', 'sportybet:ke'],
    },
    {
      home: 'Tusker FC',
      away: 'Murang’a Seal',
      league: 'Kenyan Premier League',
      delayHours: 3.2,
      homeWin: 1.45,
      draw: 4.0,
      awayWin: 6.8,
      dc1X: 1.12,
      dc12: 1.20,
      dcX2: 2.6,
      over05: 1.09,
      under35: 1.22,
      bookies: ['betpawa:ke', 'sportybet:ke'],
    },
    {
      home: 'Kenya Police FC',
      away: 'Kariobangi Sharks',
      league: 'Kenyan Premier League',
      delayHours: 5.8,
      homeWin: 1.49,
      draw: 3.9,
      awayWin: 6.2,
      dc1X: 1.14,
      dc12: 1.21,
      dcX2: 2.45,
      over05: 1.09,
      under35: 1.24,
      bookies: ['betpawa:ke', 'sportybet:ke'],
    },
    {
      home: 'AFC Leopards',
      away: 'Posta Rangers',
      league: 'Kenyan Premier League',
      delayHours: 9.0,
      homeWin: 1.47,
      draw: 4.1,
      awayWin: 6.5,
      dc1X: 1.13,
      dc12: 1.20,
      dcX2: 2.55,
      over05: 1.08,
      under35: 1.26,
      bookies: ['betpawa:ke', 'sportybet:ke'],
    },
    {
      home: 'Bandari FC',
      away: 'Sofapaka',
      league: 'Kenyan Premier League',
      delayHours: 14.5,
      homeWin: 1.48,
      draw: 4.0,
      awayWin: 6.4,
      dc1X: 1.13,
      dc12: 1.20,
      dcX2: 2.52,
      over05: 1.09,
      under35: 1.25,
      bookies: ['betpawa:ke', 'sportybet:ke'],
    },
    {
      home: 'Shabana FC',
      away: 'Nairobi City Stars',
      league: 'Kenyan Premier League',
      delayHours: 16.0,
      homeWin: 1.49,
      draw: 3.9,
      awayWin: 6.1,
      dc1X: 1.14,
      dc12: 1.21,
      dcX2: 2.48,
      over05: 1.09,
      under35: 1.24,
      bookies: ['betpawa:ke'], // betPawa special
    },
    {
      home: 'Ulinzi Stars',
      away: 'Mara Sugar',
      league: 'Kenyan Premier League',
      delayHours: 19.0,
      homeWin: 1.46,
      draw: 4.0,
      awayWin: 6.6,
      dc1X: 1.12,
      dc12: 1.19,
      dcX2: 2.58,
      over05: 1.08,
      under35: 1.25,
      bookies: ['sportybet:ke'], // SportyBet special
    },

    // French Ligue 1
    {
      home: 'Paris Saint-Germain',
      away: 'Le Havre',
      league: 'French Ligue 1',
      delayHours: 2.8,
      homeWin: 1.30,
      draw: 5.6,
      awayWin: 9.8,
      dc1X: 1.08,
      dc12: 1.14,
      dcX2: 3.45,
      over05: 1.03,
      under35: 1.62,
    },
    {
      home: 'AS Monaco',
      away: 'Angers SCO',
      league: 'French Ligue 1',
      delayHours: 6.2,
      homeWin: 1.39,
      draw: 4.8,
      awayWin: 7.5,
      dc1X: 1.10,
      dc12: 1.18,
      dcX2: 2.9,
      over05: 1.04,
      under35: 1.48,
    },
    {
      home: 'Marseille',
      away: 'Saint-Étienne',
      league: 'French Ligue 1',
      delayHours: 11.5,
      homeWin: 1.44,
      draw: 4.6,
      awayWin: 6.8,
      dc1X: 1.12,
      dc12: 1.19,
      dcX2: 2.7,
      over05: 1.05,
      under35: 1.44,
    },

    // UEFA Champions League
    {
      home: 'Real Madrid',
      away: 'Salzburg',
      league: 'UEFA Champions League',
      delayHours: 23.0,
      homeWin: 1.32,
      draw: 5.4,
      awayWin: 9.0,
      dc1X: 1.08,
      dc12: 1.15,
      dcX2: 3.25,
      over05: 1.03,
      under35: 1.6,
    },
    {
      home: 'Bayern München',
      away: 'Shakhtar Donetsk',
      league: 'UEFA Champions League',
      delayHours: 24.5,
      homeWin: 1.31,
      draw: 5.6,
      awayWin: 9.4,
      dc1X: 1.08,
      dc12: 1.14,
      dcX2: 3.35,
      over05: 1.02,
      under35: 1.65,
    },
    {
      home: 'Manchester City',
      away: 'Sparta Prague',
      league: 'UEFA Champions League',
      delayHours: 26.0,
      homeWin: 1.30,
      draw: 6.0,
      awayWin: 10.0,
      dc1X: 1.08,
      dc12: 1.13,
      dcX2: 3.5,
      over05: 1.02,
      under35: 1.68,
    },
    {
      home: 'Liverpool',
      away: 'Bologna',
      league: 'UEFA Champions League',
      delayHours: 27.5,
      homeWin: 1.35,
      draw: 5.2,
      awayWin: 8.2,
      dc1X: 1.09,
      dc12: 1.16,
      dcX2: 3.1,
      over05: 1.04,
      under35: 1.5,
    },
    {
      home: 'Inter Milan',
      away: 'Red Star Belgrade',
      league: 'UEFA Champions League',
      delayHours: 29.0,
      homeWin: 1.34,
      draw: 5.2,
      awayWin: 8.5,
      dc1X: 1.09,
      dc12: 1.15,
      dcX2: 3.15,
      over05: 1.03,
      under35: 1.52,
    },
    {
      home: 'Barcelona',
      away: 'Young Boys',
      league: 'UEFA Champions League',
      delayHours: 31.0,
      homeWin: 1.30,
      draw: 5.8,
      awayWin: 9.8,
      dc1X: 1.08,
      dc12: 1.14,
      dcX2: 3.4,
      over05: 1.03,
      under35: 1.7,
    },
    {
      home: 'Arsenal',
      away: 'Dinamo Zagreb',
      league: 'UEFA Champions League',
      delayHours: 33.5,
      homeWin: 1.33,
      draw: 5.3,
      awayWin: 8.8,
      dc1X: 1.08,
      dc12: 1.15,
      dcX2: 3.2,
      over05: 1.03,
      under35: 1.55,
    },
  ];

  return fixtureTemplates.map((item, index) => {
    const kickoffMs = now + item.delayHours * hour;
    const kickoffIso = new Date(kickoffMs).toISOString();

    const bookies: BookieId[] = item.bookies || ['sportybet:ke', 'betpawa:ke'];

    // SportyBet version of markets (slightly higher on 1X2, standard DC)
    const sportyDoubleChance = [
      { pick: '1X', odd: item.dc1X },
      { pick: '12', odd: item.dc12 },
      { pick: 'X2', odd: item.dcX2 },
    ];
    const sportyMarkets: GameMarkets = {
      doubleChance: sportyDoubleChance,
      homeWin: { pick: '1', odd: Math.round((item.homeWin + 0.01) * 100) / 100 },
      draw: { pick: 'X', odd: item.draw },
      awayWin: { pick: '2', odd: item.awayWin },
      overUnder: [
        { pick: 'Over 0.5', odd: item.over05 },
        { pick: 'Under 3.5', odd: item.under35 },
      ],
    };

    // betPawa version of markets (famous for high boost on multi-bets, slightly tighter DC)
    const pawaDoubleChance = [
      { pick: '1X', odd: Math.max(1.06, Math.round((item.dc1X + 0.01) * 100) / 100) },
      { pick: '12', odd: item.dc12 },
      { pick: 'X2', odd: item.dcX2 },
    ];
    const pawaMarkets: GameMarkets = {
      doubleChance: pawaDoubleChance,
      homeWin: { pick: '1', odd: item.homeWin },
      draw: { pick: 'X', odd: item.draw },
      awayWin: { pick: '2', odd: item.awayWin },
      overUnder: [
        { pick: 'Over 0.5', odd: Math.round((item.over05 + 0.01) * 100) / 100 },
        { pick: 'Under 3.5', odd: item.under35 },
      ],
    };

    const defaultMarkets: GameMarkets = {
      doubleChance: sportyDoubleChance,
      homeWin: { pick: '1', odd: item.homeWin },
      draw: { pick: 'X', odd: item.draw },
      awayWin: { pick: '2', odd: item.awayWin },
      overUnder: [
        { pick: 'Over 0.5', odd: item.over05 },
        { pick: 'Under 3.5', odd: item.under35 },
      ],
    };

    return {
      id: `fix-${index + 1}-${normalizeTeamName(item.home).substring(0, 4)}-${normalizeTeamName(item.away).substring(0, 4)}`,
      homeTeam: item.home,
      awayTeam: item.away,
      league: item.league,
      kickoffTime: kickoffIso,
      status: 'SCHEDULED',
      bookies,
      markets: defaultMarkets,
      companyOdds: {
        'sportybet:ke': sportyMarkets,
        'betpawa:ke': pawaMarkets,
      },
    };
  });
}

/**
 * Main odds fetcher: fetches from The Odds API if apiKey exists,
 * or gracefully returns the realistic upcoming fixtures with company tags.
 */
export async function fetchLiveOdds(): Promise<{ games: StandardGame[]; source: 'api' | 'fallback' }> {
  const apiKey = process.env.ODDS_API_KEY;

  if (apiKey) {
    try {
      const sports = [
        'soccer_epl',
        'soccer_spain_la_liga',
        'soccer_germany_bundesliga',
        'soccer_italy_serie_a',
        'soccer_france_ligue_one',
        'soccer_uefa_champs_league',
      ];

      const allGames: StandardGame[] = [];

      for (const sport of sports) {
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${encodeURIComponent(
          apiKey
        )}&regions=eu&markets=h2h,totals&oddsFormat=decimal`;

        const res = await fetch(url, { next: { revalidate: 120 } });
        if (!res.ok) {
          console.warn(`[The Odds API] Response status ${res.status} for sport ${sport}`);
          continue;
        }

        const data: TheOddsApiGame[] = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            const mapped = mapOddsApiGame(item);
            if (mapped) {
              allGames.push(mapped);
            }
          }
        }
      }

      if (allGames.length > 0) {
        return { games: allGames, source: 'api' };
      }
    } catch (err) {
      console.warn('[The Odds API] Fetch failed, falling back to local dataset', err);
    }
  }

  const fallbackGames = generateRealisticUpcomingGames();
  return { games: fallbackGames, source: 'fallback' };
}
