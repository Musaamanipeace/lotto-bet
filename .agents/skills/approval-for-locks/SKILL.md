---
name: approval-for-locks
description: Use when a change would restrict or freeze future development — locks need explicit user approval first.
---

# approval-for-locks

Anything that restricts or freezes future development requires the user's explicit approval first. Propose it, wait for approval, then act. Propose: what it locks, why it's needed, how to undo it. This includes:

- lockdown or "do not edit" markers
- CODEOWNERS or branch protection/rulesets
- pinned/frozen dependencies, irreversible migrations
- strict validation or schemas that block extension
- permission or file-mode changes, feature gates that disable code paths, read-only settings
