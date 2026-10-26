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

1. Wire real HTTP calls in `FootballDataOrgProvider` and `ApiFootballProvider`.
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
