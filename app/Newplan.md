# lotto-bet: issues for the AI coding agent

## Shared context (read first)

- Repo: github.com/Musaamanipeace/lotto-bet. Football betting slip builder with a market filter and booking-code generator. Stack: Next.js 14, Supabase (check whether Neon is also used), deployed on Vercel.
- Before changing anything, map the repo: auth code, every use of localStorage / sessionStorage / IndexedDB, every Supabase table and query, the header, the games list, the betslip, the book code generator, and the filters. Reuse existing patterns and components. Do not add dependencies without stating why.
- Hard rules:
  - Never use the Supabase service-role key in client code.
  - Never run destructive SQL or migrations against production. Write migrations as files and flag them for human review.
  - Every task needs automated tests or a written manual verification checklist.
- Suggested order: 1, 2, 3, 4, 5, then 6 to 12 in any order. Auth and key removal come first because PWA caching and shortcuts both store per-user data.

---

## 1. Fix the local/Supabase data leak with proper sign-in and sign-out (critical)

**Goal:** After sign-out, no user data or saved settings remain readable. A signed-in user can only read and write their own rows.

**Problem:** Data saved locally (settings keys and similar) persists across sessions and can mismatch or leak against what is in Supabase.

**Tasks**
- Audit every persistence point: localStorage, sessionStorage, IndexedDB, cookies, React/Zustand/context state, and every Supabase table without a user scope. Produce a table listing each key, where it is written, and whether it is user-specific.
- Use Supabase Auth with `@supabase/ssr` (or the repo's existing equivalent). Protect user routes with middleware and server-side session checks, not client-only checks.
- Namespace all user-specific client storage by user id, or stop storing it client-side.
- Implement one `signOut()` that: calls Supabase `signOut`; clears all app keys from local/session storage and IndexedDB; clears in-memory state and query caches; clears service-worker caches (see task 3); then redirects.
- Add a `pageshow` handler so the back button or bfcache cannot show stale signed-in UI.
- Add RLS to every user-owned table (slips, saved settings, shortcuts, etc.): a `user_id uuid default auth.uid()` column and select/insert/update/delete policies where `user_id = auth.uid()`. No user-data table may be open to `anon`.

**Tests (required)**
- DB/RLS test: create users A and B with seed data. A cannot read, update or delete B's rows. An anonymous client reads nothing.
- E2E (Playwright): sign in as A, save a setting and a slip, sign out, assert all app storage is empty and protected routes redirect. Sign in as B and assert none of A's data appears, including after reload and the back button.
- Unit test: `signOut()` clears every registered storage key.
- Run against a local or test Supabase project, never production.

**Acceptance criteria**
- [ ] Every storage point is documented and is user-scoped or removed.
- [ ] After sign-out, no user-specific key remains in any browser storage.
- [ ] RLS tests and the E2E test pass in CI.

---

## 2. Remove all keys from the database

**Goal:** No API keys, secrets or "settings keys" are stored in the database.

**Tasks**
- Find every table and column holding keys (e.g. LLM provider keys, bookmaker tokens). Move them to server-only environment variables (Vercel env vars) and update `.env.example`.
- Write a migration that drops those columns or deletes those rows. Mark it **requires human approval before running**.
- Remove any client code that reads or writes these keys.
- List which keys should be rotated because they were exposed.

**Acceptance criteria**
- [ ] A grep for key-storing columns and queries returns nothing.
- [ ] The app works using server env vars only.
- [ ] The rotation list is in the PR description.

---

## 3. Convert the app to a PWA

**Goal:** Installable on mobile and desktop, with a safe offline fallback.

**Tasks**
- Add a web manifest: name, short name, `start_url`, `display: standalone`, theme and background colors, and 192px, 512px and maskable icons.
- Add a service worker (Serwist or `next-pwa`, whichever works with Next 14) with an offline fallback page.
- Caching rules: never cache authenticated API responses, Supabase requests or user-specific pages. Cache only static assets and the offline page. Clear all caches on sign-out (hook into task 1).
- Add Apple meta tags and a viewport with `viewport-fit=cover`.

**Acceptance criteria**
- [ ] Lighthouse PWA installability passes.
- [ ] After sign-out, no user data is retrievable offline.
- [ ] Installable from Chrome on Android.

---

## 4. Make the mobile header static

**Goal:** The top header never scrolls away on mobile.

**Tasks**
- Use `position: sticky` or `fixed; top: 0` with a z-index above content. Find any ancestor with `overflow` set that breaks sticky behaviour.
- Pad for safe areas (`env(safe-area-inset-top)`), use `dvh` rather than `vh`, and offset page content so nothing hides under the header.
- Verify on iOS Safari (address bar collapse) and in the installed PWA.

**Acceptance criteria**
- [ ] Header stays fixed while scrolling at widths 360px, 390px and 430px.
- [ ] No content is hidden beneath it.

---

## 5. Betslip popup in the header; Settings moves to the menu

**Goal:** The betslip is a header button that opens a popup, closed by default.

**Tasks**
- Replace the Settings item in the header with a Betslip button showing a badge with the selection count. Move Settings into the menu.
- Open the betslip as a modal or bottom sheet over the current page. Do not navigate away. On close the user must be at the exact scroll position they left. Use a scroll lock that preserves `scrollY`.
- Accessibility: focus trap, Escape to close, return focus to the trigger, and the mobile back button closes the popup.
- The betslip is collapsed on load and after navigation.

**Acceptance criteria**
- [ ] Scroll position is identical before opening and after closing, on desktop and mobile.
- [ ] Settings is reachable only from the menu.

---

## 6. Merge Book Code Generator into the betslip

**Goal:** Book code generation is a simple button inside the betslip, not a separate feature.

**Tasks**
- Delete the standalone component, its route, and its menu/nav entries. Keep the generation logic and API; call it from a "Generate book code" button in the betslip. Show the result in the betslip with a copy button, plus loading and error states.

**Acceptance criteria**
- [ ] No standalone book code UI or route remains.
- [ ] The button works with the existing generator logic.

---

## 7. Hide the hero for signed-in users

**Goal:** Authenticated users never see the hero with "Build your football slip from live odds".

**Tasks**
- Render the hero only when there is no session. Use the server-side session to avoid a flash of the hero on load.

**Acceptance criteria**
- [ ] A signed-in user never sees the hero, including on first paint.
- [ ] A signed-out user still sees it.

---

## 8. Games carousel

**Goal:** Available games show one card at a time with side navigation, inside a collapsible section.

**Tasks**
- Make the section collapsible (expanded by default). Show a single game card with previous/next buttons plus swipe, using CSS scroll-snap. Show position ("3 / 24"), support keyboard arrows, and disable buttons at the ends.

**Acceptance criteria**
- [ ] One card visible at a time and snaps correctly on touch.
- [ ] Collapse/expand works and preserves the current index.

---

## 9. Unify the filters

**Goal:** Market filters and the bookmaker, time period and league filters become one filter bar.

**Tasks**
- Combine them into a single component or panel. Keep the existing market cards with submarket toggles, and keep the same filter state and logic.
- The two-point (min/max odds) filter must change only via text inputs: two numeric fields with validation (min <= max, sensible bounds, clamp on blur). Remove drag interaction.

**Acceptance criteria**
- [ ] A single filter UI with all four controls.
- [ ] Min/max odds cannot be changed by dragging, only by typing.

---

## 10. Add-to-slip behaviour

**Goal:** Adding a game either creates a new auto-saved slip or adds to the existing one.

**Tasks**
- If no active slip exists, create one automatically with a default name (e.g. "Slip 7 Nov, 14:32") and save it immediately.
- If an active slip exists, show a small chooser: "Add to current slip" or "New slip".
- Prevent duplicate selections of the same game and market. Show a confirmation toast.

**Acceptance criteria**
- [ ] The first add creates and saves a named slip.
- [ ] The chooser appears when a slip is active.
- [ ] Slips are saved per user (RLS from task 1).

---

## 11. "Add tool" shortcuts bar (needs the most care)

**Goal:** Just below the header, a row where users pin shortcuts to routes or sections they visit often.

**Data model:** table `user_shortcuts` with `id`, `user_id` (RLS: own rows only), `label` (max 24 chars), `target` (internal path, optionally with a `#section` anchor), `icon` (optional), `position` (integer), `created_at`.

**Behaviour**
- Shortcuts appear as horizontally scrollable chips. A trailing "+ Add tool" chip opens a picker listing existing app routes and sections (a hardcoded allowlist), not free text.
- Allow edit, delete and reorder (drag, plus up/down buttons for accessibility). Set a maximum (suggest 8) with a clear message at the limit.
- Prevent duplicate targets. Show an empty state with a hint.

**Security**
- `target` must be an internal path from the allowlist. Reject external URLs and `javascript:` values, both in the UI and in a DB check constraint.
- The bar renders only when signed in. Shortcuts are cleared from client state on sign-out (task 1).

**Acceptance criteria**
- [ ] Add, rename, remove and reorder all persist per user.
- [ ] Tapping a shortcut navigates and scrolls to the section.
- [ ] RLS test: user A cannot see user B's shortcuts.
- [ ] The bar works with the static header on mobile (task 4).

---

## Assumptions to confirm

1. "Remove all keys from the db" means API keys, secrets and settings keys stored in the database, moved to server env vars.
2. "Assigned users" means signed-in users.
3. "Divided" filters means they should be merged into one bar.
4. "Two-point filter on text input only" means replacing the min/max sliders with two numeric fields.
5. The shortcut cap of 8 and the 24-character label limit are suggestions.
