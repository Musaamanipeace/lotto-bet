---
name: issue-branch-merge
description: Use for every unit of work: create an issue, branch, commits, PR, and merge, following the repo workflow.
---

# issue-branch-merge

For every unit of work (see `AGENTS.md`):

1. `gh issue create` — clear title + goal + acceptance criteria in the body.
2. Fetch the default branch, then create branch `type/<issue#>-short-name` from the up-to-date default branch.
3. Implement (follow the other skills: no-guessing-no-mocks, small-commits, etc.).
4. Push the branch: `git push -u origin <branch>`.
5. `gh pr create` — title + summary + "How tested"; the PR body MUST contain `Closes #N` (see `.github/workflows/require-linked-issue.yml`).
6. Check readiness: `gh pr view <N> --json mergeable,mergeStateStatus` and `gh pr checks <N>`.
7. If mergeable and all checks pass: merge with `gh pr merge` using the repo's default merge style (if unsure between styles, record the answer in `USER_RULES.md` — see its merge-style rule). Then delete the branch (local and remote).
8. If not mergeable or checks fail: do not force anything. Create a fix on the same branch if it's your own work, otherwise a new issue/branch for someone else's. Retry once. If still blocked after one fix attempt, stop and report.
9. Never push directly to the default branch. Never force-push without user approval. Never bypass checks or hooks.
