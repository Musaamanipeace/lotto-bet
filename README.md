# Lotto Bet

AI-powered multi-bookmaker betslip filter and code generator (SportyBet + betPawa).

## Quick start (no database required bro)

```bash
npm install
npm run dev
```

Open http://localhost:3000

- On first request to `/api/games`, the app **automatically fetches** SportyBet (and betPawa) upcoming events and keeps them in memory for the lifetime of the Node process.
- You can also force a refresh: `POST /api/admin/refresh` (no secret required in development bro).
- SportyBet share-code generation works without sign-in in development bro.

### Optional: Postgres (production)

1. Copy `.env.example` → `.env.local`
2. Set `DATABASE_URL` (Neon / Supabase / local Postgres)
3. Apply migrations in order:
   - `db/migrations/001_init.sql`
   - `db/migrations/002_auth.sql`
   - `db/migrations/003_enable_rls.sql`
4. Set `CRON_SECRET` and protect cron/refresh routes
5. Restart; the app will use Postgres instead of the in-memory store

### Optional: LLM keys

See `.env.example` for `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies (plain install, no special flags needed) |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run refresh` | Trigger a manual refresh (dev server must be running) |

## Architecture notes

- **SportyBet**: fetches `pcUpcomingEvents` (paged), generates share codes via `POST /orders/share`.
- **betPawa**: fetches upcoming events; codegen produces a **browser console script** (no server-side booking POST, avoids 404s).
- Bookmakers are isolated: one failing never blocks the other.
- Pipeline stores a run + games; `/api/games` reads the latest finished run (or auto-runs one if none exists).

### betPawa booking codes

**Paging rule.** betPawa rejects any single request with `take > 100` (HTTP 400 "The maximum number of events is 100"). `fetchBetPawaGames` never sends more than `BETPAWA_MAX_TAKE` (100); larger requests are split across pages using `skip` (the only paging parameter betPawa honours), stopping at the first short page. Raw event count — not parsed game count — is the stop signal.

**Why the server must not POST `/api/sportsbook/v3/booking-number` directly.** betPawa rejects server-origin booking requests (separate 400). Booking codes are created either (a) by the user running a console script pasted into the browser (always generated and returned as the guaranteed fallback), or (b) optionally by a real headless-browser session on `betpawa.co.ke` so origin and cookies are the site's own.

**Optional headless-browser path** (`src/lib/codegen/betpawa-browser.ts`). Free open-source Playwright + Chromium — no paid browser service. Two modes:

- **In-process** — set `BETPAWA_BROWSER=1` (requires a long-running Node host with Chromium installed).
- **Worker mode** — set `BETPAWA_BROWSER_WORKER_URL` + `BETPAWA_WORKER_SECRET` to POST the booking body to your own worker service (deploy `worker/betpawa-worker.mjs` on Fly.io, Railway, Render, or a VPS; Vercel serverless functions are a poor fit for Chromium). The worker validates the booking body and requires a bearer secret. Concurrency is capped at 2.

If the browser path fails, `browserError` is attached and the console-script fallback is still returned.

**Test one real booking from the worker host first** — if betPawa blocks that host, the console-script fallback still works.

> Price IDs expire. Generate and post in the same request; if the script fails or time has passed, regenerate it instead of reusing it.

## Requirements

- Node.js **>= 18**
- No database required for local use

## Changes in this fixed build (0.2.1)

- `npm install` works without `--no-scripts` (engines relaxed to Node >= 18, clean deps)
- In-memory store when `DATABASE_URL` is unset → SportyBet games load on first visit
- Auto-bootstrap pipeline on first `/api/games` request
- Refresh endpoint usable without `CRON_SECRET` in development
- Codegen works without auth when not in production+DB mode

## AI features (free-data build)

This branch implements the deterministic AI layer described in the design doc:

| Module | Role |
|--------|------|
| `src/lib/criteria.ts` | Odds bands, provisional criteria, Verified / Best-fit mode, fit-score weights, core/booster mixes |
| `src/lib/evaluator.ts` | Criteria evaluation; unavailable never counts as pass; Best-fit vs Verified labels |
| `src/lib/stats.ts` | StatsProvider interface + free-tier stubs (football-data.org, API-Football) |
| `src/lib/ai-picks.ts` | Fit scoring, ranking, accumulator composition (25+, pick-N, target-odds) |

### Principles (enforced in code)

- Deterministic engine decides qualification; LLM only chooses among validated IDs.
- Unavailable criteria never become a pass.
- Provisional thresholds are flagged on every pick.
- Only bookmaker implied probability (margin-removed) is shown as a probability.
- No win language, no silent fallbacks, no fabricated sample slips.

### Working assumptions (design §14)

- Criteria without a stated number use league-relative / provisional cut-offs.
- Fit-score weights and core/booster ratios (75/25 default) are provisional and tunable in `criteria.ts`.
- Corners market uses Cards bands as placeholders until real bands are supplied.
- Cashout class remains disabled until a verified feed field exists.
- xG / PPDA / field tilt stay unavailable on free data.

### Next steps (design §13)

