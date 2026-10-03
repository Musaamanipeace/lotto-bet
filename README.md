# LottoBet — SportyBet Odds Filter & Betslip Generator

A Next.js application that fetches upcoming football fixtures and market odds directly from
SportyBet Kenya's public API, applies filtering criteria (Double Chance, Home Win, Over 0.5,
Under 3.5 goals), and generates a randomized accumulator betslip that can be exported as a
SportyBet booking code.

## Important: Local Domain Requirement

SportyBet's API endpoints are **geo-restricted to Kenya**. Requests from non-Kenyan IPs (including
Vercel-hosted deployments) will be blocked or return errors. **You must run this app locally on a
machine with a Kenyan IP address** for full functionality.

- **SportyBet events API** (`/api/ke/factsCenter/pcUpcomingEvents`) returns 422 from non-KE IPs.
- **SportyBet share API** (`/api/ke/orders/share`) rejects booking-code requests from non-KE IPs.
- Run on `http://localhost:3000` or access via `http://127.0.0.1:3000` from a Kenyan network.

## Features

- **SportyBet-native data**: Fetches live upcoming football events and detailed market odds from
  SportyBet's public endpoints (no fallback data — real API only).
- **Odds filtering**: Filter by league, kickoff window (3h–48h ahead), and market criteria
  (Double Chance 1X/X2/12, Home Win, Over 0.5, Under 3.5 goals).
- **Betslip generation**: Picks N random qualifying selections via Fisher-Yates shuffle with
  adjustable leg count (5–50 presets).
- **Server-side booking-code generation**: POSTs selections to SportyBet's share API
  (`https://www.sportybet.com/api/ke/orders/share`) with proper headers and a 12-second timeout.
  Only returns real SportyBet `shareCode` values — no local/fake code generation.
- **Stake simulator**: Interactive calculator with Kenya 20% withholding tax and net payouts.
- **Cut-1 simulation**: Estimates payout if one leg fails.

## Prerequisites

- **Node.js** 18+
- **npm** (tested with npm 10.9.2) or **Bun**

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   # or: bun install
   ```

2. Run the development server:

   ```bash
   npm run dev
   # or: bun run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

No environment variables are required. SportyBet's public API endpoints are used directly.
The repository ships with an empty `.env.example` (comment-only).

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── odds/route.ts          # Server-side odds endpoint (SportyBet pcUpcomingEvents + event)
│   │   └── generate-code/route.ts # Server-side booking code proxy (POST to SportyBet share API)
│   ├── globals.css                # Tailwind base styles
│   ├── layout.tsx                 # Root layout & metadata
│   └── page.tsx                   # Main page (odds fetch, filtering, UI state)
├── components/
│   ├── FilterBar.tsx              # Filter controls, league selector, pick count
│   ├── GameCard.tsx               # Match card with market picks
│   ├── BetslipDrawer.tsx          # Betslip drawer & stake simulator
│   └── ExportModal.tsx            # Booking code export modal
├── lib/
│   ├── constants.ts               # SportyBet URLs, market ID mappings, bonus logic
│   ├── filterEngine.ts            # Game evaluation, filtering, shuffling
│   ├── oddsFetcher.ts             # SportyBet API integration (events + market details)
│   └── codeConverter.ts           # Booking code generation via SportyBet share API
└── types/
    └── index.ts                   # TypeScript interfaces
```

## API Endpoints

### `GET /api/odds`

Fetches upcoming football events from SportyBet and returns them in a normalized format.

**Response** (200):
```json
{
  "success": true,
  "count": 15,
  "source": "api",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "games": [{ ... }]
}
```

**Response** (500): Returns `{ "success": false, "error": "Unable to retrieve match odds at this time." }`
if the SportyBet API is unreachable or returns an error.

### `POST /api/generate-code`

Generates a SportyBet booking code by POSTing selections to SportyBet's share API.

**Request body**:
```json
{
  "destination_bookie": "sportybet:ke",
  "selections": [
    {
      "eventId": "sr:match:12345678",
      "marketId": "18",
      "outcomeId": "11",
      "specifier": null,
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "pick": "1",
      "odd": 1.15,
      "marketName": "Double Chance"
    }
  ]
}
```

**Response** (200):
```json
{
  "success": true,
  "bookingCode": "ABCD12",
  "deepLink": "https://www.sportybet.com/ke/?shareCode=ABCD12",
  "totalOdds": 2.50,
  "matchCount": 2
}
```

**Response** (422): Returns an error message if SportyBet rejects the selections (e.g., markets
closed, invalid IDs, missing market data).

## Booking Code Generation

Booking codes are generated server-side by calling:

```
POST https://www.sportybet.com/api/ke/orders/share
```

The payload uses SportyBet's native schema with two variants (`selections` and `outcomes`):

```json
{
  "selections": [
    {
      "eventId": "sr:match:12345678",
      "marketId": "18",
      "outcomeId": "11",
      "specifier": null
    }
  ]
}
```

Required headers:
- `Content-Type: application/json`
- `Accept: application/json`
- `Current-Country: KE`
- `Origin: https://www.sportybet.com`
- `Referer: https://www.sportybet.com/ke/`

On success (`bizCode === 10000`), the `shareCode` is extracted and a deep link is constructed:

```
https://www.sportybet.com/ke/?shareCode={shareCode}
```

No local/fake code generation is performed. If the SportyBet API fails, the app returns the
error message from SportyBet so the user can adjust their selections and retry.

## License

Private project.