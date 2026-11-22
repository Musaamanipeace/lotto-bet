---
name: documentation-handoff
description: Use after each completed unit of work; update the agent docs (PROGRESS, NEXT) and record rules and decisions.
---

# documentation-handoff

After each completed unit of work:

1. `docs/agent/PROGRESS.md` — what was done, issue/PR links, files touched (high level).
2. `docs/agent/NEXT.md` — next steps, open questions, blockers.
3. Any rule the user stated in chat goes to `docs/agent/USER_RULES.md` immediately, with the date, in the user's words.
4. Non-obvious decisions (what, why, alternatives rejected) go to `docs/agent/DECISIONS.md`.
5. Docs describe what IS true, not aspirations. Write so an agent with zero context can continue the work.
