---
name: small-commits
description: Use when about to commit; format the message and keep each commit one small specific change.
---

# small-commits

1. One commit = one small, specific implementation. Never batch unrelated changes.
2. Message format: `type(scope): imperative summary` (types: feat, fix, docs, refactor, test, chore) + a body when the why isn't obvious. Reference the issue.
3. Before each commit, review `git diff --staged` and confirm it contains only that change.
4. Stage only the files of this commit; never stage unrelated files or new WIP work.
5. Large-chunk commits are allowed ONLY when the user explicitly instructs it in chat.
