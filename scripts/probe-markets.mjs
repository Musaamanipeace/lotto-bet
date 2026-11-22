#!/usr/bin/env node
/**
 * Phase 0 diagnostic (NOT used by the app). Read-only. One attempt per request, no retries,
 * about 40 to 60 small requests with a short pause between them.
 *
 *   node scripts/probe-markets-v2.mjs
 *       Stage 1. SportyBet: football (control), tennis, basketball. betPawa: scans category ids 1 to 15
 *       and shows which sport each one is.
 *
 *   node scripts/probe-markets-v2.mjs --betpawa=tennis:ID,basketball:ID
 *       Stage 2. Dumps betPawa's market types for the category ids you identified in stage 1.
 *
 *   node scripts/probe-markets-v2.mjs --fixtures-only
 *       Skips the long SportyBet market listing. Saves trimmed real feed responses as test fixtures
 *       (probe-output/fixture-sportybet-<sport>-feed.json) using the exact market ids the app will request,
 *       prints a short summary, then runs the betPawa category scan (or the stage 2 dump if --betpawa= is given).
 *
 *   Add --all to print every market type instead of only the relevant-looking ones.
 *
 * Run it from your own machine in Kenya, like the app's other probe script. Output is also saved to
 * probe-output/report.json. Paste the console text back into the chat.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const SPORTY = process.env.SPORTY_BASE ?? 'https://www.sportybet.com';
const PAWA = process.env.PAWA_BASE ?? 'https://www.betpawa.co.ke';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const SH = { 'Current-Country': 'KE', Referer: `${SPORTY}/ke/`, Accept: 'application/json', 'User-Agent': UA };
const PH = { 'x-pawa-brand': 'betpawa-kenya', 'x-pawa-language': 'en', devicetype: 'web', Accept: 'application/json' };

const args = process.argv.slice(2);
const SHOW_ALL = args.includes('--all');
const FIXTURES_ONLY = args.includes('--fixtures-only');
const pawaArg = (args.find((a) => a.startsWith('--betpawa=')) ?? '').slice('--betpawa='.length);
const PAWA_PICKS = Object.fromEntries(
  pawaArg.split(',').filter(Boolean).map((p) => p.split(':')).filter((p) => p.length === 2),
);
// Sportradar-style ids. Football is the control: it is known to work in the app today.
const SPORTS = { football: 'sr:sport:1', tennis: 'sr:sport:5', basketball: 'sr:sport:2' };
const RELEVANT = /winner|moneyline|total|over|under|quarter|half|1st|2nd|3rd|4th|games|sets|points/i;

const report = { generatedAt: new Date().toISOString(), sportybet: {}, betpawa: {} };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(url, init = {}) {
  await sleep(300);
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text };
  } catch (e) {
    return { error: `${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ''}` };
  }
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const when = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '?');

// ---------- market aggregation ----------
function addMarket(bucket, id, name, spec, outcomes, eventKey) {
  let b = bucket.get(id);
  if (!b) { b = { id, names: new Set(), specs: new Set(), outcomes: new Set(), events: new Set() }; bucket.set(id, b); }
  if (name) b.names.add(name);
  if (spec) b.specs.add(spec);
  for (const o of outcomes.slice(0, 4)) b.outcomes.add(o);
  b.events.add(eventKey);
}

function printBucket(title, bucket, totalEvents) {
  const all = [...bucket.values()].sort((a, b) => b.events.size - a.events.size);
  const shown = all.filter((b) => SHOW_ALL || RELEVANT.test([...b.names].join(' ')));
  console.log(`\n${title}: ${all.length} market types seen, showing ${shown.length}${SHOW_ALL ? '' : ' (add --all for every one)'}`);
  for (const b of shown) {
    console.log(`  id ${b.id} | ${[...b.names].slice(0, 2).join(' / ') || '(no name field)'} | in ${b.events.size}/${totalEvents} events`);
    if (b.specs.size) console.log(`      specifiers: ${[...b.specs].slice(0, 6).join(' ; ')}`);
    console.log(`      outcomes: ${[...b.outcomes].slice(0, 6).join(' ; ')}`);
  }
  return all.map((b) => ({
    id: b.id, names: [...b.names], specifiers: [...b.specs].slice(0, 12), outcomes: [...b.outcomes], events: b.events.size,
  }));
}

// ---------- SportyBet ----------
async function probeSporty(sportName, sportId) {
  console.log(`\n==================== SportyBet: ${sportName} (${sportId}) ====================`);
  const out = (report.sportybet[sportName] = { sportId });
  let feed = null;
  // Variant 1: no marketId. Variant 2: a few Sportradar-style ids for that sport (guesses, harmless if wrong).
  // Variant 3: the football ids the app uses today.
  const GUESS = { tennis: '186,188', basketball: '219,225', football: '1,18' };
  for (const marketId of [undefined, GUESS[sportName], '1,18']) {
    const p = new URLSearchParams({ sportId, pageSize: '30', pageNum: '1', timeline: '72', todayGames: 'false', _t: String(Date.now()) });
    if (marketId) p.set('marketId', marketId);
    const r = await call(`${SPORTY}/api/ke/factsCenter/pcUpcomingEvents?${p}`, { headers: SH });
    const label = marketId ? `with marketId=${marketId}` : 'without marketId';
    if (r.error) { console.log(`Feed ${label}: network error: ${r.error}`); continue; }
    console.log(`Feed ${label}: HTTP ${r.status}, bizCode ${r.json?.bizCode ?? 'n/a'}`);
    const t = r.json?.data?.tournaments;
    if (r.json?.bizCode === 10000 && Array.isArray(t) && t.some((x) => (x.events ?? []).length)) { feed = r; break; }
    console.log(`  no events in that response. message: ${JSON.stringify(r.json?.message ?? null)} | body starts: ${r.text.slice(0, 200)}`);
  }
  if (!feed) { out.error = 'no events from the feed'; console.log('No events found for this sport. Send me the lines above.'); return; }

  const events = feed.json.data.tournaments
    .flatMap((t) => (t.events ?? []).map((e) => ({ ...e, __league: t.name })))
    .filter((e) => typeof e.eventId === 'string' && e.estimateStartTime > Date.now());
  console.log(`Upcoming events in feed: ${events.length}`);
  for (const e of events.slice(0, 3)) {
    console.log(`  ${e.homeTeamName} v ${e.awayTeamName} | ${e.__league} | ${e.eventId} | ${when(e.estimateStartTime)}`);
  }
  if (events[0]) console.log(`Event object keys: ${Object.keys(events[0]).join(', ')}`);
  const feedMarket = events.flatMap((e) => (Array.isArray(e.markets) ? e.markets : []))[0];
  if (feedMarket) console.log(`Feed market object keys: ${Object.keys(feedMarket).join(', ')}`);
  out.sampleEvents = events.slice(0, 3).map((e) => ({
    eventId: e.eventId, home: e.homeTeamName, away: e.awayTeamName, league: e.__league, start: e.estimateStartTime,
  }));

  const bucket = new Map();
  let detailsOk = 0;
  const picked = events.slice(0, 6);
  for (const e of picked) {
    const r = await call(`${SPORTY}/api/ke/factsCenter/event?eventId=${encodeURIComponent(e.eventId)}&productId=3`, { headers: SH });
    if (r.error || r.json?.bizCode !== 10000) {
      console.log(`Event details for ${e.eventId}: ${r.error ?? `HTTP ${r.status}, bizCode ${r.json?.bizCode ?? 'n/a'}`} ${r.text ? r.text.slice(0, 120) : ''}`);
      continue;
    }
    const markets = r.json?.data?.markets ?? r.json?.data?.event?.markets;
    if (!Array.isArray(markets)) {
      console.log(`Event details for ${e.eventId}: no markets array. data keys: ${Object.keys(r.json?.data ?? {}).join(', ')}`);
      continue;
    }
    detailsOk++;
    if (detailsOk === 1) {
      console.log(`Details market object keys: ${Object.keys(markets[0] ?? {}).join(', ')}`);
      out.rawDetailsSample = markets.slice(0, 3);
    }
    for (const m of markets) {
      if (!isObj(m)) continue;
      addMarket(bucket, String(m.id), m.desc ?? m.name ?? m.title ?? '', m.specifier ?? '',
        (Array.isArray(m.outcomes) ? m.outcomes : []).map((o) => `${o.id}=${o.desc ?? o.name ?? ''}`), e.eventId);
    }
  }
  if (detailsOk === 0) {
    console.log('Event details endpoint did not work, so falling back to the markets in the feed (this shows only main markets).');
    for (const e of events) {
      for (const m of Array.isArray(e.markets) ? e.markets : []) {
        addMarket(bucket, String(m.id), m.desc ?? m.name ?? '', m.specifier ?? '',
          (Array.isArray(m.outcomes) ? m.outcomes : []).map((o) => `${o.id}=${o.desc ?? o.name ?? ''}`), e.eventId);
      }
    }
  }
  out.markets = printBucket(`SportyBet ${sportName} markets`, bucket, Math.max(detailsOk, picked.length));
}

// ---------- betPawa ----------
function pawaUrl(cats, take, view) {
  const q = {
    queries: [{
      query: { eventType: 'UPCOMING', ...(cats ? { categories: cats } : {}) },
      sort: { popularity: 'DESC' }, skip: 0, take, ...(view ? { view } : {}),
    }],
  };
  return `${PAWA}/api/sportsbook/v4/events/lists/by-queries?q=${encodeURIComponent(JSON.stringify(q))}`;
}
const pawaEvents = (json) => (Array.isArray(json?.responses) ? json.responses : []).flatMap((g) => (Array.isArray(g?.responses) ? g.responses : []));
const names = (e) => {
  const parts = Array.isArray(e.participants) ? e.participants : [];
  const n = (pos) => parts.find((p) => p?.position === pos)?.name ?? '?';
  return `${n(1)} v ${n(2)}`;
};

async function pawaFetch(cat, take) {
  // Variant A: no view (asks for default markets). Variant B: the three market types the app already uses.
  for (const view of [undefined, { marketTypes: ['3743', '3795', '5000'] }]) {
    const r = await call(pawaUrl([cat], take, view), { headers: PH });
    if (r.error) return { error: r.error };
    const ev = pawaEvents(r.json);
    if (r.status === 200 && ev.length) return { events: ev, variant: view ? 'known market types' : 'no view' };
    if (r.status === 200 && !view) continue;
  }
  return { events: [], variant: null };
}

async function pawaScan() {
  console.log('\n==================== betPawa: category scan (which id is which sport?) ====================');
  report.betpawa.scan = {};
  for (let c = 1; c <= 15; c++) {
    const r = await pawaFetch(String(c), 5);
    if (r.error) { console.log(`category ${c}: network error: ${r.error}`); report.betpawa.scan[c] = { error: r.error }; continue; }
    if (!r.events.length) { console.log(`category ${c}: no events`); report.betpawa.scan[c] = { events: 0 }; continue; }
    console.log(`category ${c}: ${r.events.length} events (${r.variant})`);
    const sample = r.events.slice(0, 3).map((e) => ({ match: names(e), competition: e.competition?.name ?? '?', markets: Array.isArray(e.markets) ? e.markets.length : 0 }));
    for (const s of sample) console.log(`    ${s.match} | ${s.competition} | ${s.markets} markets in payload`);
    report.betpawa.scan[c] = { events: r.events.length, sample };
  }
  console.log('\nNext: find which category is tennis and which is basketball from the names above, then run:');
  console.log('  node scripts/probe-markets-v2.mjs --betpawa=tennis:<id>,basketball:<id>');
}

async function pawaDeep(sportName, cat) {
  console.log(`\n==================== betPawa: ${sportName} (category ${cat}) ====================`);
  const out = (report.betpawa[sportName] = { category: cat });
  const r = await pawaFetch(String(cat), 12);
  if (r.error || !r.events.length) { console.log(`No events (${r.error ?? 'empty'}). Send me this line.`); out.error = r.error ?? 'empty'; return; }
  console.log(`Events: ${r.events.length} (request variant: ${r.variant})`);
  const e0 = r.events[0];
  console.log(`Event keys: ${Object.keys(e0).join(', ')}`);
  const m0 = (Array.isArray(e0.markets) ? e0.markets : [])[0];
  if (m0) {
    console.log(`Market keys: ${Object.keys(m0).join(', ')}`);
    console.log(`marketType keys: ${Object.keys(m0.marketType ?? {}).join(', ')}`);
    const row0 = Array.isArray(m0.row) ? m0.row[0] : null;
    if (row0) console.log(`Row keys: ${Object.keys(row0).join(', ')}; specifier example: ${JSON.stringify(row0.specifier ?? null)}`);
    out.rawMarketSample = m0;
  }
  const bucket = new Map();
  for (const e of r.events) {
    for (const m of Array.isArray(e.markets) ? e.markets : []) {
      const id = String(m?.marketType?.id ?? '?');
      const name = m?.marketType?.name ?? m?.marketType?.displayName ?? '';
      for (const row of Array.isArray(m.row) ? m.row : []) {
        const spec = isObj(row.specifier) ? JSON.stringify(row.specifier) : '';
        const prices = (Array.isArray(row.prices) ? row.prices : []).map((p) => `${p.id}=${p.name ?? ''}`);
        addMarket(bucket, id, name, spec, prices, String(e.id));
      }
    }
  }
  out.markets = printBucket(`betPawa ${sportName} markets`, bucket, r.events.length);
}


// ---------- SportyBet fixtures (exact ids the app will request) ----------
const FINAL_IDS = { football: '1,10,18,29', tennis: '186,189', basketball: '219,225,236,68,90' };
async function saveFixture(sportName, sportId) {
  console.log(`\n===== SportyBet fixture feed: ${sportName} (marketId=${FINAL_IDS[sportName]}) =====`);
  const p = new URLSearchParams({ sportId, marketId: FINAL_IDS[sportName], pageSize: '30', pageNum: '1', timeline: '72', todayGames: 'false', _t: String(Date.now()) });
  const r = await call(`${SPORTY}/api/ke/factsCenter/pcUpcomingEvents?${p}`, { headers: SH });
  if (r.error || r.json?.bizCode !== 10000 || !Array.isArray(r.json?.data?.tournaments)) {
    console.log(`Failed: ${r.error ?? `HTTP ${r.status}, bizCode ${r.json?.bizCode ?? 'n/a'}, body ${r.text?.slice(0, 160)}`}`);
    report.sportybet[`${sportName}_fixture`] = { error: r.error ?? `HTTP ${r.status}` };
    return;
  }
  const all = r.json.data.tournaments.flatMap((t) => t.events ?? []);
  const perId = new Map();
  for (const e of all) {
    for (const m of Array.isArray(e.markets) ? e.markets : []) {
      const k = String(m.id);
      const o = perId.get(k) ?? { objects: 0, specs: new Set(), quarters: new Set(), outcomeIds: new Set(), events: new Set() };
      o.objects++; o.events.add(e.eventId);
      if (m.specifier) o.specs.add(m.specifier);
      const q = /quarternr=(\d)/.exec(m.specifier ?? '');
      if (q) o.quarters.add(q[1]);
      for (const oc of Array.isArray(m.outcomes) ? m.outcomes : []) o.outcomeIds.add(String(oc.id));
      perId.set(k, o);
    }
  }
  console.log(`Events in feed page: ${all.length}`);
  const summary = {};
  for (const [id, o] of perId) {
    const line = `id ${id}: ${o.objects} market objects in ${o.events.size} events, ${o.specs.size} distinct specifiers, outcome ids [${[...o.outcomeIds].join(',')}]${o.quarters.size ? `, quarters seen [${[...o.quarters].sort().join(',')}]` : ''}`;
    console.log('  ' + line);
    summary[id] = line;
  }
  const ids = FINAL_IDS[sportName].split(',');
  for (const id of ids) if (!perId.has(id)) console.log(`  NOTE: requested id ${id} did not appear in any event in this page`);
  let left = 5;
  const trimmed = JSON.parse(JSON.stringify(r.json));
  trimmed.data.tournaments = trimmed.data.tournaments
    .map((t) => { const ev = (t.events ?? []).slice(0, left); left -= ev.length; return { ...t, events: ev }; })
    .filter((t) => t.events.length);
  mkdirSync('probe-output', { recursive: true });
  const file = `probe-output/fixture-sportybet-${sportName}-feed.json`;
  writeFileSync(file, JSON.stringify(trimmed, null, 2));
  console.log(`Saved ${file}`);
  report.sportybet[`${sportName}_fixture`] = { requestedIds: ids, summary, file };
}

// ---------- run ----------
for (const [name, id] of Object.entries(SPORTS)) {
  if (!FIXTURES_ONLY) await probeSporty(name, id);
  await saveFixture(name, id);
}
if (Object.keys(PAWA_PICKS).length) {
  for (const [name, cat] of Object.entries(PAWA_PICKS)) await pawaDeep(name, cat);
} else {
  await pawaScan();
}
mkdirSync('probe-output', { recursive: true });
writeFileSync('probe-output/report.json', JSON.stringify(report, null, 2));
console.log('\nDone. Full report saved to probe-output/report.json. Paste the text above into the chat.');