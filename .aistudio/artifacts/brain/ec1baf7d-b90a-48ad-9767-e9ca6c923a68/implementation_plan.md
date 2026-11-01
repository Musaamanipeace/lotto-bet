# Lotto Bet: Filter Templates, Account Storage, Collapsible Hierarchy & Top Navigation Hub

A comprehensive plan to enhance Lotto Bet with saved filter templates, complete user authentication and account-stored data, universal collapsible subcomponents, a top-page collapsible navigation hub with instant betslip and filter access, and a conformed stats engine with robust zero-fetch fallback messaging.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following design and architectural choices will guide implementation:
> - **Account & Data Persistence**: Hybrid auth store with seamless in-memory and local browser persistence when PostgreSQL is not configured, automatically upgrading to PostgreSQL when `DATABASE_URL` is available. This guarantees instant zero-friction sign-up, login, and data storage in both local dev and production.
> - **Top-Page Collapsible Card**: A sticky top navigation hub positioned right below the header bar, featuring 1-click collapsibility, fast route switching, active slip status with odds calculator, and instant filter template switching.
> - **Collapsible Subcomponents**: Standardized accordion and collapse controls across Game Cards (markets), Filter Bar (categories), Slip Staging (legs), AI Picks (tier categories), and Leagues (priority groups).
> - **Zero-Data Informs & Conform Stats**: Clear status badges and informative banners when upstream bookmaker feeds return zero matches, accompanied by an instant "Seed Demo Fixtures / Run Refresh" action, plus a "Conform Stats" button for deep risk and odds distribution breakdown.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms Lotto Bet into a complete betting slip curation studio. Users can customize and save reusable filter templates, sign in to sync slips and templates across devices, collapse and expand dense odds markets and subcomponents, navigate all app views via a top collapsible card, and run statistical conformity audits on their slips.
- **Target Audience**: Football analysts, accumulator bettors, and sports enthusiasts seeking structured, data-grounded slip creation without guesswork.
- **Key Value**: Streamlined workflow from finding games with precise filters to managing saved slips, backed by resilient fallback data handling.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Filter Templateization**: The user configures bookmaker, leagues, odds bounds, and market types (e.g. Under 3.5, Home Win), clicks "Save as Template", names it (e.g. "Weekend Safe Overs"), and can re-apply or share it with one click.
2. **Top Collapsible Navigation Hub**: At the top of every page, a compact card reveals active slip legs, total odds, filter presets, and direct route buttons. Clicking "Collapse" minimizes it to a slim persistent pill.
3. **Account Sign-In & Data Center**: Users can sign up or log in via the Auth modal. The account drawer displays all saved betslips, active slips, and saved filter templates with 1-click loading and deletion.
4. **Collapsible Market Matrices**: On game cards and builder views, dense market tables (1X2, Over/Under, Both Teams to Score) can be expanded or collapsed individually or in bulk.
5. **Conform Stats & Zero-Data Notification**: If the upstream fetch returns zero games, an informative banner explains the feed status and offers a one-click fixture refresh. The "Conform Stats" button opens an analytical breakdown of implied probability vs bookmaker margin.

### Visual Identity & Theme
- **Canvas**: Dark navy background (`#060a18` / `bg-navy-950`) with high-contrast text (`text-slate-100` and `text-slate-400`).
- **Accent Elements**: Vibrant emerald (`#10b981`) for positive actions and pass criteria; metallic gold (`#f5c451`) for odds, multipliers, and high-value indicators; cyan (`#22d3ee`) for analytical insights and filters.
- **Typography**: Space Grotesk for display headlines and top metrics; Plus Jakarta Sans for body text; tabular monospace (`font-mono tabular-nums`) for odds, timestamps, and statistics.
- **Spacing & Elevation**: Clean 1px hairline borders (`border-white/10`), subtle glassmorphism (`backdrop-blur-md bg-white/[0.04]`), and consistent nested padding math ($r_{inner} = r_{outer} - padding$).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Storage Authentication & Persistence**
  - *Approach*: Provide an in-memory + local storage hybrid `AuthStore` that mirrors PostgreSQL functionality when `DATABASE_URL` is absent.
  - *Why*: Eliminates 500 errors during local testing or container restarts while preserving standard PostgreSQL schemas when deployed.
- **Decision 2: Top Collapsible Card Hub**
  - *Approach*: Implement a static top card component mounted in `app/layout.tsx` or sticky beneath the header with local collapse state remembered across routes.
  - *Why*: Gives users immediate access to their active slip, filter templates, and navigation anywhere in the app without hunting through menus.
- **Decision 3: Filter Template Structure**
  - *Approach*: Save complete filter state (bookmaker, odds min/max, market selections, leagues search, risk tier) with pre-populated default templates (e.g. "Safe Favorites", "Goal Feast", "Underdog Value").
  - *Why*: Saves users time and encourages disciplined slip building strategies.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Bar                              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│     Top Page Static Collapsible Card Hub (All Routes, Slip, Filters)    │
│  [Routes: Builder | AI Picks | My Slips | Community | Leagues | Chat] │
│  [Active Slip: 5 Legs · Total Odds 8.42] [Filter Templates Selector]   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│  Builder / Game Views       │               │  Account & Stored Data      │
│  - Collapsible Filter Bar   │               │  - Auth Context & Modal     │
│  - Collapsible Market Cards │               │  - Saved Slips Store        │
│  - "Conform Stats" Modal    │               │  - Saved Filter Templates   │
│  - Zero-Data Inform Banner  │               │  - In-Memory + PG Sync      │
└─────────────────────────────┘               └─────────────────────────────┘
```

### Component & State Mapping
- **`app/components/top-collapsible-hub.tsx`**: Static card with collapse toggle, route switcher, real-time slip badge with odds preview, and saved template dropdown.
- **`app/components/market-filters.tsx`**: Enhanced with "Save Filter Template", "Load Template", and collapsible category panels.
- **`src/lib/templates-store.ts`**: Client + server state management for saved filter templates with user account binding.
- **`app/components/conform-stats-modal.tsx`**: Interactive statistics audit panel showing margin removal, risk distribution, and correlation checks.
- **`app/components/zero-data-banner.tsx`**: Informative empty-state component with upstream status diagnosis and fixture refresh trigger.
- **`src/lib/auth-store.ts` & `src/lib/session.ts`**: Universal auth store resolving to `PgAuthStore` or `MemoryAuthStore` without crashing when PostgreSQL is unconfigured.
