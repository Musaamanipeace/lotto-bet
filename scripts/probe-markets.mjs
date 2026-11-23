/**
 * Phase 0 diagnostic (NOT used by the app). Read-only, SportyBet-only. One attempt per request,
 * with a short pause between them.
 *
 *   node scripts/probe-markets.mjs
 *       SportyBet market discovery for football (control), tennis and basketball.
 *
 *   node scripts/probe-markets.mjs --fixtures-only
 *       Saves trimmed real feed responses as test fixtures using the exact market ids the app requests.
 *
 *   Add --all to print every market type instead of only the relevant-looking ones.
 *
 * Run it from your own machine in Kenya, like the app's other probe script. Output is also saved to
 * probe-output/report.json. Paste the console text back into the chat.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const SPORTY = process.env.SPORTY_BASE ?? 'https://www.sportybet.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const SH = { 'Current-Country': 'KE', Referer: `${SPORTY}/ke/`, Accept: 'application/json', 'User-Agent': UA };

const args = process.argv.slice(2);
const SHOW_ALL = args.includes('--all');
const FIXTURES_ONLY = args.includes('--fixtures-only');
// Sportradar-style ids. Football is the control: it is known to work in the app today.
const SPORTS = { football: 'sr:sport:1', tennis: 'sr:sport:5', basketball: 'sr:sport:2' };
const RELEVANT = /winner|moneyline|total|over|under|quarter|half|1st|2nd|3rd|4th|games|sets|points/i;

const report = { generatedAt: new Date().toISOString(), sportybet: {} };
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
mkdirSync('probe-output', { recursive: true });
writeFileSync('probe-output/report.json', JSON.stringify(report, null, 2));
console.log('\nDone. Full report saved to probe-output/report.json. Paste the text above into the chat.');