# Progress log — agent workflow bootstrap

Newest first: what was done, issue/PR links, files touched (high level).

## Bootstrap — in progress (Issue #1, PR pending)

Done:

- `AGENTS.md` — canonical agent rules: skill index, non-negotiable rules, session start/end checklists.
- `.agents/skills/*` — 10 skills: follow-the-plan, no-guessing-no-mocks, blocked-commands, issue-branch-merge, small-commits, documentation-handoff, approval-for-locks, ui-no-redundancy, completion-report, contribution-review.
- `docs/agent/{PROGRESS,USER_RULES,DECISIONS,NEXT}.md` — progress log, user rules, decisions, next steps.
- `docs/SECURITY_AND_VERIFICATION.md` (pre-existing, untouched).

Detected for agents/contributors: Next.js 14 + TypeScript app; `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Remaining: `CONTRIBUTING.md`, `.github/*` (3 issue templates, PR template, require-linked-issue workflow), then push/PR/merge.
