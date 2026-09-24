---
name: analysis-techniques
description: |
  Lightweight techniques for software analysis when reasoning materially
  reduces uncertainty: competing root-cause hypotheses, risky cross-layer
  changes, contract or state drift, broad test strategy, and plan validation.
  Do not trigger for localized diagnosis answerable with a direct read, one
  focused check, or an obvious fix—even if the prompt says "analyze" or
  "investigate".
---

# Analysis Techniques

Use the minimum analysis needed to reduce uncertainty. Do not add a formal
analysis phase when direct implementation and verification are enough.

## Activation gate

Use this skill when either:

- one hard trigger applies: high-impact security/data/payment risk, a requested
  formal analysis deliverable, or competing hypotheses remain after the
  cheapest focused check; or
- at least two complexity signals apply: three or more system boundaries,
  unclear state/contract/rollback behavior, broad test design, or several
  plausible causes requiring different evidence.

Do not activate it merely because the user says "analyze", "investigate", or
"root cause". Keep reasoning implicit and act directly when the issue is
localized, likely contained to one or two files, answerable by one command or
focused read, or already has an evident validation path.

If the gate does not pass, skip this skill and proceed directly.

## Choose one technique

Start with one technique. Add a second only when it answers a different blocking
question.

| Need | Technique |
|---|---|
| Diagnose an unknown failure | Hypotheses: possible causes, evidence, disproof checks |
| Understand cross-layer impact | Impact map: UI, API, types, data, auth, tests |
| Trace data or contract drift | Contract trace: input, validation, logic, persistence, output, consumers |
| Reason about a workflow | State map: states, transitions, guards, errors, recovery |
| Prioritize a risky change | Risk check: impact, likelihood, reversibility, validation |
| Decide test coverage | Test matrix: behavior, negative paths, level, regression case |
| Validate an execution plan | Plan gate: dependencies, exit criteria, rollback, blockers |

## Rules

- Verify evidence in code, configuration, tests, logs, or runtime behavior.
- Separate verified facts from assumptions.
- Investigate only until the next safe action is clear.
- Do not produce empty templates, exhaustive matrices, or ceremonial reports.
- Do not delegate merely to appear thorough.
- Analysis and delegation are separate decisions; using a technique never
  implies launching a subagent.
- Read `references/subagent-prompts.md` only after delegation has been justified
  independently by the execution or orchestration skill.
- Prefer a focused test or reproduction over additional speculation.
- For routine work, keep analysis implicit and execute.

## Output

Usually, do not add a separate analysis section. When the reasoning materially
changes the approach, report only:

```text
Verified: relevant evidence
Unknown: remaining uncertainty, if any
Decision: next action and why
```
