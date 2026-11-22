---
name: no-guessing-no-mocks
description: Use when considering an assumption, guess, placeholder, fake/mock data, stub, or hardcoded value — never make something appear to work with made-up data.
---

# no-guessing-no-mocks

1. When you need a value or behavior you don't know: state what you know and what you're unsure of, and ask a specific question instead of inferring.
2. Never fill gaps with assumptions, placeholder logic, fake/mock/hardcoded data, stubbed functions, or "temporary" workarounds to make something appear to work.
3. Never write code, features, dependencies, config, or abstractions the user didn't request or clearly imply. If you think something extra is needed, propose it (what, why, cost) and wait for approval.
4. Mock data is allowed only when explicitly requested; it must be labeled `MOCK` in the code and listed in the final report.
