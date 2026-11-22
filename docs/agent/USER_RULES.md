# User rules (verbatim where possible, with dates)

Recorded during the agent-workflow bootstrap (2026-11-22). Rules persist until I remove them.

## Bootstrap task rules (2026-11-22)

From the bootstrap task prompt:

- Inspect the repo first; merge into existing files; never overwrite or delete existing content without asking me.
- Do not assume my stack, test commands, or conventions — detect them from the repo. If you can't detect something, list it under "Open questions" in the final report and leave a clearly marked `TODO(user)` placeholder in the doc.
- Do not invent rules I haven't given. Everything written must trace to this prompt; extra bits are marked `(suggested, needs user approval)`.
- Make one small commit per file or logical unit, each on a branch, via the issue workflow: create issue ("Bootstrap agent workflow"), branch, commit in small pieces, open a PR containing `Closes #N`, merge if mergeable.
- Do not change application code during this setup task.
- Final report format: Completed (with issue/PR links) / Not done or blocked / Open questions / Suggestions / Skills used / Anything mocked, assumed, or deviating from the plan (none if none).

## Merge style (2026-11-22)

- Repo settings: `mergeCommitAllowed`, `rebaseMergeAllowed` and `squashMergeAllowed` all true — not uniquely determined.
- Decision: use `gh pr merge` defaults (merge commit) when merging; change with e.g. `gh pr merge --squash <N>` if you prefer.

## Skill-family rules (from the bootstrap prompt's skill list, one-line summaries)

- follow-the-plan — execute the plan in order, one step at a time; state the current step; never reorder, skip, or substitute steps; stop and ask on blockers or unresolvable questions; ask for plan approval only on open questions.
- no-guessing-no-mocks — never fill gaps with assumptions/placeholders/mocks/stubs/hardcoded data; ask a specific question when info is missing; mock only when explicitly requested, labeled `MOCK`.
- blocked-commands — on failing/unrunnable commands: try an equivalent alternative first; if none, give the exact command, what to look for, and ask me to paste the output.
- issue-branch-merge — issue → branch `type/<issue#>-short-name` from the up-to-date default branch → small commits → push → PR with `Closes #N` → check mergeable/checks → merge if mergeable and checks pass → delete branch; never push to the default branch, never force-push without approval, never bypass checks or hooks.
- small-commits — one commit = one small specific change; `type(scope): imperative summary` + issue reference; body when the why isn't obvious; review `git diff --staged` before each commit.
- documentation-handoff — after each completed unit: update PROGRESS.md, NEXT.md; user rules stated in chat → USER_RULES.md immediately with date; decisions → DECISIONS.md.
- approval-for-locks — locks (protection/rulesets, CODEOWNERS, pinned dependencies, irreversible migrations, strict schemas blocking extension, permission/file-mode changes, feature gates, read-only settings, lockdown markers) need explicit approval first.
- ui-no-redundancy — each fact on screen appears once; don't restate labels/headings/implied values; ask when unsure.
- completion-report — end every task with the report format (Completed / Not done or blocked / Open questions / Suggestions / Skills used / Anything mocked or deviating).
- contribution-review — external PRs: check issue link, CONTRIBUTING.md compliance, small focused commits, no unrequested scope; summarize; don't merge external PRs without approval.