1. ~~Wire real HTTP calls in `FootballDataOrgProvider`~~ done (see Update below). `ApiFootballProvider` is intentionally not built: no cards/corners market is generated yet.
2. Daily pipeline: candidate generation → evaluate → rank → store AI picks & slips.
3. AI Picks UI (best-by-market, pick N, target odds, 25+).
4. Re-validation + lineup exclusion cron.
5. LLM tools for builder assistant / chat / Exchange (optional; can stay deterministic).
6. Settlement from football-data.org results → win-rate indicator.

Set `FOOTBALL_DATA_API_KEY` and/or `API_FOOTBALL_KEY` in `.env.local` when ready.

## Complete AI implementation (this archive)

### New modules
| Path | Role |
|------|------|
| `src/lib/candidates.ts` | Map live markets → PickMarketKey; tier from odds bands |
| `src/lib/ai-engine.ts` | Candidates → criteria eval → fit score → rank → slips |
| `src/lib/ai-picks.ts` | Ranking, fit score, core/booster composition, target odds |
| `src/lib/ai-store.ts` | In-process snapshot of latest AI picks/slips |
| `src/lib/run-ai.ts` | Load games from store → generate → cache |
| `src/lib/revalidate.ts` | Re-check stored picks vs current odds before export |
| `src/lib/criteria.ts` | Provisional thresholds, Best-fit mode, mix ratios |
| `src/lib/evaluator.ts` | Verified vs Best fit labels |
| `src/lib/stats.ts` | Free-tier provider stubs |

### API routes
- `GET /api/ai/status` – providers, mode, snapshot summary
- `POST /api/ai/generate` – regenerate from latest fetch run
- `GET /api/ai/picks?market=&bookmaker=&limit=`
- `GET /api/ai/slips` – 25+ accumulators
- `GET /api/ai/pick-n?n=`
- `GET /api/ai/target-odds?target=`

### UI
- `/ai-picks` – Best by market, Pick N, Target odds, 25+ slips
- Builder: **Add with AI** for signed-in users
- Menu link to AI Picks
- Refresh / daily cron also runs AI generation after fetch

### Verified
- `tsc --noEmit` clean
- `npm test` – 75 pass
- `next build` – success

### Still deferred (design §14)
- Real HTTP in football-data.org / API-Football providers
- Cashout class
- LLM chat / Exchange / Shuffle (interfaces already present)
- Settlement + win-rate indicator


## Update: data status, league filters, alternatives, add-N

### Data status ("unavailable" now says why)
Every criterion carries a `dataState`: `ok`, `not_offered` (no free source has it, e.g. xG/PPDA), `not_covered`
(source has it, not for this league/team), `not_fetched` (never requested: no key, per-run budget, not built),
`fetch_failed` (request failed: 429, bad key, network), `not_configured`. The AI Picks page shows a coverage strip,
per-pick badges and a per-criterion list. `GET /api/ai/status` and `/api/ai/picks` return the same `coverage` summary.

Real stats come from **football-data.org** (`FOOTBALL_DATA_API_KEY`, free): season-to-date home/away/overall tables
(home/away win rate, unbeaten rate, rank, goals for/against) and each team's last finished matches (form, rest days,
over 1.5 / under 3.5 / under 4.5 / no-draw rates). Free limit is 10 requests/minute: calls are throttled
(`FOOTBALL_DATA_RATE_PER_MIN`, default 9), cached 6 h, and capped per run (`FOOTBALL_DATA_MAX_CALLS_PER_RUN`, default 60).
Candidates are evaluated Big Five first so the cap is spent where data is richest. Only the free domestic leagues
in `src/lib/competitions.ts` map to football-data.org; everything else reports `not_covered`.
`API_FOOTBALL_KEY` is not used yet (cards/fouls/corners criteria belong to markets the engine does not generate).

Less data means less trust: fit score adds `lowDataProbabilityBoost x (1 - coverage) x implied probability`
(`FIT_SCORE_WEIGHTS`), so low-coverage picks need a higher bookmaker probability to rank well. It is a weight, not a cutoff.

### League filters
`/leagues` has checkboxes (per league, per group, search, select all/clear). The selection lives in `?leagues=` and
hands off to `/ai-picks?leagues=` and the Builder. AI Picks has a league dropdown; `leagues` is accepted by
`/api/ai/picks`, `/pick-n`, `/target-odds` and `/alternatives`. Nothing ticked = all leagues.

### Alternatives (`/ai-picks` -> Alternatives tab, `GET /api/ai/alternatives`)
Give a target (+/- tolerance) or a min-max range (e.g. 100 to 1000). The first slip comes from the existing
`pickTargetOdds`; every other slip is a parent slip with legs swapped for equal-or-better picks (any market by default),
total odds kept inside the range, every pair differing by at least N legs, one pick per game, Verified never downgraded
to Best fit. Deterministic per seed, so "Load 50 more" extends the same list. It stops with a plain message when
the pool is exhausted. Per slip: lock legs, swap weakest N / ticked legs (`POST /api/ai/swap`, never repeats a pick),
undo, add N legs to the betslip, or load the slip as the betslip.

### Add N to the betslip
`src/lib/add-picks.ts` + `POST /api/ai/revalidate`: odds are re-checked first; price changes inside the band are applied
and reported, suspended or dropped picks are skipped with the reason, games already on the slip and other-bookmaker
picks are refused, the 50-leg cap is respected, and the report says "Added X of N".
