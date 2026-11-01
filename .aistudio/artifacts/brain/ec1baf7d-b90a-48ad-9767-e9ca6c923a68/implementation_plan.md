# Completed Slips & Results Tracker

A comprehensive plan to automatically track saved slips once match kickoffs pass, verify match outcomes via an external sports score feed with manual score fallback, evaluate leg-by-leg settlements, and display historical results with won vs. lost performance counts.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed by the user and govern implementation:
> - **Result Verification Source**: External sports score API integration with an intuitive manual score entry/edit fallback for unmapped fixtures or delayed feeds.
> - **Performance Display**: Clean, focused summary showing total completed slips, total won slips, total lost slips, and win percentage.
> - **Submission & Lifecycle**: Auto-track all saved slips once kickoff times pass, seamlessly separating active upcoming slips from completed/in-progress slips.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges the gap between building slips and tracking their real-world outcomes. Any slip saved in the app automatically shifts into the tracking workflow once its matches kick off. Final scores are fetched or manually recorded, each leg is evaluated against its market rules, and slips are settled as **Won** or **Lost**.
- **Target Audience**: Bettors and football analysts who want an accountable record of how their saved combinations performed without having to check every fixture score manually.
- **Key Value**: Hands-off tracking of betslips with transparent score verification, fail-safe manual score editing, and a clear historical record.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Auto-Tracking on Kickoff**: When a user saves a slip, it appears in "Active Slips". Once the kickoff timestamp passes, the slip automatically reflects as "In Progress / Settled" in the Results Tracker.
2. **Score Resolution & Verification**:
   - The app checks for final scores via the sports data API (`/api/slips/results`).
   - If scores are available, each leg displays the final score (e.g. `Real Madrid 2 - 0 Barcelona · FT`), and an indicator badge displays whether the pick won (✔) or lost (✖).
   - If an external score is pending or needs correction, a **"Edit Score / Override"** button allows the user to input the final home and away goals directly.
3. **Slip Settlement Outcome**:
   - A slip is marked **Won** (vibrant emerald badge) if all active legs succeed.
   - A slip is marked **Lost** (muted rose badge) if any leg fails.
   - Any leg marked as postponed/void is excluded from settlement math.
4. **Summary & Historical Log**:
   - Header stat cards provide quick scannability: **Completed Slips**, **Won Slips**, **Lost Slips**, and **Win Rate %**.
   - Filter tabs allow toggling between: `All Slips`, `Won Only`, `Lost Only`, and `Pending Matches`.

### Visual Identity & Theme
- **Badges**:
  - Won: Emerald border and subtle fill (`border-emerald-500/40 bg-emerald-500/15 text-emerald-300`).
  - Lost: Rose border and subtle fill (`border-rose-500/40 bg-rose-500/15 text-rose-300`).
  - Pending / Live: Cyan/amber border with clock indicator.
- **Typography & Layout**: Match scores rendered in high-contrast tabular figures (`font-mono tabular-nums text-sm font-bold`).
- **Collapsible Structure**: In keeping with the app's collapsible standards, each completed slip item features an expand/collapse toggle for its leg breakdown.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Automated Market Settlement Engine (`src/lib/results-evaluator.ts`)**
  - *Chosen Approach*: Pure deterministic functions evaluating each market type:
    - `1x2`: Home win (`home > away`), Draw (`home == away`), Away win (`away > home`).
    - `double_chance`: `1X` (`home >= away`), `X2` (`away >= home`), `12` (`home !== away`).
    - `over_under`: Total goals (`home + away`) strictly greater or less than line.
    - `btts`: Yes (`home > 0 && away > 0`), No (`home === 0 || away === 0`).
  - *Why*: Fast, client/server portable, mathematically rigorous, and zero hallucination.
- **Decision 2: External API + Manual Fallback Architecture**
  - *Chosen Approach*: Endpoint `/api/slips/results` checks configured external score providers (`FOOTBALL_DATA_API_KEY` / `API_FOOTBALL_KEY`), with fallback to an in-memory/localStorage score ledger where users can submit match scores directly.
  - *Why*: Guarantees that users are never blocked if an API key is unconfigured, rate-limited, or tracking an obscure minor league.
- **Decision 3: Integrated Route & Navigation Placement**
  - *Chosen Approach*: Expose the Results Tracker through `/results` and link it directly in the top collapsible hub and saved-slips view.
  - *Why*: Provides immediate 1-click access without cluttering the primary builder workflow.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Top Navigation Bar & Hub                        │
│             [Builder | AI Picks | Saved Slips | Results Tracker]       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                 Results Tracker View (/results)                        │
│  [Total Completed: 12]  [Won: 7]  [Lost: 5]  [Win Rate: 58.3%]         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
┌─────────────────────────────┐               ┌─────────────────────────────┐
│  Settlement Engine          │               │  Score Resolution Service   │
│  - evaluateLegOutcome()     │               │  - /api/slips/results       │
│  - evaluateSlipSettlement() │               │  - External score checker   │
│  - Deterministic rules      │               │  - Manual score override    │
└─────────────────────────────┘               └─────────────────────────────┘
```

### Component & File Blueprint
1. **`src/lib/results-evaluator.ts`**:
   - Defines `MatchScore`, `LegOutcome` (`'won' | 'lost' | 'void' | 'pending'`), and `SlipSettlement`.
   - Pure functions to evaluate standard football markets from final scores.
2. **`src/lib/results-store.ts`**:
   - Manages match scores cache, manual score overrides, and slip settlement status.
   - Persists to server store and browser `localStorage`.
3. **`app/api/slips/results/route.ts`**:
   - `GET`: Returns resolved match scores for queried fixture names or IDs.
   - `POST`: Stores manual match score overrides entered by the user.
4. **`app/results/page.tsx`**:
   - Dedicated Results Tracker page with KPI metrics banner (Total Completed, Won, Lost, Win Rate).
   - Slips list with status badges, leg-by-leg score tags, collapsible sections, and "Edit Score" modal.
5. **`app/components/top-collapsible-hub.tsx` & `app/components/top-bar.tsx`**:
   - Add "Results Tracker" route shortcut and live won/lost badge.
