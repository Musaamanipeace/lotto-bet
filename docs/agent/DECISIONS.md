# Decisions — agent workflow bootstrap (what, why, alternatives rejected)

Recorded 2026-11-22 unless noted.

## CLAUDE.md — not created

- What: pointer file `CLAUDE.md` saying "Read and follow AGENTS.md" (one line).
- Why: the task says to create it "only if this is Claude Code"; this session runs in the OpenCode harness, not Claude Code.
- Alternatives rejected: other tool-pointer files (not requested).

## Default merge style

- Repo settings: `mergeCommitAllowed`, `rebaseMergeAllowed` and `squashMergeAllowed` all true — not uniquely determined.
- Decision: use `gh pr merge` defaults (merge commit). Recorded in `USER_RULES.md`.
- Alternatives rejected: self-locking the repo to one merge style without user approval.

## Existing content not touched

- `docs/SECURITY_AND_VERIFICATION.md` existed; `docs/agent/` was added alongside it. Nothing overwritten or deleted (verified with `git status`).

## TODO(user) placeholders

- `CONTRIBUTING.md`: code-of-conduct pointer — no `CODE_OF_CONDUCT.md` exists in this repo (to be added or omitted by you; pointer left as TODO).
- Nothing else unknown to the agent during the bootstrap (see final report "Open questions").
