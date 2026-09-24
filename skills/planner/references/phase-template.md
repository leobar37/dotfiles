# Phase File Template

Each phase is a **goal-shaped**, agent-sized unit of work: it states its own
description, a single verifiable end state, and concrete deliverables. Use this
structure for each file in `.plans/<plan-name>/phases/*.md`.

Prefer declarative file names such as:

- `01-investigate-root-cause.md`
- `02-design-api-contract.md`
- `03-implement-frontend-shell.md`
- `04-validate-integration.md`

Avoid generic names such as:

- `phase1.md`
- `misc.md`
- `backend-stuff.md`

```markdown
---
id: P-001
phase_type: investigation
title: [Phase Title]
status: pending
description: [one line: what this phase achieves and why]
end_state: [one observable condition that means this phase is done]
verification: [command or observable that proves the end_state]
deliverables: [concrete artifact, another artifact]
entry_criteria: [what must be true before starting]
dependencies: []
requirements: [FR-001, NFR-001]
subagent: [droid name for this phase type]
---

# [Phase ID] [Phase Title]

## Context

[Why this phase matters, what the agent needs to know before starting, and how it
fits into the larger plan. Include the business or technical reason, any
assumptions, and the concrete outcome the agent is driving toward. This section
must be enough for another agent to pick up the file and execute it without
re-reading the entire plan.]

## Description

[What this phase achieves and why it matters. Focus on the outcome, not the
implementation path.]

## Phase Type

[investigation | design | implementation | validation | integration]

## End State (verifiable)

[The single measurable, observable condition that means this phase is done. It
MUST be provable by a concrete output.

GOOD: "GET /crm/events streams and `npm test crm/feed` exits 0"
BAD:  "the feed works well" (nothing concrete proves it)]

## Deliverables

- [concrete artifact that remains: file, endpoint, migration, contract, doc]
- [deliverable]

## Definition of Done

- [ ] [observable check: command, test result, exit code, file or queue state]
- [ ] [observable check]

## Evidence

[Recorded during execution. Leave empty when planning; fill as checks pass.]

- [ ] Check: [command or observation] → Result: [exit code / output excerpt]
- [ ] Check: [command or observation] → Result: [exit code / output excerpt]

## Entry Criteria

- [what must be true before starting this phase]
- [prerequisites, context, or completed dependencies]

## Dependencies

- [phase ID or none]

## Files or Areas Involved

- `path/to/file-or-dir` - Likely Create | Modify | Review - [why it matters]

## Context to Preserve

- [existing behavior, API, compatibility rule, or user flow that must remain intact]

## Constraints

- [non-goal or boundary]
- [required architectural decision only if already decided]
- [maximum 3-5 implementation constraints; keep the phase outcome-oriented]

## Requirements Covered

- `FR-001`
- `NFR-001`

## Subagent Prompt

~~~
You are executing goal unit [P-XXX] from a structured plan.

**Context**
[Paste the Context section above.]

**Objective**
[Paste the Description above.]

**Files or Areas Involved**
[Paste the Files or Areas Involved section above.]

**Final Result / End State**
[Paste the End State above.]

**Deliverables**
[Paste the Deliverables above.]

**Definition of Done**
[Paste the Definition of Done above.]

**Entry Criteria**
[Paste the Entry Criteria above.]

**Dependencies**
[Paste the Dependencies above.]

**Context to Preserve**
[Paste the Context to Preserve above.]

**Constraints**
[Paste the Constraints above.]

**Verification**
[Paste the Verification above.]

**Expected Final Report**
- Files changed
- How the result maps to the end state
- Deliverables produced
- Behavior preserved
- Verification results and evidence recorded
- Remaining risks or blockers
~~~

## Expected Final Report

- Files changed
- How the result maps to the end state
- Deliverables produced
- Behavior preserved
- Verification results
- Remaining risks or blockers

## Risks or Notes

- [important caveat, dependency, or risk]
```

Notes:

- Each phase is a **goal unit**: it must include context, files/areas, and a
  verifiable final result so it can be handed off as a standalone goal.
- The `Context` section must be complete enough for another agent (or a future
  session) to execute the phase without re-reading the rest of the plan.
- The `end_state` MUST be observable. If no command, test, exit code, or file
  state can prove it, split an investigation phase before this one.
- `end_state` and `verification` replace the old `exit_criteria` /
  `Completion Criteria` fields; do not duplicate them.
- `Evidence` is a runtime field. Record actual command outputs, exit codes, or
  observable artifacts as the phase executes.
- Frontmatter fields: `id`, `phase_type`, `title`, `status`, `description`,
  `end_state`, `verification`, `deliverables`, `entry_criteria`, `dependencies`,
  `requirements`, `subagent`.
- Each phase must trace to one or more requirement IDs in frontmatter and body.
- State what to achieve and what to validate; avoid prescribing how to implement it.
- Include likely files as orientation, not as a mandatory edit script.
- Do not include long code blocks or pseudo-implementations unless they define a
  public contract that has already been decided.
- If the phase needs a major unresolved architecture choice, split it into a
  decision or investigation phase before the implementation phase.
- Write each phase so an execution command such as `/build-plan` can use it as a
  clean execution unit, or so its `end_state` can drive a `/goal`-style loop.
- Keep the phase ID and dependencies stable so `planner-checklist.js` can operate
  directly on phase frontmatter.
