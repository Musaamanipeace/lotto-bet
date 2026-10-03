# Codebase

## File Tree

```
```

## File Contents

### `.env.example`

```
# No environment variables required.
# SportyBet's public API endpoints are used directly.

```

### `.eslintrc.json`

```json
{
  "extends": "next/core-web-vitals"
}

```

### `.gitignore`

```
# Dependencies
node_modules/
bun.lock
package-lock.json
pnpm-lock.yaml
yarn.lock

# Build output
.next/
out/
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env*.local

# Runtime data
*.log
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db

# Editor / IDE
.vscode/
.idea/
*.swp
*.swo
*~

```

### `README.md`

```
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

```

### `bun.lock`

```text
{
  "lockfileVersion": 2,
  "configVersion": 1,
  "workspaces": {
    "": {
      "name": "slip-generator",
      "dependencies": {
        "clsx": "^2.1.1",
        "lucide-react": "^0.475.0",
        "next": "14.2.24",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "tailwind-merge": "^2.6.0",
      },
      "devDependencies": {
        "@types/node": "^20.17.19",
        "@types/react": "^18.3.18",
        "@types/react-dom": "^18.3.5",
        "autoprefixer": "^10.4.20",
        "eslint": "^8.57.1",
        "eslint-config-next": "14.2.24",
        "postcss": "^8.4.49",
        "tailwindcss": "^3.4.17",
        "typescript": "^5.7.3",
      },
    },
  },
  "packages": {
    "@alloc/quick-lru": ["@alloc/quick-lru@5.3.0", "", {}, "sha512-U4+70Pc5ZS9osnCBCE5Jha/ciHM+Yp+CNMNC/7HvYbNRk1Ldd+f7qO65W5qfhu/TCv+/ozljlXXe9Nj8419DMA=="],

    "@emnapi/core": ["@emnapi/core@1.10.0", "", { "dependencies": { "@emnapi/wasi-threads": "1.2.1", "tslib": "^2.4.0" } }, "sha512-yq6OkJ4p82CAfPl0u9mQebQHKPJkY7WrIuk205cTYnYe+k2Z8YBh11FrbRG/H6ihirqcacOgl2BIO8oyMQLeXw=="],

    "@emnapi/runtime": ["@emnapi/runtime@1.10.0", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-ewvYlk86xUoGI0zQRNq/mC+16R1QeDlKQy21Ki3oSYXNgLb45GV1P6A0M+/s6nyCuNDqe5VpaY84BzXGwVbwFA=="],

    "@emnapi/wasi-threads": ["@emnapi/wasi-threads@1.2.1", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-uTII7OYF+/Mes/MrcIOYp5yOtSMLBWSIoLPpcgwipoiKbli6k322tcoFsxoIIxPDqW01SQGAgko4EzZi2BNv2w=="],

    "@eslint-community/eslint-utils": ["@eslint-community/eslint-utils@4.10.1", "", { "dependencies": { "eslint-visitor-keys": "^3.4.3" }, "peerDependencies": { "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0" } }, "sha512-cuadcxVFE8sDK6iWJbs8Sn0av2Nrh2QSGQhVlBW9AaAHqHwjWsZHT8LJ4hFGPh7ASBV2deFdM7H/DPjulmh8rg=="],

    "@eslint-community/regexpp": ["@eslint-community/regexpp@4.12.2", "", {}, "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew=="],

    "@eslint/eslintrc": ["@eslint/eslintrc@2.1.4", "", { "dependencies": { "ajv": "^6.12.4", "debug": "^4.3.2", "espree": "^9.6.0", "globals": "^13.19.0", "ignore": "^5.2.0", "import-fresh": "^3.2.1", "js-yaml": "^4.1.0", "minimatch": "^3.1.2", "strip-json-comments": "^3.1.1" } }, "sha512-269Z39MS6wVJtsoUl10L60WdkhJVdPG24Q4eZTH3nnF6lpvSShEK3wQjDX9JRWAUPvPh7COouPpU9IrqaZFvtQ=="],

    "@eslint/js": ["@eslint/js@8.57.1", "", {}, "sha512-d9zaMRSTIKDLhctzH12MtXvJKSSUhaHcjV+2Z+GK+EEY7XKpP5yR4x+N3TAcHTcu963nIr+TMcCb4DBCYX1z6Q=="],

    "@humanwhocodes/config-array": ["@humanwhocodes/config-array@0.13.0", "", { "dependencies": { "@humanwhocodes/object-schema": "^2.0.3", "debug": "^4.3.1", "minimatch": "^3.0.5" } }, "sha512-DZLEEqFWQFiyK6h5YIeynKx7JlvCYWL0cImfSRXZ9l4Sg2efkFGTuFf6vzXjK1cq6IYkU+Eg/JizXw+TD2vRNw=="],

    "@humanwhocodes/module-importer": ["@humanwhocodes/module-importer@1.0.1", "", {}, "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA=="],

    "@humanwhocodes/object-schema": ["@humanwhocodes/object-schema@2.0.3", "", {}, "sha512-93zYdMES/c1D69yZiKDBj0V24vqNzB/koF26KPaagAfd3P/4gUlh3Dys5ogAK+Exi9QyzlD8x/08Zt7wIKcDcA=="],

    "@isaacs/cliui": ["@isaacs/cliui@8.0.2", "", { "dependencies": { "string-width": "^5.1.2", "string-width-cjs": "npm:string-width@^4.2.0", "strip-ansi": "^7.0.1", "strip-ansi-cjs": "npm:strip-ansi@^6.0.1", "wrap-ansi": "^8.1.0", "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0" } }, "sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA=="],

    "@jridgewell/gen-mapping": ["@jridgewell/gen-mapping@0.3.13", "", { "dependencies": { "@jridgewell/sourcemap-codec": "^1.5.0", "@jridgewell/trace-mapping": "^0.3.24" } }, "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA=="],

    "@jridgewell/resolve-uri": ["@jridgewell/resolve-uri@3.1.2", "", {}, "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw=="],

    "@jridgewell/sourcemap-codec": ["@jridgewell/sourcemap-codec@1.6.0", "", {}, "sha512-T7jf+5zgsZHwNJ4lvQ7/aezbyk0nNX+zJVWpmHA7VYsEx7a7qr5Rg5IbtJFqkgze5Y2sruq1RUY8Q837Od7iFw=="],

    "@jridgewell/trace-mapping": ["@jridgewell/trace-mapping@0.3.31", "", { "dependencies": { "@jridgewell/resolve-uri": "^3.1.0", "@jridgewell/sourcemap-codec": "^1.4.14" } }, "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw=="],

    "@napi-rs/wasm-runtime": ["@napi-rs/wasm-runtime@1.2.4", "", { "dependencies": { "@tybys/wasm-util": "^0.10.3" }, "peerDependencies": { "@emnapi/core": "^1.7.1 || ^2.0.0-alpha.4", "@emnapi/runtime": "^1.7.1 || ^2.0.0-alpha.4" } }, "sha512-AJxoUD2/15ESHbvpcyjU274nsAPLuOtPHCk0vKJM5pj//Fg/B1FXNWjPnXTT9PymCYYiHo4zPj0ZomXBKhoy7g=="],

    "@next/env": ["@next/env@14.2.24", "", {}, "sha512-LAm0Is2KHTNT6IT16lxT+suD0u+VVfYNQqM+EJTKuFRRuY2z+zj01kueWXPCxbMBDt0B5vONYzabHGUNbZYAhA=="],

    "@next/eslint-plugin-next": ["@next/eslint-plugin-next@14.2.24", "", { "dependencies": { "glob": "10.3.10" } }, "sha512-FDL3qs+5DML0AJz56DCVr+KnFYivxeAX73En8QbPw9GjJZ6zbfvqDy+HrarHFzbsIASn7y8y5ySJ/lllSruNVQ=="],

    "@next/swc-darwin-arm64": ["@next/swc-darwin-arm64@14.2.24", "", { "os": "darwin", "cpu": "arm64" }, "sha512-7Tdi13aojnAZGpapVU6meVSpNzgrFwZ8joDcNS8cJVNuP3zqqrLqeory9Xec5TJZR/stsGJdfwo8KeyloT3+rQ=="],

    "@next/swc-darwin-x64": ["@next/swc-darwin-x64@14.2.24", "", { "os": "darwin", "cpu": "x64" }, "sha512-lXR2WQqUtu69l5JMdTwSvQUkdqAhEWOqJEYUQ21QczQsAlNOW2kWZCucA6b3EXmPbcvmHB1kSZDua/713d52xg=="],

    "@next/swc-linux-arm64-gnu": ["@next/swc-linux-arm64-gnu@14.2.24", "", { "os": "linux", "cpu": "arm64" }, "sha512-nxvJgWOpSNmzidYvvGDfXwxkijb6hL9+cjZx1PVG6urr2h2jUqBALkKjT7kpfurRWicK6hFOvarmaWsINT1hnA=="],

    "@next/swc-linux-arm64-musl": ["@next/swc-linux-arm64-musl@14.2.24", "", { "os": "linux", "cpu": "arm64" }, "sha512-PaBgOPhqa4Abxa3y/P92F3kklNPsiFjcjldQGT7kFmiY5nuFn8ClBEoX8GIpqU1ODP2y8P6hio6vTomx2Vy0UQ=="],

    "@next/swc-linux-x64-gnu": ["@next/swc-linux-x64-gnu@14.2.24", "", { "os": "linux", "cpu": "x64" }, "sha512-vEbyadiRI7GOr94hd2AB15LFVgcJZQWu7Cdi9cWjCMeCiUsHWA0U5BkGPuoYRnTxTn0HacuMb9NeAmStfBCLoQ=="],

    "@next/swc-linux-x64-musl": ["@next/swc-linux-x64-musl@14.2.24", "", { "os": "linux", "cpu": "x64" }, "sha512-df0FC9ptaYsd8nQCINCzFtDWtko8PNRTAU0/+d7hy47E0oC17tI54U/0NdGk7l/76jz1J377dvRjmt6IUdkpzQ=="],

    "@next/swc-win32-arm64-msvc": ["@next/swc-win32-arm64-msvc@14.2.24", "", { "os": "win32", "cpu": "arm64" }, "sha512-ZEntbLjeYAJ286eAqbxpZHhDFYpYjArotQ+/TW9j7UROh0DUmX7wYDGtsTPpfCV8V+UoqHBPU7q9D4nDNH014Q=="],

    "@next/swc-win32-ia32-msvc": ["@next/swc-win32-ia32-msvc@14.2.24", "", { "os": "win32", "cpu": "ia32" }, "sha512-9KuS+XUXM3T6v7leeWU0erpJ6NsFIwiTFD5nzNg8J5uo/DMIPvCp3L1Ao5HjbHX0gkWPB1VrKoo/Il4F0cGK2Q=="],

    "@next/swc-win32-x64-msvc": ["@next/swc-win32-x64-msvc@14.2.24", "", { "os": "win32", "cpu": "x64" }, "sha512-cXcJ2+x0fXQ2CntaE00d7uUH+u1Bfp/E0HsNQH79YiLaZE5Rbm7dZzyAYccn3uICM7mw+DxoMqEfGXZtF4Fgaw=="],

    "@nodelib/fs.scandir": ["@nodelib/fs.scandir@2.1.5", "", { "dependencies": { "@nodelib/fs.stat": "2.0.5", "run-parallel": "^1.1.9" } }, "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g=="],

    "@nodelib/fs.stat": ["@nodelib/fs.stat@2.0.5", "", {}, "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A=="],

    "@nodelib/fs.walk": ["@nodelib/fs.walk@1.2.8", "", { "dependencies": { "@nodelib/fs.scandir": "2.1.5", "fastq": "^1.6.0" } }, "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg=="],

    "@nolyfill/is-core-module": ["@nolyfill/is-core-module@1.0.39", "", {}, "sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA=="],

    "@pkgjs/parseargs": ["@pkgjs/parseargs@0.11.0", "", {}, "sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg=="],

    "@rtsao/scc": ["@rtsao/scc@1.1.0", "", {}, "sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g=="],

    "@rushstack/eslint-patch": ["@rushstack/eslint-patch@1.16.1", "", {}, "sha512-TvZbIpeKqGQQ7X0zSCvPH9riMSFQFSggnfBjFZ1mEoILW+UuXCKwOoPcgjMwiUtRqFZ8jWhPJc4um14vC6I4ag=="],

    "@swc/counter": ["@swc/counter@0.1.3", "", {}, "sha512-e2BR4lsJkkRlKZ/qCHPw9ZaSxc0MVUd7gtbtaB7aMvHeJVYe8sOB8DBZkP2DtISHGSku9sCK6T6cnY0CtXrOCQ=="],

    "@swc/helpers": ["@swc/helpers@0.5.5", "", { "dependencies": { "@swc/counter": "^0.1.3", "tslib": "^2.4.0" } }, "sha512-KGYxvIOXcceOAbEk4bi/dVLEK9z8sZ0uBB3Il5b1rhfClSpcX0yfRO0KmTkqR2cnQDymwLB+25ZyMzICg/cm/A=="],

    "@tybys/wasm-util": ["@tybys/wasm-util@0.10.4", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-W3c4gRigFS0T/Ma4qIYF3GDAc5AQdHb1yL5znJT1Zv1YaD9Kitx656wBjvr19qbiosmZT8lWDM5BEMynUqX65A=="],

    "@types/json5": ["@types/json5@0.0.29", "", {}, "sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ=="],

    "@types/node": ["@types/node@20.19.43", "", { "dependencies": { "undici-types": "~6.21.0" } }, "sha512-6oYBAi5ikg4Pl+kGsoYtawUMBT2zZMCvPNF7pVLnHZfd1zf38DRiWn/gT01RYCdUqkv7Fhr+C9ot4/tb+2sVvA=="],

    "@types/prop-types": ["@types/prop-types@15.7.15", "", {}, "sha512-F6bEyamV9jKGAFBEmlQnesRPGOQqS2+Uwi0Em15xenOxHaf2hv6L8YCVn3rPdPJOiJfPiCnLIRyvwVaqMY3MIw=="],

    "@types/react": ["@types/react@18.3.31", "", { "dependencies": { "@types/prop-types": "*", "csstype": "^3.2.2" } }, "sha512-vfEqpXTvwT91yhmwdfouStN2hSKwTvyRs8qpLfADyrq/kxDw0hZM7Wk9Ug1FELj8hIby+S/+kQCSRFF32nv2Qw=="],

    "@types/react-dom": ["@types/react-dom@18.3.7", "", { "peerDependencies": { "@types/react": "^18.0.0" } }, "sha512-MEe3UeoENYVFXzoXEWsvcpg6ZvlrFNlOQ7EOsvhI3CfAXwzPfO8Qwuxd40nepsYKqyyVQnTdEfv68q91yLcKrQ=="],

    "@typescript-eslint/eslint-plugin": ["@typescript-eslint/eslint-plugin@8.71.0", "", { "dependencies": { "@eslint-community/regexpp": "^4.12.2", "@typescript-eslint/scope-manager": "8.71.0", "@typescript-eslint/type-utils": "8.71.0", "@typescript-eslint/utils": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0", "ignore": "^7.0.5", "natural-compare": "^1.4.0", "ts-api-utils": "^2.5.0" }, "peerDependencies": { "@typescript-eslint/parser": "^8.71.0", "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-pqcS9c1HxZTHt7End4nXqd0s5lJrrFzrgCkKFJrsbUnaL6M3+6oBFZaslg6Gjsl3argl2DDRFROnXARaZ2e4Nw=="],

    "@typescript-eslint/parser": ["@typescript-eslint/parser@8.71.0", "", { "dependencies": { "@typescript-eslint/scope-manager": "8.71.0", "@typescript-eslint/types": "8.71.0", "@typescript-eslint/typescript-estree": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0", "debug": "^4.4.3" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-CG4nPk1f2zc8yw4pALqHsFYH2hdo+h1T9daSp21+Hnxi9LOE3GT9hAfTKJCBXVNM2GmYs1eMEP615wPoeOgk3A=="],

    "@typescript-eslint/project-service": ["@typescript-eslint/project-service@8.71.0", "", { "dependencies": { "@typescript-eslint/tsconfig-utils": "^8.71.0", "@typescript-eslint/types": "^8.71.0", "debug": "^4.4.3" }, "peerDependencies": { "typescript": ">=4.8.4 <6.1.0" } }, "sha512-aABjw5rjBacYONVPaPiWOCjJu0vEF4a25iQuodlmQYL1trtLZ0X/y+2Vzl3BKI1odM4LnwLE1oUDXYp1wzx1TQ=="],

    "@typescript-eslint/scope-manager": ["@typescript-eslint/scope-manager@8.71.0", "", { "dependencies": { "@typescript-eslint/types": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0" } }, "sha512-gWF0BhUcnjZxSpLE8ngS/59n2SB0J3YqRxvX1+2aoRJk9hNtHSLOV+TcarFiOr5ipXm3yc1QrI4c9YZc8zyCxw=="],

    "@typescript-eslint/tsconfig-utils": ["@typescript-eslint/tsconfig-utils@8.71.0", "", { "peerDependencies": { "typescript": ">=4.8.4 <6.1.0" } }, "sha512-Z1UlWHADEK2Mlb9NpWfDeSjqoZ5EyrOv4R3eQpbkzqn/EwaIdOpXXupEA1+0ZIOSJSZZDBHG0BrQyN8zUG6Pwg=="],

    "@typescript-eslint/type-utils": ["@typescript-eslint/type-utils@8.71.0", "", { "dependencies": { "@typescript-eslint/types": "8.71.0", "@typescript-eslint/typescript-estree": "8.71.0", "@typescript-eslint/utils": "8.71.0", "debug": "^4.4.3", "ts-api-utils": "^2.5.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-i8uO1qbdxeKgRnS5sCRt6On3/nfo2d2DwQe3Yvjx543zLy7r8ySqRuPPiIIXAhS03U0v5NfAFx+rUgxFzKKwNw=="],

    "@typescript-eslint/types": ["@typescript-eslint/types@8.71.0", "", {}, "sha512-cJ4OoxPGWvFnBTnSZyaU+qJzGTqPTGJY+gDchj6cRyLRdmIdt4rcsE4twj+zPfrNiWuVi38wijHzShL++Z9atQ=="],

    "@typescript-eslint/typescript-estree": ["@typescript-eslint/typescript-estree@8.71.0", "", { "dependencies": { "@typescript-eslint/project-service": "8.71.0", "@typescript-eslint/tsconfig-utils": "8.71.0", "@typescript-eslint/types": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0", "debug": "^4.4.3", "minimatch": "^10.2.2", "semver": "^7.7.3", "tinyglobby": "^0.2.15", "ts-api-utils": "^2.5.0" }, "peerDependencies": { "typescript": ">=4.8.4 <6.1.0" } }, "sha512-PEEF4G5sLLWAS5BpPrUvms4ySZkiBQQZM4z+3ReI46axK5Vqr/vXBQatJQIZZOYdGyPUAKTtsrWzpqKuU+3DEw=="],

    "@typescript-eslint/utils": ["@typescript-eslint/utils@8.71.0", "", { "dependencies": { "@eslint-community/eslint-utils": "^4.9.1", "@typescript-eslint/scope-manager": "8.71.0", "@typescript-eslint/types": "8.71.0", "@typescript-eslint/typescript-estree": "8.71.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-pKR/tEMVrXZG23UFKUn5BQf3zfmfk7KQceI2cGzywZ5nxM5Eu3hEJU1utjWzydtzBbcJAQhHN8iPCxobHpPcZQ=="],

    "@typescript-eslint/visitor-keys": ["@typescript-eslint/visitor-keys@8.71.0", "", { "dependencies": { "@typescript-eslint/types": "8.71.0", "eslint-visitor-keys": "^5.0.0" } }, "sha512-8eQ9R218XORK+KLosnf4bu/QsUXvUyVwTbArg7/0NMB1Pu87OJKvj4nhFblkYE8gQV73mW1dx1ptlPCkwRGa7A=="],

    "@ungap/structured-clone": ["@ungap/structured-clone@1.4.0", "", {}, "sha512-1mEZtMKPM09vDmQt5y7YvmN2+DFTP7Tg0EWXdic8/C6VRnpb33e4ghisCIE3WZjsE2N8mf+QV1Zqh7ZFYLWInQ=="],

    "@unrs/resolver-binding-android-arm-eabi": ["@unrs/resolver-binding-android-arm-eabi@1.12.2", "", { "os": "android", "cpu": "arm" }, "sha512-g5T90pqg1bo/7mytQx6F4iBNC0Wsh9cu+z9veDbFjc7HjpesJFWD7QMS0NGStXM075+7dJPPVvBbpZlnrdpi/w=="],

    "@unrs/resolver-binding-android-arm64": ["@unrs/resolver-binding-android-arm64@1.12.2", "", { "os": "android", "cpu": "arm64" }, "sha512-YGCRZv/9GLhwmz6mYDeTsm/92BAyR28l6c2ReweVW5pWgfsitWLY8upvfRlGdoyD8HjeTHSYJWyZGD4KJA/nFQ=="],

    "@unrs/resolver-binding-darwin-arm64": ["@unrs/resolver-binding-darwin-arm64@1.12.2", "", { "os": "darwin", "cpu": "arm64" }, "sha512-u9DiNT1auQMO20A9SyTuG3wUgQWB9Z7KjAg0uFuCDR1FsAY8A0CG2S6JpHS1xwm/w1G08bjXZDcyOCjv1WAm2w=="],

    "@unrs/resolver-binding-darwin-x64": ["@unrs/resolver-binding-darwin-x64@1.12.2", "", { "os": "darwin", "cpu": "x64" }, "sha512-f7rPLi/T1HVKZu/u6t87lroib16n8vrSzcyxI7lg4BGO9UF26KhQL44sd9eOUgrTYhvRXtWOIZT5PejdPyJfUA=="],

    "@unrs/resolver-binding-freebsd-x64": ["@unrs/resolver-binding-freebsd-x64@1.12.2", "", { "os": "freebsd", "cpu": "x64" }, "sha512-BpcOjWCJub6nRZUS2zA20pmLvjtqAtGejETaIyRLiZiQf++cbrjltLA5NN/xaXfqeOBOSlMFbemIl5/S5tljmg=="],

    "@unrs/resolver-binding-linux-arm-gnueabihf": ["@unrs/resolver-binding-linux-arm-gnueabihf@1.12.2", "", { "os": "linux", "cpu": "arm" }, "sha512-vZTDvdSISZjJx66OzJqtsOhzifbqRjbmI1Mnu49fQDwog5GtDI4QidRiEAYbZCRj9C8YZEW+3ZjqsyS9GR4k2A=="],

    "@unrs/resolver-binding-linux-arm-musleabihf": ["@unrs/resolver-binding-linux-arm-musleabihf@1.12.2", "", { "os": "linux", "cpu": "arm" }, "sha512-BiPI+IrIlwcW4nLLMM21+B1dFPzd55yAVgVGrdgDjNef+ch03GdxrcyaIz8X9SsQirh/kCQ7mviyWlMxdh2D7g=="],

    "@unrs/resolver-binding-linux-arm64-gnu": ["@unrs/resolver-binding-linux-arm64-gnu@1.12.2", "", { "os": "linux", "cpu": "arm64" }, "sha512-zJc0H99FEPoFfSrNpa91HYfxzfAJCr502oxNK1cfdC9hlaFI43RT+JFCann9JUgZmLzzntChHyn13Sgn9ljHNg=="],

    "@unrs/resolver-binding-linux-arm64-musl": ["@unrs/resolver-binding-linux-arm64-musl@1.12.2", "", { "os": "linux", "cpu": "arm64" }, "sha512-KQ3Lki6l+Pz1k/eBipN41ES+YUK30beLGb9YqcB1O542cyLCNE6GaxrfcY3T6EezmGGk84wb5XyO9loTM9tkcA=="],

    "@unrs/resolver-binding-linux-loong64-gnu": ["@unrs/resolver-binding-linux-loong64-gnu@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-3SJGEh1DborhG6pyxvhPzCT4bbSIVihsvgJc13P1bHG7KLdNDaF9T3gsTwFc7Jw/5Y5/iWOjkEx7Zy0NvCGX3Q=="],

    "@unrs/resolver-binding-linux-loong64-musl": ["@unrs/resolver-binding-linux-loong64-musl@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-jiuG/Obbel7uw1PwHNFfrkiKhLAF6mnyZ6aWlOAVN9WqKm8v0OFGnciJIHu8+CMvXLQ8AD51LPzAoUfT21D5Ew=="],

    "@unrs/resolver-binding-linux-ppc64-gnu": ["@unrs/resolver-binding-linux-ppc64-gnu@1.12.2", "", { "os": "linux", "cpu": "ppc64" }, "sha512-q7xRvVpmcfeL+LlZg8Pbbo6QaTZwDU5BaGZbwfhkEsXJn3Was8xYfE0RBH266xZt0rM6B7i8xAYIvjthuUIWHg=="],

    "@unrs/resolver-binding-linux-riscv64-gnu": ["@unrs/resolver-binding-linux-riscv64-gnu@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-0CVdx6lcnT3Q9inOH8tsMIOJ6ImndllMjqJHg8RLVdB7Vq4SfkEXl9mCSsVNuNA4MCYycRicCUxPCabVHJRr6A=="],

    "@unrs/resolver-binding-linux-riscv64-musl": ["@unrs/resolver-binding-linux-riscv64-musl@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-iOwlRo9vnp6R6ohHQS11n0NnfdXx/omhkocmIfaPRpQhKZ+3BDMkkdRVh53qjkFkpPddf+FETA28NwGN7l5l+w=="],

    "@unrs/resolver-binding-linux-s390x-gnu": ["@unrs/resolver-binding-linux-s390x-gnu@1.12.2", "", { "os": "linux", "cpu": "s390x" }, "sha512-HYJtLfXq94q8iZNFT1lknx258wlkkWhZeUXJRqzKBBUJ00CvZ+N33zgbCqimLjsyw5Va6uUxhVa12mI+kaveEw=="],

    "@unrs/resolver-binding-linux-x64-gnu": ["@unrs/resolver-binding-linux-x64-gnu@1.12.2", "", { "os": "linux", "cpu": "x64" }, "sha512-mPsUhunKKDih5O96Y6enDQyHc1SqBPlY1E/SfMWDM3EdJ95Z9CArPeCVwCCqbP45ljvivdEk8Fxn+SIb1rDAJQ=="],

    "@unrs/resolver-binding-linux-x64-musl": ["@unrs/resolver-binding-linux-x64-musl@1.12.2", "", { "os": "linux", "cpu": "x64" }, "sha512-azrt6+5ydLd8Vt210AAFis/lZevSfPw93EJRIJG+xPu4WCJ8K0kppCTpMyLPcKT7H15M4Jnt2tMp5bOvCkRC6A=="],

    "@unrs/resolver-binding-openharmony-arm64": ["@unrs/resolver-binding-openharmony-arm64@1.12.2", "", { "os": "none", "cpu": "arm64" }, "sha512-YZ9hP4O0X9PQb8eO980qmLNGH4zT3I9+SZTdt0Pr0YyuGQhYKoOZkV02VzrzyOZJ5xIJ3UFIenKkUkGg8GjgWQ=="],

    "@unrs/resolver-binding-wasm32-wasi": ["@unrs/resolver-binding-wasm32-wasi@1.12.2", "", { "dependencies": { "@emnapi/core": "1.10.0", "@emnapi/runtime": "1.10.0", "@napi-rs/wasm-runtime": "^1.1.4" }, "cpu": "none" }, "sha512-tYFDIkMxSflfEc/h92ZWNsZlHSwgimbNHSO3PL2JWQHfCuC2q316jMyYU9TIWZsFK2bQwyK5VAdYgn8ygPj69A=="],

    "@unrs/resolver-binding-win32-arm64-msvc": ["@unrs/resolver-binding-win32-arm64-msvc@1.12.2", "", { "os": "win32", "cpu": "arm64" }, "sha512-qzNyg3xL0VPQmCaUh+N5jSitce6k+uCBfMDesWRnlULOZaqUkaJ0ybdT+UqlAWJoQjuqfIU/0Ptx9bteN4D82g=="],

    "@unrs/resolver-binding-win32-ia32-msvc": ["@unrs/resolver-binding-win32-ia32-msvc@1.12.2", "", { "os": "win32", "cpu": "ia32" }, "sha512-WD9sY00OfpHVGfsnHZoA8jVT+esS/Bg8z8jzxp5BnDCjjwsuKsPQrzswwpFy4J1AUJbXPRfkpcX0mXrzeXW79g=="],

    "@unrs/resolver-binding-win32-x64-msvc": ["@unrs/resolver-binding-win32-x64-msvc@1.12.2", "", { "os": "win32", "cpu": "x64" }, "sha512-nAB74NfSNKknqQ1RrYj6uz8FcXEomu/MATJZxh/x+BArzN2U3JbOYC0APYzUIGhVY3m5hRxA8VPNdPBoG8txlA=="],

    "acorn": ["acorn@8.18.0", "", { "bin": { "acorn": "bin/acorn" } }, "sha512-lGq+9yr1/GuAWaVYIHRjvvySG5/4VfKIvC8EWxStPdcDh/Ka7FG3twP6v4d5BkravUilhIAsG4Qj83t02LWUPQ=="],

    "acorn-jsx": ["acorn-jsx@5.3.2", "", { "peerDependencies": { "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0" } }, "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ=="],

    "ajv": ["ajv@6.15.0", "", { "dependencies": { "fast-deep-equal": "^3.1.1", "fast-json-stable-stringify": "^2.0.0", "json-schema-traverse": "^0.4.1", "uri-js": "^4.2.2" } }, "sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw=="],

    "ansi-regex": ["ansi-regex@5.0.1", "", {}, "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ=="],

    "ansi-styles": ["ansi-styles@4.3.0", "", { "dependencies": { "color-convert": "^2.0.1" } }, "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg=="],

    "any-promise": ["any-promise@1.3.0", "", {}, "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A=="],

    "anymatch": ["anymatch@3.1.3", "", { "dependencies": { "normalize-path": "^3.0.0", "picomatch": "^2.0.4" } }, "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw=="],

    "arg": ["arg@5.0.2", "", {}, "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg=="],

    "argparse": ["argparse@2.0.1", "", {}, "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q=="],

    "aria-query": ["aria-query@5.3.2", "", {}, "sha512-COROpnaoap1E2F000S62r6A60uHZnmlvomhfyT2DlTcrY1OrBKn2UhH7qn5wTC9zMvD0AY7csdPSNwKP+7WiQw=="],

    "array-buffer-byte-length": ["array-buffer-byte-length@1.0.2", "", { "dependencies": { "call-bound": "^1.0.3", "is-array-buffer": "^3.0.5" } }, "sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw=="],

    "array-includes": ["array-includes@3.2.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-object-atoms": "^1.1.2", "es-shim-unscopables": "^1.1.0", "is-string": "^1.1.1", "math-intrinsics": "^1.1.0" } }, "sha512-VXY5eFRarnXcYxwBjJzPmEhH55+rmP79/+ueDhi0F+TuqfHCItagIHqxeUZrmgrOPa31QTh9H85DjX3FfJ0FTg=="],

    "array.prototype.findlast": ["array.prototype.findlast@1.2.5", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.2", "es-errors": "^1.3.0", "es-object-atoms": "^1.0.0", "es-shim-unscopables": "^1.0.2" } }, "sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ=="],

    "array.prototype.findlastindex": ["array.prototype.findlastindex@1.2.6", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.23.9", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "es-shim-unscopables": "^1.1.0" } }, "sha512-F/TKATkzseUExPlfvmwQKGITM3DGTK+vkAsCZoDc5daVygbJBnjEUCbgkAvVFsgfXfX4YIqZ/27G3k3tdXrTxQ=="],

    "array.prototype.flat": ["array.prototype.flat@1.3.3", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.5", "es-shim-unscopables": "^1.0.2" } }, "sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg=="],

    "array.prototype.flatmap": ["array.prototype.flatmap@1.3.3", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.5", "es-shim-unscopables": "^1.0.2" } }, "sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg=="],

    "array.prototype.tosorted": ["array.prototype.tosorted@1.1.4", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.3", "es-errors": "^1.3.0", "es-shim-unscopables": "^1.0.2" } }, "sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA=="],

    "arraybuffer.prototype.slice": ["arraybuffer.prototype.slice@1.0.4", "", { "dependencies": { "array-buffer-byte-length": "^1.0.1", "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.5", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6", "is-array-buffer": "^3.0.4" } }, "sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ=="],

    "ast-types-flow": ["ast-types-flow@0.0.8", "", {}, "sha512-OH/2E5Fg20h2aPrbe+QL8JZQFko0YZaF+j4mnQ7BGhfavO7OpSLa8a0y9sBwomHdSbkhTS8TQNayBfnW5DwbvQ=="],

    "async-function": ["async-function@1.0.0", "", {}, "sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA=="],

    "autoprefixer": ["autoprefixer@10.6.1", "", { "dependencies": { "browserslist": "^4.28.9", "caniuse-lite": "^1.0.30001810", "fraction.js": "^5.3.4", "picocolors": "^1.1.1", "postcss-value-parser": "^4.2.0" }, "peerDependencies": { "postcss": "^8.1.0" }, "bin": { "autoprefixer": "bin/autoprefixer" } }, "sha512-cL1Qz6ADZhcEbny/8HPfe99J6HhNoYtpX2LFLIbhgGE7Q1hlQVkYFdetDN7Id3KiQxhDrHwzlHr/YQCnZ8+xSA=="],

    "available-typed-arrays": ["available-typed-arrays@1.0.7", "", { "dependencies": { "possible-typed-array-names": "^1.0.0" } }, "sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ=="],

    "axe-core": ["axe-core@4.13.0", "", {}, "sha512-UzGt8zg7Ny8djbYMhxl2zuEevVa7r2gJjYY5Lwr1xM7+XU2nd6CkIWFTVcCIbAP63vSz71NaVyyuSk9lHKcy0A=="],

    "axobject-query": ["axobject-query@4.1.0", "", {}, "sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ=="],

    "balanced-match": ["balanced-match@1.0.2", "", {}, "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw=="],

    "baseline-browser-mapping": ["baseline-browser-mapping@2.11.26", "", { "bin": { "baseline-browser-mapping": "dist/cli.cjs" } }, "sha512-GLQdD3y6UF8iVuMJl5fHgE4jdn/ua7n+toKfLgNlg3BqQtOZjpy68T8Tup8/wGWZCDlm7KMg7tPb4MPn7oN0TQ=="],

    "binary-extensions": ["binary-extensions@2.3.0", "", {}, "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw=="],

    "brace-expansion": ["brace-expansion@1.1.21", "", { "dependencies": { "balanced-match": "^1.0.0", "concat-map": "0.0.1" } }, "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw=="],

    "braces": ["braces@3.0.3", "", { "dependencies": { "fill-range": "^7.1.1" } }, "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA=="],

    "browserslist": ["browserslist@4.29.3", "", { "dependencies": { "baseline-browser-mapping": "^2.11.26", "caniuse-lite": "^1.0.30001813", "electron-to-chromium": "^1.5.439", "node-releases": "^2.0.57", "update-browserslist-db": "^1.3.3" }, "bin": { "browserslist": "cli.js" } }, "sha512-1R4kiYKXGViqEN0CnoDrXc1StD9niAwu+j2dukWzrD4bJgsD4lDmEp0CRbc6E/vYJIfTHwPmwyaKtVSudICdPA=="],

    "busboy": ["busboy@1.6.0", "", { "dependencies": { "streamsearch": "^1.1.0" } }, "sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA=="],

    "call-bind": ["call-bind@1.0.9", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "es-define-property": "^1.0.1", "get-intrinsic": "^1.3.0", "set-function-length": "^1.2.2" } }, "sha512-a/hy+pNsFUTR+Iz8TCJvXudKVLAnz/DyeSUo10I5yvFDQJBFU2s9uqQpoSrJlroHUKoKqzg+epxyP9lqFdzfBQ=="],

    "call-bind-apply-helpers": ["call-bind-apply-helpers@1.0.2", "", { "dependencies": { "es-errors": "^1.3.0", "function-bind": "^1.1.2" } }, "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ=="],

    "call-bound": ["call-bound@1.0.4", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "get-intrinsic": "^1.3.0" } }, "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg=="],

    "callsites": ["callsites@3.1.0", "", {}, "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ=="],

    "camelcase-css": ["camelcase-css@2.0.1", "", {}, "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA=="],

    "caniuse-lite": ["caniuse-lite@1.0.30001814", "", {}, "sha512-/Uaf1lAzr59XcMpW0o96WoEfr+VXK2OX4U9AgFoiSHsVJ4HppnIFUjtYzsyDH2+tgANaQb2/oxYGwCPapN1FpA=="],

    "chalk": ["chalk@4.1.2", "", { "dependencies": { "ansi-styles": "^4.1.0", "supports-color": "^7.1.0" } }, "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA=="],

    "chokidar": ["chokidar@3.6.0", "", { "dependencies": { "anymatch": "~3.1.2", "braces": "~3.0.2", "glob-parent": "~5.1.2", "is-binary-path": "~2.1.0", "is-glob": "~4.0.1", "normalize-path": "~3.0.0", "readdirp": "~3.6.0" }, "optionalDependencies": { "fsevents": "~2.3.2" } }, "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw=="],

    "client-only": ["client-only@0.0.1", "", {}, "sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA=="],

    "clsx": ["clsx@2.1.1", "", {}, "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA=="],

    "color-convert": ["color-convert@2.0.1", "", { "dependencies": { "color-name": "~1.1.4" } }, "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ=="],

    "color-name": ["color-name@1.1.4", "", {}, "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA=="],

    "commander": ["commander@4.1.1", "", {}, "sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA=="],

    "concat-map": ["concat-map@0.0.1", "", {}, "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg=="],

    "cross-spawn": ["cross-spawn@7.0.6", "", { "dependencies": { "path-key": "^3.1.0", "shebang-command": "^2.0.0", "which": "^2.0.1" } }, "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA=="],

    "cssesc": ["cssesc@3.0.0", "", { "bin": { "cssesc": "bin/cssesc" } }, "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg=="],

    "csstype": ["csstype@3.2.3", "", {}, "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ=="],

    "damerau-levenshtein": ["damerau-levenshtein@1.0.8", "", {}, "sha512-sdQSFB7+llfUcQHUQO3+B8ERRj0Oa4w9POWMI/puGtuf7gFywGmkaLCElnudfTiKZV+NvHqL0ifzdrI8Ro7ESA=="],

    "data-view-buffer": ["data-view-buffer@1.0.2", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "is-data-view": "^1.0.2" } }, "sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ=="],

    "data-view-byte-length": ["data-view-byte-length@1.0.2", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "is-data-view": "^1.0.2" } }, "sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ=="],

    "data-view-byte-offset": ["data-view-byte-offset@1.0.1", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "is-data-view": "^1.0.1" } }, "sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ=="],

    "debug": ["debug@4.4.3", "", { "dependencies": { "ms": "^2.1.3" }, "peerDependencies": { "supports-color": "*" }, "optionalPeers": ["supports-color"] }, "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA=="],

    "deep-is": ["deep-is@0.1.4", "", {}, "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ=="],

    "define-data-property": ["define-data-property@1.1.4", "", { "dependencies": { "es-define-property": "^1.0.0", "es-errors": "^1.3.0", "gopd": "^1.0.1" } }, "sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A=="],

    "define-properties": ["define-properties@1.2.1", "", { "dependencies": { "define-data-property": "^1.0.1", "has-property-descriptors": "^1.0.0", "object-keys": "^1.1.1" } }, "sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg=="],

    "didyoumean": ["didyoumean@1.2.2", "", {}, "sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw=="],

    "dlv": ["dlv@1.1.3", "", {}, "sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA=="],

    "doctrine": ["doctrine@3.0.0", "", { "dependencies": { "esutils": "^2.0.2" } }, "sha512-yS+Q5i3hBf7GBkd4KG8a7eBNNWNGLTaEwwYWUijIYM7zrlYDM0BFXHjjPWlWZ1Rg7UaddZeIDmi9jF3HmqiQ2w=="],

    "dunder-proto": ["dunder-proto@1.0.1", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.1", "es-errors": "^1.3.0", "gopd": "^1.2.0" } }, "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A=="],

    "eastasianwidth": ["eastasianwidth@0.2.0", "", {}, "sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA=="],

    "electron-to-chromium": ["electron-to-chromium@1.5.443", "", {}, "sha512-TDJG36L9A3CWWwZ97HKaE+Iz1sW80pNp6sAU0owzCIV3Zc9eVyRqZK8Vz6NKuMIU8WjP0pIkoqCa0VRf/yFD0Q=="],

    "emoji-regex": ["emoji-regex@9.2.2", "", {}, "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg=="],

    "es-abstract": ["es-abstract@1.24.2", "", { "dependencies": { "array-buffer-byte-length": "^1.0.2", "arraybuffer.prototype.slice": "^1.0.4", "available-typed-arrays": "^1.0.7", "call-bind": "^1.0.8", "call-bound": "^1.0.4", "data-view-buffer": "^1.0.2", "data-view-byte-length": "^1.0.2", "data-view-byte-offset": "^1.0.1", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "es-set-tostringtag": "^2.1.0", "es-to-primitive": "^1.3.0", "function.prototype.name": "^1.1.8", "get-intrinsic": "^1.3.0", "get-proto": "^1.0.1", "get-symbol-description": "^1.1.0", "globalthis": "^1.0.4", "gopd": "^1.2.0", "has-property-descriptors": "^1.0.2", "has-proto": "^1.2.0", "has-symbols": "^1.1.0", "hasown": "^2.0.2", "internal-slot": "^1.1.0", "is-array-buffer": "^3.0.5", "is-callable": "^1.2.7", "is-data-view": "^1.0.2", "is-negative-zero": "^2.0.3", "is-regex": "^1.2.1", "is-set": "^2.0.3", "is-shared-array-buffer": "^1.0.4", "is-string": "^1.1.1", "is-typed-array": "^1.1.15", "is-weakref": "^1.1.1", "math-intrinsics": "^1.1.0", "object-inspect": "^1.13.4", "object-keys": "^1.1.1", "object.assign": "^4.1.7", "own-keys": "^1.0.1", "regexp.prototype.flags": "^1.5.4", "safe-array-concat": "^1.1.3", "safe-push-apply": "^1.0.0", "safe-regex-test": "^1.1.0", "set-proto": "^1.0.0", "stop-iteration-iterator": "^1.1.0", "string.prototype.trim": "^1.2.10", "string.prototype.trimend": "^1.0.9", "string.prototype.trimstart": "^1.0.8", "typed-array-buffer": "^1.0.3", "typed-array-byte-length": "^1.0.3", "typed-array-byte-offset": "^1.0.4", "typed-array-length": "^1.0.7", "unbox-primitive": "^1.1.0", "which-typed-array": "^1.1.19" } }, "sha512-2FpH9Q5i2RRwyEP1AylXe6nYLR5OhaJTZwmlcP0dL/+JCbgg7yyEo/sEK6HeGZRf3dFpWwThaRHVApXSkW3xeg=="],

    "es-abstract-get": ["es-abstract-get@1.0.0", "", { "dependencies": { "es-errors": "^1.3.0", "es-object-atoms": "^1.1.2", "is-callable": "^1.2.7", "object-inspect": "^1.13.4" } }, "sha512-6PMWXpdhshVvFp+FoWYs1EvG1Nj0tvk0dZM+XcK0xMEM1czRVcP6ohqPWHy6qPagSpC8j4+p89WXlT+xXJs/fg=="],

    "es-define-property": ["es-define-property@1.0.1", "", {}, "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g=="],

    "es-errors": ["es-errors@1.3.0", "", {}, "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw=="],

    "es-iterator-helpers": ["es-iterator-helpers@1.4.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-errors": "^1.3.0", "es-set-tostringtag": "^2.1.0", "function-bind": "^1.1.2", "get-intrinsic": "^1.3.0", "globalthis": "^1.0.4", "gopd": "^1.2.0", "has-property-descriptors": "^1.0.2", "has-proto": "^1.2.0", "has-symbols": "^1.1.0", "internal-slot": "^1.1.0", "iterator.prototype": "^1.1.5", "math-intrinsics": "^1.1.0" } }, "sha512-c/A0P0oxkACDc+cKWw8evLXK83oBKgn0qPOqCYT4x9uolpCIJAcYvJC9QYKNDRPsTeGyCrQ326jrvgZWdCdK5Q=="],

    "es-object-atoms": ["es-object-atoms@1.1.2", "", { "dependencies": { "es-errors": "^1.3.0" } }, "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw=="],

    "es-set-tostringtag": ["es-set-tostringtag@2.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6", "has-tostringtag": "^1.0.2", "hasown": "^2.0.2" } }, "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA=="],

    "es-shim-unscopables": ["es-shim-unscopables@1.1.0", "", { "dependencies": { "hasown": "^2.0.2" } }, "sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw=="],

    "es-to-primitive": ["es-to-primitive@1.3.4", "", { "dependencies": { "es-abstract-get": "^1.0.0", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "is-callable": "^1.2.7", "is-date-object": "^1.1.0", "is-symbol": "^1.1.1" } }, "sha512-yPDz7wqpg1/mmHLmS3tcfTfbw5f1eryXvyghYBffGdERwe+mV7ZcWzTR8LR17Kvqt3qfPurjlonmnq3MKXIOXw=="],

    "escalade": ["escalade@3.2.0", "", {}, "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA=="],

    "escape-string-regexp": ["escape-string-regexp@4.0.0", "", {}, "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA=="],

    "eslint": ["eslint@8.57.1", "", { "dependencies": { "@eslint-community/eslint-utils": "^4.2.0", "@eslint-community/regexpp": "^4.6.1", "@eslint/eslintrc": "^2.1.4", "@eslint/js": "8.57.1", "@humanwhocodes/config-array": "^0.13.0", "@humanwhocodes/module-importer": "^1.0.1", "@nodelib/fs.walk": "^1.2.8", "@ungap/structured-clone": "^1.2.0", "ajv": "^6.12.4", "chalk": "^4.0.0", "cross-spawn": "^7.0.2", "debug": "^4.3.2", "doctrine": "^3.0.0", "escape-string-regexp": "^4.0.0", "eslint-scope": "^7.2.2", "eslint-visitor-keys": "^3.4.3", "espree": "^9.6.1", "esquery": "^1.4.2", "esutils": "^2.0.2", "fast-deep-equal": "^3.1.3", "file-entry-cache": "^6.0.1", "find-up": "^5.0.0", "glob-parent": "^6.0.2", "globals": "^13.19.0", "graphemer": "^1.4.0", "ignore": "^5.2.0", "imurmurhash": "^0.1.4", "is-glob": "^4.0.0", "is-path-inside": "^3.0.3", "js-yaml": "^4.1.0", "json-stable-stringify-without-jsonify": "^1.0.1", "levn": "^0.4.1", "lodash.merge": "^4.6.2", "minimatch": "^3.1.2", "natural-compare": "^1.4.0", "optionator": "^0.9.3", "strip-ansi": "^6.0.1", "text-table": "^0.2.0" }, "bin": { "eslint": "bin/eslint.js" } }, "sha512-ypowyDxpVSYpkXr9WPv2PAZCtNip1Mv5KTW0SCurXv/9iOpcrH9PaqUElksqEB6pChqHGDRCFTyrZlGhnLNGiA=="],

    "eslint-config-next": ["eslint-config-next@14.2.24", "", { "dependencies": { "@next/eslint-plugin-next": "14.2.24", "@rushstack/eslint-patch": "^1.3.3", "@typescript-eslint/eslint-plugin": "^5.4.2 || ^6.0.0 || ^7.0.0 || ^8.0.0", "@typescript-eslint/parser": "^5.4.2 || ^6.0.0 || ^7.0.0 || ^8.0.0", "eslint-import-resolver-node": "^0.3.6", "eslint-import-resolver-typescript": "^3.5.2", "eslint-plugin-import": "^2.28.1", "eslint-plugin-jsx-a11y": "^6.7.1", "eslint-plugin-react": "^7.33.2", "eslint-plugin-react-hooks": "^4.5.0 || 5.0.0-canary-7118f5dd7-20230705" }, "peerDependencies": { "eslint": "^7.23.0 || ^8.0.0", "typescript": ">=3.3.1" }, "optionalPeers": ["typescript"] }, "sha512-9r1ujK++Pgpfixr5+DQ6rXDIQmSzuDbBlAQYMkJRMz9KWqovX7ESUTC0EAyBfOCl3ubkoeplw+aoXDuih3A8fw=="],

    "eslint-import-resolver-node": ["eslint-import-resolver-node@0.3.10", "", { "dependencies": { "debug": "^3.2.7", "is-core-module": "^2.16.1", "resolve": "^2.0.0-next.6" } }, "sha512-tRrKqFyCaKict5hOd244sL6EQFNycnMQnBe+j8uqGNXYzsImGbGUU4ibtoaBmv5FLwJwcFJNeg1GeVjQfbMrDQ=="],

    "eslint-import-resolver-typescript": ["eslint-import-resolver-typescript@3.10.1", "", { "dependencies": { "@nolyfill/is-core-module": "1.0.39", "debug": "^4.4.0", "get-tsconfig": "^4.10.0", "is-bun-module": "^2.0.0", "stable-hash": "^0.0.5", "tinyglobby": "^0.2.13", "unrs-resolver": "^1.6.2" }, "peerDependencies": { "eslint": "*", "eslint-plugin-import": "*", "eslint-plugin-import-x": "*" }, "optionalPeers": ["eslint-plugin-import", "eslint-plugin-import-x"] }, "sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ=="],

    "eslint-module-utils": ["eslint-module-utils@2.14.0", "", { "dependencies": { "debug": "^3.2.7" }, "peerDependencies": { "eslint": "*" }, "optionalPeers": ["eslint"] }, "sha512-W2WCRZ9Dqntd+2u8jJcVMV2PKulc6RdLgUUoh/yQr3uB6lo/ZOeGx11sv60/8S4QFFKNslAlWhr9u0Ef7ZW6Ig=="],

    "eslint-plugin-import": ["eslint-plugin-import@2.32.0", "", { "dependencies": { "@rtsao/scc": "^1.1.0", "array-includes": "^3.1.9", "array.prototype.findlastindex": "^1.2.6", "array.prototype.flat": "^1.3.3", "array.prototype.flatmap": "^1.3.3", "debug": "^3.2.7", "doctrine": "^2.1.0", "eslint-import-resolver-node": "^0.3.9", "eslint-module-utils": "^2.12.1", "hasown": "^2.0.2", "is-core-module": "^2.16.1", "is-glob": "^4.0.3", "minimatch": "^3.1.2", "object.fromentries": "^2.0.8", "object.groupby": "^1.0.3", "object.values": "^1.2.1", "semver": "^6.3.1", "string.prototype.trimend": "^1.0.9", "tsconfig-paths": "^3.15.0" }, "peerDependencies": { "eslint": "^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9" } }, "sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA=="],

    "eslint-plugin-jsx-a11y": ["eslint-plugin-jsx-a11y@6.10.2", "", { "dependencies": { "aria-query": "^5.3.2", "array-includes": "^3.1.8", "array.prototype.flatmap": "^1.3.2", "ast-types-flow": "^0.0.8", "axe-core": "^4.10.0", "axobject-query": "^4.1.0", "damerau-levenshtein": "^1.0.8", "emoji-regex": "^9.2.2", "hasown": "^2.0.2", "jsx-ast-utils": "^3.3.5", "language-tags": "^1.0.9", "minimatch": "^3.1.2", "object.fromentries": "^2.0.8", "safe-regex-test": "^1.0.3", "string.prototype.includes": "^2.0.1" }, "peerDependencies": { "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" } }, "sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q=="],

    "eslint-plugin-react": ["eslint-plugin-react@7.37.5", "", { "dependencies": { "array-includes": "^3.1.8", "array.prototype.findlast": "^1.2.5", "array.prototype.flatmap": "^1.3.3", "array.prototype.tosorted": "^1.1.4", "doctrine": "^2.1.0", "es-iterator-helpers": "^1.2.1", "estraverse": "^5.3.0", "hasown": "^2.0.2", "jsx-ast-utils": "^2.4.1 || ^3.0.0", "minimatch": "^3.1.2", "object.entries": "^1.1.9", "object.fromentries": "^2.0.8", "object.values": "^1.2.1", "prop-types": "^15.8.1", "resolve": "^2.0.0-next.5", "semver": "^6.3.1", "string.prototype.matchall": "^4.0.12", "string.prototype.repeat": "^1.0.0" }, "peerDependencies": { "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7" } }, "sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA=="],

    "eslint-plugin-react-hooks": ["eslint-plugin-react-hooks@4.6.2", "", { "peerDependencies": { "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0" } }, "sha512-QzliNJq4GinDBcD8gPB5v0wh6g8q3SUi6EFF0x8N/BL9PoVs0atuGc47ozMRyOWAKdwaZ5OnbOEa3WR+dSGKuQ=="],

    "eslint-scope": ["eslint-scope@7.2.2", "", { "dependencies": { "esrecurse": "^4.3.0", "estraverse": "^5.2.0" } }, "sha512-dOt21O7lTMhDM+X9mB4GX+DZrZtCUJPL/wlcTqxyrx5IvO0IYtILdtrQGQp+8n5S0gwSVmOf9NQrjMOgfQZlIg=="],

    "eslint-visitor-keys": ["eslint-visitor-keys@3.4.3", "", {}, "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag=="],

    "espree": ["espree@9.6.1", "", { "dependencies": { "acorn": "^8.9.0", "acorn-jsx": "^5.3.2", "eslint-visitor-keys": "^3.4.1" } }, "sha512-oruZaFkjorTpF32kDSI5/75ViwGeZginGGy2NoOSg3Q9bnwlnmDm4HLnkl0RE3n+njDXR037aY1+x58Z/zFdwQ=="],

    "esquery": ["esquery@1.7.0", "", { "dependencies": { "estraverse": "^5.1.0" } }, "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g=="],

    "esrecurse": ["esrecurse@4.3.0", "", { "dependencies": { "estraverse": "^5.2.0" } }, "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag=="],

    "estraverse": ["estraverse@5.3.0", "", {}, "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA=="],

    "esutils": ["esutils@2.0.3", "", {}, "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g=="],

    "fast-deep-equal": ["fast-deep-equal@3.1.3", "", {}, "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q=="],

    "fast-glob": ["fast-glob@3.3.3", "", { "dependencies": { "@nodelib/fs.stat": "^2.0.2", "@nodelib/fs.walk": "^1.2.3", "glob-parent": "^5.1.2", "merge2": "^1.3.0", "micromatch": "^4.0.8" } }, "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg=="],

    "fast-json-stable-stringify": ["fast-json-stable-stringify@2.1.0", "", {}, "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw=="],

    "fast-levenshtein": ["fast-levenshtein@2.0.6", "", {}, "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw=="],

    "fastq": ["fastq@1.20.3", "", { "dependencies": { "reusify": "^1.0.4" } }, "sha512-XKv5nnLs6nLF71NgiKJLIZFLkPyIEuOselLG7ujZnGrRfQK8HpvY+WqKhAJUAdLomwVHErVS4LfxFlPq0/FTAw=="],

    "fdir": ["fdir@6.5.0", "", { "peerDependencies": { "picomatch": "^3 || ^4" }, "optionalPeers": ["picomatch"] }, "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg=="],

    "file-entry-cache": ["file-entry-cache@6.0.1", "", { "dependencies": { "flat-cache": "^3.0.4" } }, "sha512-7Gps/XWymbLk2QLYK4NzpMOrYjMhdIxXuIvy2QBsLE6ljuodKvdkWs/cpyJJ3CVIVpH0Oi1Hvg1ovbMzLdFBBg=="],

    "fill-range": ["fill-range@7.1.1", "", { "dependencies": { "to-regex-range": "^5.0.1" } }, "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg=="],

    "find-up": ["find-up@5.0.0", "", { "dependencies": { "locate-path": "^6.0.0", "path-exists": "^4.0.0" } }, "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng=="],

    "flat-cache": ["flat-cache@3.2.0", "", { "dependencies": { "flatted": "^3.2.9", "keyv": "^4.5.3", "rimraf": "^3.0.2" } }, "sha512-CYcENa+FtcUKLmhhqyctpclsq7QF38pKjZHsGNiSQF5r4FtoKDWabFDl3hzaEQMvT1LHEysw5twgLvpYYb4vbw=="],

    "flatted": ["flatted@3.4.4", "", {}, "sha512-5+ybhBZANEJxaH3X5evAFatUxLfEHSr7n6kYJ+1Qd0mUqr4eu9gIf6GDbWHf8RJijHrjjO8G+la14SlL2SeS1Q=="],

    "for-each": ["for-each@0.3.5", "", { "dependencies": { "is-callable": "^1.2.7" } }, "sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg=="],

    "foreground-child": ["foreground-child@3.3.1", "", { "dependencies": { "cross-spawn": "^7.0.6", "signal-exit": "^4.0.1" } }, "sha512-gIXjKqtFuWEgzFRJA9WCQeSJLZDjgJUOMCMzxtvFq/37KojM1BFGufqsCy0r4qSQmYLsZYMeyRqzIWOMup03sw=="],

    "fraction.js": ["fraction.js@5.3.4", "", {}, "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ=="],

    "fs.realpath": ["fs.realpath@1.0.0", "", {}, "sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw=="],

    "fsevents": ["fsevents@2.3.3", "", { "os": "darwin" }, "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw=="],

    "function-bind": ["function-bind@1.1.2", "", {}, "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA=="],

    "function.prototype.name": ["function.prototype.name@1.2.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "functions-have-names": "^1.2.3", "has-property-descriptors": "^1.0.2", "hasown": "^2.0.4", "is-callable": "^1.2.7", "is-document.all": "^1.0.0" } }, "sha512-jObKIik1P2QjPHP5nz5BaOtUlfgS0fWo8IUByNXkM+o+02sJOi94em77GwJKQSJ3gfPHdgzLNrHc1uokV4P/ew=="],

    "functions-have-names": ["functions-have-names@1.2.3", "", {}, "sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ=="],

    "generator-function": ["generator-function@2.0.1", "", {}, "sha512-SFdFmIJi+ybC0vjlHN0ZGVGHc3lgE0DxPAT0djjVg+kjOnSqclqmj0KQ7ykTOLP6YxoqOvuAODGdcHJn+43q3g=="],

    "get-intrinsic": ["get-intrinsic@1.3.0", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "function-bind": "^1.1.2", "get-proto": "^1.0.1", "gopd": "^1.2.0", "has-symbols": "^1.1.0", "hasown": "^2.0.2", "math-intrinsics": "^1.1.0" } }, "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ=="],

    "get-proto": ["get-proto@1.0.1", "", { "dependencies": { "dunder-proto": "^1.0.1", "es-object-atoms": "^1.0.0" } }, "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g=="],

    "get-symbol-description": ["get-symbol-description@1.1.0", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6" } }, "sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg=="],

    "get-tsconfig": ["get-tsconfig@4.14.3", "", { "dependencies": { "resolve-pkg-maps": "^1.0.0" } }, "sha512-++QEw4DIY7WGoukz+/+A/8dGYPT9l9yIadnmSgZ8Rjr3YVSVDipQSO9CdnJo9ePqFqUUqh+wk9uIaoiAwsiPkA=="],

    "glob": ["glob@10.3.10", "", { "dependencies": { "foreground-child": "^3.1.0", "jackspeak": "^2.3.5", "minimatch": "^9.0.1", "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0", "path-scurry": "^1.10.1" }, "bin": { "glob": "dist/esm/bin.mjs" } }, "sha512-fa46+tv1Ak0UPK1TOy/pZrIybNNt4HCv7SDzwyfiOZkvZLEbjsZkJBPtDHVshZjbecAoAGSC20MjLDG/qr679g=="],

    "glob-parent": ["glob-parent@6.0.2", "", { "dependencies": { "is-glob": "^4.0.3" } }, "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A=="],

    "globals": ["globals@13.24.0", "", { "dependencies": { "type-fest": "^0.20.2" } }, "sha512-AhO5QUcj8llrbG09iWhPU2B204J1xnPeL8kQmVorSsy+Sjj1sk8gIyh6cUocGmH4L0UuhAJy+hJMRA4mgA4mFQ=="],

    "globalthis": ["globalthis@1.0.4", "", { "dependencies": { "define-properties": "^1.2.1", "gopd": "^1.0.1" } }, "sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ=="],

    "gopd": ["gopd@1.2.0", "", {}, "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg=="],

    "graceful-fs": ["graceful-fs@4.2.11", "", {}, "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ=="],

    "graphemer": ["graphemer@1.4.0", "", {}, "sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag=="],

    "has-bigints": ["has-bigints@1.1.0", "", {}, "sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg=="],

    "has-flag": ["has-flag@4.0.0", "", {}, "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ=="],

    "has-property-descriptors": ["has-property-descriptors@1.0.2", "", { "dependencies": { "es-define-property": "^1.0.0" } }, "sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg=="],

    "has-proto": ["has-proto@1.2.0", "", { "dependencies": { "dunder-proto": "^1.0.0" } }, "sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ=="],

    "has-symbols": ["has-symbols@1.1.0", "", {}, "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ=="],

    "has-tostringtag": ["has-tostringtag@1.0.2", "", { "dependencies": { "has-symbols": "^1.0.3" } }, "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw=="],

    "hasown": ["hasown@2.0.4", "", { "dependencies": { "function-bind": "^1.1.2" } }, "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A=="],

    "ignore": ["ignore@5.3.2", "", {}, "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g=="],

    "import-fresh": ["import-fresh@3.3.1", "", { "dependencies": { "parent-module": "^1.0.0", "resolve-from": "^4.0.0" } }, "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ=="],

    "imurmurhash": ["imurmurhash@0.1.4", "", {}, "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA=="],

    "inflight": ["inflight@1.0.6", "", { "dependencies": { "once": "^1.3.0", "wrappy": "1" } }, "sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA=="],

    "inherits": ["inherits@2.0.4", "", {}, "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ=="],

    "internal-slot": ["internal-slot@1.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "hasown": "^2.0.2", "side-channel": "^1.1.0" } }, "sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw=="],

    "is-array-buffer": ["is-array-buffer@3.0.5", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.3", "get-intrinsic": "^1.2.6" } }, "sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A=="],

    "is-async-function": ["is-async-function@2.1.1", "", { "dependencies": { "async-function": "^1.0.0", "call-bound": "^1.0.3", "get-proto": "^1.0.1", "has-tostringtag": "^1.0.2", "safe-regex-test": "^1.1.0" } }, "sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ=="],

    "is-bigint": ["is-bigint@1.1.0", "", { "dependencies": { "has-bigints": "^1.0.2" } }, "sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ=="],

    "is-binary-path": ["is-binary-path@2.1.0", "", { "dependencies": { "binary-extensions": "^2.0.0" } }, "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw=="],

    "is-boolean-object": ["is-boolean-object@1.2.2", "", { "dependencies": { "call-bound": "^1.0.3", "has-tostringtag": "^1.0.2" } }, "sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A=="],

    "is-bun-module": ["is-bun-module@2.0.0", "", { "dependencies": { "semver": "^7.7.1" } }, "sha512-gNCGbnnnnFAUGKeZ9PdbyeGYJqewpmc2aKHUEMO5nQPWU9lOmv7jcmQIv+qHD8fXW6W7qfuCwX4rY9LNRjXrkQ=="],

    "is-callable": ["is-callable@1.2.7", "", {}, "sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA=="],

    "is-core-module": ["is-core-module@2.17.0", "", { "dependencies": { "hasown": "^2.0.4" } }, "sha512-J/vG0zBCbIKOQFfufSwyXdMrsohyJIUNkrnmo6WZGzoM7tr/lsbfW5b2BvisL6zsyMzK9UxV9L6c7AoFbyXHOA=="],

    "is-data-view": ["is-data-view@1.0.2", "", { "dependencies": { "call-bound": "^1.0.2", "get-intrinsic": "^1.2.6", "is-typed-array": "^1.1.13" } }, "sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw=="],

    "is-date-object": ["is-date-object@1.1.0", "", { "dependencies": { "call-bound": "^1.0.2", "has-tostringtag": "^1.0.2" } }, "sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg=="],

    "is-document.all": ["is-document.all@1.0.0", "", { "dependencies": { "call-bound": "^1.0.4" } }, "sha512-+XSoyS05OdBbhFuELhgTCpFNHkpBOJqtsZfUFFpe5QTw+9Sjbh8zitxhQkYAo6wV7e1Vb8cAPvpCk9jGam/82g=="],

    "is-extglob": ["is-extglob@2.1.1", "", {}, "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ=="],

    "is-finalizationregistry": ["is-finalizationregistry@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3" } }, "sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg=="],

    "is-fullwidth-code-point": ["is-fullwidth-code-point@3.0.0", "", {}, "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg=="],

    "is-generator-function": ["is-generator-function@1.1.2", "", { "dependencies": { "call-bound": "^1.0.4", "generator-function": "^2.0.0", "get-proto": "^1.0.1", "has-tostringtag": "^1.0.2", "safe-regex-test": "^1.1.0" } }, "sha512-upqt1SkGkODW9tsGNG5mtXTXtECizwtS2kA161M+gJPc1xdb/Ax629af6YrTwcOeQHbewrPNlE5Dx7kzvXTizA=="],

    "is-glob": ["is-glob@4.0.3", "", { "dependencies": { "is-extglob": "^2.1.1" } }, "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg=="],

    "is-map": ["is-map@2.0.3", "", {}, "sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw=="],

    "is-negative-zero": ["is-negative-zero@2.0.3", "", {}, "sha512-5KoIu2Ngpyek75jXodFvnafB6DJgr3u8uuK0LEZJjrU19DrMD3EVERaR8sjz8CCGgpZvxPl9SuE1GMVPFHx1mw=="],

    "is-number": ["is-number@7.0.0", "", {}, "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng=="],

    "is-number-object": ["is-number-object@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3", "has-tostringtag": "^1.0.2" } }, "sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw=="],

    "is-path-inside": ["is-path-inside@3.0.3", "", {}, "sha512-Fd4gABb+ycGAmKou8eMftCupSir5lRxqf4aD/vd0cD2qc4HL07OjCeuHMr8Ro4CoMaeCKDB0/ECBOVWjTwUvPQ=="],

    "is-regex": ["is-regex@1.2.1", "", { "dependencies": { "call-bound": "^1.0.2", "gopd": "^1.2.0", "has-tostringtag": "^1.0.2", "hasown": "^2.0.2" } }, "sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g=="],

    "is-set": ["is-set@2.0.3", "", {}, "sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg=="],

    "is-shared-array-buffer": ["is-shared-array-buffer@1.0.4", "", { "dependencies": { "call-bound": "^1.0.3" } }, "sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A=="],

    "is-string": ["is-string@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3", "has-tostringtag": "^1.0.2" } }, "sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA=="],

    "is-symbol": ["is-symbol@1.1.1", "", { "dependencies": { "call-bound": "^1.0.2", "has-symbols": "^1.1.0", "safe-regex-test": "^1.1.0" } }, "sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w=="],

    "is-typed-array": ["is-typed-array@1.1.15", "", { "dependencies": { "which-typed-array": "^1.1.16" } }, "sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ=="],

    "is-weakmap": ["is-weakmap@2.0.2", "", {}, "sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w=="],

    "is-weakref": ["is-weakref@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3" } }, "sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew=="],

    "is-weakset": ["is-weakset@2.0.4", "", { "dependencies": { "call-bound": "^1.0.3", "get-intrinsic": "^1.2.6" } }, "sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ=="],

    "isarray": ["isarray@2.0.5", "", {}, "sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw=="],

    "isexe": ["isexe@2.0.0", "", {}, "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw=="],

    "iterator.prototype": ["iterator.prototype@1.1.5", "", { "dependencies": { "define-data-property": "^1.1.4", "es-object-atoms": "^1.0.0", "get-intrinsic": "^1.2.6", "get-proto": "^1.0.0", "has-symbols": "^1.1.0", "set-function-name": "^2.0.2" } }, "sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g=="],

    "jackspeak": ["jackspeak@2.3.6", "", { "dependencies": { "@isaacs/cliui": "^8.0.2" }, "optionalDependencies": { "@pkgjs/parseargs": "^0.11.0" } }, "sha512-N3yCS/NegsOBokc8GAdM8UcmfsKiSS8cipheD/nivzr700H+nsMOxJjQnvwOcRYVuFkdH0wGUvW2WbXGmrZGbQ=="],

    "jiti": ["jiti@1.21.7", "", { "bin": { "jiti": "bin/jiti.js" } }, "sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A=="],

    "js-tokens": ["js-tokens@4.0.0", "", {}, "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ=="],

    "js-yaml": ["js-yaml@4.3.2", "", { "dependencies": { "argparse": "^2.0.1" }, "bin": { "js-yaml": "bin/js-yaml.js" } }, "sha512-SFNOvSJ+Dgf/9An904Yx+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3/TP3O+wzWuiTFl4sqbltzA=="],

    "json-buffer": ["json-buffer@3.0.1", "", {}, "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ=="],

    "json-schema-traverse": ["json-schema-traverse@0.4.1", "", {}, "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg=="],

    "json-stable-stringify-without-jsonify": ["json-stable-stringify-without-jsonify@1.0.1", "", {}, "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw=="],

    "json5": ["json5@1.0.2", "", { "dependencies": { "minimist": "^1.2.0" }, "bin": { "json5": "lib/cli.js" } }, "sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA=="],

    "jsx-ast-utils": ["jsx-ast-utils@3.3.5", "", { "dependencies": { "array-includes": "^3.1.6", "array.prototype.flat": "^1.3.1", "object.assign": "^4.1.4", "object.values": "^1.1.6" } }, "sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ=="],

    "keyv": ["keyv@4.5.4", "", { "dependencies": { "json-buffer": "3.0.1" } }, "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw=="],

    "language-subtag-registry": ["language-subtag-registry@0.3.23", "", {}, "sha512-0K65Lea881pHotoGEa5gDlMxt3pctLi2RplBb7Ezh4rRdLEOtgi7n4EwK9lamnUCkKBqaeKRVebTq6BAxSkpXQ=="],

    "language-tags": ["language-tags@1.0.9", "", { "dependencies": { "language-subtag-registry": "^0.3.20" } }, "sha512-MbjN408fEndfiQXbFQ1vnd+1NoLDsnQW41410oQBXiyXDMYH5z505juWa4KUE1LqxRC7DgOgZDbKLxHIwm27hA=="],

    "levn": ["levn@0.4.1", "", { "dependencies": { "prelude-ls": "^1.2.1", "type-check": "~0.4.0" } }, "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ=="],

    "lilconfig": ["lilconfig@3.1.3", "", {}, "sha512-/vlFKAoH5Cgt3Ie+JLhRbwOsCQePABiU3tJ1egGvyQ+33R/vcwM2Zl2QR/LzjsBeItPt3oSVXapn+m4nQDvpzw=="],

    "lines-and-columns": ["lines-and-columns@1.2.4", "", {}, "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg=="],

    "locate-path": ["locate-path@6.0.0", "", { "dependencies": { "p-locate": "^5.0.0" } }, "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw=="],

    "lodash.merge": ["lodash.merge@4.6.2", "", {}, "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ=="],

    "loose-envify": ["loose-envify@1.4.0", "", { "dependencies": { "js-tokens": "^3.0.0 || ^4.0.0" }, "bin": { "loose-envify": "cli.js" } }, "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q=="],

    "lru-cache": ["lru-cache@10.4.3", "", {}, "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ=="],

    "lucide-react": ["lucide-react@0.475.0", "", { "peerDependencies": { "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0" } }, "sha512-NJzvVu1HwFVeZ+Gwq2q00KygM1aBhy/ZrhY9FsAgJtpB+E4R7uxRk9M2iKvHa6/vNxZydIB59htha4c2vvwvVg=="],

    "math-intrinsics": ["math-intrinsics@1.1.0", "", {}, "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g=="],

    "merge2": ["merge2@1.4.1", "", {}, "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg=="],

    "micromatch": ["micromatch@4.0.8", "", { "dependencies": { "braces": "^3.0.3", "picomatch": "^2.3.1" } }, "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA=="],

    "minimatch": ["minimatch@3.1.5", "", { "dependencies": { "brace-expansion": "^1.1.7" } }, "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w=="],

    "minimist": ["minimist@1.2.8", "", {}, "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA=="],

    "minipass": ["minipass@7.1.3", "", {}, "sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A=="],

    "ms": ["ms@2.1.3", "", {}, "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA=="],

    "mz": ["mz@2.7.0", "", { "dependencies": { "any-promise": "^1.0.0", "object-assign": "^4.0.1", "thenify-all": "^1.0.0" } }, "sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q=="],

    "nanoid": ["nanoid@3.3.19", "", { "bin": { "nanoid": "bin/nanoid.cjs" } }, "sha512-Y2tUNy4ouw6tq5oDSKeQYGOyhkUBhNOcGV/02KC+6kd9eDGqdZd++mjMiIDilrBYvjEnCYvVtsuHCuP+okSfug=="],

    "napi-postinstall": ["napi-postinstall@0.3.4", "", { "bin": { "napi-postinstall": "lib/cli.js" } }, "sha512-PHI5f1O0EP5xJ9gQmFGMS6IZcrVvTjpXjz7Na41gTE7eE2hK11lg04CECCYEEjdc17EV4DO+fkGEtt7TpTaTiQ=="],

    "natural-compare": ["natural-compare@1.4.0", "", {}, "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw=="],

    "next": ["next@14.2.24", "", { "dependencies": { "@next/env": "14.2.24", "@swc/helpers": "0.5.5", "busboy": "1.6.0", "caniuse-lite": "^1.0.30001579", "graceful-fs": "^4.2.11", "postcss": "8.4.31", "styled-jsx": "5.1.1" }, "optionalDependencies": { "@next/swc-darwin-arm64": "14.2.24", "@next/swc-darwin-x64": "14.2.24", "@next/swc-linux-arm64-gnu": "14.2.24", "@next/swc-linux-arm64-musl": "14.2.24", "@next/swc-linux-x64-gnu": "14.2.24", "@next/swc-linux-x64-musl": "14.2.24", "@next/swc-win32-arm64-msvc": "14.2.24", "@next/swc-win32-ia32-msvc": "14.2.24", "@next/swc-win32-x64-msvc": "14.2.24" }, "peerDependencies": { "@opentelemetry/api": "^1.1.0", "@playwright/test": "^1.41.2", "react": "^18.2.0", "react-dom": "^18.2.0", "sass": "^1.3.0" }, "optionalPeers": ["@opentelemetry/api", "@playwright/test", "sass"], "bin": { "next": "dist/bin/next" } }, "sha512-En8VEexSJ0Py2FfVnRRh8gtERwDRaJGNvsvad47ShkC2Yi8AXQPXEA2vKoDJlGFSj5WE5SyF21zNi4M5gyi+SQ=="],

    "node-exports-info": ["node-exports-info@1.6.2", "", { "dependencies": { "array.prototype.flatmap": "^1.3.3", "es-errors": "^1.3.0", "object.entries": "^1.1.9", "semver": "^6.3.1" } }, "sha512-kXs9Go0cah0qHVV2v389IXQLdLCeE1xfFtjOAF+iobu0OIoG1pje8At2vMHyaPMiPMnG/LWP50twML21eMcAag=="],

    "node-releases": ["node-releases@2.0.57", "", {}, "sha512-kQK9LGGFiHtrWiNhZtA7Qbw17AQz+dmsEKODRIVTXA9+e5MS/2gZEBhYJt13GrAz5/IOZKddH/0Z3TP/Zgo+yw=="],

    "normalize-path": ["normalize-path@3.0.0", "", {}, "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA=="],

    "object-assign": ["object-assign@4.1.1", "", {}, "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg=="],

    "object-hash": ["object-hash@3.0.0", "", {}, "sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw=="],

    "object-inspect": ["object-inspect@1.13.4", "", {}, "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew=="],

    "object-keys": ["object-keys@1.1.1", "", {}, "sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA=="],

    "object.assign": ["object.assign@4.1.7", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.3", "define-properties": "^1.2.1", "es-object-atoms": "^1.0.0", "has-symbols": "^1.1.0", "object-keys": "^1.1.1" } }, "sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw=="],

    "object.entries": ["object.entries@1.1.9", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-object-atoms": "^1.1.1" } }, "sha512-8u/hfXFRBD1O0hPUjioLhoWFHRmt6tKA4/vZPyckBr18l1KE9uHrFaFaUi8MDRTpi4uak2goyPTSNJLXX2k2Hw=="],

    "object.fromentries": ["object.fromentries@2.0.8", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.2", "es-object-atoms": "^1.0.0" } }, "sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ=="],

    "object.groupby": ["object.groupby@1.0.3", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.2" } }, "sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ=="],

    "object.values": ["object.values@1.2.1", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.3", "define-properties": "^1.2.1", "es-object-atoms": "^1.0.0" } }, "sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA=="],

    "once": ["once@1.4.0", "", { "dependencies": { "wrappy": "1" } }, "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w=="],

    "optionator": ["optionator@0.9.4", "", { "dependencies": { "deep-is": "^0.1.3", "fast-levenshtein": "^2.0.6", "levn": "^0.4.1", "prelude-ls": "^1.2.1", "type-check": "^0.4.0", "word-wrap": "^1.2.5" } }, "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g=="],

    "own-keys": ["own-keys@1.0.2", "", { "dependencies": { "call-bound": "^1.0.4", "get-intrinsic": "^1.3.0", "object-keys": "^1.1.1", "safe-push-apply": "^1.0.0" } }, "sha512-19YVAg7T+WTrxggPukVq7DjTv6+PJ867TmhCvBsYwmbFCsZd344rq2Ld1p0wo8f8Qrrhgp82c6FJRqdXWtSEhg=="],

    "p-limit": ["p-limit@3.1.0", "", { "dependencies": { "yocto-queue": "^0.1.0" } }, "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ=="],

    "p-locate": ["p-locate@5.0.0", "", { "dependencies": { "p-limit": "^3.0.2" } }, "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw=="],

    "parent-module": ["parent-module@1.0.1", "", { "dependencies": { "callsites": "^3.0.0" } }, "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g=="],

    "path-exists": ["path-exists@4.0.0", "", {}, "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w=="],

    "path-is-absolute": ["path-is-absolute@1.0.1", "", {}, "sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg=="],

    "path-key": ["path-key@3.1.1", "", {}, "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q=="],

    "path-parse": ["path-parse@1.0.7", "", {}, "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw=="],

    "path-scurry": ["path-scurry@1.11.1", "", { "dependencies": { "lru-cache": "^10.2.0", "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0" } }, "sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA=="],

    "picocolors": ["picocolors@1.1.1", "", {}, "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA=="],

    "picomatch": ["picomatch@2.3.2", "", {}, "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA=="],

    "pirates": ["pirates@4.0.7", "", {}, "sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA=="],

    "possible-typed-array-names": ["possible-typed-array-names@1.1.0", "", {}, "sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg=="],

    "postcss": ["postcss@8.5.28", "", { "dependencies": { "nanoid": "^3.3.18", "picocolors": "^1.1.1", "source-map-js": "^1.2.1" } }, "sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A=="],

    "postcss-import": ["postcss-import@15.1.0", "", { "dependencies": { "postcss-value-parser": "^4.0.0", "read-cache": "^1.0.0", "resolve": "^1.1.7" }, "peerDependencies": { "postcss": "^8.0.0" } }, "sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew=="],

    "postcss-js": ["postcss-js@4.1.0", "", { "dependencies": { "camelcase-css": "^2.0.1" }, "peerDependencies": { "postcss": "^8.4.21" } }, "sha512-oIAOTqgIo7q2EOwbhb8UalYePMvYoIeRY2YKntdpFQXNosSu3vLrniGgmH9OKs/qAkfoj5oB3le/7mINW1LCfw=="],

    "postcss-load-config": ["postcss-load-config@6.0.1", "", { "dependencies": { "lilconfig": "^3.1.1" }, "peerDependencies": { "jiti": ">=1.21.0", "postcss": ">=8.0.9", "tsx": "^4.8.1", "yaml": "^2.4.2" }, "optionalPeers": ["jiti", "postcss", "tsx", "yaml"] }, "sha512-oPtTM4oerL+UXmx+93ytZVN82RrlY/wPUV8IeDxFrzIjXOLF1pN+EmKPLbubvKHT2HC20xXsCAH2Z+CKV6Oz/g=="],

    "postcss-nested": ["postcss-nested@6.2.0", "", { "dependencies": { "postcss-selector-parser": "^6.1.1" }, "peerDependencies": { "postcss": "^8.2.14" } }, "sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ=="],

    "postcss-selector-parser": ["postcss-selector-parser@6.1.4", "", { "dependencies": { "cssesc": "^3.0.0", "util-deprecate": "^1.0.2" } }, "sha512-bIoJLOmjCO1S9XdY/DcnR5hJxvrDir1PbGChrzXG3vw0/FOliy/fA3dmdhQ441kah4gKv+TwckGzex6wNS5cnQ=="],

    "postcss-value-parser": ["postcss-value-parser@4.2.0", "", {}, "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ=="],

    "prelude-ls": ["prelude-ls@1.2.1", "", {}, "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g=="],

    "prop-types": ["prop-types@15.8.1", "", { "dependencies": { "loose-envify": "^1.4.0", "object-assign": "^4.1.1", "react-is": "^16.13.1" } }, "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg=="],

    "punycode": ["punycode@2.3.1", "", {}, "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg=="],

    "queue-microtask": ["queue-microtask@1.2.3", "", {}, "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A=="],

    "react": ["react@18.3.1", "", { "dependencies": { "loose-envify": "^1.1.0" } }, "sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ=="],

    "react-dom": ["react-dom@18.3.1", "", { "dependencies": { "loose-envify": "^1.1.0", "scheduler": "^0.23.2" }, "peerDependencies": { "react": "^18.3.1" } }, "sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw=="],

    "react-is": ["react-is@16.13.1", "", {}, "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ=="],

    "read-cache": ["read-cache@1.0.2", "", {}, "sha512-/peqiBB/n07gQGLsWaHho3WfvUyRscw0gYTsEFMhrIe/nWLkYaf5SbKYjGYqtRV3aPwykJgF2VEMo1ac4bnsGA=="],

    "readdirp": ["readdirp@3.6.0", "", { "dependencies": { "picomatch": "^2.2.1" } }, "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA=="],

    "reflect.getprototypeof": ["reflect.getprototypeof@1.0.10", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.9", "es-errors": "^1.3.0", "es-object-atoms": "^1.0.0", "get-intrinsic": "^1.2.7", "get-proto": "^1.0.1", "which-builtin-type": "^1.2.1" } }, "sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw=="],

    "regexp.prototype.flags": ["regexp.prototype.flags@1.5.4", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-errors": "^1.3.0", "get-proto": "^1.0.1", "gopd": "^1.2.0", "set-function-name": "^2.0.2" } }, "sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA=="],

    "resolve": ["resolve@1.22.12", "", { "dependencies": { "es-errors": "^1.3.0", "is-core-module": "^2.16.1", "path-parse": "^1.0.7", "supports-preserve-symlinks-flag": "^1.0.0" }, "bin": { "resolve": "bin/resolve" } }, "sha512-TyeJ1zif53BPfHootBGwPRYT1RUt6oGWsaQr8UyZW/eAm9bKoijtvruSDEmZHm92CwS9nj7/fWttqPCgzep8CA=="],

    "resolve-from": ["resolve-from@4.0.0", "", {}, "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g=="],

    "resolve-pkg-maps": ["resolve-pkg-maps@1.0.0", "", {}, "sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw=="],

    "reusify": ["reusify@1.1.0", "", {}, "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw=="],

    "rimraf": ["rimraf@3.0.2", "", { "dependencies": { "glob": "^7.1.3" }, "bin": { "rimraf": "bin.js" } }, "sha512-JZkJMZkAGFFPP2YqXZXPbMlMBgsxzE8ILs4lMIX/2o0L9UBw9O/Y3o6wFw/i9YLapcUJWwqbi3kdxIPdC62TIA=="],

    "run-parallel": ["run-parallel@1.2.0", "", { "dependencies": { "queue-microtask": "^1.2.2" } }, "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA=="],

    "safe-array-concat": ["safe-array-concat@1.1.4", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "get-intrinsic": "^1.3.0", "has-symbols": "^1.1.0", "isarray": "^2.0.5" } }, "sha512-wtZlHyOje6OZTGqAoaDKxFkgRtkF9CnHAVnCHKfuj200wAgL+bSJhdsCD2l0Qx/2ekEXjPWcyKkfGb5CPboslg=="],

    "safe-push-apply": ["safe-push-apply@1.0.0", "", { "dependencies": { "es-errors": "^1.3.0", "isarray": "^2.0.5" } }, "sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA=="],

    "safe-regex-test": ["safe-regex-test@1.1.0", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "is-regex": "^1.2.1" } }, "sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw=="],

    "scheduler": ["scheduler@0.23.2", "", { "dependencies": { "loose-envify": "^1.1.0" } }, "sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ=="],

    "semver": ["semver@6.3.1", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA=="],

    "set-function-length": ["set-function-length@1.2.2", "", { "dependencies": { "define-data-property": "^1.1.4", "es-errors": "^1.3.0", "function-bind": "^1.1.2", "get-intrinsic": "^1.2.4", "gopd": "^1.0.1", "has-property-descriptors": "^1.0.2" } }, "sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg=="],

    "set-function-name": ["set-function-name@2.0.2", "", { "dependencies": { "define-data-property": "^1.1.4", "es-errors": "^1.3.0", "functions-have-names": "^1.2.3", "has-property-descriptors": "^1.0.2" } }, "sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ=="],

    "set-proto": ["set-proto@1.0.0", "", { "dependencies": { "dunder-proto": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.0.0" } }, "sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw=="],

    "shebang-command": ["shebang-command@2.0.0", "", { "dependencies": { "shebang-regex": "^3.0.0" } }, "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA=="],

    "shebang-regex": ["shebang-regex@3.0.0", "", {}, "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A=="],

    "side-channel": ["side-channel@1.1.1", "", { "dependencies": { "es-errors": "^1.3.0", "object-inspect": "^1.13.4", "side-channel-list": "^1.0.1", "side-channel-map": "^1.0.1", "side-channel-weakmap": "^1.0.2" } }, "sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ=="],

    "side-channel-list": ["side-channel-list@1.0.1", "", { "dependencies": { "es-errors": "^1.3.0", "object-inspect": "^1.13.4" } }, "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w=="],

    "side-channel-map": ["side-channel-map@1.0.1", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.5", "object-inspect": "^1.13.3" } }, "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA=="],

    "side-channel-weakmap": ["side-channel-weakmap@1.0.2", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.5", "object-inspect": "^1.13.3", "side-channel-map": "^1.0.1" } }, "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A=="],

    "signal-exit": ["signal-exit@4.1.0", "", {}, "sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw=="],

    "source-map-js": ["source-map-js@1.2.2", "", {}, "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw=="],

    "stable-hash": ["stable-hash@0.0.5", "", {}, "sha512-+L3ccpzibovGXFK+Ap/f8LOS0ahMrHTf3xu7mMLSpEGU0EO9ucaysSylKo9eRDFNhWve/y275iPmIZ4z39a9iA=="],

    "stop-iteration-iterator": ["stop-iteration-iterator@1.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "internal-slot": "^1.1.0" } }, "sha512-eLoXW/DHyl62zxY4SCaIgnRhuMr6ri4juEYARS8E6sCEqzKpOiE521Ucofdx+KnDZl5xmvGYaaKCk5FEOxJCoQ=="],

    "streamsearch": ["streamsearch@1.1.0", "", {}, "sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg=="],

    "string-width": ["string-width@5.1.2", "", { "dependencies": { "eastasianwidth": "^0.2.0", "emoji-regex": "^9.2.2", "strip-ansi": "^7.0.1" } }, "sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA=="],

    "string-width-cjs": ["string-width@4.2.3", "", { "dependencies": { "emoji-regex": "^8.0.0", "is-fullwidth-code-point": "^3.0.0", "strip-ansi": "^6.0.1" } }, "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g=="],

    "string.prototype.includes": ["string.prototype.includes@2.0.1", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.3" } }, "sha512-o7+c9bW6zpAdJHTtujeePODAhkuicdAryFsfVKwA+wGw89wJ4GTY484WTucM9hLtDEOpOvI+aHnzqnC5lHp4Rg=="],

    "string.prototype.matchall": ["string.prototype.matchall@4.1.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.2", "get-intrinsic": "^1.3.0", "gopd": "^1.2.0", "has-symbols": "^1.1.0", "internal-slot": "^1.1.0", "regexp.prototype.flags": "^1.5.4", "set-function-name": "^2.0.2", "side-channel": "^1.1.1" } }, "sha512-tHNHTxInrYLCga9O9YGxWA3G9/nnzQw8UGAyqGx3Ar1pSTTzIuM4woFSq4SowkXCjJIwq5sIiQvEfRI9tCH1qQ=="],

    "string.prototype.repeat": ["string.prototype.repeat@1.0.0", "", { "dependencies": { "define-properties": "^1.1.3", "es-abstract": "^1.17.5" } }, "sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w=="],

    "string.prototype.trim": ["string.prototype.trim@1.2.11", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-data-property": "^1.1.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-object-atoms": "^1.1.2", "has-property-descriptors": "^1.0.2", "safe-regex-test": "^1.1.0" } }, "sha512-PwvK7BU+CMTJGYQCTZb5RWXIML92lftJLhQz1tBzgKiqGxJaMlBAa48POXaNAC2s4y8jr3EFqrkF9+44neS46w=="],

    "string.prototype.trimend": ["string.prototype.trimend@1.0.10", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-object-atoms": "^1.1.2" } }, "sha512-2+3aDAOmPTmuFwjDnmJG2ctEkQKVki7vOSqaxkv42Mowj1V6PnvuwFCRrR5lChUux1TBskPjfkeTOhqczDMxTw=="],

    "string.prototype.trimstart": ["string.prototype.trimstart@1.0.8", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-object-atoms": "^1.0.0" } }, "sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg=="],

    "strip-ansi": ["strip-ansi@6.0.1", "", { "dependencies": { "ansi-regex": "^5.0.1" } }, "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A=="],

    "strip-ansi-cjs": ["strip-ansi@6.0.1", "", { "dependencies": { "ansi-regex": "^5.0.1" } }, "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A=="],

    "strip-bom": ["strip-bom@3.0.0", "", {}, "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA=="],

    "strip-json-comments": ["strip-json-comments@3.1.1", "", {}, "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig=="],

    "styled-jsx": ["styled-jsx@5.1.1", "", { "dependencies": { "client-only": "0.0.1" }, "peerDependencies": { "@babel/core": "*", "babel-plugin-macros": "*", "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0" }, "optionalPeers": ["@babel/core", "babel-plugin-macros"] }, "sha512-pW7uC1l4mBZ8ugbiZrcIsiIvVx1UmTfw7UkC3Um2tmfUq9Bhk8IiyEIPl6F8agHgjzku6j0xQEZbfA5uSgSaCw=="],

    "sucrase": ["sucrase@3.35.1", "", { "dependencies": { "@jridgewell/gen-mapping": "^0.3.2", "commander": "^4.0.0", "lines-and-columns": "^1.1.6", "mz": "^2.7.0", "pirates": "^4.0.1", "tinyglobby": "^0.2.11", "ts-interface-checker": "^0.1.9" }, "bin": { "sucrase": "bin/sucrase", "sucrase-node": "bin/sucrase-node" } }, "sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw=="],

    "supports-color": ["supports-color@7.2.0", "", { "dependencies": { "has-flag": "^4.0.0" } }, "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw=="],

    "supports-preserve-symlinks-flag": ["supports-preserve-symlinks-flag@1.0.0", "", {}, "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w=="],

    "tailwind-merge": ["tailwind-merge@2.6.1", "", {}, "sha512-Oo6tHdpZsGpkKG88HJ8RR1rg/RdnEkQEfMoEk2x1XRI3F1AxeU+ijRXpiVUF4UbLfcxxRGw6TbUINKYdWVsQTQ=="],

    "tailwindcss": ["tailwindcss@3.4.19", "", { "dependencies": { "@alloc/quick-lru": "^5.2.0", "arg": "^5.0.2", "chokidar": "^3.6.0", "didyoumean": "^1.2.2", "dlv": "^1.1.3", "fast-glob": "^3.3.2", "glob-parent": "^6.0.2", "is-glob": "^4.0.3", "jiti": "^1.21.7", "lilconfig": "^3.1.3", "micromatch": "^4.0.8", "normalize-path": "^3.0.0", "object-hash": "^3.0.0", "picocolors": "^1.1.1", "postcss": "^8.4.47", "postcss-import": "^15.1.0", "postcss-js": "^4.0.1", "postcss-load-config": "^4.0.2 || ^5.0 || ^6.0", "postcss-nested": "^6.2.0", "postcss-selector-parser": "^6.1.2", "resolve": "^1.22.8", "sucrase": "^3.35.0" }, "bin": { "tailwind": "lib/cli.js", "tailwindcss": "lib/cli.js" } }, "sha512-3ofp+LL8E+pK/JuPLPggVAIaEuhvIz4qNcf3nA1Xn2o/7fb7s/TYpHhwGDv1ZU3PkBluUVaF8PyCHcm48cKLWQ=="],

    "text-table": ["text-table@0.2.0", "", {}, "sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw=="],

    "thenify": ["thenify@3.3.1", "", { "dependencies": { "any-promise": "^1.0.0" } }, "sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw=="],

    "thenify-all": ["thenify-all@1.6.0", "", { "dependencies": { "thenify": ">= 3.1.0 < 4" } }, "sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA=="],

    "tinyglobby": ["tinyglobby@0.2.17", "", { "dependencies": { "fdir": "^6.5.0", "picomatch": "^4.0.4" } }, "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g=="],

    "to-regex-range": ["to-regex-range@5.0.1", "", { "dependencies": { "is-number": "^7.0.0" } }, "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ=="],

    "ts-api-utils": ["ts-api-utils@2.5.0", "", { "peerDependencies": { "typescript": ">=4.8.4" } }, "sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA=="],

    "ts-interface-checker": ["ts-interface-checker@0.1.13", "", {}, "sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA=="],

    "tsconfig-paths": ["tsconfig-paths@3.15.0", "", { "dependencies": { "@types/json5": "^0.0.29", "json5": "^1.0.2", "minimist": "^1.2.6", "strip-bom": "^3.0.0" } }, "sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg=="],

    "tslib": ["tslib@2.8.1", "", {}, "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w=="],

    "type-check": ["type-check@0.4.0", "", { "dependencies": { "prelude-ls": "^1.2.1" } }, "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew=="],

    "type-fest": ["type-fest@0.20.2", "", {}, "sha512-Ne+eE4r0/iWnpAxD852z3A+N0Bt5RN//NjJwRd2VFHEmrywxf5vsZlh4R6lixl6B+wz/8d+maTSAkN1FIkI3LQ=="],

    "typed-array-buffer": ["typed-array-buffer@1.0.3", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "is-typed-array": "^1.1.14" } }, "sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw=="],

    "typed-array-byte-length": ["typed-array-byte-length@1.0.3", "", { "dependencies": { "call-bind": "^1.0.8", "for-each": "^0.3.3", "gopd": "^1.2.0", "has-proto": "^1.2.0", "is-typed-array": "^1.1.14" } }, "sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg=="],

    "typed-array-byte-offset": ["typed-array-byte-offset@1.0.5", "", { "dependencies": { "available-typed-arrays": "^1.0.7", "call-bind": "^1.0.9", "for-each": "^0.3.5", "gopd": "^1.2.0", "is-typed-array": "^1.1.15", "reflect.getprototypeof": "^1.0.10" } }, "sha512-0FHJvLPqZ7KJzp17O13jfsAjsqazgrxBu2zEK95PmUz8lv2+GjRuxUInCr2Rk9Dms3ihN21zJ929ZO43yJ95QQ=="],

    "typed-array-length": ["typed-array-length@1.0.8", "", { "dependencies": { "call-bind": "^1.0.9", "for-each": "^0.3.5", "gopd": "^1.2.0", "is-typed-array": "^1.1.15", "possible-typed-array-names": "^1.1.0", "reflect.getprototypeof": "^1.0.10" } }, "sha512-phPGCwqr2+Qo0fwniCE8e4pKnGu/yFb5nD5Y8bf0EEeiI5GklnACYA9GFy/DrAeRrKHXvHn+1SUsOWgJp6RO+g=="],

    "typescript": ["typescript@5.9.3", "", { "bin": { "tsc": "bin/tsc", "tsserver": "bin/tsserver" } }, "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw=="],

    "unbox-primitive": ["unbox-primitive@1.1.0", "", { "dependencies": { "call-bound": "^1.0.3", "has-bigints": "^1.0.2", "has-symbols": "^1.1.0", "which-boxed-primitive": "^1.1.1" } }, "sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw=="],

    "undici-types": ["undici-types@6.21.0", "", {}, "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ=="],

    "unrs-resolver": ["unrs-resolver@1.12.2", "", { "dependencies": { "napi-postinstall": "^0.3.4" }, "optionalDependencies": { "@unrs/resolver-binding-android-arm-eabi": "1.12.2", "@unrs/resolver-binding-android-arm64": "1.12.2", "@unrs/resolver-binding-darwin-arm64": "1.12.2", "@unrs/resolver-binding-darwin-x64": "1.12.2", "@unrs/resolver-binding-freebsd-x64": "1.12.2", "@unrs/resolver-binding-linux-arm-gnueabihf": "1.12.2", "@unrs/resolver-binding-linux-arm-musleabihf": "1.12.2", "@unrs/resolver-binding-linux-arm64-gnu": "1.12.2", "@unrs/resolver-binding-linux-arm64-musl": "1.12.2", "@unrs/resolver-binding-linux-loong64-gnu": "1.12.2", "@unrs/resolver-binding-linux-loong64-musl": "1.12.2", "@unrs/resolver-binding-linux-ppc64-gnu": "1.12.2", "@unrs/resolver-binding-linux-riscv64-gnu": "1.12.2", "@unrs/resolver-binding-linux-riscv64-musl": "1.12.2", "@unrs/resolver-binding-linux-s390x-gnu": "1.12.2", "@unrs/resolver-binding-linux-x64-gnu": "1.12.2", "@unrs/resolver-binding-linux-x64-musl": "1.12.2", "@unrs/resolver-binding-openharmony-arm64": "1.12.2", "@unrs/resolver-binding-wasm32-wasi": "1.12.2", "@unrs/resolver-binding-win32-arm64-msvc": "1.12.2", "@unrs/resolver-binding-win32-ia32-msvc": "1.12.2", "@unrs/resolver-binding-win32-x64-msvc": "1.12.2" } }, "sha512-dmlRxBJJayXjqTwC+JtF1HhJmgf3ftQ3YejFcZrf4+KKtJv0qDsK1pjqaaVjG7wJ5NJ6UVP1OqRMQ71Z4C3rxQ=="],

    "update-browserslist-db": ["update-browserslist-db@1.3.3", "", { "dependencies": { "escalade": "^3.2.0", "picocolors": "^1.1.1" }, "peerDependencies": { "browserslist": ">= 4.21.0" }, "bin": { "update-browserslist-db": "cli.js" } }, "sha512-pJ2sYawQS0R/WI928Gj5GlPhTGzbMelq0+4INtSYNDV9ErKJcX6xjGWkoG/VnB3dpUm00zALaqkrUD77pO5TDQ=="],

    "uri-js": ["uri-js@4.4.1", "", { "dependencies": { "punycode": "^2.1.0" } }, "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg=="],

    "util-deprecate": ["util-deprecate@1.0.2", "", {}, "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw=="],

    "which": ["which@2.0.2", "", { "dependencies": { "isexe": "^2.0.0" }, "bin": { "node-which": "./bin/node-which" } }, "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA=="],

    "which-boxed-primitive": ["which-boxed-primitive@1.1.1", "", { "dependencies": { "is-bigint": "^1.1.0", "is-boolean-object": "^1.2.1", "is-number-object": "^1.1.1", "is-string": "^1.1.1", "is-symbol": "^1.1.1" } }, "sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA=="],

    "which-builtin-type": ["which-builtin-type@1.2.1", "", { "dependencies": { "call-bound": "^1.0.2", "function.prototype.name": "^1.1.6", "has-tostringtag": "^1.0.2", "is-async-function": "^2.0.0", "is-date-object": "^1.1.0", "is-finalizationregistry": "^1.1.0", "is-generator-function": "^1.0.10", "is-regex": "^1.2.1", "is-weakref": "^1.0.2", "isarray": "^2.0.5", "which-boxed-primitive": "^1.1.0", "which-collection": "^1.0.2", "which-typed-array": "^1.1.16" } }, "sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q=="],

    "which-collection": ["which-collection@1.0.2", "", { "dependencies": { "is-map": "^2.0.3", "is-set": "^2.0.3", "is-weakmap": "^2.0.2", "is-weakset": "^2.0.3" } }, "sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw=="],

    "which-typed-array": ["which-typed-array@1.1.24", "", { "dependencies": { "available-typed-arrays": "^1.0.7", "call-bind": "^1.0.9", "call-bound": "^1.0.4", "for-each": "^0.3.5", "get-proto": "^1.0.1", "gopd": "^1.2.0", "has-tostringtag": "^1.0.2" } }, "sha512-wk4Mf4pR5mRP7eYuuTBCIQ9d0ud2Fv2jRLQpfgnRjbOxAFHmjKFValgTpitVKzJJS8ajnYQV2Du1SZ8j6b/EUQ=="],

    "word-wrap": ["word-wrap@1.2.5", "", {}, "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA=="],

    "wrap-ansi": ["wrap-ansi@8.1.0", "", { "dependencies": { "ansi-styles": "^6.1.0", "string-width": "^5.0.1", "strip-ansi": "^7.0.1" } }, "sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ=="],

    "wrap-ansi-cjs": ["wrap-ansi@7.0.0", "", { "dependencies": { "ansi-styles": "^4.0.0", "string-width": "^4.1.0", "strip-ansi": "^6.0.0" } }, "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q=="],

    "wrappy": ["wrappy@1.0.2", "", {}, "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ=="],

    "yocto-queue": ["yocto-queue@0.1.0", "", {}, "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q=="],

    "@isaacs/cliui/strip-ansi": ["strip-ansi@7.2.0", "", { "dependencies": { "ansi-regex": "^6.2.2" } }, "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w=="],

    "@typescript-eslint/eslint-plugin/ignore": ["ignore@7.0.11", "", {}, "sha512-YChdK5txDjwGUvgR7oCJcLGkwi3LDh8Zx8tS7ndYciLEg/oOCL26VUBSUEtgS7EjiybcBqFxh5j0rAdDX7/bbg=="],

    "@typescript-eslint/typescript-estree/minimatch": ["minimatch@10.2.6", "", { "dependencies": { "brace-expansion": "^5.0.8" } }, "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A=="],

    "@typescript-eslint/typescript-estree/semver": ["semver@7.8.5", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA=="],

    "@typescript-eslint/visitor-keys/eslint-visitor-keys": ["eslint-visitor-keys@5.0.1", "", {}, "sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA=="],

    "chokidar/glob-parent": ["glob-parent@5.1.2", "", { "dependencies": { "is-glob": "^4.0.1" } }, "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow=="],

    "eslint-import-resolver-node/debug": ["debug@3.2.7", "", { "dependencies": { "ms": "^2.1.1" } }, "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ=="],

    "eslint-import-resolver-node/resolve": ["resolve@2.0.0-next.7", "", { "dependencies": { "es-errors": "^1.3.0", "is-core-module": "^2.16.2", "node-exports-info": "^1.6.0", "object-keys": "^1.1.1", "path-parse": "^1.0.7", "supports-preserve-symlinks-flag": "^1.0.0" }, "bin": { "resolve": "bin/resolve" } }, "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ=="],

    "eslint-module-utils/debug": ["debug@3.2.7", "", { "dependencies": { "ms": "^2.1.1" } }, "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ=="],

    "eslint-plugin-import/debug": ["debug@3.2.7", "", { "dependencies": { "ms": "^2.1.1" } }, "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ=="],

    "eslint-plugin-import/doctrine": ["doctrine@2.1.0", "", { "dependencies": { "esutils": "^2.0.2" } }, "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw=="],

    "eslint-plugin-react/doctrine": ["doctrine@2.1.0", "", { "dependencies": { "esutils": "^2.0.2" } }, "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw=="],

    "eslint-plugin-react/resolve": ["resolve@2.0.0-next.7", "", { "dependencies": { "es-errors": "^1.3.0", "is-core-module": "^2.16.2", "node-exports-info": "^1.6.0", "object-keys": "^1.1.1", "path-parse": "^1.0.7", "supports-preserve-symlinks-flag": "^1.0.0" }, "bin": { "resolve": "bin/resolve" } }, "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ=="],

    "fast-glob/glob-parent": ["glob-parent@5.1.2", "", { "dependencies": { "is-glob": "^4.0.1" } }, "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow=="],

    "glob/minimatch": ["minimatch@9.0.9", "", { "dependencies": { "brace-expansion": "^2.0.2" } }, "sha512-OBwBN9AL4dqmETlpS2zasx+vTeWclWzkblfZk7KTA5j3jeOONz/tRCnZomUyvNg83wL5Zv9Ss6HMJXAgL8R2Yg=="],

    "is-bun-module/semver": ["semver@7.8.5", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA=="],

    "next/postcss": ["postcss@8.4.31", "", { "dependencies": { "nanoid": "^3.3.6", "picocolors": "^1.0.0", "source-map-js": "^1.0.2" } }, "sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ=="],

    "rimraf/glob": ["glob@7.2.3", "", { "dependencies": { "fs.realpath": "^1.0.0", "inflight": "^1.0.4", "inherits": "2", "minimatch": "^3.1.1", "once": "^1.3.0", "path-is-absolute": "^1.0.0" } }, "sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q=="],

    "string-width/strip-ansi": ["strip-ansi@7.2.0", "", { "dependencies": { "ansi-regex": "^6.2.2" } }, "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w=="],

    "string-width-cjs/emoji-regex": ["emoji-regex@8.0.0", "", {}, "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="],

    "tinyglobby/picomatch": ["picomatch@4.0.7", "", {}, "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA=="],

    "wrap-ansi/ansi-styles": ["ansi-styles@6.2.3", "", {}, "sha512-4Dj6M28JB+oAH8kFkTLUo+a2jwOFkuqb3yucU0CANcRRUbxS0cP0nZYCGjcc3BNXwRIsUVmDGgzawme7zvJHvg=="],

    "wrap-ansi/strip-ansi": ["strip-ansi@7.2.0", "", { "dependencies": { "ansi-regex": "^6.2.2" } }, "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w=="],

    "wrap-ansi-cjs/string-width": ["string-width@4.2.3", "", { "dependencies": { "emoji-regex": "^8.0.0", "is-fullwidth-code-point": "^3.0.0", "strip-ansi": "^6.0.1" } }, "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g=="],

    "@isaacs/cliui/strip-ansi/ansi-regex": ["ansi-regex@6.4.0", "", {}, "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw=="],

    "@typescript-eslint/typescript-estree/minimatch/brace-expansion": ["brace-expansion@5.0.12", "", { "dependencies": { "balanced-match": "^4.0.2" } }, "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ=="],

    "glob/minimatch/brace-expansion": ["brace-expansion@2.1.7", "", { "dependencies": { "balanced-match": "^1.0.0" } }, "sha512-uZbew1NqdmPDTMJ8ah1y+b+9QEJrfkXFk3RcTQw3X0jW/xRUvFKsg1CfQdSYGdTbXZWExtU3J3ccxtnfw1Fi0g=="],

    "string-width/strip-ansi/ansi-regex": ["ansi-regex@6.4.0", "", {}, "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw=="],

    "wrap-ansi-cjs/string-width/emoji-regex": ["emoji-regex@8.0.0", "", {}, "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="],

    "wrap-ansi/strip-ansi/ansi-regex": ["ansi-regex@6.4.0", "", {}, "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw=="],

    "@typescript-eslint/typescript-estree/minimatch/brace-expansion/balanced-match": ["balanced-match@4.0.4", "", {}, "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA=="],
  }
}

```

### `codebase.md`

```
# Codebase

## File Tree

```
```

## File Contents

### `.env.example`

```
# No environment variables required.
# SportyBet's public API endpoints are used directly.

```

### `.eslintrc.json`

```json
{
  "extends": "next/core-web-vitals"
}

```

### `.gitignore`

```
# Dependencies
node_modules/
bun.lock
package-lock.json
pnpm-lock.yaml
yarn.lock

# Build output
.next/
out/
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env*.local

# Runtime data
*.log
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# OS files
.DS_Store
Thumbs.db

# Editor / IDE
.vscode/
.idea/
*.swp
*.swo
*~

```

### `README.md`

```
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

```

### `bun.lock`

```text
{
  "lockfileVersion": 2,
  "configVersion": 1,
  "workspaces": {
    "": {
      "name": "slip-generator",
      "dependencies": {
        "clsx": "^2.1.1",
        "lucide-react": "^0.475.0",
        "next": "14.2.24",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "tailwind-merge": "^2.6.0",
      },
      "devDependencies": {
        "@types/node": "^20.17.19",
        "@types/react": "^18.3.18",
        "@types/react-dom": "^18.3.5",
        "autoprefixer": "^10.4.20",
        "eslint": "^8.57.1",
        "eslint-config-next": "14.2.24",
        "postcss": "^8.4.49",
        "tailwindcss": "^3.4.17",
        "typescript": "^5.7.3",
      },
    },
  },
  "packages": {
    "@alloc/quick-lru": ["@alloc/quick-lru@5.3.0", "", {}, "sha512-U4+70Pc5ZS9osnCBCE5Jha/ciHM+Yp+CNMNC/7HvYbNRk1Ldd+f7qO65W5qfhu/TCv+/ozljlXXe9Nj8419DMA=="],

    "@emnapi/core": ["@emnapi/core@1.10.0", "", { "dependencies": { "@emnapi/wasi-threads": "1.2.1", "tslib": "^2.4.0" } }, "sha512-yq6OkJ4p82CAfPl0u9mQebQHKPJkY7WrIuk205cTYnYe+k2Z8YBh11FrbRG/H6ihirqcacOgl2BIO8oyMQLeXw=="],

    "@emnapi/runtime": ["@emnapi/runtime@1.10.0", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-ewvYlk86xUoGI0zQRNq/mC+16R1QeDlKQy21Ki3oSYXNgLb45GV1P6A0M+/s6nyCuNDqe5VpaY84BzXGwVbwFA=="],

    "@emnapi/wasi-threads": ["@emnapi/wasi-threads@1.2.1", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-uTII7OYF+/Mes/MrcIOYp5yOtSMLBWSIoLPpcgwipoiKbli6k322tcoFsxoIIxPDqW01SQGAgko4EzZi2BNv2w=="],

    "@eslint-community/eslint-utils": ["@eslint-community/eslint-utils@4.10.1", "", { "dependencies": { "eslint-visitor-keys": "^3.4.3" }, "peerDependencies": { "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0" } }, "sha512-cuadcxVFE8sDK6iWJbs8Sn0av2Nrh2QSGQhVlBW9AaAHqHwjWsZHT8LJ4hFGPh7ASBV2deFdM7H/DPjulmh8rg=="],

    "@eslint-community/regexpp": ["@eslint-community/regexpp@4.12.2", "", {}, "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew=="],

    "@eslint/eslintrc": ["@eslint/eslintrc@2.1.4", "", { "dependencies": { "ajv": "^6.12.4", "debug": "^4.3.2", "espree": "^9.6.0", "globals": "^13.19.0", "ignore": "^5.2.0", "import-fresh": "^3.2.1", "js-yaml": "^4.1.0", "minimatch": "^3.1.2", "strip-json-comments": "^3.1.1" } }, "sha512-269Z39MS6wVJtsoUl10L60WdkhJVdPG24Q4eZTH3nnF6lpvSShEK3wQjDX9JRWAUPvPh7COouPpU9IrqaZFvtQ=="],

    "@eslint/js": ["@eslint/js@8.57.1", "", {}, "sha512-d9zaMRSTIKDLhctzH12MtXvJKSSUhaHcjV+2Z+GK+EEY7XKpP5yR4x+N3TAcHTcu963nIr+TMcCb4DBCYX1z6Q=="],

    "@humanwhocodes/config-array": ["@humanwhocodes/config-array@0.13.0", "", { "dependencies": { "@humanwhocodes/object-schema": "^2.0.3", "debug": "^4.3.1", "minimatch": "^3.0.5" } }, "sha512-DZLEEqFWQFiyK6h5YIeynKx7JlvCYWL0cImfSRXZ9l4Sg2efkFGTuFf6vzXjK1cq6IYkU+Eg/JizXw+TD2vRNw=="],

    "@humanwhocodes/module-importer": ["@humanwhocodes/module-importer@1.0.1", "", {}, "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA=="],

    "@humanwhocodes/object-schema": ["@humanwhocodes/object-schema@2.0.3", "", {}, "sha512-93zYdMES/c1D69yZiKDBj0V24vqNzB/koF26KPaagAfd3P/4gUlh3Dys5ogAK+Exi9QyzlD8x/08Zt7wIKcDcA=="],

    "@isaacs/cliui": ["@isaacs/cliui@8.0.2", "", { "dependencies": { "string-width": "^5.1.2", "string-width-cjs": "npm:string-width@^4.2.0", "strip-ansi": "^7.0.1", "strip-ansi-cjs": "npm:strip-ansi@^6.0.1", "wrap-ansi": "^8.1.0", "wrap-ansi-cjs": "npm:wrap-ansi@^7.0.0" } }, "sha512-O8jcjabXaleOG9DQ0+ARXWZBTfnP4WNAqzuiJK7ll44AmxGKv/J2M4TPjxjY3znBCfvBXFzucm1twdyFybFqEA=="],

    "@jridgewell/gen-mapping": ["@jridgewell/gen-mapping@0.3.13", "", { "dependencies": { "@jridgewell/sourcemap-codec": "^1.5.0", "@jridgewell/trace-mapping": "^0.3.24" } }, "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA=="],

    "@jridgewell/resolve-uri": ["@jridgewell/resolve-uri@3.1.2", "", {}, "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw=="],

    "@jridgewell/sourcemap-codec": ["@jridgewell/sourcemap-codec@1.6.0", "", {}, "sha512-T7jf+5zgsZHwNJ4lvQ7/aezbyk0nNX+zJVWpmHA7VYsEx7a7qr5Rg5IbtJFqkgze5Y2sruq1RUY8Q837Od7iFw=="],

    "@jridgewell/trace-mapping": ["@jridgewell/trace-mapping@0.3.31", "", { "dependencies": { "@jridgewell/resolve-uri": "^3.1.0", "@jridgewell/sourcemap-codec": "^1.4.14" } }, "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw=="],

    "@napi-rs/wasm-runtime": ["@napi-rs/wasm-runtime@1.2.4", "", { "dependencies": { "@tybys/wasm-util": "^0.10.3" }, "peerDependencies": { "@emnapi/core": "^1.7.1 || ^2.0.0-alpha.4", "@emnapi/runtime": "^1.7.1 || ^2.0.0-alpha.4" } }, "sha512-AJxoUD2/15ESHbvpcyjU274nsAPLuOtPHCk0vKJM5pj//Fg/B1FXNWjPnXTT9PymCYYiHo4zPj0ZomXBKhoy7g=="],

    "@next/env": ["@next/env@14.2.24", "", {}, "sha512-LAm0Is2KHTNT6IT16lxT+suD0u+VVfYNQqM+EJTKuFRRuY2z+zj01kueWXPCxbMBDt0B5vONYzabHGUNbZYAhA=="],

    "@next/eslint-plugin-next": ["@next/eslint-plugin-next@14.2.24", "", { "dependencies": { "glob": "10.3.10" } }, "sha512-FDL3qs+5DML0AJz56DCVr+KnFYivxeAX73En8QbPw9GjJZ6zbfvqDy+HrarHFzbsIASn7y8y5ySJ/lllSruNVQ=="],

    "@next/swc-darwin-arm64": ["@next/swc-darwin-arm64@14.2.24", "", { "os": "darwin", "cpu": "arm64" }, "sha512-7Tdi13aojnAZGpapVU6meVSpNzgrFwZ8joDcNS8cJVNuP3zqqrLqeory9Xec5TJZR/stsGJdfwo8KeyloT3+rQ=="],

    "@next/swc-darwin-x64": ["@next/swc-darwin-x64@14.2.24", "", { "os": "darwin", "cpu": "x64" }, "sha512-lXR2WQqUtu69l5JMdTwSvQUkdqAhEWOqJEYUQ21QczQsAlNOW2kWZCucA6b3EXmPbcvmHB1kSZDua/713d52xg=="],

    "@next/swc-linux-arm64-gnu": ["@next/swc-linux-arm64-gnu@14.2.24", "", { "os": "linux", "cpu": "arm64" }, "sha512-nxvJgWOpSNmzidYvvGDfXwxkijb6hL9+cjZx1PVG6urr2h2jUqBALkKjT7kpfurRWicK6hFOvarmaWsINT1hnA=="],

    "@next/swc-linux-arm64-musl": ["@next/swc-linux-arm64-musl@14.2.24", "", { "os": "linux", "cpu": "arm64" }, "sha512-PaBgOPhqa4Abxa3y/P92F3kklNPsiFjcjldQGT7kFmiY5nuFn8ClBEoX8GIpqU1ODP2y8P6hio6vTomx2Vy0UQ=="],

    "@next/swc-linux-x64-gnu": ["@next/swc-linux-x64-gnu@14.2.24", "", { "os": "linux", "cpu": "x64" }, "sha512-vEbyadiRI7GOr94hd2AB15LFVgcJZQWu7Cdi9cWjCMeCiUsHWA0U5BkGPuoYRnTxTn0HacuMb9NeAmStfBCLoQ=="],

    "@next/swc-linux-x64-musl": ["@next/swc-linux-x64-musl@14.2.24", "", { "os": "linux", "cpu": "x64" }, "sha512-df0FC9ptaYsd8nQCINCzFtDWtko8PNRTAU0/+d7hy47E0oC17tI54U/0NdGk7l/76jz1J377dvRjmt6IUdkpzQ=="],

    "@next/swc-win32-arm64-msvc": ["@next/swc-win32-arm64-msvc@14.2.24", "", { "os": "win32", "cpu": "arm64" }, "sha512-ZEntbLjeYAJ286eAqbxpZHhDFYpYjArotQ+/TW9j7UROh0DUmX7wYDGtsTPpfCV8V+UoqHBPU7q9D4nDNH014Q=="],

    "@next/swc-win32-ia32-msvc": ["@next/swc-win32-ia32-msvc@14.2.24", "", { "os": "win32", "cpu": "ia32" }, "sha512-9KuS+XUXM3T6v7leeWU0erpJ6NsFIwiTFD5nzNg8J5uo/DMIPvCp3L1Ao5HjbHX0gkWPB1VrKoo/Il4F0cGK2Q=="],

    "@next/swc-win32-x64-msvc": ["@next/swc-win32-x64-msvc@14.2.24", "", { "os": "win32", "cpu": "x64" }, "sha512-cXcJ2+x0fXQ2CntaE00d7uUH+u1Bfp/E0HsNQH79YiLaZE5Rbm7dZzyAYccn3uICM7mw+DxoMqEfGXZtF4Fgaw=="],

    "@nodelib/fs.scandir": ["@nodelib/fs.scandir@2.1.5", "", { "dependencies": { "@nodelib/fs.stat": "2.0.5", "run-parallel": "^1.1.9" } }, "sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g=="],

    "@nodelib/fs.stat": ["@nodelib/fs.stat@2.0.5", "", {}, "sha512-RkhPPp2zrqDAQA/2jNhnztcPAlv64XdhIp7a7454A5ovI7Bukxgt7MX7udwAu3zg1DcpPU0rz3VV1SeaqvY4+A=="],

    "@nodelib/fs.walk": ["@nodelib/fs.walk@1.2.8", "", { "dependencies": { "@nodelib/fs.scandir": "2.1.5", "fastq": "^1.6.0" } }, "sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg=="],

    "@nolyfill/is-core-module": ["@nolyfill/is-core-module@1.0.39", "", {}, "sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA=="],

    "@pkgjs/parseargs": ["@pkgjs/parseargs@0.11.0", "", {}, "sha512-+1VkjdD0QBLPodGrJUeqarH8VAIvQODIbwh9XpP5Syisf7YoQgsJKPNFoqqLQlu+VQ/tVSshMR6loPMn8U+dPg=="],

    "@rtsao/scc": ["@rtsao/scc@1.1.0", "", {}, "sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g=="],

    "@rushstack/eslint-patch": ["@rushstack/eslint-patch@1.16.1", "", {}, "sha512-TvZbIpeKqGQQ7X0zSCvPH9riMSFQFSggnfBjFZ1mEoILW+UuXCKwOoPcgjMwiUtRqFZ8jWhPJc4um14vC6I4ag=="],

    "@swc/counter": ["@swc/counter@0.1.3", "", {}, "sha512-e2BR4lsJkkRlKZ/qCHPw9ZaSxc0MVUd7gtbtaB7aMvHeJVYe8sOB8DBZkP2DtISHGSku9sCK6T6cnY0CtXrOCQ=="],

    "@swc/helpers": ["@swc/helpers@0.5.5", "", { "dependencies": { "@swc/counter": "^0.1.3", "tslib": "^2.4.0" } }, "sha512-KGYxvIOXcceOAbEk4bi/dVLEK9z8sZ0uBB3Il5b1rhfClSpcX0yfRO0KmTkqR2cnQDymwLB+25ZyMzICg/cm/A=="],

    "@tybys/wasm-util": ["@tybys/wasm-util@0.10.4", "", { "dependencies": { "tslib": "^2.4.0" } }, "sha512-W3c4gRigFS0T/Ma4qIYF3GDAc5AQdHb1yL5znJT1Zv1YaD9Kitx656wBjvr19qbiosmZT8lWDM5BEMynUqX65A=="],

    "@types/json5": ["@types/json5@0.0.29", "", {}, "sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ=="],

    "@types/node": ["@types/node@20.19.43", "", { "dependencies": { "undici-types": "~6.21.0" } }, "sha512-6oYBAi5ikg4Pl+kGsoYtawUMBT2zZMCvPNF7pVLnHZfd1zf38DRiWn/gT01RYCdUqkv7Fhr+C9ot4/tb+2sVvA=="],

    "@types/prop-types": ["@types/prop-types@15.7.15", "", {}, "sha512-F6bEyamV9jKGAFBEmlQnesRPGOQqS2+Uwi0Em15xenOxHaf2hv6L8YCVn3rPdPJOiJfPiCnLIRyvwVaqMY3MIw=="],

    "@types/react": ["@types/react@18.3.31", "", { "dependencies": { "@types/prop-types": "*", "csstype": "^3.2.2" } }, "sha512-vfEqpXTvwT91yhmwdfouStN2hSKwTvyRs8qpLfADyrq/kxDw0hZM7Wk9Ug1FELj8hIby+S/+kQCSRFF32nv2Qw=="],

    "@types/react-dom": ["@types/react-dom@18.3.7", "", { "peerDependencies": { "@types/react": "^18.0.0" } }, "sha512-MEe3UeoENYVFXzoXEWsvcpg6ZvlrFNlOQ7EOsvhI3CfAXwzPfO8Qwuxd40nepsYKqyyVQnTdEfv68q91yLcKrQ=="],

    "@typescript-eslint/eslint-plugin": ["@typescript-eslint/eslint-plugin@8.71.0", "", { "dependencies": { "@eslint-community/regexpp": "^4.12.2", "@typescript-eslint/scope-manager": "8.71.0", "@typescript-eslint/type-utils": "8.71.0", "@typescript-eslint/utils": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0", "ignore": "^7.0.5", "natural-compare": "^1.4.0", "ts-api-utils": "^2.5.0" }, "peerDependencies": { "@typescript-eslint/parser": "^8.71.0", "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-pqcS9c1HxZTHt7End4nXqd0s5lJrrFzrgCkKFJrsbUnaL6M3+6oBFZaslg6Gjsl3argl2DDRFROnXARaZ2e4Nw=="],

    "@typescript-eslint/parser": ["@typescript-eslint/parser@8.71.0", "", { "dependencies": { "@typescript-eslint/scope-manager": "8.71.0", "@typescript-eslint/types": "8.71.0", "@typescript-eslint/typescript-estree": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0", "debug": "^4.4.3" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-CG4nPk1f2zc8yw4pALqHsFYH2hdo+h1T9daSp21+Hnxi9LOE3GT9hAfTKJCBXVNM2GmYs1eMEP615wPoeOgk3A=="],

    "@typescript-eslint/project-service": ["@typescript-eslint/project-service@8.71.0", "", { "dependencies": { "@typescript-eslint/tsconfig-utils": "^8.71.0", "@typescript-eslint/types": "^8.71.0", "debug": "^4.4.3" }, "peerDependencies": { "typescript": ">=4.8.4 <6.1.0" } }, "sha512-aABjw5rjBacYONVPaPiWOCjJu0vEF4a25iQuodlmQYL1trtLZ0X/y+2Vzl3BKI1odM4LnwLE1oUDXYp1wzx1TQ=="],

    "@typescript-eslint/scope-manager": ["@typescript-eslint/scope-manager@8.71.0", "", { "dependencies": { "@typescript-eslint/types": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0" } }, "sha512-gWF0BhUcnjZxSpLE8ngS/59n2SB0J3YqRxvX1+2aoRJk9hNtHSLOV+TcarFiOr5ipXm3yc1QrI4c9YZc8zyCxw=="],

    "@typescript-eslint/tsconfig-utils": ["@typescript-eslint/tsconfig-utils@8.71.0", "", { "peerDependencies": { "typescript": ">=4.8.4 <6.1.0" } }, "sha512-Z1UlWHADEK2Mlb9NpWfDeSjqoZ5EyrOv4R3eQpbkzqn/EwaIdOpXXupEA1+0ZIOSJSZZDBHG0BrQyN8zUG6Pwg=="],

    "@typescript-eslint/type-utils": ["@typescript-eslint/type-utils@8.71.0", "", { "dependencies": { "@typescript-eslint/types": "8.71.0", "@typescript-eslint/typescript-estree": "8.71.0", "@typescript-eslint/utils": "8.71.0", "debug": "^4.4.3", "ts-api-utils": "^2.5.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-i8uO1qbdxeKgRnS5sCRt6On3/nfo2d2DwQe3Yvjx543zLy7r8ySqRuPPiIIXAhS03U0v5NfAFx+rUgxFzKKwNw=="],

    "@typescript-eslint/types": ["@typescript-eslint/types@8.71.0", "", {}, "sha512-cJ4OoxPGWvFnBTnSZyaU+qJzGTqPTGJY+gDchj6cRyLRdmIdt4rcsE4twj+zPfrNiWuVi38wijHzShL++Z9atQ=="],

    "@typescript-eslint/typescript-estree": ["@typescript-eslint/typescript-estree@8.71.0", "", { "dependencies": { "@typescript-eslint/project-service": "8.71.0", "@typescript-eslint/tsconfig-utils": "8.71.0", "@typescript-eslint/types": "8.71.0", "@typescript-eslint/visitor-keys": "8.71.0", "debug": "^4.4.3", "minimatch": "^10.2.2", "semver": "^7.7.3", "tinyglobby": "^0.2.15", "ts-api-utils": "^2.5.0" }, "peerDependencies": { "typescript": ">=4.8.4 <6.1.0" } }, "sha512-PEEF4G5sLLWAS5BpPrUvms4ySZkiBQQZM4z+3ReI46axK5Vqr/vXBQatJQIZZOYdGyPUAKTtsrWzpqKuU+3DEw=="],

    "@typescript-eslint/utils": ["@typescript-eslint/utils@8.71.0", "", { "dependencies": { "@eslint-community/eslint-utils": "^4.9.1", "@typescript-eslint/scope-manager": "8.71.0", "@typescript-eslint/types": "8.71.0", "@typescript-eslint/typescript-estree": "8.71.0" }, "peerDependencies": { "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0", "typescript": ">=4.8.4 <6.1.0" } }, "sha512-pKR/tEMVrXZG23UFKUn5BQf3zfmfk7KQceI2cGzywZ5nxM5Eu3hEJU1utjWzydtzBbcJAQhHN8iPCxobHpPcZQ=="],

    "@typescript-eslint/visitor-keys": ["@typescript-eslint/visitor-keys@8.71.0", "", { "dependencies": { "@typescript-eslint/types": "8.71.0", "eslint-visitor-keys": "^5.0.0" } }, "sha512-8eQ9R218XORK+KLosnf4bu/QsUXvUyVwTbArg7/0NMB1Pu87OJKvj4nhFblkYE8gQV73mW1dx1ptlPCkwRGa7A=="],

    "@ungap/structured-clone": ["@ungap/structured-clone@1.4.0", "", {}, "sha512-1mEZtMKPM09vDmQt5y7YvmN2+DFTP7Tg0EWXdic8/C6VRnpb33e4ghisCIE3WZjsE2N8mf+QV1Zqh7ZFYLWInQ=="],

    "@unrs/resolver-binding-android-arm-eabi": ["@unrs/resolver-binding-android-arm-eabi@1.12.2", "", { "os": "android", "cpu": "arm" }, "sha512-g5T90pqg1bo/7mytQx6F4iBNC0Wsh9cu+z9veDbFjc7HjpesJFWD7QMS0NGStXM075+7dJPPVvBbpZlnrdpi/w=="],

    "@unrs/resolver-binding-android-arm64": ["@unrs/resolver-binding-android-arm64@1.12.2", "", { "os": "android", "cpu": "arm64" }, "sha512-YGCRZv/9GLhwmz6mYDeTsm/92BAyR28l6c2ReweVW5pWgfsitWLY8upvfRlGdoyD8HjeTHSYJWyZGD4KJA/nFQ=="],

    "@unrs/resolver-binding-darwin-arm64": ["@unrs/resolver-binding-darwin-arm64@1.12.2", "", { "os": "darwin", "cpu": "arm64" }, "sha512-u9DiNT1auQMO20A9SyTuG3wUgQWB9Z7KjAg0uFuCDR1FsAY8A0CG2S6JpHS1xwm/w1G08bjXZDcyOCjv1WAm2w=="],

    "@unrs/resolver-binding-darwin-x64": ["@unrs/resolver-binding-darwin-x64@1.12.2", "", { "os": "darwin", "cpu": "x64" }, "sha512-f7rPLi/T1HVKZu/u6t87lroib16n8vrSzcyxI7lg4BGO9UF26KhQL44sd9eOUgrTYhvRXtWOIZT5PejdPyJfUA=="],

    "@unrs/resolver-binding-freebsd-x64": ["@unrs/resolver-binding-freebsd-x64@1.12.2", "", { "os": "freebsd", "cpu": "x64" }, "sha512-BpcOjWCJub6nRZUS2zA20pmLvjtqAtGejETaIyRLiZiQf++cbrjltLA5NN/xaXfqeOBOSlMFbemIl5/S5tljmg=="],

    "@unrs/resolver-binding-linux-arm-gnueabihf": ["@unrs/resolver-binding-linux-arm-gnueabihf@1.12.2", "", { "os": "linux", "cpu": "arm" }, "sha512-vZTDvdSISZjJx66OzJqtsOhzifbqRjbmI1Mnu49fQDwog5GtDI4QidRiEAYbZCRj9C8YZEW+3ZjqsyS9GR4k2A=="],

    "@unrs/resolver-binding-linux-arm-musleabihf": ["@unrs/resolver-binding-linux-arm-musleabihf@1.12.2", "", { "os": "linux", "cpu": "arm" }, "sha512-BiPI+IrIlwcW4nLLMM21+B1dFPzd55yAVgVGrdgDjNef+ch03GdxrcyaIz8X9SsQirh/kCQ7mviyWlMxdh2D7g=="],

    "@unrs/resolver-binding-linux-arm64-gnu": ["@unrs/resolver-binding-linux-arm64-gnu@1.12.2", "", { "os": "linux", "cpu": "arm64" }, "sha512-zJc0H99FEPoFfSrNpa91HYfxzfAJCr502oxNK1cfdC9hlaFI43RT+JFCann9JUgZmLzzntChHyn13Sgn9ljHNg=="],

    "@unrs/resolver-binding-linux-arm64-musl": ["@unrs/resolver-binding-linux-arm64-musl@1.12.2", "", { "os": "linux", "cpu": "arm64" }, "sha512-KQ3Lki6l+Pz1k/eBipN41ES+YUK30beLGb9YqcB1O542cyLCNE6GaxrfcY3T6EezmGGk84wb5XyO9loTM9tkcA=="],

    "@unrs/resolver-binding-linux-loong64-gnu": ["@unrs/resolver-binding-linux-loong64-gnu@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-3SJGEh1DborhG6pyxvhPzCT4bbSIVihsvgJc13P1bHG7KLdNDaF9T3gsTwFc7Jw/5Y5/iWOjkEx7Zy0NvCGX3Q=="],

    "@unrs/resolver-binding-linux-loong64-musl": ["@unrs/resolver-binding-linux-loong64-musl@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-jiuG/Obbel7uw1PwHNFfrkiKhLAF6mnyZ6aWlOAVN9WqKm8v0OFGnciJIHu8+CMvXLQ8AD51LPzAoUfT21D5Ew=="],

    "@unrs/resolver-binding-linux-ppc64-gnu": ["@unrs/resolver-binding-linux-ppc64-gnu@1.12.2", "", { "os": "linux", "cpu": "ppc64" }, "sha512-q7xRvVpmcfeL+LlZg8Pbbo6QaTZwDU5BaGZbwfhkEsXJn3Was8xYfE0RBH266xZt0rM6B7i8xAYIvjthuUIWHg=="],

    "@unrs/resolver-binding-linux-riscv64-gnu": ["@unrs/resolver-binding-linux-riscv64-gnu@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-0CVdx6lcnT3Q9inOH8tsMIOJ6ImndllMjqJHg8RLVdB7Vq4SfkEXl9mCSsVNuNA4MCYycRicCUxPCabVHJRr6A=="],

    "@unrs/resolver-binding-linux-riscv64-musl": ["@unrs/resolver-binding-linux-riscv64-musl@1.12.2", "", { "os": "linux", "cpu": "none" }, "sha512-iOwlRo9vnp6R6ohHQS11n0NnfdXx/omhkocmIfaPRpQhKZ+3BDMkkdRVh53qjkFkpPddf+FETA28NwGN7l5l+w=="],

    "@unrs/resolver-binding-linux-s390x-gnu": ["@unrs/resolver-binding-linux-s390x-gnu@1.12.2", "", { "os": "linux", "cpu": "s390x" }, "sha512-HYJtLfXq94q8iZNFT1lknx258wlkkWhZeUXJRqzKBBUJ00CvZ+N33zgbCqimLjsyw5Va6uUxhVa12mI+kaveEw=="],

    "@unrs/resolver-binding-linux-x64-gnu": ["@unrs/resolver-binding-linux-x64-gnu@1.12.2", "", { "os": "linux", "cpu": "x64" }, "sha512-mPsUhunKKDih5O96Y6enDQyHc1SqBPlY1E/SfMWDM3EdJ95Z9CArPeCVwCCqbP45ljvivdEk8Fxn+SIb1rDAJQ=="],

    "@unrs/resolver-binding-linux-x64-musl": ["@unrs/resolver-binding-linux-x64-musl@1.12.2", "", { "os": "linux", "cpu": "x64" }, "sha512-azrt6+5ydLd8Vt210AAFis/lZevSfPw93EJRIJG+xPu4WCJ8K0kppCTpMyLPcKT7H15M4Jnt2tMp5bOvCkRC6A=="],

    "@unrs/resolver-binding-openharmony-arm64": ["@unrs/resolver-binding-openharmony-arm64@1.12.2", "", { "os": "none", "cpu": "arm64" }, "sha512-YZ9hP4O0X9PQb8eO980qmLNGH4zT3I9+SZTdt0Pr0YyuGQhYKoOZkV02VzrzyOZJ5xIJ3UFIenKkUkGg8GjgWQ=="],

    "@unrs/resolver-binding-wasm32-wasi": ["@unrs/resolver-binding-wasm32-wasi@1.12.2", "", { "dependencies": { "@emnapi/core": "1.10.0", "@emnapi/runtime": "1.10.0", "@napi-rs/wasm-runtime": "^1.1.4" }, "cpu": "none" }, "sha512-tYFDIkMxSflfEc/h92ZWNsZlHSwgimbNHSO3PL2JWQHfCuC2q316jMyYU9TIWZsFK2bQwyK5VAdYgn8ygPj69A=="],

    "@unrs/resolver-binding-win32-arm64-msvc": ["@unrs/resolver-binding-win32-arm64-msvc@1.12.2", "", { "os": "win32", "cpu": "arm64" }, "sha512-qzNyg3xL0VPQmCaUh+N5jSitce6k+uCBfMDesWRnlULOZaqUkaJ0ybdT+UqlAWJoQjuqfIU/0Ptx9bteN4D82g=="],

    "@unrs/resolver-binding-win32-ia32-msvc": ["@unrs/resolver-binding-win32-ia32-msvc@1.12.2", "", { "os": "win32", "cpu": "ia32" }, "sha512-WD9sY00OfpHVGfsnHZoA8jVT+esS/Bg8z8jzxp5BnDCjjwsuKsPQrzswwpFy4J1AUJbXPRfkpcX0mXrzeXW79g=="],

    "@unrs/resolver-binding-win32-x64-msvc": ["@unrs/resolver-binding-win32-x64-msvc@1.12.2", "", { "os": "win32", "cpu": "x64" }, "sha512-nAB74NfSNKknqQ1RrYj6uz8FcXEomu/MATJZxh/x+BArzN2U3JbOYC0APYzUIGhVY3m5hRxA8VPNdPBoG8txlA=="],

    "acorn": ["acorn@8.18.0", "", { "bin": { "acorn": "bin/acorn" } }, "sha512-lGq+9yr1/GuAWaVYIHRjvvySG5/4VfKIvC8EWxStPdcDh/Ka7FG3twP6v4d5BkravUilhIAsG4Qj83t02LWUPQ=="],

    "acorn-jsx": ["acorn-jsx@5.3.2", "", { "peerDependencies": { "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0" } }, "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ=="],

    "ajv": ["ajv@6.15.0", "", { "dependencies": { "fast-deep-equal": "^3.1.1", "fast-json-stable-stringify": "^2.0.0", "json-schema-traverse": "^0.4.1", "uri-js": "^4.2.2" } }, "sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw=="],

    "ansi-regex": ["ansi-regex@5.0.1", "", {}, "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ=="],

    "ansi-styles": ["ansi-styles@4.3.0", "", { "dependencies": { "color-convert": "^2.0.1" } }, "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg=="],

    "any-promise": ["any-promise@1.3.0", "", {}, "sha512-7UvmKalWRt1wgjL1RrGxoSJW/0QZFIegpeGvZG9kjp8vrRu55XTHbwnqq2GpXm9uLbcuhxm3IqX9OB4MZR1b2A=="],

    "anymatch": ["anymatch@3.1.3", "", { "dependencies": { "normalize-path": "^3.0.0", "picomatch": "^2.0.4" } }, "sha512-KMReFUr0B4t+D+OBkjR3KYqvocp2XaSzO55UcB6mgQMd3KbcE+mWTyvVV7D/zsdEbNnV6acZUutkiHQXvTr1Rw=="],

    "arg": ["arg@5.0.2", "", {}, "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg=="],

    "argparse": ["argparse@2.0.1", "", {}, "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q=="],

    "aria-query": ["aria-query@5.3.2", "", {}, "sha512-COROpnaoap1E2F000S62r6A60uHZnmlvomhfyT2DlTcrY1OrBKn2UhH7qn5wTC9zMvD0AY7csdPSNwKP+7WiQw=="],

    "array-buffer-byte-length": ["array-buffer-byte-length@1.0.2", "", { "dependencies": { "call-bound": "^1.0.3", "is-array-buffer": "^3.0.5" } }, "sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw=="],

    "array-includes": ["array-includes@3.2.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-object-atoms": "^1.1.2", "es-shim-unscopables": "^1.1.0", "is-string": "^1.1.1", "math-intrinsics": "^1.1.0" } }, "sha512-VXY5eFRarnXcYxwBjJzPmEhH55+rmP79/+ueDhi0F+TuqfHCItagIHqxeUZrmgrOPa31QTh9H85DjX3FfJ0FTg=="],

    "array.prototype.findlast": ["array.prototype.findlast@1.2.5", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.2", "es-errors": "^1.3.0", "es-object-atoms": "^1.0.0", "es-shim-unscopables": "^1.0.2" } }, "sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ=="],

    "array.prototype.findlastindex": ["array.prototype.findlastindex@1.2.6", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.23.9", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "es-shim-unscopables": "^1.1.0" } }, "sha512-F/TKATkzseUExPlfvmwQKGITM3DGTK+vkAsCZoDc5daVygbJBnjEUCbgkAvVFsgfXfX4YIqZ/27G3k3tdXrTxQ=="],

    "array.prototype.flat": ["array.prototype.flat@1.3.3", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.5", "es-shim-unscopables": "^1.0.2" } }, "sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg=="],

    "array.prototype.flatmap": ["array.prototype.flatmap@1.3.3", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.5", "es-shim-unscopables": "^1.0.2" } }, "sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg=="],

    "array.prototype.tosorted": ["array.prototype.tosorted@1.1.4", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.3", "es-errors": "^1.3.0", "es-shim-unscopables": "^1.0.2" } }, "sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA=="],

    "arraybuffer.prototype.slice": ["arraybuffer.prototype.slice@1.0.4", "", { "dependencies": { "array-buffer-byte-length": "^1.0.1", "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.5", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6", "is-array-buffer": "^3.0.4" } }, "sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ=="],

    "ast-types-flow": ["ast-types-flow@0.0.8", "", {}, "sha512-OH/2E5Fg20h2aPrbe+QL8JZQFko0YZaF+j4mnQ7BGhfavO7OpSLa8a0y9sBwomHdSbkhTS8TQNayBfnW5DwbvQ=="],

    "async-function": ["async-function@1.0.0", "", {}, "sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA=="],

    "autoprefixer": ["autoprefixer@10.6.1", "", { "dependencies": { "browserslist": "^4.28.9", "caniuse-lite": "^1.0.30001810", "fraction.js": "^5.3.4", "picocolors": "^1.1.1", "postcss-value-parser": "^4.2.0" }, "peerDependencies": { "postcss": "^8.1.0" }, "bin": { "autoprefixer": "bin/autoprefixer" } }, "sha512-cL1Qz6ADZhcEbny/8HPfe99J6HhNoYtpX2LFLIbhgGE7Q1hlQVkYFdetDN7Id3KiQxhDrHwzlHr/YQCnZ8+xSA=="],

    "available-typed-arrays": ["available-typed-arrays@1.0.7", "", { "dependencies": { "possible-typed-array-names": "^1.0.0" } }, "sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ=="],

    "axe-core": ["axe-core@4.13.0", "", {}, "sha512-UzGt8zg7Ny8djbYMhxl2zuEevVa7r2gJjYY5Lwr1xM7+XU2nd6CkIWFTVcCIbAP63vSz71NaVyyuSk9lHKcy0A=="],

    "axobject-query": ["axobject-query@4.1.0", "", {}, "sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ=="],

    "balanced-match": ["balanced-match@1.0.2", "", {}, "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw=="],

    "baseline-browser-mapping": ["baseline-browser-mapping@2.11.26", "", { "bin": { "baseline-browser-mapping": "dist/cli.cjs" } }, "sha512-GLQdD3y6UF8iVuMJl5fHgE4jdn/ua7n+toKfLgNlg3BqQtOZjpy68T8Tup8/wGWZCDlm7KMg7tPb4MPn7oN0TQ=="],

    "binary-extensions": ["binary-extensions@2.3.0", "", {}, "sha512-Ceh+7ox5qe7LJuLHoY0feh3pHuUDHAcRUeyL2VYghZwfpkNIy/+8Ocg0a3UuSoYzavmylwuLWQOf3hl0jjMMIw=="],

    "brace-expansion": ["brace-expansion@1.1.21", "", { "dependencies": { "balanced-match": "^1.0.0", "concat-map": "0.0.1" } }, "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw=="],

    "braces": ["braces@3.0.3", "", { "dependencies": { "fill-range": "^7.1.1" } }, "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA=="],

    "browserslist": ["browserslist@4.29.3", "", { "dependencies": { "baseline-browser-mapping": "^2.11.26", "caniuse-lite": "^1.0.30001813", "electron-to-chromium": "^1.5.439", "node-releases": "^2.0.57", "update-browserslist-db": "^1.3.3" }, "bin": { "browserslist": "cli.js" } }, "sha512-1R4kiYKXGViqEN0CnoDrXc1StD9niAwu+j2dukWzrD4bJgsD4lDmEp0CRbc6E/vYJIfTHwPmwyaKtVSudICdPA=="],

    "busboy": ["busboy@1.6.0", "", { "dependencies": { "streamsearch": "^1.1.0" } }, "sha512-8SFQbg/0hQ9xy3UNTB0YEnsNBbWfhf7RtnzpL7TkBiTBRfrQ9Fxcnz7VJsleJpyp6rVLvXiuORqjlHi5q+PYuA=="],

    "call-bind": ["call-bind@1.0.9", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "es-define-property": "^1.0.1", "get-intrinsic": "^1.3.0", "set-function-length": "^1.2.2" } }, "sha512-a/hy+pNsFUTR+Iz8TCJvXudKVLAnz/DyeSUo10I5yvFDQJBFU2s9uqQpoSrJlroHUKoKqzg+epxyP9lqFdzfBQ=="],

    "call-bind-apply-helpers": ["call-bind-apply-helpers@1.0.2", "", { "dependencies": { "es-errors": "^1.3.0", "function-bind": "^1.1.2" } }, "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ=="],

    "call-bound": ["call-bound@1.0.4", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "get-intrinsic": "^1.3.0" } }, "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg=="],

    "callsites": ["callsites@3.1.0", "", {}, "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ=="],

    "camelcase-css": ["camelcase-css@2.0.1", "", {}, "sha512-QOSvevhslijgYwRx6Rv7zKdMF8lbRmx+uQGx2+vDc+KI/eBnsy9kit5aj23AgGu3pa4t9AgwbnXWqS+iOY+2aA=="],

    "caniuse-lite": ["caniuse-lite@1.0.30001814", "", {}, "sha512-/Uaf1lAzr59XcMpW0o96WoEfr+VXK2OX4U9AgFoiSHsVJ4HppnIFUjtYzsyDH2+tgANaQb2/oxYGwCPapN1FpA=="],

    "chalk": ["chalk@4.1.2", "", { "dependencies": { "ansi-styles": "^4.1.0", "supports-color": "^7.1.0" } }, "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA=="],

    "chokidar": ["chokidar@3.6.0", "", { "dependencies": { "anymatch": "~3.1.2", "braces": "~3.0.2", "glob-parent": "~5.1.2", "is-binary-path": "~2.1.0", "is-glob": "~4.0.1", "normalize-path": "~3.0.0", "readdirp": "~3.6.0" }, "optionalDependencies": { "fsevents": "~2.3.2" } }, "sha512-7VT13fmjotKpGipCW9JEQAusEPE+Ei8nl6/g4FBAmIm0GOOLMua9NDDo/DWp0ZAxCr3cPq5ZpBqmPAQgDda2Pw=="],

    "client-only": ["client-only@0.0.1", "", {}, "sha512-IV3Ou0jSMzZrd3pZ48nLkT9DA7Ag1pnPzaiQhpW7c3RbcqqzvzzVu+L8gfqMp/8IM2MQtSiqaCxrrcfu8I8rMA=="],

    "clsx": ["clsx@2.1.1", "", {}, "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA=="],

    "color-convert": ["color-convert@2.0.1", "", { "dependencies": { "color-name": "~1.1.4" } }, "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ=="],

    "color-name": ["color-name@1.1.4", "", {}, "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA=="],

    "commander": ["commander@4.1.1", "", {}, "sha512-NOKm8xhkzAjzFx8B2v5OAHT+u5pRQc2UCa2Vq9jYL/31o2wi9mxBA7LIFs3sV5VSC49z6pEhfbMULvShKj26WA=="],

    "concat-map": ["concat-map@0.0.1", "", {}, "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg=="],

    "cross-spawn": ["cross-spawn@7.0.6", "", { "dependencies": { "path-key": "^3.1.0", "shebang-command": "^2.0.0", "which": "^2.0.1" } }, "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA=="],

    "cssesc": ["cssesc@3.0.0", "", { "bin": { "cssesc": "bin/cssesc" } }, "sha512-/Tb/JcjK111nNScGob5MNtsntNM1aCNUDipB/TkwZFhyDrrE47SOx/18wF2bbjgc3ZzCSKW1T5nt5EbFoAz/Vg=="],

    "csstype": ["csstype@3.2.3", "", {}, "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ=="],

    "damerau-levenshtein": ["damerau-levenshtein@1.0.8", "", {}, "sha512-sdQSFB7+llfUcQHUQO3+B8ERRj0Oa4w9POWMI/puGtuf7gFywGmkaLCElnudfTiKZV+NvHqL0ifzdrI8Ro7ESA=="],

    "data-view-buffer": ["data-view-buffer@1.0.2", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "is-data-view": "^1.0.2" } }, "sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ=="],

    "data-view-byte-length": ["data-view-byte-length@1.0.2", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "is-data-view": "^1.0.2" } }, "sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ=="],

    "data-view-byte-offset": ["data-view-byte-offset@1.0.1", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "is-data-view": "^1.0.1" } }, "sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ=="],

    "debug": ["debug@4.4.3", "", { "dependencies": { "ms": "^2.1.3" }, "peerDependencies": { "supports-color": "*" }, "optionalPeers": ["supports-color"] }, "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA=="],

    "deep-is": ["deep-is@0.1.4", "", {}, "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ=="],

    "define-data-property": ["define-data-property@1.1.4", "", { "dependencies": { "es-define-property": "^1.0.0", "es-errors": "^1.3.0", "gopd": "^1.0.1" } }, "sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A=="],

    "define-properties": ["define-properties@1.2.1", "", { "dependencies": { "define-data-property": "^1.0.1", "has-property-descriptors": "^1.0.0", "object-keys": "^1.1.1" } }, "sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg=="],

    "didyoumean": ["didyoumean@1.2.2", "", {}, "sha512-gxtyfqMg7GKyhQmb056K7M3xszy/myH8w+B4RT+QXBQsvAOdc3XymqDDPHx1BgPgsdAA5SIifona89YtRATDzw=="],

    "dlv": ["dlv@1.1.3", "", {}, "sha512-+HlytyjlPKnIG8XuRG8WvmBP8xs8P71y+SKKS6ZXWoEgLuePxtDoUEiH7WkdePWrQ5JBpE6aoVqfZfJUQkjXwA=="],

    "doctrine": ["doctrine@3.0.0", "", { "dependencies": { "esutils": "^2.0.2" } }, "sha512-yS+Q5i3hBf7GBkd4KG8a7eBNNWNGLTaEwwYWUijIYM7zrlYDM0BFXHjjPWlWZ1Rg7UaddZeIDmi9jF3HmqiQ2w=="],

    "dunder-proto": ["dunder-proto@1.0.1", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.1", "es-errors": "^1.3.0", "gopd": "^1.2.0" } }, "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A=="],

    "eastasianwidth": ["eastasianwidth@0.2.0", "", {}, "sha512-I88TYZWc9XiYHRQ4/3c5rjjfgkjhLyW2luGIheGERbNQ6OY7yTybanSpDXZa8y7VUP9YmDcYa+eyq4ca7iLqWA=="],

    "electron-to-chromium": ["electron-to-chromium@1.5.443", "", {}, "sha512-TDJG36L9A3CWWwZ97HKaE+Iz1sW80pNp6sAU0owzCIV3Zc9eVyRqZK8Vz6NKuMIU8WjP0pIkoqCa0VRf/yFD0Q=="],

    "emoji-regex": ["emoji-regex@9.2.2", "", {}, "sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg=="],

    "es-abstract": ["es-abstract@1.24.2", "", { "dependencies": { "array-buffer-byte-length": "^1.0.2", "arraybuffer.prototype.slice": "^1.0.4", "available-typed-arrays": "^1.0.7", "call-bind": "^1.0.8", "call-bound": "^1.0.4", "data-view-buffer": "^1.0.2", "data-view-byte-length": "^1.0.2", "data-view-byte-offset": "^1.0.1", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "es-set-tostringtag": "^2.1.0", "es-to-primitive": "^1.3.0", "function.prototype.name": "^1.1.8", "get-intrinsic": "^1.3.0", "get-proto": "^1.0.1", "get-symbol-description": "^1.1.0", "globalthis": "^1.0.4", "gopd": "^1.2.0", "has-property-descriptors": "^1.0.2", "has-proto": "^1.2.0", "has-symbols": "^1.1.0", "hasown": "^2.0.2", "internal-slot": "^1.1.0", "is-array-buffer": "^3.0.5", "is-callable": "^1.2.7", "is-data-view": "^1.0.2", "is-negative-zero": "^2.0.3", "is-regex": "^1.2.1", "is-set": "^2.0.3", "is-shared-array-buffer": "^1.0.4", "is-string": "^1.1.1", "is-typed-array": "^1.1.15", "is-weakref": "^1.1.1", "math-intrinsics": "^1.1.0", "object-inspect": "^1.13.4", "object-keys": "^1.1.1", "object.assign": "^4.1.7", "own-keys": "^1.0.1", "regexp.prototype.flags": "^1.5.4", "safe-array-concat": "^1.1.3", "safe-push-apply": "^1.0.0", "safe-regex-test": "^1.1.0", "set-proto": "^1.0.0", "stop-iteration-iterator": "^1.1.0", "string.prototype.trim": "^1.2.10", "string.prototype.trimend": "^1.0.9", "string.prototype.trimstart": "^1.0.8", "typed-array-buffer": "^1.0.3", "typed-array-byte-length": "^1.0.3", "typed-array-byte-offset": "^1.0.4", "typed-array-length": "^1.0.7", "unbox-primitive": "^1.1.0", "which-typed-array": "^1.1.19" } }, "sha512-2FpH9Q5i2RRwyEP1AylXe6nYLR5OhaJTZwmlcP0dL/+JCbgg7yyEo/sEK6HeGZRf3dFpWwThaRHVApXSkW3xeg=="],

    "es-abstract-get": ["es-abstract-get@1.0.0", "", { "dependencies": { "es-errors": "^1.3.0", "es-object-atoms": "^1.1.2", "is-callable": "^1.2.7", "object-inspect": "^1.13.4" } }, "sha512-6PMWXpdhshVvFp+FoWYs1EvG1Nj0tvk0dZM+XcK0xMEM1czRVcP6ohqPWHy6qPagSpC8j4+p89WXlT+xXJs/fg=="],

    "es-define-property": ["es-define-property@1.0.1", "", {}, "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g=="],

    "es-errors": ["es-errors@1.3.0", "", {}, "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw=="],

    "es-iterator-helpers": ["es-iterator-helpers@1.4.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-errors": "^1.3.0", "es-set-tostringtag": "^2.1.0", "function-bind": "^1.1.2", "get-intrinsic": "^1.3.0", "globalthis": "^1.0.4", "gopd": "^1.2.0", "has-property-descriptors": "^1.0.2", "has-proto": "^1.2.0", "has-symbols": "^1.1.0", "internal-slot": "^1.1.0", "iterator.prototype": "^1.1.5", "math-intrinsics": "^1.1.0" } }, "sha512-c/A0P0oxkACDc+cKWw8evLXK83oBKgn0qPOqCYT4x9uolpCIJAcYvJC9QYKNDRPsTeGyCrQ326jrvgZWdCdK5Q=="],

    "es-object-atoms": ["es-object-atoms@1.1.2", "", { "dependencies": { "es-errors": "^1.3.0" } }, "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw=="],

    "es-set-tostringtag": ["es-set-tostringtag@2.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6", "has-tostringtag": "^1.0.2", "hasown": "^2.0.2" } }, "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA=="],

    "es-shim-unscopables": ["es-shim-unscopables@1.1.0", "", { "dependencies": { "hasown": "^2.0.2" } }, "sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw=="],

    "es-to-primitive": ["es-to-primitive@1.3.4", "", { "dependencies": { "es-abstract-get": "^1.0.0", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "is-callable": "^1.2.7", "is-date-object": "^1.1.0", "is-symbol": "^1.1.1" } }, "sha512-yPDz7wqpg1/mmHLmS3tcfTfbw5f1eryXvyghYBffGdERwe+mV7ZcWzTR8LR17Kvqt3qfPurjlonmnq3MKXIOXw=="],

    "escalade": ["escalade@3.2.0", "", {}, "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA=="],

    "escape-string-regexp": ["escape-string-regexp@4.0.0", "", {}, "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA=="],

    "eslint": ["eslint@8.57.1", "", { "dependencies": { "@eslint-community/eslint-utils": "^4.2.0", "@eslint-community/regexpp": "^4.6.1", "@eslint/eslintrc": "^2.1.4", "@eslint/js": "8.57.1", "@humanwhocodes/config-array": "^0.13.0", "@humanwhocodes/module-importer": "^1.0.1", "@nodelib/fs.walk": "^1.2.8", "@ungap/structured-clone": "^1.2.0", "ajv": "^6.12.4", "chalk": "^4.0.0", "cross-spawn": "^7.0.2", "debug": "^4.3.2", "doctrine": "^3.0.0", "escape-string-regexp": "^4.0.0", "eslint-scope": "^7.2.2", "eslint-visitor-keys": "^3.4.3", "espree": "^9.6.1", "esquery": "^1.4.2", "esutils": "^2.0.2", "fast-deep-equal": "^3.1.3", "file-entry-cache": "^6.0.1", "find-up": "^5.0.0", "glob-parent": "^6.0.2", "globals": "^13.19.0", "graphemer": "^1.4.0", "ignore": "^5.2.0", "imurmurhash": "^0.1.4", "is-glob": "^4.0.0", "is-path-inside": "^3.0.3", "js-yaml": "^4.1.0", "json-stable-stringify-without-jsonify": "^1.0.1", "levn": "^0.4.1", "lodash.merge": "^4.6.2", "minimatch": "^3.1.2", "natural-compare": "^1.4.0", "optionator": "^0.9.3", "strip-ansi": "^6.0.1", "text-table": "^0.2.0" }, "bin": { "eslint": "bin/eslint.js" } }, "sha512-ypowyDxpVSYpkXr9WPv2PAZCtNip1Mv5KTW0SCurXv/9iOpcrH9PaqUElksqEB6pChqHGDRCFTyrZlGhnLNGiA=="],

    "eslint-config-next": ["eslint-config-next@14.2.24", "", { "dependencies": { "@next/eslint-plugin-next": "14.2.24", "@rushstack/eslint-patch": "^1.3.3", "@typescript-eslint/eslint-plugin": "^5.4.2 || ^6.0.0 || ^7.0.0 || ^8.0.0", "@typescript-eslint/parser": "^5.4.2 || ^6.0.0 || ^7.0.0 || ^8.0.0", "eslint-import-resolver-node": "^0.3.6", "eslint-import-resolver-typescript": "^3.5.2", "eslint-plugin-import": "^2.28.1", "eslint-plugin-jsx-a11y": "^6.7.1", "eslint-plugin-react": "^7.33.2", "eslint-plugin-react-hooks": "^4.5.0 || 5.0.0-canary-7118f5dd7-20230705" }, "peerDependencies": { "eslint": "^7.23.0 || ^8.0.0", "typescript": ">=3.3.1" }, "optionalPeers": ["typescript"] }, "sha512-9r1ujK++Pgpfixr5+DQ6rXDIQmSzuDbBlAQYMkJRMz9KWqovX7ESUTC0EAyBfOCl3ubkoeplw+aoXDuih3A8fw=="],

    "eslint-import-resolver-node": ["eslint-import-resolver-node@0.3.10", "", { "dependencies": { "debug": "^3.2.7", "is-core-module": "^2.16.1", "resolve": "^2.0.0-next.6" } }, "sha512-tRrKqFyCaKict5hOd244sL6EQFNycnMQnBe+j8uqGNXYzsImGbGUU4ibtoaBmv5FLwJwcFJNeg1GeVjQfbMrDQ=="],

    "eslint-import-resolver-typescript": ["eslint-import-resolver-typescript@3.10.1", "", { "dependencies": { "@nolyfill/is-core-module": "1.0.39", "debug": "^4.4.0", "get-tsconfig": "^4.10.0", "is-bun-module": "^2.0.0", "stable-hash": "^0.0.5", "tinyglobby": "^0.2.13", "unrs-resolver": "^1.6.2" }, "peerDependencies": { "eslint": "*", "eslint-plugin-import": "*", "eslint-plugin-import-x": "*" }, "optionalPeers": ["eslint-plugin-import", "eslint-plugin-import-x"] }, "sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ=="],

    "eslint-module-utils": ["eslint-module-utils@2.14.0", "", { "dependencies": { "debug": "^3.2.7" }, "peerDependencies": { "eslint": "*" }, "optionalPeers": ["eslint"] }, "sha512-W2WCRZ9Dqntd+2u8jJcVMV2PKulc6RdLgUUoh/yQr3uB6lo/ZOeGx11sv60/8S4QFFKNslAlWhr9u0Ef7ZW6Ig=="],

    "eslint-plugin-import": ["eslint-plugin-import@2.32.0", "", { "dependencies": { "@rtsao/scc": "^1.1.0", "array-includes": "^3.1.9", "array.prototype.findlastindex": "^1.2.6", "array.prototype.flat": "^1.3.3", "array.prototype.flatmap": "^1.3.3", "debug": "^3.2.7", "doctrine": "^2.1.0", "eslint-import-resolver-node": "^0.3.9", "eslint-module-utils": "^2.12.1", "hasown": "^2.0.2", "is-core-module": "^2.16.1", "is-glob": "^4.0.3", "minimatch": "^3.1.2", "object.fromentries": "^2.0.8", "object.groupby": "^1.0.3", "object.values": "^1.2.1", "semver": "^6.3.1", "string.prototype.trimend": "^1.0.9", "tsconfig-paths": "^3.15.0" }, "peerDependencies": { "eslint": "^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9" } }, "sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA=="],

    "eslint-plugin-jsx-a11y": ["eslint-plugin-jsx-a11y@6.10.2", "", { "dependencies": { "aria-query": "^5.3.2", "array-includes": "^3.1.8", "array.prototype.flatmap": "^1.3.2", "ast-types-flow": "^0.0.8", "axe-core": "^4.10.0", "axobject-query": "^4.1.0", "damerau-levenshtein": "^1.0.8", "emoji-regex": "^9.2.2", "hasown": "^2.0.2", "jsx-ast-utils": "^3.3.5", "language-tags": "^1.0.9", "minimatch": "^3.1.2", "object.fromentries": "^2.0.8", "safe-regex-test": "^1.0.3", "string.prototype.includes": "^2.0.1" }, "peerDependencies": { "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9" } }, "sha512-scB3nz4WmG75pV8+3eRUQOHZlNSUhFNq37xnpgRkCCELU3XMvXAxLk1eqWWyE22Ki4Q01Fnsw9BA3cJHDPgn2Q=="],

    "eslint-plugin-react": ["eslint-plugin-react@7.37.5", "", { "dependencies": { "array-includes": "^3.1.8", "array.prototype.findlast": "^1.2.5", "array.prototype.flatmap": "^1.3.3", "array.prototype.tosorted": "^1.1.4", "doctrine": "^2.1.0", "es-iterator-helpers": "^1.2.1", "estraverse": "^5.3.0", "hasown": "^2.0.2", "jsx-ast-utils": "^2.4.1 || ^3.0.0", "minimatch": "^3.1.2", "object.entries": "^1.1.9", "object.fromentries": "^2.0.8", "object.values": "^1.2.1", "prop-types": "^15.8.1", "resolve": "^2.0.0-next.5", "semver": "^6.3.1", "string.prototype.matchall": "^4.0.12", "string.prototype.repeat": "^1.0.0" }, "peerDependencies": { "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7" } }, "sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA=="],

    "eslint-plugin-react-hooks": ["eslint-plugin-react-hooks@4.6.2", "", { "peerDependencies": { "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0" } }, "sha512-QzliNJq4GinDBcD8gPB5v0wh6g8q3SUi6EFF0x8N/BL9PoVs0atuGc47ozMRyOWAKdwaZ5OnbOEa3WR+dSGKuQ=="],

    "eslint-scope": ["eslint-scope@7.2.2", "", { "dependencies": { "esrecurse": "^4.3.0", "estraverse": "^5.2.0" } }, "sha512-dOt21O7lTMhDM+X9mB4GX+DZrZtCUJPL/wlcTqxyrx5IvO0IYtILdtrQGQp+8n5S0gwSVmOf9NQrjMOgfQZlIg=="],

    "eslint-visitor-keys": ["eslint-visitor-keys@3.4.3", "", {}, "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag=="],

    "espree": ["espree@9.6.1", "", { "dependencies": { "acorn": "^8.9.0", "acorn-jsx": "^5.3.2", "eslint-visitor-keys": "^3.4.1" } }, "sha512-oruZaFkjorTpF32kDSI5/75ViwGeZginGGy2NoOSg3Q9bnwlnmDm4HLnkl0RE3n+njDXR037aY1+x58Z/zFdwQ=="],

    "esquery": ["esquery@1.7.0", "", { "dependencies": { "estraverse": "^5.1.0" } }, "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g=="],

    "esrecurse": ["esrecurse@4.3.0", "", { "dependencies": { "estraverse": "^5.2.0" } }, "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag=="],

    "estraverse": ["estraverse@5.3.0", "", {}, "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA=="],

    "esutils": ["esutils@2.0.3", "", {}, "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g=="],

    "fast-deep-equal": ["fast-deep-equal@3.1.3", "", {}, "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q=="],

    "fast-glob": ["fast-glob@3.3.3", "", { "dependencies": { "@nodelib/fs.stat": "^2.0.2", "@nodelib/fs.walk": "^1.2.3", "glob-parent": "^5.1.2", "merge2": "^1.3.0", "micromatch": "^4.0.8" } }, "sha512-7MptL8U0cqcFdzIzwOTHoilX9x5BrNqye7Z/LuC7kCMRio1EMSyqRK3BEAUD7sXRq4iT4AzTVuZdhgQ2TCvYLg=="],

    "fast-json-stable-stringify": ["fast-json-stable-stringify@2.1.0", "", {}, "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw=="],

    "fast-levenshtein": ["fast-levenshtein@2.0.6", "", {}, "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw=="],

    "fastq": ["fastq@1.20.3", "", { "dependencies": { "reusify": "^1.0.4" } }, "sha512-XKv5nnLs6nLF71NgiKJLIZFLkPyIEuOselLG7ujZnGrRfQK8HpvY+WqKhAJUAdLomwVHErVS4LfxFlPq0/FTAw=="],

    "fdir": ["fdir@6.5.0", "", { "peerDependencies": { "picomatch": "^3 || ^4" }, "optionalPeers": ["picomatch"] }, "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg=="],

    "file-entry-cache": ["file-entry-cache@6.0.1", "", { "dependencies": { "flat-cache": "^3.0.4" } }, "sha512-7Gps/XWymbLk2QLYK4NzpMOrYjMhdIxXuIvy2QBsLE6ljuodKvdkWs/cpyJJ3CVIVpH0Oi1Hvg1ovbMzLdFBBg=="],

    "fill-range": ["fill-range@7.1.1", "", { "dependencies": { "to-regex-range": "^5.0.1" } }, "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg=="],

    "find-up": ["find-up@5.0.0", "", { "dependencies": { "locate-path": "^6.0.0", "path-exists": "^4.0.0" } }, "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng=="],

    "flat-cache": ["flat-cache@3.2.0", "", { "dependencies": { "flatted": "^3.2.9", "keyv": "^4.5.3", "rimraf": "^3.0.2" } }, "sha512-CYcENa+FtcUKLmhhqyctpclsq7QF38pKjZHsGNiSQF5r4FtoKDWabFDl3hzaEQMvT1LHEysw5twgLvpYYb4vbw=="],

    "flatted": ["flatted@3.4.4", "", {}, "sha512-5+ybhBZANEJxaH3X5evAFatUxLfEHSr7n6kYJ+1Qd0mUqr4eu9gIf6GDbWHf8RJijHrjjO8G+la14SlL2SeS1Q=="],

    "for-each": ["for-each@0.3.5", "", { "dependencies": { "is-callable": "^1.2.7" } }, "sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg=="],

    "foreground-child": ["foreground-child@3.3.1", "", { "dependencies": { "cross-spawn": "^7.0.6", "signal-exit": "^4.0.1" } }, "sha512-gIXjKqtFuWEgzFRJA9WCQeSJLZDjgJUOMCMzxtvFq/37KojM1BFGufqsCy0r4qSQmYLsZYMeyRqzIWOMup03sw=="],

    "fraction.js": ["fraction.js@5.3.4", "", {}, "sha512-1X1NTtiJphryn/uLQz3whtY6jK3fTqoE3ohKs0tT+Ujr1W59oopxmoEh7Lu5p6vBaPbgoM0bzveAW4Qi5RyWDQ=="],

    "fs.realpath": ["fs.realpath@1.0.0", "", {}, "sha512-OO0pH2lK6a0hZnAdau5ItzHPI6pUlvI7jMVnxUQRtw4owF2wk8lOSabtGDCTP4Ggrg2MbGnWO9X8K1t4+fGMDw=="],

    "fsevents": ["fsevents@2.3.3", "", { "os": "darwin" }, "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw=="],

    "function-bind": ["function-bind@1.1.2", "", {}, "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA=="],

    "function.prototype.name": ["function.prototype.name@1.2.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "functions-have-names": "^1.2.3", "has-property-descriptors": "^1.0.2", "hasown": "^2.0.4", "is-callable": "^1.2.7", "is-document.all": "^1.0.0" } }, "sha512-jObKIik1P2QjPHP5nz5BaOtUlfgS0fWo8IUByNXkM+o+02sJOi94em77GwJKQSJ3gfPHdgzLNrHc1uokV4P/ew=="],

    "functions-have-names": ["functions-have-names@1.2.3", "", {}, "sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ=="],

    "generator-function": ["generator-function@2.0.1", "", {}, "sha512-SFdFmIJi+ybC0vjlHN0ZGVGHc3lgE0DxPAT0djjVg+kjOnSqclqmj0KQ7ykTOLP6YxoqOvuAODGdcHJn+43q3g=="],

    "get-intrinsic": ["get-intrinsic@1.3.0", "", { "dependencies": { "call-bind-apply-helpers": "^1.0.2", "es-define-property": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.1", "function-bind": "^1.1.2", "get-proto": "^1.0.1", "gopd": "^1.2.0", "has-symbols": "^1.1.0", "hasown": "^2.0.2", "math-intrinsics": "^1.1.0" } }, "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ=="],

    "get-proto": ["get-proto@1.0.1", "", { "dependencies": { "dunder-proto": "^1.0.1", "es-object-atoms": "^1.0.0" } }, "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g=="],

    "get-symbol-description": ["get-symbol-description@1.1.0", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.6" } }, "sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg=="],

    "get-tsconfig": ["get-tsconfig@4.14.3", "", { "dependencies": { "resolve-pkg-maps": "^1.0.0" } }, "sha512-++QEw4DIY7WGoukz+/+A/8dGYPT9l9yIadnmSgZ8Rjr3YVSVDipQSO9CdnJo9ePqFqUUqh+wk9uIaoiAwsiPkA=="],

    "glob": ["glob@10.3.10", "", { "dependencies": { "foreground-child": "^3.1.0", "jackspeak": "^2.3.5", "minimatch": "^9.0.1", "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0", "path-scurry": "^1.10.1" }, "bin": { "glob": "dist/esm/bin.mjs" } }, "sha512-fa46+tv1Ak0UPK1TOy/pZrIybNNt4HCv7SDzwyfiOZkvZLEbjsZkJBPtDHVshZjbecAoAGSC20MjLDG/qr679g=="],

    "glob-parent": ["glob-parent@6.0.2", "", { "dependencies": { "is-glob": "^4.0.3" } }, "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A=="],

    "globals": ["globals@13.24.0", "", { "dependencies": { "type-fest": "^0.20.2" } }, "sha512-AhO5QUcj8llrbG09iWhPU2B204J1xnPeL8kQmVorSsy+Sjj1sk8gIyh6cUocGmH4L0UuhAJy+hJMRA4mgA4mFQ=="],

    "globalthis": ["globalthis@1.0.4", "", { "dependencies": { "define-properties": "^1.2.1", "gopd": "^1.0.1" } }, "sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ=="],

    "gopd": ["gopd@1.2.0", "", {}, "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg=="],

    "graceful-fs": ["graceful-fs@4.2.11", "", {}, "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ=="],

    "graphemer": ["graphemer@1.4.0", "", {}, "sha512-EtKwoO6kxCL9WO5xipiHTZlSzBm7WLT627TqC/uVRd0HKmq8NXyebnNYxDoBi7wt8eTWrUrKXCOVaFq9x1kgag=="],

    "has-bigints": ["has-bigints@1.1.0", "", {}, "sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg=="],

    "has-flag": ["has-flag@4.0.0", "", {}, "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ=="],

    "has-property-descriptors": ["has-property-descriptors@1.0.2", "", { "dependencies": { "es-define-property": "^1.0.0" } }, "sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg=="],

    "has-proto": ["has-proto@1.2.0", "", { "dependencies": { "dunder-proto": "^1.0.0" } }, "sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ=="],

    "has-symbols": ["has-symbols@1.1.0", "", {}, "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ=="],

    "has-tostringtag": ["has-tostringtag@1.0.2", "", { "dependencies": { "has-symbols": "^1.0.3" } }, "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw=="],

    "hasown": ["hasown@2.0.4", "", { "dependencies": { "function-bind": "^1.1.2" } }, "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A=="],

    "ignore": ["ignore@5.3.2", "", {}, "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g=="],

    "import-fresh": ["import-fresh@3.3.1", "", { "dependencies": { "parent-module": "^1.0.0", "resolve-from": "^4.0.0" } }, "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ=="],

    "imurmurhash": ["imurmurhash@0.1.4", "", {}, "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA=="],

    "inflight": ["inflight@1.0.6", "", { "dependencies": { "once": "^1.3.0", "wrappy": "1" } }, "sha512-k92I/b08q4wvFscXCLvqfsHCrjrF7yiXsQuIVvVE7N82W3+aqpzuUdBbfhWcy/FZR3/4IgflMgKLOsvPDrGCJA=="],

    "inherits": ["inherits@2.0.4", "", {}, "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ=="],

    "internal-slot": ["internal-slot@1.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "hasown": "^2.0.2", "side-channel": "^1.1.0" } }, "sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw=="],

    "is-array-buffer": ["is-array-buffer@3.0.5", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.3", "get-intrinsic": "^1.2.6" } }, "sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A=="],

    "is-async-function": ["is-async-function@2.1.1", "", { "dependencies": { "async-function": "^1.0.0", "call-bound": "^1.0.3", "get-proto": "^1.0.1", "has-tostringtag": "^1.0.2", "safe-regex-test": "^1.1.0" } }, "sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ=="],

    "is-bigint": ["is-bigint@1.1.0", "", { "dependencies": { "has-bigints": "^1.0.2" } }, "sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ=="],

    "is-binary-path": ["is-binary-path@2.1.0", "", { "dependencies": { "binary-extensions": "^2.0.0" } }, "sha512-ZMERYes6pDydyuGidse7OsHxtbI7WVeUEozgR/g7rd0xUimYNlvZRE/K2MgZTjWy725IfelLeVcEM97mmtRGXw=="],

    "is-boolean-object": ["is-boolean-object@1.2.2", "", { "dependencies": { "call-bound": "^1.0.3", "has-tostringtag": "^1.0.2" } }, "sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A=="],

    "is-bun-module": ["is-bun-module@2.0.0", "", { "dependencies": { "semver": "^7.7.1" } }, "sha512-gNCGbnnnnFAUGKeZ9PdbyeGYJqewpmc2aKHUEMO5nQPWU9lOmv7jcmQIv+qHD8fXW6W7qfuCwX4rY9LNRjXrkQ=="],

    "is-callable": ["is-callable@1.2.7", "", {}, "sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA=="],

    "is-core-module": ["is-core-module@2.17.0", "", { "dependencies": { "hasown": "^2.0.4" } }, "sha512-J/vG0zBCbIKOQFfufSwyXdMrsohyJIUNkrnmo6WZGzoM7tr/lsbfW5b2BvisL6zsyMzK9UxV9L6c7AoFbyXHOA=="],

    "is-data-view": ["is-data-view@1.0.2", "", { "dependencies": { "call-bound": "^1.0.2", "get-intrinsic": "^1.2.6", "is-typed-array": "^1.1.13" } }, "sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw=="],

    "is-date-object": ["is-date-object@1.1.0", "", { "dependencies": { "call-bound": "^1.0.2", "has-tostringtag": "^1.0.2" } }, "sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg=="],

    "is-document.all": ["is-document.all@1.0.0", "", { "dependencies": { "call-bound": "^1.0.4" } }, "sha512-+XSoyS05OdBbhFuELhgTCpFNHkpBOJqtsZfUFFpe5QTw+9Sjbh8zitxhQkYAo6wV7e1Vb8cAPvpCk9jGam/82g=="],

    "is-extglob": ["is-extglob@2.1.1", "", {}, "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ=="],

    "is-finalizationregistry": ["is-finalizationregistry@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3" } }, "sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg=="],

    "is-fullwidth-code-point": ["is-fullwidth-code-point@3.0.0", "", {}, "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg=="],

    "is-generator-function": ["is-generator-function@1.1.2", "", { "dependencies": { "call-bound": "^1.0.4", "generator-function": "^2.0.0", "get-proto": "^1.0.1", "has-tostringtag": "^1.0.2", "safe-regex-test": "^1.1.0" } }, "sha512-upqt1SkGkODW9tsGNG5mtXTXtECizwtS2kA161M+gJPc1xdb/Ax629af6YrTwcOeQHbewrPNlE5Dx7kzvXTizA=="],

    "is-glob": ["is-glob@4.0.3", "", { "dependencies": { "is-extglob": "^2.1.1" } }, "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg=="],

    "is-map": ["is-map@2.0.3", "", {}, "sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw=="],

    "is-negative-zero": ["is-negative-zero@2.0.3", "", {}, "sha512-5KoIu2Ngpyek75jXodFvnafB6DJgr3u8uuK0LEZJjrU19DrMD3EVERaR8sjz8CCGgpZvxPl9SuE1GMVPFHx1mw=="],

    "is-number": ["is-number@7.0.0", "", {}, "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng=="],

    "is-number-object": ["is-number-object@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3", "has-tostringtag": "^1.0.2" } }, "sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw=="],

    "is-path-inside": ["is-path-inside@3.0.3", "", {}, "sha512-Fd4gABb+ycGAmKou8eMftCupSir5lRxqf4aD/vd0cD2qc4HL07OjCeuHMr8Ro4CoMaeCKDB0/ECBOVWjTwUvPQ=="],

    "is-regex": ["is-regex@1.2.1", "", { "dependencies": { "call-bound": "^1.0.2", "gopd": "^1.2.0", "has-tostringtag": "^1.0.2", "hasown": "^2.0.2" } }, "sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g=="],

    "is-set": ["is-set@2.0.3", "", {}, "sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg=="],

    "is-shared-array-buffer": ["is-shared-array-buffer@1.0.4", "", { "dependencies": { "call-bound": "^1.0.3" } }, "sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A=="],

    "is-string": ["is-string@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3", "has-tostringtag": "^1.0.2" } }, "sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA=="],

    "is-symbol": ["is-symbol@1.1.1", "", { "dependencies": { "call-bound": "^1.0.2", "has-symbols": "^1.1.0", "safe-regex-test": "^1.1.0" } }, "sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w=="],

    "is-typed-array": ["is-typed-array@1.1.15", "", { "dependencies": { "which-typed-array": "^1.1.16" } }, "sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ=="],

    "is-weakmap": ["is-weakmap@2.0.2", "", {}, "sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w=="],

    "is-weakref": ["is-weakref@1.1.1", "", { "dependencies": { "call-bound": "^1.0.3" } }, "sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew=="],

    "is-weakset": ["is-weakset@2.0.4", "", { "dependencies": { "call-bound": "^1.0.3", "get-intrinsic": "^1.2.6" } }, "sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ=="],

    "isarray": ["isarray@2.0.5", "", {}, "sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw=="],

    "isexe": ["isexe@2.0.0", "", {}, "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw=="],

    "iterator.prototype": ["iterator.prototype@1.1.5", "", { "dependencies": { "define-data-property": "^1.1.4", "es-object-atoms": "^1.0.0", "get-intrinsic": "^1.2.6", "get-proto": "^1.0.0", "has-symbols": "^1.1.0", "set-function-name": "^2.0.2" } }, "sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g=="],

    "jackspeak": ["jackspeak@2.3.6", "", { "dependencies": { "@isaacs/cliui": "^8.0.2" }, "optionalDependencies": { "@pkgjs/parseargs": "^0.11.0" } }, "sha512-N3yCS/NegsOBokc8GAdM8UcmfsKiSS8cipheD/nivzr700H+nsMOxJjQnvwOcRYVuFkdH0wGUvW2WbXGmrZGbQ=="],

    "jiti": ["jiti@1.21.7", "", { "bin": { "jiti": "bin/jiti.js" } }, "sha512-/imKNG4EbWNrVjoNC/1H5/9GFy+tqjGBHCaSsN+P2RnPqjsLmv6UD3Ej+Kj8nBWaRAwyk7kK5ZUc+OEatnTR3A=="],

    "js-tokens": ["js-tokens@4.0.0", "", {}, "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ=="],

    "js-yaml": ["js-yaml@4.3.2", "", { "dependencies": { "argparse": "^2.0.1" }, "bin": { "js-yaml": "bin/js-yaml.js" } }, "sha512-SFNOvSJ+Dgf/9An904Yx+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3/TP3O+wzWuiTFl4sqbltzA=="],

    "json-buffer": ["json-buffer@3.0.1", "", {}, "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ=="],

    "json-schema-traverse": ["json-schema-traverse@0.4.1", "", {}, "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg=="],

    "json-stable-stringify-without-jsonify": ["json-stable-stringify-without-jsonify@1.0.1", "", {}, "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw=="],

    "json5": ["json5@1.0.2", "", { "dependencies": { "minimist": "^1.2.0" }, "bin": { "json5": "lib/cli.js" } }, "sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA=="],

    "jsx-ast-utils": ["jsx-ast-utils@3.3.5", "", { "dependencies": { "array-includes": "^3.1.6", "array.prototype.flat": "^1.3.1", "object.assign": "^4.1.4", "object.values": "^1.1.6" } }, "sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ=="],

    "keyv": ["keyv@4.5.4", "", { "dependencies": { "json-buffer": "3.0.1" } }, "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw=="],

    "language-subtag-registry": ["language-subtag-registry@0.3.23", "", {}, "sha512-0K65Lea881pHotoGEa5gDlMxt3pctLi2RplBb7Ezh4rRdLEOtgi7n4EwK9lamnUCkKBqaeKRVebTq6BAxSkpXQ=="],

    "language-tags": ["language-tags@1.0.9", "", { "dependencies": { "language-subtag-registry": "^0.3.20" } }, "sha512-MbjN408fEndfiQXbFQ1vnd+1NoLDsnQW41410oQBXiyXDMYH5z505juWa4KUE1LqxRC7DgOgZDbKLxHIwm27hA=="],

    "levn": ["levn@0.4.1", "", { "dependencies": { "prelude-ls": "^1.2.1", "type-check": "~0.4.0" } }, "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ=="],

    "lilconfig": ["lilconfig@3.1.3", "", {}, "sha512-/vlFKAoH5Cgt3Ie+JLhRbwOsCQePABiU3tJ1egGvyQ+33R/vcwM2Zl2QR/LzjsBeItPt3oSVXapn+m4nQDvpzw=="],

    "lines-and-columns": ["lines-and-columns@1.2.4", "", {}, "sha512-7ylylesZQ/PV29jhEDl3Ufjo6ZX7gCqJr5F7PKrqc93v7fzSymt1BpwEU8nAUXs8qzzvqhbjhK5QZg6Mt/HkBg=="],

    "locate-path": ["locate-path@6.0.0", "", { "dependencies": { "p-locate": "^5.0.0" } }, "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw=="],

    "lodash.merge": ["lodash.merge@4.6.2", "", {}, "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ=="],

    "loose-envify": ["loose-envify@1.4.0", "", { "dependencies": { "js-tokens": "^3.0.0 || ^4.0.0" }, "bin": { "loose-envify": "cli.js" } }, "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q=="],

    "lru-cache": ["lru-cache@10.4.3", "", {}, "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ=="],

    "lucide-react": ["lucide-react@0.475.0", "", { "peerDependencies": { "react": "^16.5.1 || ^17.0.0 || ^18.0.0 || ^19.0.0" } }, "sha512-NJzvVu1HwFVeZ+Gwq2q00KygM1aBhy/ZrhY9FsAgJtpB+E4R7uxRk9M2iKvHa6/vNxZydIB59htha4c2vvwvVg=="],

    "math-intrinsics": ["math-intrinsics@1.1.0", "", {}, "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g=="],

    "merge2": ["merge2@1.4.1", "", {}, "sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg=="],

    "micromatch": ["micromatch@4.0.8", "", { "dependencies": { "braces": "^3.0.3", "picomatch": "^2.3.1" } }, "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA=="],

    "minimatch": ["minimatch@3.1.5", "", { "dependencies": { "brace-expansion": "^1.1.7" } }, "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w=="],

    "minimist": ["minimist@1.2.8", "", {}, "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA=="],

    "minipass": ["minipass@7.1.3", "", {}, "sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A=="],

    "ms": ["ms@2.1.3", "", {}, "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA=="],

    "mz": ["mz@2.7.0", "", { "dependencies": { "any-promise": "^1.0.0", "object-assign": "^4.0.1", "thenify-all": "^1.0.0" } }, "sha512-z81GNO7nnYMEhrGh9LeymoE4+Yr0Wn5McHIZMK5cfQCl+NDX08sCZgUc9/6MHni9IWuFLm1Z3HTCXu2z9fN62Q=="],

    "nanoid": ["nanoid@3.3.19", "", { "bin": { "nanoid": "bin/nanoid.cjs" } }, "sha512-Y2tUNy4ouw6tq5oDSKeQYGOyhkUBhNOcGV/02KC+6kd9eDGqdZd++mjMiIDilrBYvjEnCYvVtsuHCuP+okSfug=="],

    "napi-postinstall": ["napi-postinstall@0.3.4", "", { "bin": { "napi-postinstall": "lib/cli.js" } }, "sha512-PHI5f1O0EP5xJ9gQmFGMS6IZcrVvTjpXjz7Na41gTE7eE2hK11lg04CECCYEEjdc17EV4DO+fkGEtt7TpTaTiQ=="],

    "natural-compare": ["natural-compare@1.4.0", "", {}, "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw=="],

    "next": ["next@14.2.24", "", { "dependencies": { "@next/env": "14.2.24", "@swc/helpers": "0.5.5", "busboy": "1.6.0", "caniuse-lite": "^1.0.30001579", "graceful-fs": "^4.2.11", "postcss": "8.4.31", "styled-jsx": "5.1.1" }, "optionalDependencies": { "@next/swc-darwin-arm64": "14.2.24", "@next/swc-darwin-x64": "14.2.24", "@next/swc-linux-arm64-gnu": "14.2.24", "@next/swc-linux-arm64-musl": "14.2.24", "@next/swc-linux-x64-gnu": "14.2.24", "@next/swc-linux-x64-musl": "14.2.24", "@next/swc-win32-arm64-msvc": "14.2.24", "@next/swc-win32-ia32-msvc": "14.2.24", "@next/swc-win32-x64-msvc": "14.2.24" }, "peerDependencies": { "@opentelemetry/api": "^1.1.0", "@playwright/test": "^1.41.2", "react": "^18.2.0", "react-dom": "^18.2.0", "sass": "^1.3.0" }, "optionalPeers": ["@opentelemetry/api", "@playwright/test", "sass"], "bin": { "next": "dist/bin/next" } }, "sha512-En8VEexSJ0Py2FfVnRRh8gtERwDRaJGNvsvad47ShkC2Yi8AXQPXEA2vKoDJlGFSj5WE5SyF21zNi4M5gyi+SQ=="],

    "node-exports-info": ["node-exports-info@1.6.2", "", { "dependencies": { "array.prototype.flatmap": "^1.3.3", "es-errors": "^1.3.0", "object.entries": "^1.1.9", "semver": "^6.3.1" } }, "sha512-kXs9Go0cah0qHVV2v389IXQLdLCeE1xfFtjOAF+iobu0OIoG1pje8At2vMHyaPMiPMnG/LWP50twML21eMcAag=="],

    "node-releases": ["node-releases@2.0.57", "", {}, "sha512-kQK9LGGFiHtrWiNhZtA7Qbw17AQz+dmsEKODRIVTXA9+e5MS/2gZEBhYJt13GrAz5/IOZKddH/0Z3TP/Zgo+yw=="],

    "normalize-path": ["normalize-path@3.0.0", "", {}, "sha512-6eZs5Ls3WtCisHWp9S2GUy8dqkpGi4BVSz3GaqiE6ezub0512ESztXUwUB6C6IKbQkY2Pnb/mD4WYojCRwcwLA=="],

    "object-assign": ["object-assign@4.1.1", "", {}, "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg=="],

    "object-hash": ["object-hash@3.0.0", "", {}, "sha512-RSn9F68PjH9HqtltsSnqYC1XXoWe9Bju5+213R98cNGttag9q9yAOTzdbsqvIa7aNm5WffBZFpWYr2aWrklWAw=="],

    "object-inspect": ["object-inspect@1.13.4", "", {}, "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew=="],

    "object-keys": ["object-keys@1.1.1", "", {}, "sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA=="],

    "object.assign": ["object.assign@4.1.7", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.3", "define-properties": "^1.2.1", "es-object-atoms": "^1.0.0", "has-symbols": "^1.1.0", "object-keys": "^1.1.1" } }, "sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw=="],

    "object.entries": ["object.entries@1.1.9", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-object-atoms": "^1.1.1" } }, "sha512-8u/hfXFRBD1O0hPUjioLhoWFHRmt6tKA4/vZPyckBr18l1KE9uHrFaFaUi8MDRTpi4uak2goyPTSNJLXX2k2Hw=="],

    "object.fromentries": ["object.fromentries@2.0.8", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.2", "es-object-atoms": "^1.0.0" } }, "sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ=="],

    "object.groupby": ["object.groupby@1.0.3", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.2" } }, "sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ=="],

    "object.values": ["object.values@1.2.1", "", { "dependencies": { "call-bind": "^1.0.8", "call-bound": "^1.0.3", "define-properties": "^1.2.1", "es-object-atoms": "^1.0.0" } }, "sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA=="],

    "once": ["once@1.4.0", "", { "dependencies": { "wrappy": "1" } }, "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w=="],

    "optionator": ["optionator@0.9.4", "", { "dependencies": { "deep-is": "^0.1.3", "fast-levenshtein": "^2.0.6", "levn": "^0.4.1", "prelude-ls": "^1.2.1", "type-check": "^0.4.0", "word-wrap": "^1.2.5" } }, "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g=="],

    "own-keys": ["own-keys@1.0.2", "", { "dependencies": { "call-bound": "^1.0.4", "get-intrinsic": "^1.3.0", "object-keys": "^1.1.1", "safe-push-apply": "^1.0.0" } }, "sha512-19YVAg7T+WTrxggPukVq7DjTv6+PJ867TmhCvBsYwmbFCsZd344rq2Ld1p0wo8f8Qrrhgp82c6FJRqdXWtSEhg=="],

    "p-limit": ["p-limit@3.1.0", "", { "dependencies": { "yocto-queue": "^0.1.0" } }, "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ=="],

    "p-locate": ["p-locate@5.0.0", "", { "dependencies": { "p-limit": "^3.0.2" } }, "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw=="],

    "parent-module": ["parent-module@1.0.1", "", { "dependencies": { "callsites": "^3.0.0" } }, "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g=="],

    "path-exists": ["path-exists@4.0.0", "", {}, "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w=="],

    "path-is-absolute": ["path-is-absolute@1.0.1", "", {}, "sha512-AVbw3UJ2e9bq64vSaS9Am0fje1Pa8pbGqTTsmXfaIiMpnr5DlDhfJOuLj9Sf95ZPVDAUerDfEk88MPmPe7UCQg=="],

    "path-key": ["path-key@3.1.1", "", {}, "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q=="],

    "path-parse": ["path-parse@1.0.7", "", {}, "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw=="],

    "path-scurry": ["path-scurry@1.11.1", "", { "dependencies": { "lru-cache": "^10.2.0", "minipass": "^5.0.0 || ^6.0.2 || ^7.0.0" } }, "sha512-Xa4Nw17FS9ApQFJ9umLiJS4orGjm7ZzwUrwamcGQuHSzDyth9boKDaycYdDcZDuqYATXw4HFXgaqWTctW/v1HA=="],

    "picocolors": ["picocolors@1.1.1", "", {}, "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA=="],

    "picomatch": ["picomatch@2.3.2", "", {}, "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA=="],

    "pirates": ["pirates@4.0.7", "", {}, "sha512-TfySrs/5nm8fQJDcBDuUng3VOUKsd7S+zqvbOTiGXHfxX4wK31ard+hoNuvkicM/2YFzlpDgABOevKSsB4G/FA=="],

    "possible-typed-array-names": ["possible-typed-array-names@1.1.0", "", {}, "sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg=="],

    "postcss": ["postcss@8.5.28", "", { "dependencies": { "nanoid": "^3.3.18", "picocolors": "^1.1.1", "source-map-js": "^1.2.1" } }, "sha512-RRuzqDtt5Y9h3quz5hWhK+TPnsmVs6WwSU6LkJMeY4HstUEDuYTG8UJSdawMRzmzAtV+KEoG8N3Qg2qLy5vM/A=="],

    "postcss-import": ["postcss-import@15.1.0", "", { "dependencies": { "postcss-value-parser": "^4.0.0", "read-cache": "^1.0.0", "resolve": "^1.1.7" }, "peerDependencies": { "postcss": "^8.0.0" } }, "sha512-hpr+J05B2FVYUAXHeK1YyI267J/dDDhMU6B6civm8hSY1jYJnBXxzKDKDswzJmtLHryrjhnDjqqp/49t8FALew=="],

    "postcss-js": ["postcss-js@4.1.0", "", { "dependencies": { "camelcase-css": "^2.0.1" }, "peerDependencies": { "postcss": "^8.4.21" } }, "sha512-oIAOTqgIo7q2EOwbhb8UalYePMvYoIeRY2YKntdpFQXNosSu3vLrniGgmH9OKs/qAkfoj5oB3le/7mINW1LCfw=="],

    "postcss-load-config": ["postcss-load-config@6.0.1", "", { "dependencies": { "lilconfig": "^3.1.1" }, "peerDependencies": { "jiti": ">=1.21.0", "postcss": ">=8.0.9", "tsx": "^4.8.1", "yaml": "^2.4.2" }, "optionalPeers": ["jiti", "postcss", "tsx", "yaml"] }, "sha512-oPtTM4oerL+UXmx+93ytZVN82RrlY/wPUV8IeDxFrzIjXOLF1pN+EmKPLbubvKHT2HC20xXsCAH2Z+CKV6Oz/g=="],

    "postcss-nested": ["postcss-nested@6.2.0", "", { "dependencies": { "postcss-selector-parser": "^6.1.1" }, "peerDependencies": { "postcss": "^8.2.14" } }, "sha512-HQbt28KulC5AJzG+cZtj9kvKB93CFCdLvog1WFLf1D+xmMvPGlBstkpTEZfK5+AN9hfJocyBFCNiqyS48bpgzQ=="],

    "postcss-selector-parser": ["postcss-selector-parser@6.1.4", "", { "dependencies": { "cssesc": "^3.0.0", "util-deprecate": "^1.0.2" } }, "sha512-bIoJLOmjCO1S9XdY/DcnR5hJxvrDir1PbGChrzXG3vw0/FOliy/fA3dmdhQ441kah4gKv+TwckGzex6wNS5cnQ=="],

    "postcss-value-parser": ["postcss-value-parser@4.2.0", "", {}, "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ=="],

    "prelude-ls": ["prelude-ls@1.2.1", "", {}, "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g=="],

    "prop-types": ["prop-types@15.8.1", "", { "dependencies": { "loose-envify": "^1.4.0", "object-assign": "^4.1.1", "react-is": "^16.13.1" } }, "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg=="],

    "punycode": ["punycode@2.3.1", "", {}, "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg=="],

    "queue-microtask": ["queue-microtask@1.2.3", "", {}, "sha512-NuaNSa6flKT5JaSYQzJok04JzTL1CA6aGhv5rfLW3PgqA+M2ChpZQnAC8h8i4ZFkBS8X5RqkDBHA7r4hej3K9A=="],

    "react": ["react@18.3.1", "", { "dependencies": { "loose-envify": "^1.1.0" } }, "sha512-wS+hAgJShR0KhEvPJArfuPVN1+Hz1t0Y6n5jLrGQbkb4urgPE/0Rve+1kMB1v/oWgHgm4WIcV+i7F2pTVj+2iQ=="],

    "react-dom": ["react-dom@18.3.1", "", { "dependencies": { "loose-envify": "^1.1.0", "scheduler": "^0.23.2" }, "peerDependencies": { "react": "^18.3.1" } }, "sha512-5m4nQKp+rZRb09LNH59GM4BxTh9251/ylbKIbpe7TpGxfJ+9kv6BLkLBXIjjspbgbnIBNqlI23tRnTWT0snUIw=="],

    "react-is": ["react-is@16.13.1", "", {}, "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ=="],

    "read-cache": ["read-cache@1.0.2", "", {}, "sha512-/peqiBB/n07gQGLsWaHho3WfvUyRscw0gYTsEFMhrIe/nWLkYaf5SbKYjGYqtRV3aPwykJgF2VEMo1ac4bnsGA=="],

    "readdirp": ["readdirp@3.6.0", "", { "dependencies": { "picomatch": "^2.2.1" } }, "sha512-hOS089on8RduqdbhvQ5Z37A0ESjsqz6qnRcffsMU3495FuTdqSm+7bhJ29JvIOsBDEEnan5DPu9t3To9VRlMzA=="],

    "reflect.getprototypeof": ["reflect.getprototypeof@1.0.10", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-abstract": "^1.23.9", "es-errors": "^1.3.0", "es-object-atoms": "^1.0.0", "get-intrinsic": "^1.2.7", "get-proto": "^1.0.1", "which-builtin-type": "^1.2.1" } }, "sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw=="],

    "regexp.prototype.flags": ["regexp.prototype.flags@1.5.4", "", { "dependencies": { "call-bind": "^1.0.8", "define-properties": "^1.2.1", "es-errors": "^1.3.0", "get-proto": "^1.0.1", "gopd": "^1.2.0", "set-function-name": "^2.0.2" } }, "sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA=="],

    "resolve": ["resolve@1.22.12", "", { "dependencies": { "es-errors": "^1.3.0", "is-core-module": "^2.16.1", "path-parse": "^1.0.7", "supports-preserve-symlinks-flag": "^1.0.0" }, "bin": { "resolve": "bin/resolve" } }, "sha512-TyeJ1zif53BPfHootBGwPRYT1RUt6oGWsaQr8UyZW/eAm9bKoijtvruSDEmZHm92CwS9nj7/fWttqPCgzep8CA=="],

    "resolve-from": ["resolve-from@4.0.0", "", {}, "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g=="],

    "resolve-pkg-maps": ["resolve-pkg-maps@1.0.0", "", {}, "sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw=="],

    "reusify": ["reusify@1.1.0", "", {}, "sha512-g6QUff04oZpHs0eG5p83rFLhHeV00ug/Yf9nZM6fLeUrPguBTkTQOdpAWWspMh55TZfVQDPaN3NQJfbVRAxdIw=="],

    "rimraf": ["rimraf@3.0.2", "", { "dependencies": { "glob": "^7.1.3" }, "bin": { "rimraf": "bin.js" } }, "sha512-JZkJMZkAGFFPP2YqXZXPbMlMBgsxzE8ILs4lMIX/2o0L9UBw9O/Y3o6wFw/i9YLapcUJWwqbi3kdxIPdC62TIA=="],

    "run-parallel": ["run-parallel@1.2.0", "", { "dependencies": { "queue-microtask": "^1.2.2" } }, "sha512-5l4VyZR86LZ/lDxZTR6jqL8AFE2S0IFLMP26AbjsLVADxHdhB/c0GUsH+y39UfCi3dzz8OlQuPmnaJOMoDHQBA=="],

    "safe-array-concat": ["safe-array-concat@1.1.4", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "get-intrinsic": "^1.3.0", "has-symbols": "^1.1.0", "isarray": "^2.0.5" } }, "sha512-wtZlHyOje6OZTGqAoaDKxFkgRtkF9CnHAVnCHKfuj200wAgL+bSJhdsCD2l0Qx/2ekEXjPWcyKkfGb5CPboslg=="],

    "safe-push-apply": ["safe-push-apply@1.0.0", "", { "dependencies": { "es-errors": "^1.3.0", "isarray": "^2.0.5" } }, "sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA=="],

    "safe-regex-test": ["safe-regex-test@1.1.0", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "is-regex": "^1.2.1" } }, "sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw=="],

    "scheduler": ["scheduler@0.23.2", "", { "dependencies": { "loose-envify": "^1.1.0" } }, "sha512-UOShsPwz7NrMUqhR6t0hWjFduvOzbtv7toDH1/hIrfRNIDBnnBWd0CwJTGvTpngVlmwGCdP9/Zl/tVrDqcuYzQ=="],

    "semver": ["semver@6.3.1", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA=="],

    "set-function-length": ["set-function-length@1.2.2", "", { "dependencies": { "define-data-property": "^1.1.4", "es-errors": "^1.3.0", "function-bind": "^1.1.2", "get-intrinsic": "^1.2.4", "gopd": "^1.0.1", "has-property-descriptors": "^1.0.2" } }, "sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg=="],

    "set-function-name": ["set-function-name@2.0.2", "", { "dependencies": { "define-data-property": "^1.1.4", "es-errors": "^1.3.0", "functions-have-names": "^1.2.3", "has-property-descriptors": "^1.0.2" } }, "sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ=="],

    "set-proto": ["set-proto@1.0.0", "", { "dependencies": { "dunder-proto": "^1.0.1", "es-errors": "^1.3.0", "es-object-atoms": "^1.0.0" } }, "sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw=="],

    "shebang-command": ["shebang-command@2.0.0", "", { "dependencies": { "shebang-regex": "^3.0.0" } }, "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA=="],

    "shebang-regex": ["shebang-regex@3.0.0", "", {}, "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A=="],

    "side-channel": ["side-channel@1.1.1", "", { "dependencies": { "es-errors": "^1.3.0", "object-inspect": "^1.13.4", "side-channel-list": "^1.0.1", "side-channel-map": "^1.0.1", "side-channel-weakmap": "^1.0.2" } }, "sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ=="],

    "side-channel-list": ["side-channel-list@1.0.1", "", { "dependencies": { "es-errors": "^1.3.0", "object-inspect": "^1.13.4" } }, "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w=="],

    "side-channel-map": ["side-channel-map@1.0.1", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.5", "object-inspect": "^1.13.3" } }, "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA=="],

    "side-channel-weakmap": ["side-channel-weakmap@1.0.2", "", { "dependencies": { "call-bound": "^1.0.2", "es-errors": "^1.3.0", "get-intrinsic": "^1.2.5", "object-inspect": "^1.13.3", "side-channel-map": "^1.0.1" } }, "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A=="],

    "signal-exit": ["signal-exit@4.1.0", "", {}, "sha512-bzyZ1e88w9O1iNJbKnOlvYTrWPDl46O1bG0D3XInv+9tkPrxrN8jUUTiFlDkkmKWgn1M6CfIA13SuGqOa9Korw=="],

    "source-map-js": ["source-map-js@1.2.2", "", {}, "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw=="],

    "stable-hash": ["stable-hash@0.0.5", "", {}, "sha512-+L3ccpzibovGXFK+Ap/f8LOS0ahMrHTf3xu7mMLSpEGU0EO9ucaysSylKo9eRDFNhWve/y275iPmIZ4z39a9iA=="],

    "stop-iteration-iterator": ["stop-iteration-iterator@1.1.0", "", { "dependencies": { "es-errors": "^1.3.0", "internal-slot": "^1.1.0" } }, "sha512-eLoXW/DHyl62zxY4SCaIgnRhuMr6ri4juEYARS8E6sCEqzKpOiE521Ucofdx+KnDZl5xmvGYaaKCk5FEOxJCoQ=="],

    "streamsearch": ["streamsearch@1.1.0", "", {}, "sha512-Mcc5wHehp9aXz1ax6bZUyY5afg9u2rv5cqQI3mRrYkGC8rW2hM02jWuwjtL++LS5qinSyhj2QfLyNsuc+VsExg=="],

    "string-width": ["string-width@5.1.2", "", { "dependencies": { "eastasianwidth": "^0.2.0", "emoji-regex": "^9.2.2", "strip-ansi": "^7.0.1" } }, "sha512-HnLOCR3vjcY8beoNLtcjZ5/nxn2afmME6lhrDrebokqMap+XbeW8n9TXpPDOqdGK5qcI3oT0GKTW6wC7EMiVqA=="],

    "string-width-cjs": ["string-width@4.2.3", "", { "dependencies": { "emoji-regex": "^8.0.0", "is-fullwidth-code-point": "^3.0.0", "strip-ansi": "^6.0.1" } }, "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g=="],

    "string.prototype.includes": ["string.prototype.includes@2.0.1", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-abstract": "^1.23.3" } }, "sha512-o7+c9bW6zpAdJHTtujeePODAhkuicdAryFsfVKwA+wGw89wJ4GTY484WTucM9hLtDEOpOvI+aHnzqnC5lHp4Rg=="],

    "string.prototype.matchall": ["string.prototype.matchall@4.1.0", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-errors": "^1.3.0", "es-object-atoms": "^1.1.2", "get-intrinsic": "^1.3.0", "gopd": "^1.2.0", "has-symbols": "^1.1.0", "internal-slot": "^1.1.0", "regexp.prototype.flags": "^1.5.4", "set-function-name": "^2.0.2", "side-channel": "^1.1.1" } }, "sha512-tHNHTxInrYLCga9O9YGxWA3G9/nnzQw8UGAyqGx3Ar1pSTTzIuM4woFSq4SowkXCjJIwq5sIiQvEfRI9tCH1qQ=="],

    "string.prototype.repeat": ["string.prototype.repeat@1.0.0", "", { "dependencies": { "define-properties": "^1.1.3", "es-abstract": "^1.17.5" } }, "sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w=="],

    "string.prototype.trim": ["string.prototype.trim@1.2.11", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-data-property": "^1.1.4", "define-properties": "^1.2.1", "es-abstract": "^1.24.2", "es-object-atoms": "^1.1.2", "has-property-descriptors": "^1.0.2", "safe-regex-test": "^1.1.0" } }, "sha512-PwvK7BU+CMTJGYQCTZb5RWXIML92lftJLhQz1tBzgKiqGxJaMlBAa48POXaNAC2s4y8jr3EFqrkF9+44neS46w=="],

    "string.prototype.trimend": ["string.prototype.trimend@1.0.10", "", { "dependencies": { "call-bind": "^1.0.9", "call-bound": "^1.0.4", "define-properties": "^1.2.1", "es-object-atoms": "^1.1.2" } }, "sha512-2+3aDAOmPTmuFwjDnmJG2ctEkQKVki7vOSqaxkv42Mowj1V6PnvuwFCRrR5lChUux1TBskPjfkeTOhqczDMxTw=="],

    "string.prototype.trimstart": ["string.prototype.trimstart@1.0.8", "", { "dependencies": { "call-bind": "^1.0.7", "define-properties": "^1.2.1", "es-object-atoms": "^1.0.0" } }, "sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg=="],

    "strip-ansi": ["strip-ansi@6.0.1", "", { "dependencies": { "ansi-regex": "^5.0.1" } }, "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A=="],

    "strip-ansi-cjs": ["strip-ansi@6.0.1", "", { "dependencies": { "ansi-regex": "^5.0.1" } }, "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A=="],

    "strip-bom": ["strip-bom@3.0.0", "", {}, "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA=="],

    "strip-json-comments": ["strip-json-comments@3.1.1", "", {}, "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig=="],

    "styled-jsx": ["styled-jsx@5.1.1", "", { "dependencies": { "client-only": "0.0.1" }, "peerDependencies": { "@babel/core": "*", "babel-plugin-macros": "*", "react": ">= 16.8.0 || 17.x.x || ^18.0.0-0" }, "optionalPeers": ["@babel/core", "babel-plugin-macros"] }, "sha512-pW7uC1l4mBZ8ugbiZrcIsiIvVx1UmTfw7UkC3Um2tmfUq9Bhk8IiyEIPl6F8agHgjzku6j0xQEZbfA5uSgSaCw=="],

    "sucrase": ["sucrase@3.35.1", "", { "dependencies": { "@jridgewell/gen-mapping": "^0.3.2", "commander": "^4.0.0", "lines-and-columns": "^1.1.6", "mz": "^2.7.0", "pirates": "^4.0.1", "tinyglobby": "^0.2.11", "ts-interface-checker": "^0.1.9" }, "bin": { "sucrase": "bin/sucrase", "sucrase-node": "bin/sucrase-node" } }, "sha512-DhuTmvZWux4H1UOnWMB3sk0sbaCVOoQZjv8u1rDoTV0HTdGem9hkAZtl4JZy8P2z4Bg0nT+YMeOFyVr4zcG5Tw=="],

    "supports-color": ["supports-color@7.2.0", "", { "dependencies": { "has-flag": "^4.0.0" } }, "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw=="],

    "supports-preserve-symlinks-flag": ["supports-preserve-symlinks-flag@1.0.0", "", {}, "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w=="],

    "tailwind-merge": ["tailwind-merge@2.6.1", "", {}, "sha512-Oo6tHdpZsGpkKG88HJ8RR1rg/RdnEkQEfMoEk2x1XRI3F1AxeU+ijRXpiVUF4UbLfcxxRGw6TbUINKYdWVsQTQ=="],

    "tailwindcss": ["tailwindcss@3.4.19", "", { "dependencies": { "@alloc/quick-lru": "^5.2.0", "arg": "^5.0.2", "chokidar": "^3.6.0", "didyoumean": "^1.2.2", "dlv": "^1.1.3", "fast-glob": "^3.3.2", "glob-parent": "^6.0.2", "is-glob": "^4.0.3", "jiti": "^1.21.7", "lilconfig": "^3.1.3", "micromatch": "^4.0.8", "normalize-path": "^3.0.0", "object-hash": "^3.0.0", "picocolors": "^1.1.1", "postcss": "^8.4.47", "postcss-import": "^15.1.0", "postcss-js": "^4.0.1", "postcss-load-config": "^4.0.2 || ^5.0 || ^6.0", "postcss-nested": "^6.2.0", "postcss-selector-parser": "^6.1.2", "resolve": "^1.22.8", "sucrase": "^3.35.0" }, "bin": { "tailwind": "lib/cli.js", "tailwindcss": "lib/cli.js" } }, "sha512-3ofp+LL8E+pK/JuPLPggVAIaEuhvIz4qNcf3nA1Xn2o/7fb7s/TYpHhwGDv1ZU3PkBluUVaF8PyCHcm48cKLWQ=="],

    "text-table": ["text-table@0.2.0", "", {}, "sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw=="],

    "thenify": ["thenify@3.3.1", "", { "dependencies": { "any-promise": "^1.0.0" } }, "sha512-RVZSIV5IG10Hk3enotrhvz0T9em6cyHBLkH/YAZuKqd8hRkKhSfCGIcP2KUY0EPxndzANBmNllzWPwak+bheSw=="],

    "thenify-all": ["thenify-all@1.6.0", "", { "dependencies": { "thenify": ">= 3.1.0 < 4" } }, "sha512-RNxQH/qI8/t3thXJDwcstUO4zeqo64+Uy/+sNVRBx4Xn2OX+OZ9oP+iJnNFqplFra2ZUVeKCSa2oVWi3T4uVmA=="],

    "tinyglobby": ["tinyglobby@0.2.17", "", { "dependencies": { "fdir": "^6.5.0", "picomatch": "^4.0.4" } }, "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g=="],

    "to-regex-range": ["to-regex-range@5.0.1", "", { "dependencies": { "is-number": "^7.0.0" } }, "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ=="],

    "ts-api-utils": ["ts-api-utils@2.5.0", "", { "peerDependencies": { "typescript": ">=4.8.4" } }, "sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA=="],

    "ts-interface-checker": ["ts-interface-checker@0.1.13", "", {}, "sha512-Y/arvbn+rrz3JCKl9C4kVNfTfSm2/mEp5FSz5EsZSANGPSlQrpRI5M4PKF+mJnE52jOO90PnPSc3Ur3bTQw0gA=="],

    "tsconfig-paths": ["tsconfig-paths@3.15.0", "", { "dependencies": { "@types/json5": "^0.0.29", "json5": "^1.0.2", "minimist": "^1.2.6", "strip-bom": "^3.0.0" } }, "sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg=="],

    "tslib": ["tslib@2.8.1", "", {}, "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w=="],

    "type-check": ["type-check@0.4.0", "", { "dependencies": { "prelude-ls": "^1.2.1" } }, "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew=="],

    "type-fest": ["type-fest@0.20.2", "", {}, "sha512-Ne+eE4r0/iWnpAxD852z3A+N0Bt5RN//NjJwRd2VFHEmrywxf5vsZlh4R6lixl6B+wz/8d+maTSAkN1FIkI3LQ=="],

    "typed-array-buffer": ["typed-array-buffer@1.0.3", "", { "dependencies": { "call-bound": "^1.0.3", "es-errors": "^1.3.0", "is-typed-array": "^1.1.14" } }, "sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw=="],

    "typed-array-byte-length": ["typed-array-byte-length@1.0.3", "", { "dependencies": { "call-bind": "^1.0.8", "for-each": "^0.3.3", "gopd": "^1.2.0", "has-proto": "^1.2.0", "is-typed-array": "^1.1.14" } }, "sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg=="],

    "typed-array-byte-offset": ["typed-array-byte-offset@1.0.5", "", { "dependencies": { "available-typed-arrays": "^1.0.7", "call-bind": "^1.0.9", "for-each": "^0.3.5", "gopd": "^1.2.0", "is-typed-array": "^1.1.15", "reflect.getprototypeof": "^1.0.10" } }, "sha512-0FHJvLPqZ7KJzp17O13jfsAjsqazgrxBu2zEK95PmUz8lv2+GjRuxUInCr2Rk9Dms3ihN21zJ929ZO43yJ95QQ=="],

    "typed-array-length": ["typed-array-length@1.0.8", "", { "dependencies": { "call-bind": "^1.0.9", "for-each": "^0.3.5", "gopd": "^1.2.0", "is-typed-array": "^1.1.15", "possible-typed-array-names": "^1.1.0", "reflect.getprototypeof": "^1.0.10" } }, "sha512-phPGCwqr2+Qo0fwniCE8e4pKnGu/yFb5nD5Y8bf0EEeiI5GklnACYA9GFy/DrAeRrKHXvHn+1SUsOWgJp6RO+g=="],

    "typescript": ["typescript@5.9.3", "", { "bin": { "tsc": "bin/tsc", "tsserver": "bin/tsserver" } }, "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw=="],

    "unbox-primitive": ["unbox-primitive@1.1.0", "", { "dependencies": { "call-bound": "^1.0.3", "has-bigints": "^1.0.2", "has-symbols": "^1.1.0", "which-boxed-primitive": "^1.1.1" } }, "sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw=="],

    "undici-types": ["undici-types@6.21.0", "", {}, "sha512-iwDZqg0QAGrg9Rav5H4n0M64c3mkR59cJ6wQp+7C4nI0gsmExaedaYLNO44eT4AtBBwjbTiGPMlt2Md0T9H9JQ=="],

    "unrs-resolver": ["unrs-resolver@1.12.2", "", { "dependencies": { "napi-postinstall": "^0.3.4" }, "optionalDependencies": { "@unrs/resolver-binding-android-arm-eabi": "1.12.2", "@unrs/resolver-binding-android-arm64": "1.12.2", "@unrs/resolver-binding-darwin-arm64": "1.12.2", "@unrs/resolver-binding-darwin-x64": "1.12.2", "@unrs/resolver-binding-freebsd-x64": "1.12.2", "@unrs/resolver-binding-linux-arm-gnueabihf": "1.12.2", "@unrs/resolver-binding-linux-arm-musleabihf": "1.12.2", "@unrs/resolver-binding-linux-arm64-gnu": "1.12.2", "@unrs/resolver-binding-linux-arm64-musl": "1.12.2", "@unrs/resolver-binding-linux-loong64-gnu": "1.12.2", "@unrs/resolver-binding-linux-loong64-musl": "1.12.2", "@unrs/resolver-binding-linux-ppc64-gnu": "1.12.2", "@unrs/resolver-binding-linux-riscv64-gnu": "1.12.2", "@unrs/resolver-binding-linux-riscv64-musl": "1.12.2", "@unrs/resolver-binding-linux-s390x-gnu": "1.12.2", "@unrs/resolver-binding-linux-x64-gnu": "1.12.2", "@unrs/resolver-binding-linux-x64-musl": "1.12.2", "@unrs/resolver-binding-openharmony-arm64": "1.12.2", "@unrs/resolver-binding-wasm32-wasi": "1.12.2", "@unrs/resolver-binding-win32-arm64-msvc": "1.12.2", "@unrs/resolver-binding-win32-ia32-msvc": "1.12.2", "@unrs/resolver-binding-win32-x64-msvc": "1.12.2" } }, "sha512-dmlRxBJJayXjqTwC+JtF1HhJmgf3ftQ3YejFcZrf4+KKtJv0qDsK1pjqaaVjG7wJ5NJ6UVP1OqRMQ71Z4C3rxQ=="],

    "update-browserslist-db": ["update-browserslist-db@1.3.3", "", { "dependencies": { "escalade": "^3.2.0", "picocolors": "^1.1.1" }, "peerDependencies": { "browserslist": ">= 4.21.0" }, "bin": { "update-browserslist-db": "cli.js" } }, "sha512-pJ2sYawQS0R/WI928Gj5GlPhTGzbMelq0+4INtSYNDV9ErKJcX6xjGWkoG/VnB3dpUm00zALaqkrUD77pO5TDQ=="],

    "uri-js": ["uri-js@4.4.1", "", { "dependencies": { "punycode": "^2.1.0" } }, "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg=="],

    "util-deprecate": ["util-deprecate@1.0.2", "", {}, "sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw=="],

    "which": ["which@2.0.2", "", { "dependencies": { "isexe": "^2.0.0" }, "bin": { "node-which": "./bin/node-which" } }, "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA=="],

    "which-boxed-primitive": ["which-boxed-primitive@1.1.1", "", { "dependencies": { "is-bigint": "^1.1.0", "is-boolean-object": "^1.2.1", "is-number-object": "^1.1.1", "is-string": "^1.1.1", "is-symbol": "^1.1.1" } }, "sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA=="],

    "which-builtin-type": ["which-builtin-type@1.2.1", "", { "dependencies": { "call-bound": "^1.0.2", "function.prototype.name": "^1.1.6", "has-tostringtag": "^1.0.2", "is-async-function": "^2.0.0", "is-date-object": "^1.1.0", "is-finalizationregistry": "^1.1.0", "is-generator-function": "^1.0.10", "is-regex": "^1.2.1", "is-weakref": "^1.0.2", "isarray": "^2.0.5", "which-boxed-primitive": "^1.1.0", "which-collection": "^1.0.2", "which-typed-array": "^1.1.16" } }, "sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q=="],

    "which-collection": ["which-collection@1.0.2", "", { "dependencies": { "is-map": "^2.0.3", "is-set": "^2.0.3", "is-weakmap": "^2.0.2", "is-weakset": "^2.0.3" } }, "sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw=="],

    "which-typed-array": ["which-typed-array@1.1.24", "", { "dependencies": { "available-typed-arrays": "^1.0.7", "call-bind": "^1.0.9", "call-bound": "^1.0.4", "for-each": "^0.3.5", "get-proto": "^1.0.1", "gopd": "^1.2.0", "has-tostringtag": "^1.0.2" } }, "sha512-wk4Mf4pR5mRP7eYuuTBCIQ9d0ud2Fv2jRLQpfgnRjbOxAFHmjKFValgTpitVKzJJS8ajnYQV2Du1SZ8j6b/EUQ=="],

    "word-wrap": ["word-wrap@1.2.5", "", {}, "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA=="],

    "wrap-ansi": ["wrap-ansi@8.1.0", "", { "dependencies": { "ansi-styles": "^6.1.0", "string-width": "^5.0.1", "strip-ansi": "^7.0.1" } }, "sha512-si7QWI6zUMq56bESFvagtmzMdGOtoxfR+Sez11Mobfc7tm+VkUckk9bW2UeffTGVUbOksxmSw0AA2gs8g71NCQ=="],

    "wrap-ansi-cjs": ["wrap-ansi@7.0.0", "", { "dependencies": { "ansi-styles": "^4.0.0", "string-width": "^4.1.0", "strip-ansi": "^6.0.0" } }, "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q=="],

    "wrappy": ["wrappy@1.0.2", "", {}, "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ=="],

    "yocto-queue": ["yocto-queue@0.1.0", "", {}, "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q=="],

    "@isaacs/cliui/strip-ansi": ["strip-ansi@7.2.0", "", { "dependencies": { "ansi-regex": "^6.2.2" } }, "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w=="],

    "@typescript-eslint/eslint-plugin/ignore": ["ignore@7.0.11", "", {}, "sha512-YChdK5txDjwGUvgR7oCJcLGkwi3LDh8Zx8tS7ndYciLEg/oOCL26VUBSUEtgS7EjiybcBqFxh5j0rAdDX7/bbg=="],

    "@typescript-eslint/typescript-estree/minimatch": ["minimatch@10.2.6", "", { "dependencies": { "brace-expansion": "^5.0.8" } }, "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A=="],

    "@typescript-eslint/typescript-estree/semver": ["semver@7.8.5", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA=="],

    "@typescript-eslint/visitor-keys/eslint-visitor-keys": ["eslint-visitor-keys@5.0.1", "", {}, "sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA=="],

    "chokidar/glob-parent": ["glob-parent@5.1.2", "", { "dependencies": { "is-glob": "^4.0.1" } }, "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow=="],

    "eslint-import-resolver-node/debug": ["debug@3.2.7", "", { "dependencies": { "ms": "^2.1.1" } }, "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ=="],

    "eslint-import-resolver-node/resolve": ["resolve@2.0.0-next.7", "", { "dependencies": { "es-errors": "^1.3.0", "is-core-module": "^2.16.2", "node-exports-info": "^1.6.0", "object-keys": "^1.1.1", "path-parse": "^1.0.7", "supports-preserve-symlinks-flag": "^1.0.0" }, "bin": { "resolve": "bin/resolve" } }, "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ=="],

    "eslint-module-utils/debug": ["debug@3.2.7", "", { "dependencies": { "ms": "^2.1.1" } }, "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ=="],

    "eslint-plugin-import/debug": ["debug@3.2.7", "", { "dependencies": { "ms": "^2.1.1" } }, "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ=="],

    "eslint-plugin-import/doctrine": ["doctrine@2.1.0", "", { "dependencies": { "esutils": "^2.0.2" } }, "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw=="],

    "eslint-plugin-react/doctrine": ["doctrine@2.1.0", "", { "dependencies": { "esutils": "^2.0.2" } }, "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw=="],

    "eslint-plugin-react/resolve": ["resolve@2.0.0-next.7", "", { "dependencies": { "es-errors": "^1.3.0", "is-core-module": "^2.16.2", "node-exports-info": "^1.6.0", "object-keys": "^1.1.1", "path-parse": "^1.0.7", "supports-preserve-symlinks-flag": "^1.0.0" }, "bin": { "resolve": "bin/resolve" } }, "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ=="],

    "fast-glob/glob-parent": ["glob-parent@5.1.2", "", { "dependencies": { "is-glob": "^4.0.1" } }, "sha512-AOIgSQCepiJYwP3ARnGx+5VnTu2HBYdzbGP45eLw1vr3zB3vZLeyed1sC9hnbcOc9/SrMyM5RPQrkGz4aS9Zow=="],

    "glob/minimatch": ["minimatch@9.0.9", "", { "dependencies": { "brace-expansion": "^2.0.2" } }, "sha512-OBwBN9AL4dqmETlpS2zasx+vTeWclWzkblfZk7KTA5j3jeOONz/tRCnZomUyvNg83wL5Zv9Ss6HMJXAgL8R2Yg=="],

    "is-bun-module/semver": ["semver@7.8.5", "", { "bin": { "semver": "bin/semver.js" } }, "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA=="],

    "next/postcss": ["postcss@8.4.31", "", { "dependencies": { "nanoid": "^3.3.6", "picocolors": "^1.0.0", "source-map-js": "^1.0.2" } }, "sha512-PS08Iboia9mts/2ygV3eLpY5ghnUcfLV/EXTOW1E2qYxJKGGBUtNjN76FYHnMs36RmARn41bC0AZmn+rR0OVpQ=="],

    "rimraf/glob": ["glob@7.2.3", "", { "dependencies": { "fs.realpath": "^1.0.0", "inflight": "^1.0.4", "inherits": "2", "minimatch": "^3.1.1", "once": "^1.3.0", "path-is-absolute": "^1.0.0" } }, "sha512-nFR0zLpU2YCaRxwoCJvL6UvCH2JFyFVIvwTLsIf21AuHlMskA1hhTdk+LlYJtOlYt9v6dvszD2BGRqBL+iQK9Q=="],

    "string-width/strip-ansi": ["strip-ansi@7.2.0", "", { "dependencies": { "ansi-regex": "^6.2.2" } }, "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w=="],

    "string-width-cjs/emoji-regex": ["emoji-regex@8.0.0", "", {}, "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="],

    "tinyglobby/picomatch": ["picomatch@4.0.7", "", {}, "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA=="],

    "wrap-ansi/ansi-styles": ["ansi-styles@6.2.3", "", {}, "sha512-4Dj6M28JB+oAH8kFkTLUo+a2jwOFkuqb3yucU0CANcRRUbxS0cP0nZYCGjcc3BNXwRIsUVmDGgzawme7zvJHvg=="],

    "wrap-ansi/strip-ansi": ["strip-ansi@7.2.0", "", { "dependencies": { "ansi-regex": "^6.2.2" } }, "sha512-yDPMNjp4WyfYBkHnjIRLfca1i6KMyGCtsVgoKe/z1+6vukgaENdgGBZt+ZmKPc4gavvEZ5OgHfHdrazhgNyG7w=="],

    "wrap-ansi-cjs/string-width": ["string-width@4.2.3", "", { "dependencies": { "emoji-regex": "^8.0.0", "is-fullwidth-code-point": "^3.0.0", "strip-ansi": "^6.0.1" } }, "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g=="],

    "@isaacs/cliui/strip-ansi/ansi-regex": ["ansi-regex@6.4.0", "", {}, "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw=="],

    "@typescript-eslint/typescript-estree/minimatch/brace-expansion": ["brace-expansion@5.0.12", "", { "dependencies": { "balanced-match": "^4.0.2" } }, "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ=="],

    "glob/minimatch/brace-expansion": ["brace-expansion@2.1.7", "", { "dependencies": { "balanced-match": "^1.0.0" } }, "sha512-uZbew1NqdmPDTMJ8ah1y+b+9QEJrfkXFk3RcTQw3X0jW/xRUvFKsg1CfQdSYGdTbXZWExtU3J3ccxtnfw1Fi0g=="],

    "string-width/strip-ansi/ansi-regex": ["ansi-regex@6.4.0", "", {}, "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw=="],

    "wrap-ansi-cjs/string-width/emoji-regex": ["emoji-regex@8.0.0", "", {}, "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A=="],

    "wrap-ansi/strip-ansi/ansi-regex": ["ansi-regex@6.4.0", "", {}, "sha512-KzTVk2tCWAHtYrvvvaP8bJKJq2pVinhLcGEQdtLIYPbmNGNyYe8QwNaTUYQp2J7/vIsUKt5QCqAfUkYyG9DkOw=="],

    "@typescript-eslint/typescript-estree/minimatch/brace-expansion/balanced-match": ["balanced-match@4.0.4", "", {}, "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA=="],
  }
}

```

### `metadata.json`

```json
{
  "name": "LottoBet - Odds Filter & Betslip Generator",
  "description": "Multi-bookie odds filter and betslip generator for SportyBet Kenya.",
  "permissions": [],
  "capabilities": [
    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"
  ]
}

```

### `next-env.d.ts`

```typescript
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.

```

### `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

module.exports = nextConfig;

```

### `package.json`

```json
{
  "name": "slip-generator",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000 -H 0.0.0.0",
    "build": "next build",
    "start": "next start -p 3000 -H 0.0.0.0",
    "lint": "next lint"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "next": "14.2.24",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.17.19",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "eslint-config-next": "14.2.24",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  }
}

```

### `postcss.config.js`

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

```

### `src/app/api/generate-code/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { BookieId, SelectedPick } from '@/types';
import { convertSelectionsToBookingCode } from '@/lib/codeConverter';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const destinationBookie: BookieId = body.destination_bookie || body.destinationBookie || 'sportybet:ke';
    const selections: SelectedPick[] = body.selections || [];

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide at least 1 match selection to generate a booking code.',
        },
        { status: 400 }
      );
    }

    if (destinationBookie !== 'sportybet:ke') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid destination bookie. Supported option: sportybet:ke.',
        },
        { status: 400 }
      );
    }

    const response = await convertSelectionsToBookingCode(destinationBookie, selections);
    if (!response.success) {
      return NextResponse.json(response, { status: 422 });
    }
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to generate booking code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate booking code due to an internal server error.',
      },
      { status: 500 }
    );
  }
}

```

### `src/app/api/odds/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchLiveOdds } from '@/lib/oddsFetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchLiveOdds();
    return NextResponse.json({
      success: true,
      count: result.games.length,
      source: result.source,
      timestamp: new Date().toISOString(),
      games: result.games,
    });
  } catch (error) {
    console.error('Failed to fetch odds:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to retrieve match odds at this time.',
      },
      { status: 500 }
    );
  }
}

```

### `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #090d16;
  --foreground: #f8fafc;
}

body {
  color: var(--foreground);
  background-color: var(--background);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #0f172a;
}
::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

```

### `src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LottoBet - Odds Filter & Betslip Generator',
   description: 'Multi-bookie odds filter and betslip generator for SportyBet Kenya.',
   openGraph: {
     title: 'LottoBet - Odds Filter & Betslip Generator',
     description: 'Multi-bookie odds filter and betslip generator for SportyBet Kenya.',
    siteName: 'LottoBet',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

```

### `src/app/page.tsx`

```typescript
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { StandardGame, FilterCriteria, SelectedPick, BookieId } from '@/types';
import { DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import {
  evaluateAndFilterGames,
  pickRandomSelections,
  pickSmartSelections,
  mergePicksIntoSlip,
  calculateAccumulatorOdds,
} from '@/lib/filterEngine';
import { FilterBar } from '@/components/FilterBar';
import { GameCard } from '@/components/GameCard';
import { BetslipDrawer } from '@/components/BetslipDrawer';
import { ExportModal } from '@/components/ExportModal';
import {
  Dices,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCheck,
  AlertTriangle,
  Flame,
  Layers,
  Zap,
  Building2,
} from 'lucide-react';

export default function HomePage() {
  const [games, setGames] = useState<StandardGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oddsSource, setOddsSource] = useState<'api'>('api');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_FILTER_CRITERIA);
  const [selectedPicks, setSelectedPicks] = useState<SelectedPick[]>([]);
  const [stake, setStake] = useState<number>(50);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'picked'>('all');

  // Fetch games from /api/odds
  const loadOdds = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/odds');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to ingest match odds');
      }
      setGames(data.games || []);
      setOddsSource(data.source || 'api');
      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching match odds';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOdds();
  }, []);

  // Compute evaluations and filtering for the active criteria
  const evaluations = useMemo(() => {
    return evaluateAndFilterGames(games, criteria);
  }, [games, criteria]);

  // Compute live counts for each company filter
  const companyCounts = useMemo(() => {
    const all = evaluateAndFilterGames(games, { ...criteria, selectedCompany: 'ALL' }).length;
    const sportybet = evaluateAndFilterGames(games, { ...criteria, selectedCompany: 'sportybet:ke' }).length;
    return { all, sportybet };
  }, [games, criteria]);

  // Extract unique available leagues for dropdown filter
  const availableLeagues = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.league) set.add(g.league);
    });
    return Array.from(set).sort();
  }, [games]);

  // Map of currently selected picks by gameId for fast lookup
  const selectedPicksMap = useMemo(() => {
    const map = new Map<string, SelectedPick>();
    selectedPicks.forEach((p) => map.set(p.gameId, p));
    return map;
  }, [selectedPicks]);

  // Initial automatic random pick once games are loaded
  useEffect(() => {
    if (evaluations.length > 0 && selectedPicks.length === 0) {
      const initialPicks = pickRandomSelections(evaluations, criteria.pickCount);
      setSelectedPicks(initialPicks);
    }
  }, [evaluations, criteria.pickCount, selectedPicks.length]);

  // Handle changing target company
  const handleCompanyChange = (bookie: 'ALL' | BookieId) => {
    setCriteria((prev) => ({ ...prev, selectedCompany: bookie }));
    if (bookie === 'sportybet:ke' && stake < 15) {
      setStake(15);
    }
  };

  // Shuffle & replace entire slip using Fisher-Yates
  const handleShuffleAndPick = () => {
    if (evaluations.length === 0) return;
    const newPicks = pickRandomSelections(evaluations, criteria.pickCount);
    setSelectedPicks(newPicks);
  };

  /** Enable full-market-data filter and rebuild slip — for testing real booking codes */
  const handleUseBookableOnly = () => {
    const next: FilterCriteria = { ...criteria, requireFullMarketData: true };
    setCriteria(next);
    const evals = evaluateAndFilterGames(games, next);
    const newPicks = pickRandomSelections(evals, next.pickCount);
    setSelectedPicks(newPicks);
  };

  /**
   * Apply current filters, AI-pick `count` new games, ADD to slip (no duplicates).
   * Filters stay as-is so you can tweak and add again; use resetFilters to clear criteria only.
   */
  const handleAddAiPicks = (count: number) => {
    const n = Math.max(1, Math.min(50, count || criteria.pickCount));
    const exclude = new Set(selectedPicks.map((p) => p.gameId));
    const fresh = pickSmartSelections(evaluations, n, exclude);
    if (fresh.length === 0) return;
    setSelectedPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  /** Same as AI add but pure random under current filters */
  const handleAddRandomPicks = (count: number) => {
    const n = Math.max(1, Math.min(50, count || criteria.pickCount));
    const exclude = new Set(selectedPicks.map((p) => p.gameId));
    const pool = evaluations.filter((ev) => !exclude.has(ev.game.id));
    const fresh = pickRandomSelections(pool, n);
    if (fresh.length === 0) return;
    setSelectedPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  /**
   * Add the next N unselected games (earliest kickoff first) using current filters.
   * Keeps all pre-existing picks in the slip — only appends new games.
   */
  const handleAddNextPicks = (count: number) => {
    const n = Math.max(1, Math.min(50, count || criteria.pickCount));
    const exclude = new Set(selectedPicks.map((p) => p.gameId));
    const pool = evaluations.filter((ev) => !exclude.has(ev.game.id));
    const sorted = [...pool].sort(
      (a, b) => new Date(a.game.kickoffTime).getTime() - new Date(b.game.kickoffTime).getTime()
    );
    const fresh = pickRandomSelections(sorted.slice(0, n), n);
    if (fresh.length === 0) return;
    setSelectedPicks((prev) => mergePicksIntoSlip(prev, fresh));
  };

  /**
   * Remove the last N picks from the slip (highest-risk games / latest additions).
   */
  const handleRemoveGames = (count: number) => {
    const n = Math.max(1, Math.min(50, count || criteria.pickCount));
    setSelectedPicks((prev) => prev.slice(0, Math.max(0, prev.length - n)));
  };

  /** Reset filter criteria to defaults without clearing the betslip */
  const handleResetFiltersKeepSlip = () => {
    setCriteria({ ...DEFAULT_FILTER_CRITERIA });
  };

  // Toggle selection on/off for a given pick
  const handleTogglePick = (pick: SelectedPick) => {
    setSelectedPicks((prev) => {
      const exists = prev.some((p) => p.gameId === pick.gameId);
      if (exists) {
        return prev.filter((p) => p.gameId !== pick.gameId);
      } else {
        return [...prev, pick];
      }
    });
  };

  // Select a specific market pick for a match
  const handleSelectSpecificPick = (pick: SelectedPick) => {
    setSelectedPicks((prev) => {
      const filtered = prev.filter((p) => p.gameId !== pick.gameId);
      return [...filtered, pick];
    });
  };

  // Remove pick
  const handleRemovePick = (gameId: string) => {
    setSelectedPicks((prev) => prev.filter((p) => p.gameId !== gameId));
  };

  // Clear entire slip
  const handleClearSlip = () => {
    setSelectedPicks([]);
  };

  const totalOdds = calculateAccumulatorOdds(selectedPicks);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-36">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0d1422]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-[#0d1422] rounded-[10px] flex items-center justify-center text-emerald-400">
                <Dices className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white flex items-center">
                  Lotto<span className="text-emerald-400">Bet</span>
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  KE v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Multi-Bookie Odds Filtering & Betslip Generator
              </p>
            </div>
          </div>

          {/* Right Header Status Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SportyBet Live Odds</span>
              {lastUpdated && <span className="text-slate-400 font-mono">({lastUpdated})</span>}
            </div>

            <button
              onClick={loadOdds}
              disabled={loading}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs flex items-center gap-1.5 transition-all"
              title="Refresh match odds"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              disabled={selectedPicks.length === 0}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Get Booking Code</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Quick Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Eligible Pool</span>
              <span className="text-lg font-black text-white font-mono">{evaluations.length} Matches</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Slip Selections</span>
              <span className="text-lg font-black text-white font-mono">{selectedPicks.length} Games</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Accumulator Odds</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{totalOdds.toLocaleString()}x</span>
            </div>
          </div>

          <div className="bg-[#111927] border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Active Company</span>
              <span className="text-xs font-bold text-slate-200">
                {criteria.selectedCompany === 'ALL'
                  ? 'All (SportyBet)'
                  : BOOKIE_CONFIGS[criteria.selectedCompany].shortName}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Configuration Bar with Company Selector */}
        <FilterBar
          criteria={criteria}
          onChange={setCriteria}
          availableLeagues={availableLeagues}
          totalEligibleMatches={evaluations.length}
          companyCounts={companyCounts}
         onShuffleAndPick={handleShuffleAndPick}
         onAddNextPicks={handleAddNextPicks}
         onRemoveGames={handleRemoveGames}
         onClearSlip={handleClearSlip}
       />

        {/* Fixtures Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Qualifying Fixtures ({evaluations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('picked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'picked'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>In Betslip ({selectedPicks.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              {criteria.selectedCompany === 'ALL'
                ? 'Showing fixtures for all companies'
                : `Showing fixtures available on ${BOOKIE_CONFIGS[criteria.selectedCompany].name}`}
            </span>
            <button
              onClick={handleShuffleAndPick}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 border border-slate-700"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Shuffle
            </button>
            <button
              onClick={handleUseBookableOnly}
              title="Only fixtures with complete SportyBet market IDs, then shuffle — use this to test real booking codes"
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border ${
                criteria.requireFullMarketData
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Bookable only
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[#111927]/60 border border-slate-800 rounded-xl p-4 animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="space-y-2">
                  <div className="h-5 bg-slate-800 rounded w-3/4" />
                  <div className="h-5 bg-slate-800 rounded w-2/3" />
                </div>
                <div className="h-8 bg-slate-800 rounded w-full mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center space-y-3 my-8">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Odds Ingestion Notice</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadOdds}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
            >
              Retry Ingestion
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && evaluations.length === 0 && (
          <div className="bg-[#111927] border border-slate-800 rounded-2xl p-10 text-center space-y-3 my-6">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">
              No Matches Found For {criteria.selectedCompany === 'ALL' ? 'Selected Criteria' : BOOKIE_CONFIGS[criteria.selectedCompany].name}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try switching bookmakers, widening the odds bounds (e.g., increase Double Chance max to 1.25), or choosing a longer kickoff timeframe.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setCriteria((prev) => ({ ...prev, selectedCompany: 'ALL' }))}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700"
              >
                View All Bookmakers
              </button>
              <button
                onClick={() => setCriteria(DEFAULT_FILTER_CRITERIA)}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Fixtures List / Grid */}
        {!loading && !error && evaluations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluations
              .filter((ev) => {
                if (activeTab === 'picked') {
                  return selectedPicksMap.has(ev.game.id);
                }
                return true;
              })
              .map((evaluation) => {
                const currentSelection = selectedPicksMap.get(evaluation.game.id) || null;
                return (
                  <GameCard
                    key={evaluation.game.id}
                    game={evaluation.game}
                    eligiblePicks={evaluation.eligiblePicks}
                    currentSelection={currentSelection}
                    selectedCompany={criteria.selectedCompany}
                    onTogglePick={handleTogglePick}
                    onSelectSpecificPick={handleSelectSpecificPick}
                  />
                );
              })}
          </div>
        )}
      </main>

      {/* Docked Betslip Drawer */}
      <BetslipDrawer
        selections={selectedPicks}
        selectedCompany={criteria.selectedCompany}
        onCompanyChange={handleCompanyChange}
        onRemovePick={handleRemovePick}
        onClearSlip={handleClearSlip}
        onShuffleAndPick={handleShuffleAndPick}
         onAddAiPicks={handleAddAiPicks}
         onAddRandomPicks={handleAddRandomPicks}
         onAddNextPicks={handleAddNextPicks}
         onRemoveGames={handleRemoveGames}
         onResetFiltersKeepSlip={handleResetFiltersKeepSlip}
        defaultAddCount={criteria.pickCount}
        eligibleCount={evaluations.length}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        stake={stake}
        onStakeChange={setStake}
      />

      {/* Booking Code Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selections={selectedPicks}
        stake={stake}
        initialBookie={criteria.selectedCompany === 'ALL' ? 'sportybet:ke' : criteria.selectedCompany}
      />
    </div>
  );
}

```

### `src/components/BetslipDrawer.tsx`

```typescript
'use client';

import React, { useState, useMemo } from 'react';
import { SelectedPick, BookieId } from '@/types';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import { BOOKIE_CONFIGS, getCompanyBonusPercentage } from '@/lib/constants';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Shuffle,
  Send,
  Ticket,
  X,
  Coins,
  Gift,
  Building2,
  Calculator,
  TrendingUp,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  ArrowUpRight,
  CheckCircle2,
  Info,
  Sparkles,
   Plus,
   Minus,
  RotateCcw,
  Dices,
} from 'lucide-react';

interface BetslipDrawerProps {
  selections: SelectedPick[];
  selectedCompany: 'ALL' | BookieId;
  onCompanyChange: (bookie: 'ALL' | BookieId) => void;
  onRemovePick: (gameId: string) => void;
  onClearSlip: () => void;
  onShuffleAndPick: () => void;
  onAddAiPicks: (count: number) => void;
  onAddRandomPicks: (count: number) => void;
  onAddNextPicks: (count: number) => void;
  onRemoveGames: (count: number) => void;
  onResetFiltersKeepSlip: () => void;
  defaultAddCount: number;
  eligibleCount: number;
  onOpenExportModal: () => void;
  stake: number;
  onStakeChange: (stake: number) => void;
}

export const BetslipDrawer: React.FC<BetslipDrawerProps> = ({
  selections,
  selectedCompany,
  onCompanyChange,
  onRemovePick,
  onClearSlip,
  onShuffleAndPick,
   onAddAiPicks,
   onAddRandomPicks,
   onAddNextPicks,
   onRemoveGames,
  onResetFiltersKeepSlip,
  defaultAddCount,
  eligibleCount,
  onOpenExportModal,
  stake,
  onStakeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'picks' | 'simulator'>('picks');
  const [addCount, setAddCount] = useState(defaultAddCount);

  // Active target company for the slip
  const targetBookie: BookieId = selectedCompany === 'ALL' ? 'sportybet:ke' : selectedCompany;
  const bookieConfig = BOOKIE_CONFIGS[targetBookie];

  // Base calculations
  const totalOdds = calculateAccumulatorOdds(selections);
  const baseReturn = Math.round(stake * totalOdds);

  const bonusPct = getCompanyBonusPercentage(targetBookie, selections.length);
  const bonusAmount = Math.round(baseReturn * (bonusPct / 100));
  const grossPayout = baseReturn + bonusAmount;

  // Kenya Betting Tax: 20% Withholding Tax on Net Winnings (Gross Payout minus Stake)
  const netWinningsBeforeTax = Math.max(0, grossPayout - stake);
  const withholdingTax = Math.round(netWinningsBeforeTax * 0.2);
  const netTakeHome = grossPayout - withholdingTax;
  const netProfit = netTakeHome - stake;
  const roiMultiplier = stake > 0 ? (grossPayout / stake).toFixed(1) : '0';

  // Statistics on selections
  const { avgOdd, minOdd, maxOdd } = useMemo(() => {
    if (selections.length === 0) return { avgOdd: 0, minOdd: 0, maxOdd: 0 };
    const odds = selections.map((s) => s.odd);
    const sum = odds.reduce((a, b) => a + b, 0);
    return {
      avgOdd: +(sum / odds.length).toFixed(2),
      minOdd: Math.min(...odds),
      maxOdd: Math.max(...odds),
    };
  }, [selections]);

  // Cut-1 / Partial Cashout Outcome Simulation (if 1 leg fails)
  const cut1Outcome = useMemo(() => {
    if (selections.length < 2) return null;
    // Assume the highest odd match is lost, rest win
    const sorted = [...selections].sort((a, b) => b.odd - a.odd);
    const remainingPicks = sorted.slice(1);
    const remainingOdds = calculateAccumulatorOdds(remainingPicks);
    const cut1Base = Math.round(stake * remainingOdds);
    const cut1BonusPct = getCompanyBonusPercentage(targetBookie, remainingPicks.length);
    const cut1Gross = Math.round(cut1Base * (1 + cut1BonusPct / 100));
    return {
      odds: remainingOdds,
      gross: cut1Gross,
      lostMatch: sorted[0],
    };
  }, [selections, stake, targetBookie]);

  // Quick Stake Matrix Comparison (KES 10, 20, 50, 100, 200, 500, 1000)
  const stakeMatrix = useMemo(() => {
    const stakes = [10, 20, 50, 100, 200, 500, 1000];
    return stakes.map((s) => {
      const bReturn = Math.round(s * totalOdds);
      const bBonus = Math.round(bReturn * (bonusPct / 100));
      const gPayout = bReturn + bBonus;
      const wTax = Math.round(Math.max(0, gPayout - s) * 0.2);
      const takeHome = gPayout - wTax;
      return {
        stake: s,
        gross: gPayout,
        netTakeHome: takeHome,
      };
    });
  }, [totalOdds, bonusPct]);

  if (selections.length === 0) {
    return null;
  }

  const quickStakes = [15, 30, 50, 100, 200, 500, 1000];

  return (
    <>
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity lg:hidden"
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-3">
          <div className="bg-[#111928] border-2 border-emerald-500/50 rounded-2xl shadow-2xl shadow-emerald-950/60 overflow-hidden">
            {/* Header / Summary Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 bg-[#0d1422] border-b border-slate-800">
              <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 cursor-pointer select-none"
              >
                <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold flex items-center justify-center">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Betslip</span>
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      {selections.length} {selections.length === 1 ? 'Pick' : 'Picks'}
                    </span>

                    {/* Bookie Pill */}
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${bookieConfig.badgeBg} ${bookieConfig.badgeText} ${bookieConfig.badgeBorder}`}
                    >
                      {bookieConfig.shortName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                    <span>
                      Odds: <strong className="text-emerald-400">{totalOdds.toLocaleString()}x</strong>
                    </span>
                    {bonusPct > 0 && (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <Gift className="w-3 h-3" /> +{bonusPct}% Bonus
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsOpen(true);
                    setActiveTab('simulator');
                  }}
                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-500/30"
                  title="Open Outcome Stake Simulator"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stake Simulator</span>
                </button>

                <button
                  onClick={onShuffleAndPick}
                  title="Shuffle & re-pick matches using Fisher-Yates algorithm"
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700 active:scale-95"
                >
                  <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>

                <button
                  onClick={onOpenExportModal}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Generate Code</span>
                </button>

                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                  aria-label="Toggle Betslip"
                >
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Expandable Content Area */}
            {isOpen && (
              <div className="max-h-[68vh] sm:max-h-[500px] flex flex-col bg-[#0b111e]">
                {/* Secondary Navigation Bar: Tabs & Bookie Switcher */}
                <div className="p-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Tab buttons */}
                  <div className="flex items-center gap-1.5 bg-[#0b111e] p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveTab('picks')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'picks'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Match Picks ({selections.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('simulator')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'simulator'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md font-black'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Outcome Stake Simulator</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    </button>
                  </div>

                   {/* Target Bookie selector */}
                   <div className="flex items-center gap-2">
                     <span className="text-[11px] text-slate-400 hidden sm:inline">Bookie:</span>
                     <button
                       onClick={() => onCompanyChange('sportybet:ke')}
                       className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                         targetBookie === 'sportybet:ke'
                           ? 'bg-red-500/20 text-red-400 border-red-500/50'
                           : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                       }`}
                     >
                       SportyBet
                     </button>
                   </div>
                </div>

                {/* Add-to-slip controls: use current filters, AI or random, then reset filters if needed */}
                <div className="px-3 py-2.5 border-b border-slate-800/80 bg-[#0d1420] space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Add to slip</span>
                    <label className="flex items-center gap-1 text-slate-300">
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">N</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={addCount}
                        onChange={(e) =>
                          setAddCount(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))
                        }
                        className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {eligibleCount} eligible under filters
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAddNextPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Add next N unselected games (earliest kickoff first), keeping existing legs"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      Add Next {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveGames(addCount)}
                      disabled={selections.length === 0}
                      title="Remove N games from the end of the slip"
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                      Remove {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddAiPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Score games under current filters and add N to the slip (keeps existing legs)"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI add {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddRandomPicks(addCount)}
                      disabled={eligibleCount === 0}
                      title="Random picks under current filters, added to slip"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Dices className="w-3 h-3" />
                      Random add {addCount}
                    </button>
                    <button
                      type="button"
                      onClick={onResetFiltersKeepSlip}
                      title="Reset filters to defaults without clearing the betslip"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset filters
                    </button>
                    <button
                      type="button"
                      onClick={onShuffleAndPick}
                      title="Replace entire slip with a new shuffle"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" />
                      Replace slip
                    </button>
                    <button
                      type="button"
                      onClick={onClearSlip}
                      disabled={selections.length === 0}
                      title="Empty the entire betslip (clears all selections)"
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center gap-1 disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3" />
                      Empty Slip
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Change filters above, then AI/Random add. Reset filters keeps your legs so you can
                    stack different criteria.
                  </p>
                </div>

                {/* TAB 1: MATCH PICKS LIST */}
                {activeTab === 'picks' && (
                  <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs text-slate-400">
                      <span>Selected Match Legs ({selections.length}):</span>
                      <button
                        onClick={onClearSlip}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px] font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    </div>

                    {selections.map((sel, idx) => (
                      <div
                        key={sel.gameId}
                        className="flex items-center justify-between p-2.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs gap-3"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">
                              {sel.homeTeam} <span className="text-slate-400 font-normal">vs</span> {sel.awayTeam}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{sel.league}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
                            {sel.pick}
                          </span>
                          <span className="font-mono font-bold text-white text-xs">
                            @{sel.odd.toFixed(2)}
                          </span>
                          <button
                            onClick={() => onRemovePick(sel.gameId)}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                            title="Remove pick"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 2: INTERACTIVE OUTCOME STAKE SIMULATOR */}
                {activeTab === 'simulator' && (
                  <div className="overflow-y-auto p-4 space-y-4 flex-1">
                    {/* Top Slider & Stake Inputs */}
                    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Interactive Stake Simulator
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                          KES {stake.toLocaleString()}
                        </span>
                      </div>

                      {/* Slider */}
                      <div className="space-y-1">
                        <input
                          type="range"
                          min={bookieConfig.minStake}
                          max="2000"
                          step="10"
                          value={Math.min(stake, 2000)}
                          onChange={(e) => onStakeChange(parseInt(e.target.value) || bookieConfig.minStake)}
                          className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Min: KES {bookieConfig.minStake}</span>
                          <span>KES 500</span>
                          <span>KES 1,000</span>
                          <span>KES 2,000+</span>
                        </div>
                      </div>

                      {/* Quick Stake Buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {quickStakes.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => onStakeChange(amt)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                              stake === amt
                                ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                            }`}
                          >
                            KES {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Outcome Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Outcome Scenario 1: FULL WIN */}
                      <div className="p-3.5 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Scenario A: All {selections.length} Legs Win
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            100% Hit Rate
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Base Return:</span>
                            <span className="font-mono text-slate-200">KES {baseReturn.toLocaleString()}</span>
                          </div>

                          {bonusPct > 0 && (
                            <div className="flex justify-between text-amber-400">
                              <span>{bookieConfig.shortName} Bonus (+{bonusPct}%):</span>
                              <span className="font-mono font-bold">+KES {bonusAmount.toLocaleString()}</span>
                            </div>
                          )}

                          <div className="flex justify-between text-slate-400">
                            <span>Gross Winnings:</span>
                            <span className="font-mono text-white font-bold">KES {grossPayout.toLocaleString()}</span>
                          </div>

                          <div className="flex justify-between text-slate-400">
                            <span className="flex items-center gap-1" title="20% Withholding Tax on Net Winnings">
                              Kenya 20% Tax (WHT):
                              <Info className="w-3 h-3 text-slate-400" />
                            </span>
                            <span className="font-mono text-red-400">-KES {withholdingTax.toLocaleString()}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                            <span className="text-xs font-bold text-white">Net Take-Home:</span>
                            <span className="text-lg font-black text-emerald-400 font-mono">
                              KES {netTakeHome.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>Net Profit:</span>
                            <span className="font-mono text-emerald-300 font-bold">
                              +KES {netProfit.toLocaleString()} ({roiMultiplier}x ROI)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Outcome Scenario 2: CUT-1 (1 Match Fails / Cashout) */}
                      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            Scenario B: 1-Match Cut / Cashout
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            Cut-1 Simulation
                          </span>
                        </div>

                        {cut1Outcome ? (
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-400">
                              <span>Simulated Missed Leg:</span>
                              <span className="font-mono text-slate-300 truncate max-w-[130px]">
                                {cut1Outcome.lostMatch.homeTeam} (@{cut1Outcome.lostMatch.odd})
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Remaining Odds ({selections.length - 1} legs):</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {cut1Outcome.odds.toLocaleString()}x
                              </span>
                            </div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                              <span className="text-xs font-bold text-white">Cut-1 Est. Value:</span>
                              <span className="text-base font-extrabold text-amber-400 font-mono">
                                KES {cut1Outcome.gross.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                              *Estimated payout under bookmaker Cut-1 insurance or early cashout salvage.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-3 text-center">
                            Add at least 2 matches to simulate Cut-1 outcomes.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Statistical Metrics Strip */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Average Leg Odd</span>
                        <span className="font-mono font-bold text-white text-sm">@{avgOdd.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Safest Leg</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">@{minOdd.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Highest Leg</span>
                        <span className="font-mono font-bold text-blue-400 text-sm">@{maxOdd.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Stake Matrix Comparison Table */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                        Quick Stake Sensitivity Table:
                      </span>
                      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 text-xs font-mono">
                        <div className="grid grid-cols-3 p-2 bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                          <span>Stake (KES)</span>
                          <span className="text-center">Gross Return</span>
                          <span className="text-right">Net Take-Home</span>
                        </div>
                        <div className="divide-y divide-slate-800/60 max-h-36 overflow-y-auto">
                          {stakeMatrix.map((item) => (
                            <div
                              key={item.stake}
                              onClick={() => onStakeChange(item.stake)}
                              className={`grid grid-cols-3 p-2 cursor-pointer transition-colors ${
                                stake === item.stake
                                  ? 'bg-amber-400/10 font-bold text-amber-300'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                KES {item.stake}
                                {stake === item.stake && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                )}
                              </span>
                              <span className="text-center text-white">
                                KES {item.gross.toLocaleString()}
                              </span>
                              <span className="text-right text-emerald-400 font-bold">
                                KES {item.netTakeHome.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Controls & Potential Return */}
                <div className="p-4 bg-[#0d1422] border-t border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Stake Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        Stake (KES):
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min={bookieConfig.minStake}
                          step="10"
                          value={stake}
                          onChange={(e) =>
                            onStakeChange(
                              Math.max(bookieConfig.minStake, parseInt(e.target.value) || bookieConfig.minStake)
                            )
                          }
                          className="w-24 bg-[#0b111e] border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-1">
                        {quickStakes.slice(0, 4).map((amt) => (
                          <button
                            key={amt}
                            onClick={() => onStakeChange(amt)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              stake === amt
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculated Return with Net Take-Home */}
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1.5">
                          <span>Take-Home (Post-Tax):</span>
                          {bonusPct > 0 && (
                            <span className="text-amber-400 font-bold">
                              (+{bonusPct}%)
                            </span>
                          )}
                        </div>
                        <span className="text-base font-extrabold text-emerald-400 font-mono">
                          KES {netTakeHome.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={onOpenExportModal}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
                      >
                        <Send className="w-4 h-4" />
                        <span>Export Betslip</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

```

### `src/components/ExportModal.tsx`

```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BookieId, SelectedPick, BookingCodeResponse } from '@/types';
import { BOOKIE_CONFIGS, getCompanyBonusPercentage } from '@/lib/constants';
import { calculateAccumulatorOdds } from '@/lib/filterEngine';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  AlertCircle,
  Share2,
  CheckCircle2,
  Download,
  Gift,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selections: SelectedPick[];
  stake: number;
  initialBookie?: BookieId;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selections,
  stake,
  initialBookie = 'sportybet:ke',
}) => {
  const [selectedBookie, setSelectedBookie] = useState<BookieId>(initialBookie);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BookingCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync initialBookie when modal opens
  useEffect(() => {
    if (isOpen && initialBookie) {
      setSelectedBookie(initialBookie);
    }
  }, [isOpen, initialBookie]);

  const totalOdds = calculateAccumulatorOdds(selections);
  const basePayout = Math.round(stake * totalOdds);
  const bonusPct = getCompanyBonusPercentage(selectedBookie, selections.length);
  const bonusAmount = Math.round(basePayout * (bonusPct / 100));
  const estPayout = basePayout + bonusAmount;

  const generateCode = useCallback(async (bookie: BookieId) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      // Server-side proxy avoids browser CORS blocks against sportybet.com
      const res = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_bookie: bookie,
          selections,
        }),
        signal: controller.signal,
      });

      let data: BookingCodeResponse;
      try {
        data = await res.json();
      } catch {
        throw new Error(
          `Server returned an invalid response (HTTP ${res.status}). Is the Next.js server still running?`
        );
      }

      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            'Failed to generate booking code. SportyBet may be unreachable or markets expired.'
        );
      }
      if (!data.bookingCode) {
        throw new Error('SportyBet did not return a booking code.');
      }
      setResult(data);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : 'Unknown error generating booking code';
      // Browser TypeError when the request never reaches the server or connection drops
      if (
        msg === 'Failed to fetch' ||
        msg.includes('NetworkError') ||
        msg.includes('Load failed') ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        msg =
          'Could not reach the booking API (network/timeout). Confirm `npm run dev` is running, then retry. If it keeps failing, SportyBet may be blocking this server IP.';
      }
      setError(msg);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [selections]);

  useEffect(() => {
    if (isOpen && selections.length > 0) {
      generateCode(selectedBookie);
    }
  }, [isOpen, selectedBookie, generateCode, selections.length]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!result?.bookingCode) return;
    const ok = await copyTextToClipboard(result.bookingCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setError('Could not copy to clipboard. Select the code and copy manually (Ctrl/Cmd+C).');
    }
  };

  const handleDownloadSlip = () => {
    if (!result) return;
    const cfg = BOOKIE_CONFIGS[result.destinationBookie];
    const content = [
      `=============================================`,
      `  LOTTOBET - MULTI-BOOKIE ACCUMULATOR SLIP   `,
      `=============================================`,
      `Target Company: ${cfg.name} (${result.destinationBookie})`,
      `Official Booking Code: ${result.bookingCode}`,
      `Total Matches: ${selections.length}`,
      `Total Odds: ${totalOdds.toLocaleString()}x`,
      `Bonus Boost: +${bonusPct}% (${cfg.bonusLabel})`,
      `Stake: KES ${stake}`,
      `Est. Total Return: KES ${estPayout.toLocaleString()}`,
      `Generated: ${new Date(result.generatedAt).toLocaleString()}`,
      `=============================================`,
      `QUALIFYING SELECTIONS:`,
      ...selections.map(
        (s, i) =>
          `${i + 1}. [${s.league}] ${s.homeTeam} vs ${s.awayTeam} | Market: ${s.marketName} | Pick: ${s.pick} @ ${s.odd.toFixed(2)}`
      ),
      `=============================================`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lottobet-${result.destinationBookie.replace(':', '-')}-${result.bookingCode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111928] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d1422]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Generate Booking Code</h3>
              <p className="text-xs text-slate-400">Target Kenya Bookmakers (SportyBet)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

          {/* Modal Content */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Loading State */}
          {loading && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">
                Packaging {selections.length} selections for {BOOKIE_CONFIGS[selectedBookie].name}...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Conversion Notice</p>
                <p className="text-slate-400 mt-0.5">{error}</p>
                <button
                  onClick={() => generateCode(selectedBookie)}
                  className="mt-2 text-xs font-bold text-red-300 underline"
                >
                  Retry generation
                </button>
              </div>
            </div>
          )}

          {/* Booking Code Presentation Box */}
          {result && !loading && (
            <div className="space-y-4">
              <div
                className={`p-4 bg-[#090e18] border-2 rounded-2xl text-center space-y-2 relative overflow-hidden ${
                  'border-red-500/50'
                }`}
              >
                <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block">
                  Official Booking Code ({BOOKIE_CONFIGS[result.destinationBookie].name})
                </span>

                <div className="flex items-center justify-center gap-3 py-1">
                  <span
                    className={`text-2xl sm:text-3xl font-mono font-black tracking-wider select-all ${
                      'text-red-400'
                    }`}
                  >
                    {result.bookingCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    className={`p-2 rounded-xl transition-all font-bold active:scale-90 ${
                      'bg-red-500 hover:bg-red-400 text-white'
                    }`}
                    title="Copy Booking Code"
                  >
                    {copied ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-300 font-medium">
                  {copied ? (
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Copied to clipboard! Ready to load in bookmaker.
                    </span>
                  ) : (
                    <span>Click copy to load into the bookie app or site</span>
                  )}
                </div>
              </div>

              {/* Betslip Financial Summary Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Picks</span>
                  <span className="font-bold text-white font-mono">{selections.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Accumulator</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {totalOdds.toLocaleString()}x
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Est. Return {bonusPct > 0 ? `(+${bonusPct}%)` : ''}
                  </span>
                  <span className="font-bold text-amber-400 font-mono">
                    KES {estPayout.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bonus Highlight Pill */}
              {bonusPct > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-amber-400" />
                    {BOOKIE_CONFIGS[selectedBookie].shortName} {BOOKIE_CONFIGS[selectedBookie].bonusLabel}
                  </span>
                  <span className="font-bold font-mono">+{bonusPct}% Boost (+KES {bonusAmount.toLocaleString()})</span>
                </div>
              )}

              {/* Direct 1-Click Action Buttons */}
              <div className="space-y-2">
                <a
                  href={BOOKIE_CONFIGS[selectedBookie].homeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                   className={`w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md ${
                     'bg-red-600 hover:bg-red-500'
                   }`}
                >
                  <span>Open {BOOKIE_CONFIGS[selectedBookie].name}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={BOOKIE_CONFIGS['sportybet:ke'].bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <span>
                      Open SportyBet
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={handleDownloadSlip}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download TXT</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0d1422] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/FilterBar.tsx`

```typescript
'use client';

import React from 'react';
import { FilterCriteria, BookieId } from '@/types';
import { TIMEFRAME_OPTIONS, PICK_COUNT_PRESETS, DEFAULT_FILTER_CRITERIA, BOOKIE_CONFIGS } from '@/lib/constants';
import { RotateCcw, Search, Sliders, Sparkles, Building2, Check, ShieldCheck, Plus, Minus, Trash2 } from 'lucide-react';

interface FilterBarProps {
  criteria: FilterCriteria;
  onChange: (criteria: FilterCriteria) => void;
  availableLeagues: string[];
  totalEligibleMatches: number;
  companyCounts: {
    all: number;
    sportybet: number;
  };
  onShuffleAndPick: () => void;
  onAddNextPicks: (count: number) => void;
  onRemoveGames: (count: number) => void;
  onClearSlip: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  criteria,
  onChange,
  availableLeagues,
  totalEligibleMatches,
  companyCounts,
  onShuffleAndPick,
  onAddNextPicks,
  onRemoveGames,
  onClearSlip,
}) => {
  const updateCriteria = <K extends keyof FilterCriteria>(key: K, value: FilterCriteria[K]) => {
    onChange({ ...criteria, [key]: value });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_FILTER_CRITERIA });
  };

  return (
    <div className="bg-[#111927] border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl mb-6">
      {/* SECTION 1: Company Filter (SportyBet vs All) */}
      <div className="pb-5 mb-5 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Filter by Betting Company:
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Select a bookmaker to isolate company-specific odds and bonus programs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: ALL COMPANIES */}
          <button
            onClick={() => updateCriteria('selectedCompany', 'ALL')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
              criteria.selectedCompany === 'ALL'
                ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-emerald-500/80 text-white shadow-lg ring-1 ring-emerald-500/40'
                : 'bg-slate-900/60 border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                  criteria.selectedCompany === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                ALL
              </div>
              <div>
                <span className="text-xs font-bold text-white block">All Bookmakers</span>
                <span className="text-[10px] text-slate-400">SportyBet</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {companyCounts.all}
              </span>
            </div>
          </button>

          {/* Option 2: SPORTYBET KENYA */}
          <button
            onClick={() => updateCriteria('selectedCompany', 'sportybet:ke')}
            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
              criteria.selectedCompany === 'sportybet:ke'
                ? 'bg-gradient-to-r from-red-950/40 to-slate-900 border-red-500 text-white shadow-lg shadow-red-950/40 ring-1 ring-red-500/50'
                : 'bg-slate-900/60 border-slate-800/90 text-slate-400 hover:border-red-500/30 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center font-bold text-xs text-red-400">
                SB
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">SportyBet Kenya</span>
                  <span className="text-xs">🇰🇪</span>
                </div>
                <span className="text-[10px] text-red-400 font-medium">Instant Booking Codes</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                {companyCounts.sportybet}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* SECTION 2: Top Search & Active Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Preferred Market Filters
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {totalEligibleMatches} Qualifying Matches
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {criteria.selectedCompany === 'ALL'
                ? 'Scanning markets across all bookmakers'
                : `Scanning odds specifically tailored for ${BOOKIE_CONFIGS[criteria.selectedCompany].name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search team or league..."
              value={criteria.searchQuery}
              onChange={(e) => updateCriteria('searchQuery', e.target.value)}
              className="w-full bg-[#0b111e] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Bookable / full market data only */}
          <button
            type="button"
            onClick={() =>
              updateCriteria('requireFullMarketData', !criteria.requireFullMarketData)
            }
            title="Only use fixtures that already have complete SportyBet market IDs (needed for real booking codes)"
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors border ${
              criteria.requireFullMarketData
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">
              {criteria.requireFullMarketData ? 'Bookable only' : 'All fixtures'}
            </span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            title="Reset Filters"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Market Selector Chips & Odds Bounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-5 border-b border-slate-800/80">
        {/* Double Chance Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            criteria.enableDoubleChance
              ? 'bg-[#0f172a] border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableDoubleChance}
                onChange={(e) => updateCriteria('enableDoubleChance', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-emerald-300">Double Chance (1X, 12, X2)</span>
            </label>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              {criteria.dcMin.toFixed(2)} - {criteria.dcMax.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Min: {criteria.dcMin.toFixed(2)}</span>
              <span>Max: {criteria.dcMax.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1.05"
              max="1.60"
              step="0.01"
              value={criteria.dcMax}
              disabled={!criteria.enableDoubleChance}
              onChange={(e) => updateCriteria('dcMax', parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Home Win (1) Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            criteria.enableHomeWin
              ? 'bg-[#0f172a] border-blue-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableHomeWin}
                onChange={(e) => updateCriteria('enableHomeWin', e.target.checked)}
                className="w-4 h-4 rounded text-blue-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-blue-300">Home Win (1)</span>
            </label>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/50">
              {criteria.homeWinMin.toFixed(2)} - {criteria.homeWinMax.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Min: {criteria.homeWinMin.toFixed(2)}</span>
              <span>Max: {criteria.homeWinMax.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1.20"
              max="1.80"
              step="0.02"
              value={criteria.homeWinMax}
              disabled={!criteria.enableHomeWin}
              onChange={(e) => updateCriteria('homeWinMax', parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Away Win (2) Controls */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            criteria.enableAwayWin
              ? 'bg-[#0f172a] border-indigo-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableAwayWin}
                onChange={(e) => updateCriteria('enableAwayWin', e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-indigo-300">Away Win (2)</span>
            </label>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/50">
              {criteria.awayWinMin.toFixed(2)} - {criteria.awayWinMax.toFixed(2)}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Min: {criteria.awayWinMin.toFixed(2)}</span>
              <span>Max: {criteria.awayWinMax.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1.50"
              max="1.60"
              step="0.02"
              value={criteria.awayWinMax}
              disabled={!criteria.enableAwayWin}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateCriteria('awayWinMax', val);
                if (criteria.awayWinMin > val) {
                  updateCriteria('awayWinMin', val - 0.3);
                }
              }}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* Over Goal Line Selector */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
            criteria.enableOver
              ? 'bg-[#0f172a] border-amber-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }}`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableOver}
                onChange={(e) => updateCriteria('enableOver', e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-amber-300">Over Goals</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">
              High Probability
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => updateCriteria('overGoalLine', '0.5')}
              disabled={!criteria.enableOver}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.overGoalLine === '0.5'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Over 0.5
            </button>
            <button
              onClick={() => updateCriteria('overGoalLine', '1.5')}
              disabled={!criteria.enableOver}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.overGoalLine === '1.5'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Over 1.5
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Filters matches with high likelihood of at least {criteria.overGoalLine === '0.5' ? '1' : '2'} goals.
          </p>
        </div>

        {/* Under Goal Line Selector */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col ${
            criteria.enableUnder
              ? 'bg-[#0f172a] border-purple-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }}`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableUnder}
                onChange={(e) => updateCriteria('enableUnder', e.target.checked)}
                className="w-4 h-4 rounded text-purple-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-purple-300">Under Goals</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
              Max {criteria.underGoalLine === '3.5' ? '3' : '4'} Goals
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => updateCriteria('underGoalLine', '3.5')}
              disabled={!criteria.enableUnder}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.underGoalLine === '3.5'
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Under 3.5
            </button>
            <button
              onClick={() => updateCriteria('underGoalLine', '4.5')}
              disabled={!criteria.enableUnder}
              className={`flex-1 text-center py-1 rounded-lg text-xs font-medium transition-all ${
                criteria.underGoalLine === '4.5'
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              } disabled:opacity-40`}
            >
              Under 4.5
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Safe over/under ceiling for disciplined accumulators.
          </p>
        </div>

        {/* Even/Odd Goals Toggle */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
            criteria.enableEvenOdd
              ? 'bg-[#0f172a] border-cyan-500/40 shadow-sm'
              : 'bg-slate-900/40 border-slate-800/70 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={criteria.enableEvenOdd}
                onChange={(e) => updateCriteria('enableEvenOdd', e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-cyan-300">Even/Odd</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              Total Goals
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Picks whether total match goals will be even or odd — single-leg market.
          </p>
        </div>
      </div>

      {/* SECTION 4: Timeframe, League & N-Picks Selector */}
      <div className="pt-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Timeframe Pills */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Kickoff Window:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TIMEFRAME_OPTIONS.map((opt) => {
              const active = criteria.timeframeHours === opt.value;
              return (
                <button
                  key={opt.label}
                  onClick={() => updateCriteria('timeframeHours', opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* League selector */}
        <div className="space-y-1.5 w-full sm:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            League:
          </span>
          <select
            value={criteria.selectedLeague}
            onChange={(e) => updateCriteria('selectedLeague', e.target.value)}
            className="w-full sm:w-52 bg-[#0b111e] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Competitions ({availableLeagues.length})</option>
            {availableLeagues.map((league) => (
              <option key={league} value={league}>
                {league}
              </option>
            ))}
          </select>
        </div>

        {/* Pick Count Selector & Shuffle Action */}
        <div className="space-y-1.5 w-full lg:w-auto">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Betslip Size (N):
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#0b111e] border border-slate-700/80 rounded-xl p-1 gap-1">
              {PICK_COUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => updateCriteria('pickCount', preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                    criteria.pickCount === preset
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <input
                type="number"
                min="1"
                max="100"
                value={criteria.pickCount}
                onChange={(e) => updateCriteria('pickCount', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-slate-800/80 border border-slate-700 text-center py-1 text-xs text-emerald-400 font-mono font-bold rounded-lg focus:outline-none"
              />
            </div>

            <button
              onClick={onShuffleAndPick}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Pick {criteria.pickCount}</span>
            </button>

            <button
              onClick={() => onAddNextPicks(criteria.pickCount)}
              title="Add next N unselected games (earliest kickoff first), keeping existing legs"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Next</span>
            </button>

            <button
              onClick={() => onRemoveGames(criteria.pickCount)}
              title="Remove N games from the end of the slip"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </button>

            <button
              onClick={onClearSlip}
              title="Empty the entire betslip"
              className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Empty Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

```

### `src/components/GameCard.tsx`

```typescript
'use client';

import React from 'react';
import { StandardGame, SelectedPick, BookieId } from '@/types';
import { BOOKIE_CONFIGS } from '@/lib/constants';
import { Clock, Plus, Check, ShieldCheck, Trophy } from 'lucide-react';

interface GameCardProps {
  game: StandardGame;
  eligiblePicks: SelectedPick[];
  currentSelection: SelectedPick | null;
  selectedCompany: 'ALL' | BookieId;
  onTogglePick: (pick: SelectedPick) => void;
  onSelectSpecificPick: (pick: SelectedPick) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  eligiblePicks,
  currentSelection,
  selectedCompany,
  onTogglePick,
  onSelectSpecificPick,
}) => {
  const isSelected = currentSelection !== null;

  const kickoff = new Date(game.kickoffTime);
  const now = new Date();
  const diffHours = Math.max(0, Math.round((kickoff.getTime() - now.getTime()) / (1000 * 60 * 60)));

  const formattedTime = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const getMarketBadgeStyle = (marketName: string) => {
    switch (marketName) {
      case 'Double Chance':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Home Win':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Over 0.5':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Under 3.5':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 relative overflow-hidden ${
        isSelected
          ? 'bg-[#132032] border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
          : 'bg-[#0f172a]/90 border-slate-800 hover:border-slate-700 hover:bg-[#111c30]'
      }`}
    >
      {/* Top Bar: League, Bookmakers Offering & Kickoff Countdown */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/60 border-b border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium truncate max-w-[170px]">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{game.league}</span>
        </div>

        {/* Bookie Availability Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {game.bookies?.map((bId) => {
            const cfg = BOOKIE_CONFIGS[bId];
            const isTarget = selectedCompany === bId;
            return (
              <span
                key={bId}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border transition-colors ${
                  isTarget
                    ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-1 ring-current`
                    : 'bg-red-950/40 text-red-400/80 border-red-800/40'
                }`}
                title={`Available on ${cfg.name}`}
              >
                {cfg.shortName}
              </span>
            );
          })}

          <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono ml-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>in {diffHours}h</span>
          </div>
        </div>
      </div>

      {/* Main Body: Teams and Matchup */}
      <div className="p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white truncate max-w-[190px]">
                {game.homeTeam}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">1 (Home)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300 truncate max-w-[190px]">
                {game.awayTeam}
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">2 (Away)</span>
            </div>
          </div>

          {/* Quick Selection Toggle Button */}
          <button
            onClick={() => {
              if (currentSelection) {
                onTogglePick(currentSelection);
              } else if (eligiblePicks.length > 0) {
                onTogglePick(eligiblePicks[0]);
              }
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isSelected
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={isSelected ? 'Remove from betslip' : 'Add qualifying pick to betslip'}
          >
            {isSelected ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>

        {/* Kickoff exact time info */}
        <div className="mt-1 text-[11px] text-slate-400 font-mono">
          Kickoff: {formattedDate} at {formattedTime}
        </div>

        {/* Eligible Qualifying Markets Chips */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Eligible Market Picks ({eligiblePicks.length}):
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {eligiblePicks.map((pickItem) => {
              const isItemActive =
                currentSelection?.pick === pickItem.pick &&
                currentSelection?.marketName === pickItem.marketName;

              return (
                <button
                  key={`${pickItem.marketName}-${pickItem.pick}`}
                  onClick={() => onSelectSpecificPick(pickItem)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    isItemActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                      : `${getMarketBadgeStyle(pickItem.marketName)} hover:brightness-125`
                  }`}
                >
                  <span>{pickItem.pick}</span>
                  <span
                    className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                      isItemActive
                        ? 'bg-slate-900/30 text-slate-950 font-black'
                        : 'bg-slate-900/60 text-emerald-400'
                    }`}
                  >
                    @{pickItem.odd.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

```

### `src/lib/clipboard.ts`

```typescript
/**
 * Copy text to the system clipboard with a fallback for non-secure contexts
 * (HTTP, some embedded browsers) where navigator.clipboard is unavailable.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      if (typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to legacy path
    }
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

```

### `src/lib/codeConverter.ts`

```typescript
import { BookieId, SelectedPick, BookingCodeResponse } from '@/types';
import {
  BOOKIE_CONFIGS,
  SPORTYBET_SHARE_URL,
  SPORTYBET_DEEP_LINK_BASE,
  getCompanyBonusPercentage,
} from './constants';
import { calculateAccumulatorOdds } from './filterEngine';

interface SportyBetShareSelection {
  eventId: string;
  marketId: string;
  outcomeId: string;
  specifier: string | null;
}

interface SportyBetShareResponse {
  bizCode?: number;
  data?: {
    shareCode?: string;
    shareURL?: string;
    [key: string]: unknown;
  };
  message?: string;
  [key: string]: unknown;
}

const SHARE_TIMEOUT_MS = 12_000;

function emptyErrorResponse(
  bookie: BookieId,
  selections: SelectedPick[],
  error: string
): BookingCodeResponse {
  const bookieConfig = BOOKIE_CONFIGS[bookie] || BOOKIE_CONFIGS['sportybet:ke'];
  const totalOdds = calculateAccumulatorOdds(selections);
  const now = new Date();
  return {
    success: false,
    bookingCode: '',
    destinationBookie: bookie,
    bookieName: bookieConfig.name,
    matchCount: selections.length,
    totalOdds,
    generatedAt: now.toISOString(),
    expiresAt: now.toISOString(),
    directUrl: bookieConfig.bookingUrl,
    selections,
    error,
  };
}

/**
 * Validate every selection has the SportyBet IDs required by the share API.
 * Missing IDs produce invalid codes — fail early instead of guessing.
 */
function buildSelectionsPayload(selections: SelectedPick[]): {
  payload: SportyBetShareSelection[] | null;
  error?: string;
} {
  const missing: string[] = [];
  const payload: SportyBetShareSelection[] = [];

  for (const s of selections) {
    const eventId = s.eventId || s.gameId;
    const marketId = s.marketId;
    const outcomeId = s.outcomeId;

    if (!eventId || eventId.startsWith('sr:match:fallback')) {
      missing.push(`${s.homeTeam} vs ${s.awayTeam} (missing or demo eventId)`);
      continue;
    }
    if (!marketId || !outcomeId) {
      missing.push(
        `${s.homeTeam} vs ${s.awayTeam} [${s.marketName} ${s.pick}] (missing marketId/outcomeId)`
      );
      continue;
    }

    payload.push({
      eventId,
      marketId,
      outcomeId,
      specifier: s.specifier ?? null,
    });
  }

  if (missing.length > 0) {
    return {
      payload: null,
      error: `Cannot build booking code — incomplete market data for: ${missing.slice(0, 5).join('; ')}${missing.length > 5 ? ` (+${missing.length - 5} more)` : ''}`,
    };
  }

  if (payload.length === 0) {
    return { payload: null, error: 'No valid selections to book.' };
  }

  return { payload };
}

async function postShare(
  body: object
): Promise<{ ok: true; data: SportyBetShareResponse } | { ok: false; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHARE_TIMEOUT_MS);

  try {
    const res = await fetch(SPORTYBET_SHARE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Current-Country': 'KE',
        Origin: 'https://www.sportybet.com',
        Referer: 'https://www.sportybet.com/ke/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const text = await res.text();
    let data: SportyBetShareResponse;
    try {
      data = JSON.parse(text) as SportyBetShareResponse;
    } catch {
      return {
        ok: false,
        error: `SportyBet returned non-JSON (HTTP ${res.status}). The share endpoint may be blocked from this server IP.`,
      };
    }

    return { ok: true, data };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        error: `SportyBet share API timed out after ${SHARE_TIMEOUT_MS / 1000}s. Try fewer legs or retry shortly.`,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach SportyBet share API: ${msg}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call SportyBet share API. No local/fake code generation — only real codes or errors.
 */
export async function convertSelectionsToBookingCode(
  bookie: BookieId,
  selections: SelectedPick[]
): Promise<BookingCodeResponse> {
  if (!Array.isArray(selections) || selections.length === 0) {
    return emptyErrorResponse(bookie, selections, 'Please select at least one match.');
  }

  if (bookie !== 'sportybet:ke') {
    return emptyErrorResponse(bookie, selections, 'Only SportyBet Kenya is supported.');
  }

  const { payload, error: buildError } = buildSelectionsPayload(selections);
  if (!payload) {
    return emptyErrorResponse(bookie, selections, buildError || 'Invalid selections.');
  }

  const bookieConfig = BOOKIE_CONFIGS[bookie];
  const totalOdds = calculateAccumulatorOdds(selections);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // SportyBet web client uses `selections`; older docs used `outcomes` — try both
  const bodyVariants: object[] = [{ selections: payload }, { outcomes: payload }];

  let lastError = 'SportyBet share API did not return a booking code.';

  for (const body of bodyVariants) {
    const result = await postShare(body);
    if (!result.ok) {
      lastError = result.error;
      continue;
    }

    const data = result.data;
    if (data.bizCode === 10000 && data.data?.shareCode) {
      const code = data.data.shareCode;
      const deepLink = data.data.shareURL || `${SPORTYBET_DEEP_LINK_BASE}${code}`;
      const bonusPct = getCompanyBonusPercentage(bookie, selections.length);

      return {
        success: true,
        bookingCode: code,
        destinationBookie: bookie,
        bookieName: bookieConfig.name,
        matchCount: selections.length,
        totalOdds,
        generatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        directUrl: bookieConfig.bookingUrl,
        deepLink,
        selections,
        bonusPercentage: bonusPct > 0 ? bonusPct : undefined,
      };
    }

    lastError =
      (typeof data.message === 'string' && data.message) ||
      (data.bizCode !== undefined
        ? `SportyBet rejected the slip (bizCode ${data.bizCode}). Markets may have closed or IDs are invalid.`
        : 'SportyBet share API did not return a booking code.');
  }

  return emptyErrorResponse(bookie, selections, lastError);
}

```

### `src/lib/constants.ts`

```typescript
import { FilterCriteria, BookieId, SportyBetMarket } from '@/types';

export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  selectedCompany: 'ALL',
  dcMin: 1.08,
  dcMax: 1.20,
  homeWinMin: 1.30,
  homeWinMax: 1.50,
  enableDoubleChance: true,
  enableHomeWin: true,
  enableAwayWin: true,
  awayWinMin: 1.50,
  awayWinMax: 1.60,
  enableOver: true,
  overGoalLine: '0.5',
  enableUnder: true,
  underGoalLine: '3.5',
  enableEvenOdd: true,
  timeframeHours: 24,
  pickCount: 30,
  searchQuery: '',
  selectedLeague: 'ALL',
  requireFullMarketData: false,
};

export interface BookieMeta {
  id: BookieId;
  name: string;
  shortName: string;
  tagline: string;
  codePrefix: string;
  accentColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  homeUrl: string;
  bookingUrl: string;
  minStake: number;
  bonusLabel: string;
}

export const BOOKIE_CONFIGS: Record<BookieId, BookieMeta> = {
  'sportybet:ke': {
    id: 'sportybet:ke',
    name: 'SportyBet Kenya',
    shortName: 'SportyBet',
    tagline: 'Instant Booking Codes • Live Cashout',
    codePrefix: 'SB',
    accentColor: '#ef4444',
    badgeBg: 'bg-red-500/15',
    badgeBorder: 'border-red-500/40',
    badgeText: 'text-red-400',
    homeUrl: 'https://www.sportybet.com/ke/',
    bookingUrl: 'https://www.sportybet.com/ke/sport/football',
    minStake: 15,
    bonusLabel: 'Multi Bonus',
  },
};

export const TIMEFRAME_OPTIONS = [
  { label: 'Next 3h', value: 3 },
  { label: 'Next 6h', value: 6 },
  { label: 'Next 12h', value: 12 },
  { label: 'Next 24h', value: 24 },
  { label: 'Next 48h', value: 48 },
  { label: 'All Upcoming', value: null },
];

export const PICK_COUNT_PRESETS = [5, 10, 15, 20, 30, 50];

/**
 * Calculates bookie accumulator win bonus percentage based on legs count.
 * E.g. SportyBet gives:
 * 3 legs: 3%, 5 legs: 10%, 10 legs: 30%, 15 legs: 50%, 20 legs: 100%, 30 legs: 250%, 40+ legs: up to 1000%!
 */
export function getCompanyBonusPercentage(bookie: BookieId, legCount: number): number {
  if (legCount < 3) return 0;
  // SportyBet
  if (legCount >= 40) return 1000;
  if (legCount >= 30) return 250;
  if (legCount >= 20) return 100;
  if (legCount >= 15) return 50;
  if (legCount >= 10) return 30;
  if (legCount >= 5) return 10;
  return 3;
}

export const SPORTYBET_MARKET_IDS = {
  MATCH_WINNER: '1',
  DOUBLE_CHANCE: '10',
  OVER_UNDER: '18',
  EVEN_ODD: '14',
} as const;

export const SPORTYBET_API_BASE = 'https://www.sportybet.com/api/ke';

/** Base upcoming-events endpoint; query params are added by oddsFetcher */
export const SPORTYBET_UPCOMING_EVENTS_URL =
  'https://www.sportybet.com/api/ke/factsCenter/pcUpcomingEvents';

export const SPORTYBET_SHARE_URL = 'https://www.sportybet.com/api/ke/orders/share';

export const SPORTYBET_DEEP_LINK_BASE = 'https://www.sportybet.com/ke/?shareCode=';

export const MARKET_NAME_TO_ID = new Map<string, string>([
  ['Double Chance', SPORTYBET_MARKET_IDS.DOUBLE_CHANCE],
  ['Home Win', SPORTYBET_MARKET_IDS.MATCH_WINNER],
  ['Over 0.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Over 1.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Under 3.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Under 4.5', SPORTYBET_MARKET_IDS.OVER_UNDER],
  ['Even', SPORTYBET_MARKET_IDS.EVEN_ODD],
  ['Odd', SPORTYBET_MARKET_IDS.EVEN_ODD],
]);

export function getMarketIdForPick(marketName: string): string | undefined {
  return MARKET_NAME_TO_ID.get(marketName);
}

export function isSportyBetMarket(market: SportyBetMarket): boolean {
  return (
    market.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER ||
    market.marketId === SPORTYBET_MARKET_IDS.DOUBLE_CHANCE ||
    market.marketId === SPORTYBET_MARKET_IDS.OVER_UNDER
  );
}

```

### `src/lib/filterEngine.ts`

```typescript
import { StandardGame, FilterCriteria, SelectedPick, BookieId, GameMarkets, SportyBetMarket } from '@/types';

/**
 * Normalizes team or league names: converts to lowercase, strips accents/diacritics,
 * and collapses consecutive whitespaces.
 */
export function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Strips non-alphanumeric characters for robust key/ID matching.
 */
export function cleanString(str: string): string {
  if (!str) return '';
  return normalizeTeamName(str).replace(/[^a-z0-9]/g, '');
}

/**
 * Resolve SportyBet marketId / outcomeId / specifier from live markets.
 * Uses official market IDs (1=1X2, 10=Double Chance, 18=Over/Under) rather than
 * brittle name matching against labels like "Home Win".
 */
function findSportyBetIds(
  sportyMarkets: SportyBetMarket[] | undefined,
  marketName: string,
  pickName: string
): { marketId?: string; outcomeId?: string; specifier?: string | null } {
  if (!sportyMarkets || sportyMarkets.length === 0) return {};

  const lowerMarket = marketName.toLowerCase();
  const lowerPick = pickName.toLowerCase().trim();

  // --- Match Winner / Home Win (market 1) ---
  if (
    lowerMarket === 'home win' ||
    lowerMarket === 'match winner' ||
    lowerMarket === '1x2' ||
    lowerPick === '1' ||
    lowerPick === 'x' ||
    lowerPick === '2'
  ) {
    const m = sportyMarkets.find((x) => x.marketId === '1');
    if (m) {
      let outcome: (typeof m.outcomes)[0] | undefined;
      if (lowerPick === '1' || lowerPick === 'home' || lowerMarket === 'home win') {
        outcome =
          m.outcomes.find((o) => o.outcomeId === '1') ||
          m.outcomes.find((o) => o.name.toLowerCase().includes('home'));
      } else if (lowerPick === 'x' || lowerPick === 'draw') {
        outcome =
          m.outcomes.find((o) => o.outcomeId === '2') ||
          m.outcomes.find((o) => o.name.toLowerCase().includes('draw'));
      } else if (lowerPick === '2' || lowerPick === 'away') {
        outcome =
          m.outcomes.find((o) => o.outcomeId === '3') ||
          m.outcomes.find((o) => o.name.toLowerCase().includes('away'));
      }
      if (outcome) {
        return { marketId: m.marketId, outcomeId: outcome.outcomeId, specifier: m.specifier };
      }
    }
  }

  // --- Double Chance (market 10) ---
  // SportyBet labels vary: "1X" / "12" / "X2" OR "Home or Draw" / "Home or Away" / "Draw or Away"
  if (lowerMarket.includes('double chance') || ['1x', 'x2', '12'].includes(lowerPick)) {
    const m =
      sportyMarkets.find((x) => x.marketId === '10') ||
      sportyMarkets.find((x) => x.name.toLowerCase().includes('double chance'));
    if (m) {
      const aliases: Record<string, string[]> = {
        '1x': ['1x', 'home or draw', 'home/draw', '1 or x', '1 or draw'],
        x2: ['x2', 'draw or away', 'draw/away', 'x or 2', 'draw or 2'],
        '12': ['12', 'home or away', 'home/away', '1 or 2', 'home or 2'],
      };
      const keys = aliases[lowerPick] || [lowerPick];
      let outcome = m.outcomes.find((o) => {
        const n = o.name.toLowerCase().replace(/\s+/g, ' ').trim();
        return keys.some((a) => n === a || n.includes(a)) || o.outcomeId === pickName;
      });
      // Common numeric outcomeIds on SportyBet DC: 9=1X, 10=12, 11=X2 (varies by feed)
      if (!outcome) {
        const byId: Record<string, string[]> = {
          '1x': ['9', '1'],
          '12': ['10', '3'],
          x2: ['11', '2'],
        };
        const ids = byId[lowerPick] || [];
        outcome = m.outcomes.find((o) => ids.includes(o.outcomeId));
      }
      // Last resort: match by normalized pick characters only (1, x, 2)
      if (!outcome && lowerPick.length <= 2) {
        outcome = m.outcomes.find((o) => {
          const compact = o.name.toLowerCase().replace(/[^1x2]/g, '');
          return compact === lowerPick || compact === lowerPick.split('').reverse().join('');
        });
      }
      if (outcome) {
        return {
          marketId: m.marketId || '10',
          outcomeId: outcome.outcomeId,
          specifier: m.specifier ?? null,
        };
      }
    }
  }

  // --- Over / Under (market 18) ---
  if (
    lowerMarket.includes('over') ||
    lowerMarket.includes('under') ||
    lowerPick.includes('over') ||
    lowerPick.includes('under')
  ) {
    const isOver = lowerPick.includes('over') || lowerMarket.includes('over 0.5');
    // Extract total from pick e.g. "Over 0.5" / "Under 3.5"
    const totalMatch = lowerPick.match(/(\d+(?:\.\d+)?)/) || lowerMarket.match(/(\d+(?:\.\d+)?)/);
    const total = totalMatch ? totalMatch[1] : isOver ? '0.5' : '3.5';
    const specifier = `total=${total}`;

    const candidates = sportyMarkets.filter((x) => x.marketId === '18');
    const m =
      candidates.find((x) => x.specifier === specifier) ||
      candidates.find((x) => (x.specifier || '').includes(total)) ||
      candidates[0];

    if (m) {
      const label = isOver ? 'over' : 'under';
      const outcome =
        m.outcomes.find((o) => o.name.toLowerCase().includes(label)) ||
        m.outcomes.find((o) => (isOver ? o.outcomeId === '12' : o.outcomeId === '13'));
      if (outcome) {
        return {
          marketId: m.marketId,
          outcomeId: outcome.outcomeId,
          specifier: m.specifier ?? specifier,
        };
      }
    }
  }

  // Generic name fallback (last resort)
  for (const market of sportyMarkets) {
    if (
      market.name.toLowerCase().includes(lowerMarket) ||
      market.marketId === lowerMarket
    ) {
      for (const outcome of market.outcomes) {
        if (
          outcome.name.toLowerCase().includes(lowerPick) ||
          outcome.outcomeId === pickName ||
          outcome.outcomeId === lowerPick
        ) {
          return {
            marketId: market.marketId,
            outcomeId: outcome.outcomeId,
            specifier: market.specifier,
          };
        }
      }
    }
  }

  return {};
}

export interface GameEvaluation {
  game: StandardGame;
  normalizedHome: string;
  normalizedAway: string;
  eligiblePicks: SelectedPick[];
  bestPick: SelectedPick | null;
  targetMarkets: GameMarkets;
  selectedCompany: 'ALL' | BookieId;
}

/**
 * Evaluates games against criteria and returns only those that meet company filters,
 * preferred markets, timeframe constraints, and active match status.
 */
export function evaluateAndFilterGames(
  games: StandardGame[],
  criteria: FilterCriteria,
  now: Date = new Date()
): GameEvaluation[] {
  const results: GameEvaluation[] = [];
  const nowMs = now.getTime();
  const maxMs = criteria.timeframeHours ? nowMs + criteria.timeframeHours * 60 * 60 * 1000 : null;

  const normalizedSearch = criteria.searchQuery ? normalizeTeamName(criteria.searchQuery) : '';

  for (const game of games) {
    // 1. Company Filter: check if game is offered by the selected bookmaker
    if (criteria.selectedCompany !== 'ALL') {
      const isOffered = game.bookies && game.bookies.includes(criteria.selectedCompany);
      if (!isOffered) {
        continue;
      }
    }

    // 2. Filter out non-prematch statuses
    if (game.status === 'IN_PLAY' || game.status === 'CANCELLED' || game.status === 'POSTPONED') {
      continue;
    }

    // 3. Validate Kickoff time
    const kickoffMs = new Date(game.kickoffTime).getTime();
    if (isNaN(kickoffMs)) continue;

    // Must be in the future (at least 2 minutes from now)
    if (kickoffMs < nowMs + 2 * 60 * 1000) {
      continue;
    }

    if (maxMs && kickoffMs > maxMs) {
      continue;
    }

    // 4. Normalized Names
    const normHome = normalizeTeamName(game.homeTeam);
    const normAway = normalizeTeamName(game.awayTeam);
    const normLeague = normalizeTeamName(game.league);

    // 5. League Filter
    if (criteria.selectedLeague && criteria.selectedLeague !== 'ALL') {
      if (normalizeTeamName(criteria.selectedLeague) !== normLeague) {
        continue;
      }
    }

    // 6. Search Query Filter
    if (normalizedSearch) {
      const matchHome = normHome.includes(normalizedSearch);
      const matchAway = normAway.includes(normalizedSearch);
      const matchLeague = normLeague.includes(normalizedSearch);
      if (!matchHome && !matchAway && !matchLeague) {
        continue;
      }
    }

    // 7. Choose Markets based on selected company
    const activeMarkets: GameMarkets =
      (criteria.selectedCompany !== 'ALL' && game.companyOdds?.[criteria.selectedCompany]) ||
      game.markets;

    // 7b. SportyBet native market data for booking code generation
    const sportyIds = game.sportyMarkets;

    // Optional: only games that already have usable SportyBet market payloads
    if (criteria.requireFullMarketData) {
      const hasBookableMarkets =
        Array.isArray(sportyIds) &&
        sportyIds.length > 0 &&
        sportyIds.some(
          (m) =>
            (m.marketId === '1' || m.marketId === '10' || m.marketId === '18') &&
            m.outcomes.length > 0
        );
      if (!hasBookableMarkets) {
        continue;
      }
    }

    // 8. Market Evaluation
    const eligiblePicks: SelectedPick[] = [];
    const pickBookie: BookieId | undefined =
      criteria.selectedCompany !== 'ALL' ? criteria.selectedCompany : undefined;

    // Double Chance (1X, X2, 12) — only include when SportyBet IDs resolve
    if (criteria.enableDoubleChance && activeMarkets.doubleChance) {
      for (const dc of activeMarkets.doubleChance) {
        if (dc.odd >= criteria.dcMin && dc.odd <= criteria.dcMax) {
          const ids = findSportyBetIds(sportyIds, 'Double Chance', dc.pick);
          if (!ids.marketId || !ids.outcomeId) continue;
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Double Chance',
            pick: dc.pick,
            odd: dc.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Home Win (1)
    if (criteria.enableHomeWin && activeMarkets.homeWin) {
      const hw = activeMarkets.homeWin;
      if (hw.odd >= criteria.homeWinMin && hw.odd <= criteria.homeWinMax) {
        const ids = findSportyBetIds(sportyIds, 'Home Win', hw.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Home Win',
            pick: '1',
            odd: hw.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Away Win (2)
    if (criteria.enableAwayWin && activeMarkets.awayWin) {
      const aw = activeMarkets.awayWin;
      if (aw.odd >= criteria.awayWinMin && aw.odd <= criteria.awayWinMax) {
        const ids = findSportyBetIds(sportyIds, 'Away Win', aw.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: 'Away Win',
            pick: '2',
            odd: aw.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Over goals — use criterion-selected goal line (0.5 or 1.5)
    if (criteria.enableOver && activeMarkets.overUnder) {
      const overPick = activeMarkets.overUnder.find((m) => m.pick === `Over ${criteria.overGoalLine}`);
      if (overPick && overPick.odd > 1.01) {
        const ids = findSportyBetIds(sportyIds, `Over ${criteria.overGoalLine}`, overPick.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: `Over ${criteria.overGoalLine}`,
            pick: `Over ${criteria.overGoalLine}`,
            odd: overPick.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Under goals — use criterion-selected goal line (3.5 or 4.5)
    if (criteria.enableUnder && activeMarkets.overUnder) {
      const underPick = activeMarkets.overUnder.find((m) => m.pick === `Under ${criteria.underGoalLine}`);
      if (underPick && underPick.odd > 1.05) {
        const ids = findSportyBetIds(sportyIds, `Under ${criteria.underGoalLine}`, underPick.pick);
        if (ids.marketId && ids.outcomeId) {
          eligiblePicks.push({
            gameId: game.id,
            eventId: game.eventId,
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            league: game.league,
            kickoffTime: game.kickoffTime,
            marketName: `Under ${criteria.underGoalLine}`,
            pick: `Under ${criteria.underGoalLine}`,
            odd: underPick.odd,
            marketId: ids.marketId,
            outcomeId: ids.outcomeId,
            specifier: ids.specifier,
            bookie: pickBookie,
          });
        }
      }
    }

    // Even/Odd goals
    if (criteria.enableEvenOdd && activeMarkets.evenOdd) {
      const eo = activeMarkets.evenOdd;
      const ids = findSportyBetIds(sportyIds, 'Even/Odd', eo.pick);
      if (ids.marketId && ids.outcomeId) {
        eligiblePicks.push({
          gameId: game.id,
          eventId: game.eventId,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          league: game.league,
          kickoffTime: game.kickoffTime,
          marketName: eo.pick,
          pick: eo.pick,
          odd: eo.odd,
          marketId: ids.marketId,
          outcomeId: ids.outcomeId,
          specifier: ids.specifier ?? null,
          bookie: pickBookie,
        });
      }
    }

    if (eligiblePicks.length > 0) {
      // Sort by optimal odds (closest to 1.15)
      const sorted = [...eligiblePicks].sort((a, b) => {
        const diffA = Math.abs(a.odd - 1.15);
        const diffB = Math.abs(b.odd - 1.15);
        return diffA - diffB;
      });

      results.push({
        game,
        normalizedHome: normHome,
        normalizedAway: normAway,
        eligiblePicks,
        bestPick: sorted[0],
        targetMarkets: activeMarkets,
        selectedCompany: criteria.selectedCompany,
      });
    }
  }

  // Sort games by kickoff time ascending
  return results.sort(
    (a, b) => new Date(a.game.kickoffTime).getTime() - new Date(b.game.kickoffTime).getTime()
  );
}

/**
 * Fisher-Yates Shuffle Algorithm for unbiased random distribution.
 */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Selects up to N random games from eligible candidates, picking 1 qualifying market per match.
 */
export function pickRandomSelections(
  evaluations: GameEvaluation[],
  count: number
): SelectedPick[] {
  if (evaluations.length === 0 || count <= 0) return [];

  const shuffled = fisherYatesShuffle(evaluations);
  const selectedGames = shuffled.slice(0, Math.min(count, shuffled.length));

  return selectedGames
    .map((evalItem) => evalItem.bestPick)
    .filter((pick): pick is SelectedPick => pick !== null);
}

/**
 * Score a candidate for "AI" selection: prefer mid-range odds, bookable IDs, league diversity.
 */
function scoreEvaluation(ev: GameEvaluation, usedLeagues: Set<string>): number {
  const pick = ev.bestPick;
  if (!pick) return -Infinity;

  const ideal = 1.15;
  const oddScore = 1 / (1 + Math.abs(pick.odd - ideal) * 8);
  const idBonus = pick.marketId && pick.outcomeId ? 0.35 : 0;
  const marketBonus =
    pick.marketName === 'Double Chance'
      ? 0.15
      : pick.marketName === 'Home Win'
        ? 0.1
        : 0.05;
  const league = (ev.game.league || '').toLowerCase();
  const diversity = usedLeagues.has(league) ? -0.4 : 0.2;
  const jitter = Math.random() * 0.08;

  return oddScore + idBonus + marketBonus + diversity + jitter;
}

/**
 * AI-style selection: ranks eligible games by score, picks top N with league diversity.
 * Skips gameIds already on the slip when excludeGameIds is provided.
 */
export function pickSmartSelections(
  evaluations: GameEvaluation[],
  count: number,
  excludeGameIds: Set<string> = new Set()
): SelectedPick[] {
  if (evaluations.length === 0 || count <= 0) return [];

  const pool = evaluations.filter(
    (ev) => ev.bestPick && !excludeGameIds.has(ev.game.id)
  );
  if (pool.length === 0) return [];

  const selected: SelectedPick[] = [];
  const usedLeagues = new Set<string>();
  const remaining = [...pool];

  while (selected.length < count && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = scoreEvaluation(remaining[i], usedLeagues);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    if (chosen.bestPick) {
      selected.push(chosen.bestPick);
      usedLeagues.add((chosen.game.league || '').toLowerCase());
    }
  }

  return selected;
}

/**
 * Merge new picks into the slip without duplicating the same match (gameId).
 */
export function mergePicksIntoSlip(
  existing: SelectedPick[],
  incoming: SelectedPick[]
): SelectedPick[] {
  const byGame = new Map<string, SelectedPick>();
  for (const p of existing) byGame.set(p.gameId, p);
  for (const p of incoming) {
    if (!byGame.has(p.gameId)) byGame.set(p.gameId, p);
  }
  return Array.from(byGame.values());
}

/**
 * Computes accumulator total odds from selected picks.
 */
export function calculateAccumulatorOdds(picks: SelectedPick[]): number {
  if (picks.length === 0) return 1.0;
  const raw = picks.reduce((acc, curr) => acc * curr.odd, 1.0);
  return Math.round(raw * 100) / 100;
}

```

### `src/lib/oddsFetcher.ts`

```typescript
import { StandardGame, GameMarkets, SportyBetMarket, SportyBetOutcome } from '@/types';
import {
  SPORTYBET_MARKET_IDS,
  SPORTYBET_UPCOMING_EVENTS_URL,
} from './constants';

/** Raw shapes returned by SportyBet pcUpcomingEvents */
interface SportyBetRawOutcome {
  id?: string;
  desc?: string;
  odds?: string | number;
  isActive?: number;
}

interface SportyBetRawMarket {
  id?: string;
  name?: string;
  desc?: string;
  specifier?: string;
  status?: number;
  outcomes?: SportyBetRawOutcome[];
}

interface SportyBetRawEvent {
  eventId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  estimateStartTime?: number;
  matchStatus?: string;
  markets?: SportyBetRawMarket[];
  sport?: {
    category?: {
      name?: string;
      tournament?: { name?: string };
    };
  };
  _tournamentName?: string;
  _categoryName?: string;
}

interface SportyBetRawTournament {
  id?: string;
  name?: string;
  categoryName?: string;
  events?: SportyBetRawEvent[];
}

interface SportyBetApiResponse {
  bizCode?: number;
  message?: string;
  data?: {
    totalNum?: number;
    tournaments?: SportyBetRawTournament[];
  };
}

const DEFAULT_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Current-Country': 'KE',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'https://www.sportybet.com/ke/',
};

/** Markets we care about: 1X2, Double Chance, Over/Under */
const REQUESTED_MARKET_IDS = [
  SPORTYBET_MARKET_IDS.MATCH_WINNER, // 1
  SPORTYBET_MARKET_IDS.DOUBLE_CHANCE, // 10
  SPORTYBET_MARKET_IDS.OVER_UNDER, // 18
].join(',');

function parseOdd(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 1 ? n : 0;
}

function parseSportyMarkets(rawMarkets: SportyBetRawMarket[] | undefined): SportyBetMarket[] {
  if (!rawMarkets?.length) return [];
  return rawMarkets
    .map((m) => {
      const marketId = String(m.id ?? '');
      const name = m.name || m.desc || '';
      const outcomes: SportyBetOutcome[] = (m.outcomes || [])
        .filter((o) => o.isActive !== 0)
        .map((o) => ({
          outcomeId: String(o.id ?? ''),
          name: o.desc || '',
          odd: parseOdd(o.odds),
        }))
        .filter((o) => o.outcomeId && o.odd > 0);
      return {
        marketId,
        name,
        specifier: m.specifier === undefined ? null : m.specifier,
        outcomes,
      };
    })
    .filter((m) => m.marketId && m.outcomes.length > 0);
}

function findOutcomeByDesc(
  markets: SportyBetMarket[],
  marketId: string,
  descIncludes: string
): SportyBetOutcome | undefined {
  const lower = descIncludes.toLowerCase();
  for (const m of markets) {
    if (m.marketId !== marketId) continue;
    const found = m.outcomes.find((o) => o.name.toLowerCase().includes(lower));
    if (found) return found;
  }
  return undefined;
}

/** Double Chance outcomes use many label variants on SportyBet */
function findDoubleChanceOutcome(
  markets: SportyBetMarket[],
  pick: '1X' | 'X2' | '12'
): SportyBetOutcome | undefined {
  const m =
    markets.find((x) => x.marketId === SPORTYBET_MARKET_IDS.DOUBLE_CHANCE) ||
    markets.find((x) => x.name.toLowerCase().includes('double chance'));
  if (!m) return undefined;

  const aliases: Record<string, string[]> = {
    '1X': ['1x', 'home or draw', 'home/draw', '1 or x', '1 or draw'],
    X2: ['x2', 'draw or away', 'draw/away', 'x or 2', 'draw or 2'],
    '12': ['12', 'home or away', 'home/away', '1 or 2', 'home or 2'],
  };
  const keys = aliases[pick] || [pick.toLowerCase()];
  let found = m.outcomes.find((o) => {
    const n = o.name.toLowerCase().replace(/\s+/g, ' ').trim();
    return keys.some((a) => n === a || n.includes(a));
  });
  if (!found) {
    const byId: Record<string, string[]> = {
      '1X': ['9', '1'],
      '12': ['10', '3'],
      X2: ['11', '2'],
    };
    const ids = byId[pick] || [];
    found = m.outcomes.find((o) => ids.includes(o.outcomeId));
  }
  if (!found) {
    const want = pick.toLowerCase();
    found = m.outcomes.find((o) => {
      const compact = o.name.toLowerCase().replace(/[^1x2]/g, '');
      return compact === want;
    });
  }
  return found;
}

function findOverUnder(
  markets: SportyBetMarket[],
  isOver: boolean,
  total: number
): SportyBetOutcome | undefined {
  const specifier = `total=${total}`;
  const label = isOver ? 'over' : 'under';
  for (const m of markets) {
    if (m.marketId !== SPORTYBET_MARKET_IDS.OVER_UNDER) continue;
    if (m.specifier !== specifier) continue;
    const found = m.outcomes.find((o) => o.name.toLowerCase().includes(label));
    if (found) return found;
  }
  for (const m of markets) {
    if (m.marketId !== SPORTYBET_MARKET_IDS.OVER_UNDER) continue;
    const found = m.outcomes.find(
      (o) =>
        o.name.toLowerCase().includes(label) &&
        (o.name.includes(String(total)) || m.specifier === specifier)
    );
    if (found) return found;
  }
  return undefined;
}

function findEvenOddOutcome(markets: SportyBetMarket[]): { even: SportyBetOutcome | undefined; odd: SportyBetOutcome | undefined } {
  const even: SportyBetOutcome | undefined = undefined;
  const odd: SportyBetOutcome | undefined = undefined;
  for (const m of markets) {
    if (m.marketId === SPORTYBET_MARKET_IDS.EVEN_ODD) {
      const e = m.outcomes.find((o) => o.name.toLowerCase().includes('even'));
      const o = m.outcomes.find((o) => o.name.toLowerCase().includes('odd'));
      return { even: e, odd: o };
    }
  }
  // Also try markets whose name includes "even" or "odd"
  for (const m of markets) {
    const lowerName = m.name.toLowerCase();
    if (lowerName.includes('even') || lowerName.includes('odd') || lowerName.includes('goal total')) {
      const e = m.outcomes.find((o) => o.name.toLowerCase().includes('even'));
      const o = m.outcomes.find((o) => o.name.toLowerCase().includes('odd'));
      if (e || o) return { even: e, odd: o };
    }
  }
  return { even, odd };
}

function mapEvent(raw: SportyBetRawEvent, tournamentName: string, categoryName: string): StandardGame | null {
  const eventId = raw.eventId || '';
  const homeTeam = raw.homeTeamName || '';
  const awayTeam = raw.awayTeamName || '';
  if (!eventId || !homeTeam || !awayTeam) return null;

  const kickoffTime = raw.estimateStartTime
    ? new Date(raw.estimateStartTime).toISOString()
    : new Date().toISOString();

  const league =
    tournamentName ||
    raw.sport?.category?.tournament?.name ||
    categoryName ||
    raw.sport?.category?.name ||
    'Soccer';

  const sportyMarkets = parseSportyMarkets(raw.markets);

  const homeOutcome =
    findOutcomeByDesc(sportyMarkets, SPORTYBET_MARKET_IDS.MATCH_WINNER, 'home') ||
    sportyMarkets
      .find((m) => m.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER)
      ?.outcomes.find((o) => o.outcomeId === '1');
  const drawOutcome =
    findOutcomeByDesc(sportyMarkets, SPORTYBET_MARKET_IDS.MATCH_WINNER, 'draw') ||
    sportyMarkets
      .find((m) => m.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER)
      ?.outcomes.find((o) => o.outcomeId === '2');
  const awayOutcome =
    findOutcomeByDesc(sportyMarkets, SPORTYBET_MARKET_IDS.MATCH_WINNER, 'away') ||
    sportyMarkets
      .find((m) => m.marketId === SPORTYBET_MARKET_IDS.MATCH_WINNER)
      ?.outcomes.find((o) => o.outcomeId === '3');

  const dc1x = findDoubleChanceOutcome(sportyMarkets, '1X');
  const dcX2 = findDoubleChanceOutcome(sportyMarkets, 'X2');
  const dc12 = findDoubleChanceOutcome(sportyMarkets, '12');

  const dcOutcomes: { pick: '1X' | 'X2' | '12'; odd: number }[] = [];
  if (dc1x) dcOutcomes.push({ pick: '1X', odd: dc1x.odd });
  if (dcX2) dcOutcomes.push({ pick: 'X2', odd: dcX2.odd });
  if (dc12) dcOutcomes.push({ pick: '12', odd: dc12.odd });

  const over05 = findOverUnder(sportyMarkets, true, 0.5);
  const over15 = findOverUnder(sportyMarkets, true, 1.5);
  const under35 = findOverUnder(sportyMarkets, false, 3.5);
  const under45 = findOverUnder(sportyMarkets, false, 4.5);
  const { even: evenOutcome, odd: oddOutcome } = findEvenOddOutcome(sportyMarkets);

  const ouPicks: { pick: string; odd: number }[] = [];
  if (over05) ouPicks.push({ pick: 'Over 0.5', odd: over05.odd });
  if (over15) ouPicks.push({ pick: 'Over 1.5', odd: over15.odd });
  if (under35) ouPicks.push({ pick: 'Under 3.5', odd: under35.odd });
  if (under45) ouPicks.push({ pick: 'Under 4.5', odd: under45.odd });

  const baseMarkets: GameMarkets = {
    doubleChance: dcOutcomes.length > 0 ? dcOutcomes : undefined,
    homeWin: homeOutcome ? { pick: '1', odd: homeOutcome.odd } : undefined,
    draw: drawOutcome ? { pick: 'X', odd: drawOutcome.odd } : undefined,
    awayWin: awayOutcome ? { pick: '2', odd: awayOutcome.odd } : undefined,
    overUnder: ouPicks.length > 0 ? ouPicks : undefined,
    evenOdd: evenOutcome && oddOutcome
      ? { pick: 'Even', odd: evenOutcome.odd }
      : evenOutcome
        ? { pick: 'Even', odd: evenOutcome.odd }
        : oddOutcome
          ? { pick: 'Odd', odd: oddOutcome.odd }
          : undefined,
  };

  return {
    id: eventId,
    eventId,
    homeTeam,
    awayTeam,
    league,
    kickoffTime,
    status: 'SCHEDULED',
    bookies: ['sportybet:ke'],
    markets: baseMarkets,
    companyOdds: {
      'sportybet:ke': baseMarkets,
    },
    sportyMarkets,
  };
}

async function fetchPage(
  pageNum: number,
  pageSize: number,
  timelineHours: number
): Promise<SportyBetRawEvent[]> {
  const url = new URL(SPORTYBET_UPCOMING_EVENTS_URL);
  url.searchParams.set('sportId', 'sr:sport:1');
  url.searchParams.set('marketId', REQUESTED_MARKET_IDS);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('pageNum', String(pageNum));
  url.searchParams.set('timeline', String(timelineHours));
  url.searchParams.set('todayGames', 'false');
  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`SportyBet upcoming events API returned ${response.status}`);
  }

  const data: SportyBetApiResponse = await response.json();
  if (data.bizCode !== undefined && data.bizCode !== 10000) {
    throw new Error(`SportyBet API bizCode ${data.bizCode}: ${data.message || 'unknown'}`);
  }

  const tournaments = data.data?.tournaments || [];
  const events: SportyBetRawEvent[] = [];
  for (const t of tournaments) {
    for (const e of t.events || []) {
      e._tournamentName = t.name || '';
      e._categoryName = t.categoryName || '';
      events.push(e);
    }
  }
  return events;
}

export async function fetchLiveOdds(): Promise<{
  games: StandardGame[];
  source: 'api';
}> {
  // Fetch a few pages in parallel (pageSize 50 × 3 ≈ 150 events) — no N+1 detail calls
  const pageSize = 50;
  const timelineHours = 48;
  const pageCount = 3;

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => fetchPage(i + 1, pageSize, timelineHours))
  );

  const allGames: StandardGame[] = [];
  const seen = new Set<string>();

  for (const events of pages) {
    for (const raw of events) {
      const mapped = mapEvent(raw, raw._tournamentName || '', raw._categoryName || '');
      if (mapped && !seen.has(mapped.id)) {
        seen.add(mapped.id);
        allGames.push(mapped);
      }
    }
  }

  if (allGames.length === 0) {
    throw new Error('No upcoming events found from SportyBet API');
  }

  return { games: allGames, source: 'api' };
}

```

### `src/types/index.ts`

```typescript
export type BookieId = 'sportybet:ke';

export interface MarketPick {
  pick: string;
  odd: number;
  marketName: string;
}

export interface GameMarkets {
  doubleChance?: { pick: '1X' | 'X2' | '12' | string; odd: number }[];
  homeWin?: { pick: '1'; odd: number };
  draw?: { pick: 'X'; odd: number };
  awayWin?: { pick: '2'; odd: number };
  overUnder?: { pick: 'Over 0.5' | 'Under 3.5' | 'Over 1.5' | 'Under 4.5' | string; odd: number }[];
  evenOdd?: { pick: 'Even' | 'Odd'; odd: number };
}

export interface SportyBetOutcome {
  outcomeId: string;
  name: string;
  odd: number;
}

export interface SportyBetMarket {
  marketId: string;
  name: string;
  specifier: string | null;
  outcomes: SportyBetOutcome[];
}

export interface StandardGame {
  id: string;
  eventId?: string; // SportyBet Sportradar event ID (e.g., sr:match:xxxxx)
  homeTeam: string;
  awayTeam: string;
  league: string;
  country?: string;
  kickoffTime: string; // ISO 8601 string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'CANCELLED' | 'POSTPONED';
  bookies: BookieId[];
  markets: GameMarkets;
  companyOdds?: Partial<Record<BookieId, GameMarkets>>;
  sportyMarkets?: SportyBetMarket[];
}

export interface SelectedPick {
  gameId: string;
  eventId?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoffTime: string;
  marketName: 'Double Chance' | 'Home Win' | 'Over 0.5' | 'Under 3.5' | 'Over 1.5' | 'Under 4.5' | 'Even' | 'Odd' | string;
  pick: string;
  odd: number;
  marketId?: string;
  outcomeId?: string;
  specifier?: string | null;
  bookie?: BookieId;
}

export interface FilterCriteria {
  selectedCompany: 'ALL' | BookieId;
  dcMin: number;
  dcMax: number;
  enableDoubleChance: boolean;
  enableHomeWin: boolean;
  homeWinMin: number;
  homeWinMax: number;
  enableAwayWin: boolean;
  awayWinMin: number;
  awayWinMax: number;
  enableOver: boolean;
  overGoalLine: '0.5' | '1.5';
  enableUnder: boolean;
  underGoalLine: '3.5' | '4.5';
  enableEvenOdd: boolean;
  timeframeHours: number | null;
  pickCount: number;
  searchQuery: string;
  selectedLeague: string;
  /** When true, only games with complete SportyBet market IDs (bookable) are used */
  requireFullMarketData: boolean;
}

export interface BookingCodeResponse {
  success: boolean;
  bookingCode: string;
  destinationBookie: BookieId;
  bookieName: string;
  matchCount: number;
  totalOdds: number;
  generatedAt: string;
  expiresAt: string;
  directUrl: string;
  deepLink?: string;
  selections: SelectedPick[];
  bonusPercentage?: number;
  error?: string;
}

```

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#10b981',
          gold: '#f59e0b',
          dark: '#0b1120',
          card: '#151f32',
          border: '#233554',
        },
      },
    },
  },
  plugins: [],
};

```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

```

