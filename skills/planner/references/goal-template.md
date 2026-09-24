# Goal Template

Use this structure for the top-level goal of a durable plan, or standalone in
`goal` mode at `.plans/<goal-name>-goal.md`.

A goal is the north star of the work: it states the outcome, a single
**verifiable end state**, the concrete deliverables, and how completion is
proven. Phases and tasks decompose the goal; they do not replace it.

The most important rule: the `end_state` must be **observable**. If no command,
test, exit code, file state, or other concrete output can prove it, the goal is
not ready — rewrite it as a verifiable condition or route the unknown into an
investigation phase first.

```markdown
---
id: G-001
title: [Goal Title]
status: pending
end_state: [one measurable, observable end-state]
verification: [command or observable that proves it, e.g. "npm test exits 0"]
budget: [optional turn or time cap, e.g. "20 turns" or "60 minutes"]
---

# [G-001] [Goal Title]

## Description

[What this goal is and WHY it matters. One or two paragraphs. Enough context for
an agent to understand intent without reading the whole plan.]

## End State (verifiable)

[The single measurable condition that means "done". It MUST be observable.

GOOD: "every call site of the old API is migrated and `npm run build` exits 0"
GOOD: "all tests in test/auth pass and the lint step is clean"
BAD:  "the app is production-ready" (nothing concrete proves it)
BAD:  "the code is clean" (not observable)]

## Deliverables

- [concrete artifact that remains after the work: file, endpoint, migration,
  doc, PR, config, dashboard]
- [deliverable]

## Definition of Done

- [ ] [observable check: command, test result, exit code, file or queue state]
- [ ] [observable check]

## Constraints / Must Not Change

- [behavior, public contract, API, or file that must stay intact on the way there]

## Non-Goals

- [explicitly out of scope for this goal]

## Budget (optional)

- Stop after [N turns | M minutes] and report progress against the end state.

## Decomposition

- Phases or tasks that advance this goal: [P-001, P-002]
- Or: "see phase-index.md" in structured mode.

## Open Questions

- [unknown that must be resolved; if it blocks the end state, resolve it in an
  investigation phase before execution]
```

Notes:

- Exactly one goal per plan. Use `G-001`; multiple goals mean the request is an
  initiative — use `initiative-overview` instead.
- Valid statuses match the canonical set: `pending`, `in_progress`, `completed`,
  `blocked`, `skipped`.
- `verification` should name a concrete way to prove the end state (command,
  test, contract check, or observable artifact), never a subjective judgment.
- Keep the goal outcome-oriented. Do not embed step-by-step implementation; that
  belongs in phases or tasks.
- In `simple` mode, inline the goal as a `## Goal` block at the top of
  `.plans/<plan-name>.md` instead of a separate file.
- In `structured` mode, write `.plans/<plan-name>/goal.md` and reference `G-001`
  from `phase-index.md`; each phase may carry `goal: G-001` in frontmatter.
- The standalone `goal` mode file is designed to be directly consumable by an
  autonomous completion loop (for example a `/goal`-style condition) or by
  `/build`.
