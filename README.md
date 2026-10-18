# Lotto Bet (stages 1-5: foundation, bookmakers, pipeline, code generation, auth + UI)

Built so far: types, typed `{ok}` results, `criteria.ts`, odds/probability/slip math, native SportyBet and
betPawa fetchers (single attempt, no fallbacks), bookmaker isolation, fuzzy matching, `/api/health`,
DB migration, tests. Stage 3 adds: pipeline (`pipeline.ts`), Postgres store (`pg-store.ts`), cron/refresh routes, `GET /api/games`
(reads the latest stored run, returns `dataAsOf`), shared filters (`filters.ts`), criteria evaluator (`evaluator.ts`),
`StatsProvider` interface (`stats.ts`). Not built yet: AI picks, chat, community, saved slips, scoring/tiers, Active Leagues.

Stage 4 adds `src/lib/codegen/`: SportyBet share-code generator (server POST), betPawa leg mapping + console script
(server only GETs fresh events, never POSTs booking-number), destination dispatcher, leg validation, `outcomes.ts`
(canonical outcome keys). `POST /api/codegen {destination, legs}` runs only the chosen generator.

Stage 5 adds auth and the first UI:
- Auth: `src/lib/auth.ts` (scrypt password hashes with per-password salt, 30-day sessions, only the SHA-256 of the session token is stored), `pg-auth-store.ts`, routes `POST /api/auth/signup|login|logout`, `GET /api/auth/me`. Cookie `lb_session` is HttpOnly, SameSite=Lax, Secure in production. Usernames are lowercase, 3-32 chars `[a-z0-9_]`; passwords 8-128 chars. Unknown user and wrong password give the same error.
- `POST /api/codegen` now requires a signed-in session (401 otherwise). State-changing JSON routes require `Content-Type: application/json`.
- Pages: landing (hero + guest builder), `/my-picks` (builder, sign-in required), top bar (logo, Get Free Slips, Menu), footer with 18+ and responsible-gambling note, auth modal, upstream health banner.
- Builder: bookmaker toggle (one bookmaker per slip, odds never mixed), live filters (kickoff window, market and line from the data, odds range, leagues) with a visible game count, Available Games and Staging Area panels, one leg per game, max 50 legs, grey-out (single leg or whole market, nothing removed), "remove N from market", clear slip, total odds, combined implied probability (margin removed, shown as pricing, never as a prediction).
- Guests: manual adds and "Add random picks" (`src/lib/random-picks.ts`, the only file allowed to use `Math.random`; a test enforces it).
- Code generation UI: destination chosen by the user, results rendered exactly as typed (`ok` or `{error, details}` with HTTP status / bizCode), betPawa `N/M legs mapped`, unmapped legs with reasons, steps, expiry warning, copy script, Open betPawa. "Generate SportyBet code instead" appears only after a betPawa failure and only runs when pressed. Greyed legs are excluded from the code.
- `PickRow.implied`: margin-free probability from the market's complete outcome set; `null` if any outcome is suspended or the set is partial.

## Routes
- `POST /api/codegen`: requires a session. Add rate limiting before a public deploy (none exists yet).
- `POST /api/auth/login|signup`: no rate limiting or lockout yet. Add before a public deploy.
- `GET /api/cron/daily` (Vercel Cron) and `POST /api/admin/refresh`: need `Authorization: Bearer $CRON_SECRET`; fail closed if unset.
  Return 502 when either bookmaker failed (the run is still stored with the per-bookmaker errors).
- `GET /api/cron/lineups`: returns 501 "No lineup provider configured" until a lineup source exists.
- `GET /api/games?bookmaker=&leagues=&market=&line=&oddsMin=&oddsMax=&dateFrom=&dateTo=`
- `vercel.json` runs the lineup cron every 30 minutes, which needs a Vercel plan that allows sub-daily crons (Hobby allows daily only).

## Run
- `npm test` runs the suite (Node >= 22.18, no install needed; tests use built-in type stripping)
- `npm install && npm run dev` then open `/` (NOT yet run: no network in the build sandbox, so `next build`, Tailwind and the `.tsx` UI were never compiled or opened in a browser. Run `npm run typecheck` and `npm run build` first and expect to fix small type or styling errors.)
- Apply `db/migrations/001_init.sql` then `002_auth.sql` to Postgres. Copy `.env.example` to `.env.local`.

