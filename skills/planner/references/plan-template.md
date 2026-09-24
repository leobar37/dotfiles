# Simple Plan Template

Use this exact structure for a simple plan at `.plans/<plan-name>.md`.

```markdown
# [Plan Title]

## Goal

[One verifiable end state for the whole plan, e.g. "all tests in <path> pass
and the build exits 0". Must be observable: a command, test, exit code, or
file state that proves it — never "production-ready" or "works well".]

- Verification: [command or observable that proves the goal end state]
- Deliverables: [concrete artifacts that remain after the work]

## Objective

[One paragraph describing the technical outcome.]

## Scope

- In scope: [items]
- Out of scope: [items]

## Verified Context

- [fact confirmed in code or docs]
- [fact confirmed in code or docs]

## Assumptions

- [inference that should stay explicit]

## Files Involved

- `path/to/file-or-dir` - Create | Modify | Review - [why it matters]
- `path/to/file-or-dir` - Create | Modify | Review - [why it matters]

## Ordered Execution Steps

Each step is a mini-goal: it has context, the files involved, a concrete action,
a verifiable end state, and a way to verify it.

1. **[Step name]**
   - Context: [why this step matters and what must be true before it]
   - Files: `path/to/file-or-dir`
   - Action: [specific implementation intent]
   - End State: [observable condition that proves this step is done]
   - Verification: [command, test, or check that proves the end state]
   - Depends on: [step number or none]

2. **[Step name]**
   - Context: [why this step matters and what must be true before it]
   - Files: `path/to/file-or-dir`
   - Action: [specific implementation intent]
   - End State: [observable condition that proves this step is done]
   - Verification: [command, test, or check that proves the end state]
   - Depends on: [step number or none]

## Risks and Edge Cases

- [risk]
- [edge case]

## Validation Strategy

- [test, lint, typecheck, manual flow, or contract validation]

## Open Questions

- [unknown that still needs confirmation]
```
