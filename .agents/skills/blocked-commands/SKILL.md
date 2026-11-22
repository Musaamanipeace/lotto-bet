---
name: blocked-commands
description: Use when a command fails or cannot be run (permissions, auth, network, interactive prompt, missing tool).
---

# blocked-commands

1. If a command fails or can't run (permissions, auth, network, interactive prompt, missing tool/binary): do not skip the step.
2. First, try a working alternative that achieves the same result without changing scope; if one exists, use it and say so.
3. If none exists: give the exact command, say what to look for (error type, exit code, what output you expect), and ask the user to paste the output. Wait for it.
4. Never claim a command succeeded or tests passed without actual output to show.
