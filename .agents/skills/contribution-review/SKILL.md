---
name: contribution-review
description: Use when an external PR arrives; check it closes an issue, follows CONTRIBUTING.md, and is small and focused.
---

# contribution-review

When external PRs arrive:

1. Check the PR closes an issue — the body must contain `close(s)/fix(es)/resolve(s) #N` (enforced by `.github/workflows/require-linked-issue.yml`).
2. Check it follows `CONTRIBUTING.md` — issue-first, naming, one focused change, commit format, tests run.
3. Check commits are small and focused; no unrequested scope.
4. Summarize findings for the user. Do not merge external PRs without the user's approval.
