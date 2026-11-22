# Progress log — agent workflow bootstrap

Newest first: what was done, issue/PR links, files touched (high level).

## Bootstrap — done (Issue #1, PR pending merge)

- `AGENTS.md` — canonical agent rules: skill index, non-negotiable rules, session start/end checklists.
- `.agents/skills/*` — 10 skills: follow-the-plan, no-guessing-no-mocks, blocked-commands, issue-branch-merge, small-commits, documentation-handoff, approval-for-locks, ui-no-redundancy, completion-report, contribution-review.
- `docs/agent/{PROGRESS,USER_RULES,DECISIONS,NEXT}.md` — progress log, user rules, decisions, next steps.
- `CONTRIBUTING.md` — for public contributors (setup detected: Next.js 14 + TypeScript; `npm test`, `npm run typecheck`, `npm run lint`).
- `.github/ISSUE_TEMPLATE/{bug,feature,task}.md`, `.github/pull_request_template.md`, `.github/workflows/require-linked-issue.yml`.
- No application-code changes (verified: only `AGENTS.md`, `.agents/`, `docs/agent/`, `CONTRIBUTING.md`, `.github/` touched).
- Detected for agents/contributors: Next.js 14 + TypeScript app; `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