## Assumptions
- Source text lost its >= / <= symbols: Over, win and card-over thresholds are minimums; Under and card-under are maximums.
- Team matching uses Sorensen-Dice on normalised names, threshold 0.72 on BOTH teams. The old code was not available, so this is my reconstruction.
- Source files import with `.ts` extensions (required for native Node tests; `allowImportingTsExtensions` is on).

## Fields you must supply (left empty on purpose)
1. `src/lib/criteria.ts` -> `CRITERIA`: all per-market windows and numeric thresholds (`status: 'awaiting_thresholds'`).
2. SportyBet event with the cashout icon (cashout class will show an error until then).
3. betPawa payload with double chance, over/under, cards, corners. Until then those markets are `unavailable`.
   Also verify betPawa field names in `bookmakers/betpawa.ts` (event id, startTime, competition.name, price fields)
   and the market-type id format in the request `view.marketTypes`; the parser is strict and errors on mismatch.

## Stage 4 limits
- Outcome identification: SportyBet 1X2 (ids 1/2/3) and BTTS (74/76) are verified; over/under uses the outcome description; double chance is NOT identified, so double-chance legs show as unmapped. betPawa price names (`1`,`X`,`2`, `yes`,`no`) are UNVERIFIED (`BETPAWA_BY_NAME` in `outcomes.ts`); a mismatch yields an unmapped leg with a reason.
- betPawa over/under, double chance, cards and corners map to nothing until a live payload is supplied.
- Re-validating a slip against current odds before export is not built (needs stored slips, stage 5).

## Known limits
- betPawa is fetched with one `take: 300` request; no paging parameter is used because none is documented. SportyBet is paged (max 20 pages; a cap hit is recorded as a warning).
- Only identified markets become pick rows. Full-time over/under only with a known line from 0.5 to 5.5, so betPawa over/under, double chance, cards, corners and half totals do not appear until a live sample is supplied.
- Scoring, tiers and slips are not built: criteria thresholds are still empty (the evaluator only handles pass/fail/unavailable and the 60% rule).

## Tests
Rule 3 (isolation) and rule 6 (no retry) are covered, plus pipeline, stored-read, filter, evaluator and cron-auth tests (57 total, stage 5 adds auth, slip, random-picks and implied-probability tests). The in-memory store and payload fixtures live only in `tests/`. Rule 4 (destination-driven code generation) is tested in stage 4 with the generators.

## Stage 5 limits and decisions to review
- The UI is untested beyond the pure logic it calls (slip, filters, random picks, auth). No component or browser tests exist.
- Signed-in users see "Add with AI (not built yet)" disabled. There is no AI add, no cashout class, no Exchange, no chat. Menu entries for those tabs are shown disabled as "not built yet".
- Codegen requires sign-in, so guests cannot get booking codes. If you want guests to have them, remove the check in `app/api/codegen/route.ts` and add rate limiting first.
- Game rows show only teams, pick, odd and kickoff, as specified. Implied probability appears in the staging area.
- No session cleanup job: expired sessions are ignored but not deleted.
- betPawa over/under, double chance, cards and corners remain unavailable until a live payload is supplied (see "Fields you must supply").

## LLM providers and failover (added after stage 5)
`src/lib/llm/`: `callLlm({system?, prompt, json?})` tries Gemini, then OpenRouter, then Mistral (order via `LLM_PROVIDER_ORDER`), ONE request per provider with a 25 s timeout, no retries. On a failure it moves to the next provider.
- `LLM_FAILOVER=any` (default): fail over on every error. `transient`: only on network errors, timeouts, 408, 429 and 5xx; a 4xx such as a bad request stops the chain.
- Not silent, which deliberately refines engineering rule 1 for AI calls: the result carries `provider`, `model` and `attempts` (every earlier failure with its real message and HTTP status), and callers should show which provider answered. If all fail, the error lists every failure. Providers without keys are listed as skipped.
- Keys: `GEMINI_API_KEY` (old `LLM_API_KEY` still accepted), `OPENROUTER_API_KEY` + `OPENROUTER_MODEL` (no default model, your choice), `MISTRAL_API_KEY`. Model overrides: `GEMINI_MODEL`, `MISTRAL_MODEL`.
- Nothing calls it yet; the stage 6 chat, Exchange and Shuffle will. There is deliberately no public route for it (it would spend your keys with no rate limiting). A bad JSON answer from one provider is not detected here; callers that need JSON must validate it.
- Tests: 66 total, the 9 new ones use fake fetches only (no real API was called).
