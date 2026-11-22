# AGENTS.md — canonical agent rules

Entry point for every agent working in this repo. **Read this file first** (session start checklist below). All agents must follow the rules, and must open and follow the matching skill **before** starting any task that matches its trigger.

## Skill Index

| Skill | Use when… | Path |
|---|---|---|
| follow-the-plan | Starting any task; before each step of any plan | `.agents/skills/follow-the-plan/SKILL.md` |
| no-guessing-no-mocks | Considering an assumption, guess, placeholder, mock, stub, or hardcoded value to make something appear to work | `.agents/skills/no-guessing-no-mocks/SKILL.md` |
| blocked-commands | A command fails or can't be run (permissions, auth, network, interactive prompt, missing tool) | `.agents/skills/blocked-commands/SKILL.md` |
| issue-branch-merge | Beginning a unit of work (issue → branch → commits → PR) or checking merge readiness | `.agents/skills/issue-branch-merge/SKILL.md` |
| small-commits | About to make a code/doc/config change or commit it | `.agents/skills/small-commits/SKILL.md` |
| documentation-handoff | After each completed unit of work; recording a user-stated rule or non-obvious decision | `.agents/skills/documentation-handoff/SKILL.md` |
| approval-for-locks | A change would restrict or freeze future development | `.agents/skills/approval-for-locks/SKILL.md` |
| ui-no-redundancy | Finalizing any frontend UI/component change | `.agents/skills/ui-no-redundancy/SKILL.md` |
| completion-report | Finishing any task; producing the end-of-task report | `.agents/skills/completion-report/SKILL.md` |
| contribution-review | Reviewing an incoming external PR | `.agents/skills/contribution-review/SKILL.md` |

The agent MUST open and follow the matching skill BEFORE starting any task that matches its trigger, and MUST name the skills it used in its final report.

## Non-negotiable rules

Each rule summarizes its skill; see the skill for details and testable steps.

1. **follow-the-plan** — Execute the plan in order, one step at a time; never reorder, skip, merge, or substitute steps. State the current step before starting it and mark it done after. Stop and ask only if a step is blocked with no alternative; never implement "in the meantime". (`.agents/skills/follow-the-plan/SKILL.md`)
2. **no-guessing-no-mocks** — Never invent facts, assumptions, placeholders, mock/stub data, or hardcoded values to make something appear to work. Ask a specific question when information is missing; state what you know vs. what you're unsure of. Mock data only when explicitly requested, labeled `MOCK`. (`.agents/skills/no-guessing-no-mocks/SKILL.md`)
3. **blocked-commands** — If a command fails or can't run (permissions, auth, network, interactive prompt): try an equivalent alternative first; if none exists, give the exact command, what to look for, and ask me to paste the output. Never claim a command succeeded without output to show. (`.agents/skills/blocked-commands/SKILL.md`)
4. **issue-branch-merge** — Every unit of work: `gh issue create` (title + acceptance criteria) → branch `type/<issue#>-short-name` from the up-to-date default branch → small commits → push → PR with `Closes #<issue>` → check `gh pr view --json mergeable,mergeStateStatus` and checks → merge if mergeable and checks pass → delete branch. Never push to the default branch, never force-push without approval, never bypass checks or hooks. (`.agents/skills/issue-branch-merge/SKILL.md`)
5. **small-commits** — One commit = one small, specific change (`type(scope): imperative summary` + issue reference; body when the why isn't obvious). Before each commit: review `git diff --staged` and confirm it contains only that change. (`.agents/skills/small-commits/SKILL.md`)
6. **documentation-handoff** — After each completed unit of work: update `docs/agent/PROGRESS.md` and `docs/agent/NEXT.md`; any rule the user states in chat goes to `docs/agent/USER_RULES.md` immediately, with the date; record non-obvious decisions in `docs/agent/DECISIONS.md`. Docs describe what IS true. (`.agents/skills/documentation-handoff/SKILL.md`)
7. **approval-for-locks** — Lockdowns, protection/rulesets, CODEOWNERS, pinned/frozen dependencies, irreversible migrations, strict schemas that block extension, permission/file-mode changes, feature gates that disable code paths, read-only settings: propose first, wait for explicit approval. (`.agents/skills/approval-for-locks/SKILL.md`)
8. **ui-no-redundancy** (frontend) — List every fact shown on screen; each fact appears once, in the place that serves it best; don't restate labels/headings/values the context already communicates. (`.agents/skills/ui-no-redundancy/SKILL.md`)
9. **completion-report** — End every task with the report format of the skill (completed / not done / open questions / suggestions / skills used / mocked or deviating). (`.agents/skills/completion-report/SKILL.md`)
10. **contribution-review** (for when external PRs arrive) — Check the PR closes an issue, follows CONTRIBUTING.md, has small focused commits, and no unrequested scope. Summarize findings; do not merge external PRs without approval. (`.agents/skills/contribution-review/SKILL.md`)

## Session start checklist

Before doing anything on a new task/session, read in order:

1. `AGENTS.md` (this file)
2. `docs/agent/USER_RULES.md`
3. `docs/agent/PROGRESS.md`
4. `docs/agent/NEXT.md`

## Session end checklist

After finishing a task/session:

1. Update `docs/agent/PROGRESS.md` — what was done, issue/PR links, high-level files touched.
2. Update `docs/agent/NEXT.md` — next steps, open questions, blockers.
3. If the user gave new rules in chat, update `docs/agent/USER_RULES.md` with the date.
4. Give the completion report (see the `completion-report` skill).
