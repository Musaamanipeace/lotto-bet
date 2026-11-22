# NEXT (next steps) — agent workflow bootstrap

Newest first: next step, open questions, blockers.

## Current

- Bootstrap in progress: Issue #1 — `AGENTS.md`, `.agents/skills/*` (10 skills), `docs/agent/{PROGRESS,USER_RULES,DECISIONS,NEXT}.md` written and committed on branch `docs/1-agent-workflow`.
- Remaining: `CONTRIBUTING.md`, `.github/` (3 issue templates, PR template, require-linked-issue workflow), then push / PR / merge.

## Next steps

1. Write `CONTRIBUTING.md` (for public contributors; detected setup: Next.js 14 + TypeScript; `npm test`, `npm run typecheck`, `npm run lint`).
2. Write `.github/ISSUE_TEMPLATE/bug.md`, `.github/ISSUE_TEMPLATE/feature.md`, `.github/ISSUE_TEMPLATE/task.md`.
3. Write `.github/pull_request_template.md` (must include "Closes #N").
4. Write `.github/workflows/require-linked-issue.yml` (fails PRs that don't close an issue; minimal permissions).
5. Update `PROGRESS.md` (phase: CONTRIBUTING + .github done).
6. Push branch, create PR with `Closes #1`, check `gh pr view --json mergeable,mergeStateStatus` and checks.
7. Merge + delete branch; update `PROGRESS.md` with issue/PR links.
8. Session end: final `PROGRESS.md` update + completion report.

## Open questions

- (none outstanding — additions from time to time are welcome)

## Blockers

- (none expected)

## Suggested — not done (needs your approval)

- `secrets-and-safety` skill — never commit keys/`.env`; check diffs for secrets.
- `pre-merge-checklist` skill — run detected lint/test/build before opening a PR.
- `release-and-changelog` skill.
