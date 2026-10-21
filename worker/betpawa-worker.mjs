// Tiny standalone service that runs Chromium and creates betPawa booking codes.
// Deploy it somewhere long-running (Fly.io, Railway, Render, a VPS) and point
// BETPAWA_BROWSER_WORKER_URL at it from the Next app. Vercel functions are a poor fit for Chromium.
import http from 'node:http';
import { chromium } from 'playwright-core';

const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.BETPAWA_WORKER_SECRET || '';
const MAX = 2;
let active = 0;
let browser = null;
const getBrowser = async () => (browser && browser.isConnected() ? browser : (browser = await chromium.launch({
  headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'],
})));

async function createCode(body) {
  if (active >= MAX) return { ok: false, error: 'Browser is busy, try again shortly' };
  active++;
  let ctx;
  try {
    ctx = await (await getBrowser()).newContext({ locale: 'en-KE' });
    const page = await ctx.newPage();
    await page.goto('https://www.betpawa.co.ke/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const out = await page.evaluate(async (b) => {
      const r = await fetch('/api/sportsbook/v3/booking-number', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-pawa-brand': 'betpawa-kenya', 'x-pawa-language': 'en', devicetype: 'web' },
        body: JSON.stringify(b),
      });
      let d = null; try { d = await r.json(); } catch {}
      return { status: r.status, d };
    }, body);
    if (out.d && out.d.code) return { ok: true, code: String(out.d.code) };
    return { ok: false, status: out.status, error: `betPawa refused the booking (HTTP ${out.status}): ${JSON.stringify(out.d).slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    active--;
    if (ctx) await ctx.close().catch(() => {});
  }
}

http.createServer(async (req, res) => {
  const send = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
  if (req.method !== 'POST') return send(405, { ok: false, error: 'POST only' });
  if (!SECRET || req.headers.authorization !== `Bearer ${SECRET}`) return send(401, { ok: false, error: 'Unauthorized' });
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 100_000) return send(413, { ok: false, error: 'Body too large' }); }
  let body;
  try { body = JSON.parse(raw); } catch { return send(400, { ok: false, error: 'Invalid JSON' }); }
  const sel = body && body.selections;
  if (!Array.isArray(sel) || sel.length === 0 || sel.length > 50 ||
      !sel.every((s) => s && s.type === 'SINGLE' && Array.isArray(s.selections) && s.selections.every(Number.isInteger))) {
    return send(400, { ok: false, error: 'Invalid booking body' });
  }
  send(200, await createCode(body));
}).listen(PORT, () => console.log(`betpawa worker listening on :${PORT}`));
