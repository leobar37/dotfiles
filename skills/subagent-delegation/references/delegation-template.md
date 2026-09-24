# Delegation Template

Use this template for implementation, validation, investigation, or review
handoffs that another agent should execute.

```text
Task Anchor:
User Objective: [the original user request, verbatim]
Current Unit: [the single work unit authorized here]
Success Means: [the observable condition that proves this unit done]

Goal:
[Implement, validate, investigate, or review one specific work unit.]

Required Skill:
- Load and follow the `feature-executor` skill before starting when this is
  implementation, correction, validation, or integration work.
- If this is investigation-only, use `feature-executor` for analysis and final
  reporting, but do not edit source files unless explicitly authorized.

Context:
- Repo root: [absolute repo path]
- Source material: [plan/task/feature brief/user request path or summary]
- Relevant completed outputs: [prior agent report summaries or none]
- Dependency notes: [ordering, blockers, or parallelization constraints]
- Orchestrator classification: [new work | correction | blocked follow-up | plan-invalidated follow-up]

Objective:
[Concrete result expected from the receiving agent.]

Scope:
- [Included responsibility]
- [Included responsibility]

Non-Goals:
- [Explicitly excluded work]
- [Behavior or subsystem not to change]

Ownership:
- [Authorized edit paths/areas, read-only areas, and existing shared-boundary owners]
- Ask the existing owner before editing shared boundaries. Do not clean up,
  refactor, revert, or stage others' changes; coordination cannot expand scope.

Stop Criteria and Out-of-Scope Findings:
- Work ONLY on the user-authorized objective, deliverables, and necessary files
  within ownership. STOP once deliverables and required verification are complete.
- Fix regressions caused by your changes within ownership and verify them.
- Leave unrelated/pre-existing bugs, failing tests, and improvements untouched;
  report minimal evidence and label uncertain cause. If nonblocking, continue
  scope without investigating or subdelegating the finding, even in parallel.
- If truly blocking, pause only the affected unit and report the dependency to
  main. Coordinate with its owner without taking over, or await explicit user
  authorization to expand scope. Neither main nor subagents may self-authorize;
  blockers, spare budget, and convenience do not grant permission.

Implementation Constraints:
- [Mandatory decision, compatibility rule, or preservation requirement]
- [Existing behavior that must remain intact]

Likely Files:
- [path] - [Create | Modify | Review] - [reason]
- [path] - [Create | Modify | Review] - [reason]

Validation:
Use the minimum relevant checks sufficient to prove the changes and affected
contracts. An unrelated global-suite failure does not authorize repository repair.
Run:
- [exact command]
- [exact focused test or build command]

If commands are unknown or unavailable, perform:
- [manual validation or code review check]

Expected Final Report:
- Anchor restatement: objective, unit, and success condition in one line
- Status: completed | partial | blocked | needs-correction
- Delegation ID / Feature ID
- Files changed
- What was implemented or discovered
- How the result maps to the delegated objective
- Deviations from the delegation, if any
- Behaviors preserved
- Validation results
- Remaining authorized work, blocked dependencies, minimal out-of-scope evidence
- Recommended orchestrator action
```

## Guidance

- Keep the prompt self-contained enough to paste into a fresh agent session.
- Include plan paths such as `.plans/<name>/...` when delegation comes from a
  durable plan.
- Use likely files as orientation, not an edit recipe or ownership grant; state
  the authorized boundary separately.
- Keep the delegated unit moderate: one coherent outcome with a meaningful
  validation surface, not a tiny collection of mechanical edits.
- Include exact validation commands when known. If not known, state the best
  available manual validation expectations.
- Do not end by asking whether to start. The prompt itself is the deliverable.
