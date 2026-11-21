#!/usr/bin/env node
/**
 * Diagnostic only (not used by the app): shows exactly what SportyBet accepts when sharing a slip.
 *   node scripts/probe-sportybet-share.mjs
 * It fetches one real upcoming match, then POSTs the SAME leg(s) to /orders/share in a few request shapes and prints
 * SportyBet's own answer for each. Run it from the machine/network you deploy from, because SportyBet may treat
 * server IPs differently from your home connection.
 */
const BASE = 'https://www.sportybet.com';
const H = {
  'Current-Country': 'KE', Referer: `${BASE}/ke/`, Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};

async function call(url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text };
  } catch (e) { return { error: `${e.message}${e.cause ? ` (${e.cause.code ?? e.cause.message})` : ''}` }; }
}

const params = new URLSearchParams({ sportId: 'sr:sport:1', marketId: '1,10,18,29', pageSize: '30', pageNum: '1', timeline: '48', todayGames: 'false', _t: String(Date.now()) });
const feed = await call(`${BASE}/api/ke/factsCenter/pcUpcomingEvents?${params}`, { headers: H });
if (feed.error) { console.error('Could not reach SportyBet at all:', feed.error); process.exit(1); }
console.log(`Feed: HTTP ${feed.status}, bizCode ${feed.json?.bizCode}`);
if (feed.json?.bizCode !== 10000) { console.error('Feed rejected:', feed.text.slice(0, 300)); process.exit(1); }

const events = (feed.json.data?.tournaments ?? []).flatMap((t) => t.events ?? []);
const ev = events.find((e) => e.estimateStartTime > Date.now() + 10 * 60_000 && (e.markets ?? []).some((m) => String(m.id) === '1'));
if (!ev) { console.error('No suitable upcoming match found in the feed.'); process.exit(1); }
const m1 = ev.markets.find((m) => String(m.id) === '1');
console.log(`\nUsing ${ev.homeTeamName} v ${ev.awayTeamName} (${ev.eventId})`);
console.log(`1X2 market keys: ${Object.keys(m1).join(', ')}`);
console.log(`Does the 1X2 market have a "specifier" key? ${'specifier' in m1 ? `yes, value ${JSON.stringify(m1.specifier)}` : 'NO (absent)'}`);
const ou = ev.markets.find((m) => String(m.id) === '18');
if (ou) console.log(`Over/Under market specifier: ${JSON.stringify(ou.specifier)}`);

const legs = [{ eventId: ev.eventId, marketId: String(m1.id), outcomeId: String(m1.outcomes[0].id), spec: m1.specifier }];
const variants = {
  'A  selections, specifier null when the feed has none (what the original sent)': { selections: legs.map((l) => ({ eventId: l.eventId, marketId: l.marketId, outcomeId: l.outcomeId, specifier: l.spec ?? null })) },
  'B  selections, specifier "" (what the rebrand sent before)': { selections: legs.map((l) => ({ eventId: l.eventId, marketId: l.marketId, outcomeId: l.outcomeId, specifier: '' })) },
  'C  selections, specifier key omitted': { selections: legs.map((l) => ({ eventId: l.eventId, marketId: l.marketId, outcomeId: l.outcomeId })) },
  'D  "outcomes" instead of "selections" (the original\'s fallback)': { outcomes: legs.map((l) => ({ eventId: l.eventId, marketId: l.marketId, outcomeId: l.outcomeId, specifier: l.spec ?? null })) },
};

console.log('\nShare attempts (one call each):');
for (const [name, body] of Object.entries(variants)) {
  const r = await call(`${BASE}/api/ke/orders/share`, { method: 'POST', headers: { ...H, Origin: BASE, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (r.error) { console.log(`  ${name}\n     -> request failed: ${r.error}`); continue; }
  const code = r.json?.data?.shareCode;
  console.log(`  ${name}\n     -> HTTP ${r.status}, bizCode ${r.json?.bizCode}, message ${JSON.stringify(r.json?.message)}${code ? `, SHARE CODE ${code}` : ''}${r.json ? '' : `, body: ${r.text.slice(0, 120)}`}`);
}
console.log('\nWhichever variants print a SHARE CODE are accepted. If none do, the message above is SportyBet\'s reason (blocked IP, closed market, etc).');
