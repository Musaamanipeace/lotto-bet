# LottoBet - Odds Filter & Betslip Generator

A multi-bookie odds filter and betslip generator for **SportyBet Kenya**. The app ingests upcoming football fixtures and their market odds, applies filtering criteria (double chance, home win, over/under thresholds), and produces a randomized accumulator betslip that can be exported as a SportyBet booking code.

## Features

- **SportyBet-native data**: Fetches live upcoming events and market details directly from SportyBet's public API endpoints.
- **Odds filtering**: Filter matches by league, timeframe, and preferred market criteria (Double Chance, Home Win, Over 0.5, Under 3.5).
- **Betslip generation**: Picks N random qualifying selections using a Fisher-Yates shuffle.
- **Client-side booking code**: Generates a SportyBet booking code via the share API directly from the browser, leveraging the user's local East African IP address.
- **Stake simulator**: Interactive calculator showing gross returns, Kenya 20% withholding tax, and net take-home per stake.
- **Cut-1 simulation**: Estimates payout if one leg fails.

## Prerequisites

- Node.js 18+
- Bun (recommended) or npm

## Getting Started

1. Install dependencies:
   ```bash
   bun install
   ```

2. Run the development server:
   ```bash
   bun run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy `.env.example` to `.env.local` if you need to override the app name:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Application name (optional, defaults to "LottoBet") |

No API keys are required — the app uses SportyBet's public endpoints directly.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── odds/route.ts          # Server-side odds endpoint (SportyBet API)
│   │   └── generate-code/route.ts # Server-side booking code proxy (fallback)
│   ├── layout.tsx                 # Root layout & metadata
│   └── page.tsx                   # Main page
├── components/
│   ├── FilterBar.tsx              # Filter controls & bookie selector
│   ├── GameCard.tsx               # Match card with market picks
│   ├── BetslipDrawer.tsx          # Betslip drawer & stake simulator
│   └── ExportModal.tsx            # Booking code export modal
├── lib/
│   ├── constants.ts               # Bookie configs, market ID mappings, bonus logic
│   ├── filterEngine.ts            # Game evaluation & filtering logic
│   ├── oddsFetcher.ts             # SportyBet API integration & fallback fixtures
│   └── codeConverter.ts           # Client-side booking code generation
└── types/
    └── index.ts                   # TypeScript interfaces
```

## Booking Code Generation

Booking codes are generated **client-side** by calling:

```
POST https://www.sportybet.com/api/ke/orders/share
```

The payload uses SportyBet's native schema:

```json
{
  "outcomes": [
    {
      "eventId": "sr:match:12345678",
      "marketId": "18",
      "outcomeId": "11",
      "specifier": null
    }
  ]
}
```

On success (`bizCode === 10000`), the `shareCode` is extracted and a deep link is constructed:

```
https://www.sportybet.com/ke/?shareCode={shareCode}
```

## License

Private project.
