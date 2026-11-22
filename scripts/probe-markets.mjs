#!/usr/bin/env node
/**
 * Diagnostic only (not used by the app): Phase 0 (E0) — dumps every market id,
 * description, specifier and outcome id from upcoming tennis + basketball events
 * on both bookmakers. Saved trimmed responses become test fixtures (tests/fixtures.ts).
 *   node scripts/probe-markets.mjs
 *
 * The README says SportyBet feed endpoints need an East Africa IP — this must be
 * run locally on a machine with that IP. Candidate SportyBet sport ids:
 *   tennis     sr:sport:5,  basketball  sr:sport:2
 * betPawa category ids are to be found from the payload (search, don't guess).
 */
const BASE = 'https://www.sportybet.com';
const H = {
  'Current-Country': 'KE',
  Referer: `${BASE}/ke/`,
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

async function call(url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text };
  } catch (e) {
    return { error: `${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ''}` };
  }
}

async function probeSportybet(sportId) {
  const params = new URLSearchParams({
    sportId, marketId: '', pageSize: '30', pageNum: '1', timeline: '48', todayGames: 'false', _t: String(Date.now()),
  });
  const r = await call(`${BASE}/api/ke/factsCenter/pcUpcomingEvents?${params}`, { headers: H });
  console.log(`\n=== SportyBet ${sportId}: HTTP ${r.status}, bizCode ${r.json?.bizCode} ===`);
  const events = (r.json?.data?.tournaments ?? []).flatMap((t) => t.events ?? []);
  const out = [];
  for (const ev of events) {
    for (const m of ev.markets ?? []) {
      out.push({
        eventId: ev.eventId,
        marketId: String(m.id),
        marketDesc: ev.displayName ?? ev.name ?? '',
        specifier: m.specifier ?? null,
        kind: m.kind ?? null,
        period: m.period ?? null,
        outcomes: (m.outcomes ?? []).map((o) => ({ id: String(o.id), desc: o.desc, odds: o.odds, isActive: o.isActive ?? true })),
      });
    }
  }
  console.log(JSON.stringify(out.slice(0, 50), null, 2));
}

async function probeBetpawa(searchTerm) {
  // BetPawa category search: the IDs for tennis/basketball are unknown until we
  // find them in a live payload — this dumps all markets for a category range.
  console.log(`\n=== BetPawa category "${searchTerm}" — CHECK THE PAYLOAD FOR CategoryId; nothing is guessed ===`);
  for (const cat of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
    const params = new URLSearchParams({ CategoryId: String(cat), Page: '1', Live: '1' });
    const r = await call(`https://api.betpawa.com/events/bycategory?${params}`, { headers: H });
    if (r.error) { console.log(`  cat ${cat}: ${r.error}`); continue; }
    const evs = r.json?.data ?? [];
    if (!Array.isArray(evs) || evs.length === 0) continue;
    console.log(`  cat ${cat}: ${evs.length} events — dump manually and look for tennis/basketball`);
  }
}

await probeSportybet('sr:sport:5');
await probeSportybet('sr:sport:2');
await probeBetpawa('tennis / basketball');
console.log('\nSave the raw JSON above as fixtures in tests/fixtures.ts once you have real payloads. The agent must not invent ids.');
