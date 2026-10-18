# Lotto Bet

AI-powered multi-bookmaker betslip filter and code generator (SportyBet + betPawa).

## Quick start (no database required)

```bash
npm install
npm run dev
```

Open http://localhost:3000

- On first request to `/api/games`, the app **automatically fetches** SportyBet (and betPawa) upcoming events and keeps them in memory for the lifetime of the Node process.
- You can also force a refresh: `POST /api/admin/refresh` (no secret required in development).
- SportyBet share-code generation works without sign-in in development.

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

## Requirements

- Node.js **>= 18**
- No database required for local use

## Changes in this fixed build (0.2.1)

- `npm install` works without `--no-scripts` (engines relaxed to Node >= 18, clean deps)
- In-memory store when `DATABASE_URL` is unset → SportyBet games load on first visit
- Auto-bootstrap pipeline on first `/api/games` request
- Refresh endpoint usable without `CRON_SECRET` in development
- Codegen works without auth when not in production+DB mode
