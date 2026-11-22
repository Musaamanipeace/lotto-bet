# Contributing

How to contribute to this repository. This file is for external contributors who know nothing about the repo. This repo's own agents follow `AGENTS.md` — they open the matching skill in `.agents/skills/` before any matching task.

## How to set up locally

Prerequisites:

- Node.js >= 18 (from `package.json` `engines`).
- GitHub CLI (`gh`) authenticated — used for the issue/PR workflow (`gh auth status`).

Setup:

1. Clone the repo.
2. `npm install` — installs dependencies (Next.js 14 + TypeScript; no lock file is committed).
3. Run the app: `npm run dev` — Next.js dev server on port 3000.

Local env: if you have access to the secret values, see `.env.example`; add a local `.env` when needed (not required for unit tests).

TODO(user): add any other setup steps here (docker, production, etc.).

## How to run tests

- `npm test` — unit tests: `node --experimental-strip-types --test "tests/**/*.test.ts"`.
- `npm run typecheck` — TypeScript: `tsc --noEmit`.
- `npm run lint` — same as typecheck.
- `npm run build` — Next.js production build.

Run `npm test` before opening a PR.

## How to make a change

1. **Start from an existing issue.** Check `gh issue list` or search. Claim an issue by commenting on it; for large work, open one first and wait for a go-ahead before starting.
2. **Branch.** `git switch -c type/<issue#>-short-name` from `main`, e.g. `feat/3-new-endpoint`.
3. **Commit small.** One commit = one small, specific change: `type(scope): imperative summary` (e.g. `fix(api): handle empty response body`). Reference the issue in the commit body.
4. **Open a PR.** Title the PR after the change. The PR body must contain `Closes #N` — enforced by `.github/workflows/require-linked-issue.yml`. Include a summary and how it was tested.
5. **Merge.** Once checks pass and review is done, merge (repo default merge style).

## Branch naming

`type/<issue#>-short-name` — e.g. `fix/12-empty-response`, `feat/9-new-endpoint`, `docs/8-agent-workflow`.

## One focused change per PR

A PR should do one thing. No unrequested refactors or new dependencies — move them to their own PRs/issues.

## Code style

- TypeScript (`tsconfig.json`).
- Follow existing conventions (`app/`, `src/`, `tests/` directories; Next.js 14 app structure).
- No unrequested additions.

## Testing

See "How to run tests". `npm test` must pass; `npm run typecheck` should be clean.

## Review

Small focused commits make review easy. Reviewers may request changes; iterate on the PR. The agent-side rules (issue workflow, no guessing, no mocks, completion report, etc.) live in `AGENTS.md`; agents follow them automatically.

## Code of conduct

TODO(user): add a pointer to a code of conduct here, or create `CODE_OF_CONDUCT.md`.

*(Written during the agent-workflow bootstrap, 2026-11-22. Detected from the repo; `TODO(user)` marks anything unknown.)*
