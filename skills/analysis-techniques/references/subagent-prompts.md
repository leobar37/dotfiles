# Subagent Prompt Patterns

Use these snippets when delegating analysis work. The goal is to make the
subagent apply a concrete technique, not just "look around".

These templates do not justify delegation. Open this file only after the parent
workflow has independently established that a bounded investigation is large
enough to outweigh handoff and verification overhead. For localized questions,
apply the technique in the main thread instead.

## Generic Technique Prompt

```text
Goal:
[specific outcome]

Scope:
[repo path, files, folders, feature]

Technique:
Apply [Technique Name]. Return the filled technique template, evidence, risks,
and recommended next action.

Constraints:
- Do not write files.
- Cite inspected file paths and line references when possible.
- Separate Verified, Inferred, and Unknown.
- Do not report speculative findings as confirmed.

Expected output:
- Summary
- Technique output
- Evidence
- Risks/open questions
- Recommended next action
```

## Frontend UI State Review

```text
Goal:
Analyze the frontend flow for missing states and edge cases.

Technique:
Apply State Machine Analysis + Contract Trace.

Questions:
1. What UI states exist and which are missing?
2. What transitions/events move between states?
3. Which API contracts does the UI assume?
4. Are loading, empty, error, retry, disabled, optimistic, and success states handled?
5. What tests should cover this?

Expected output:
- State machine table
- Contract trace table
- Missing states or impossible states
- Test recommendations
```

## Backend Dataflow Review

```text
Goal:
Trace the backend behavior for correctness, tenant isolation, and contract drift.

Technique:
Apply Dataflow Trace + Tenant Boundary Map + Contract Trace.

Questions:
1. Where does input enter?
2. Where is it validated?
3. Where are auth and tenant boundaries enforced?
4. What repository/query writes or reads occur?
5. What response contract is returned?
6. Which clients/tests/mocks consume the contract?

Expected output:
- Dataflow trace
- Tenant boundary map
- Contract trace
- Risks and missing validation
```

## Root Cause Investigation

```text
Goal:
Investigate the likely cause of [symptom].

Technique:
Apply Hypothesis Tree.

Questions:
1. What are the top plausible hypotheses?
2. What evidence supports or weakens each hypothesis?
3. What cheap disproof checks exist?
4. What is confirmed, likely, ruled out, or unknown?

Expected output:
- Symptom statement
- Hypothesis table
- Evidence and disproof checks
- Most likely cause
- Next investigation step
```

## Test Strategy Review

```text
Goal:
Design or review the test strategy for [feature].

Technique:
Apply Test Strategy Matrix.

Questions:
1. What behaviors need coverage?
2. What are happy, sad, edge, permission, and regression paths?
3. Which tests should be unit, integration, or e2e?
4. What mocks or contract fixtures are needed?
5. What existing tests already cover this?

Expected output:
- Test strategy matrix
- Coverage gaps
- Recommended tests by priority
```

## Large Work Slicing

```text
Goal:
Split [large task] into safe, verifiable execution slices.

Technique:
Apply Complexity Slicing + Risk Matrix.

Questions:
1. What slices can be independently validated?
2. Which files/layers does each slice touch?
3. What dependencies exist between slices?
4. Which slices are safe to delegate?
5. What validators prove each slice works?

Expected output:
- Slice table
- Risk matrix per slice
- Delegation candidates
- Recommended execution order
```

## Plan Validation Gate

```text
Goal:
Validate whether this plan is safe and executable before implementation.

Use this only because one or more risk triggers are present:
[list risk triggers]

Technique:
Apply Plan Validation Gate. Keep the output short and actionable. Do not write
a persistent report and do not summarize the whole system unless needed for a
specific validation finding.

Questions:
1. Are all requirements covered by phases or explicit non-goals?
2. Does every phase have clear exit criteria and validation?
3. Are there hidden dependencies or ordering risks?
4. Are cross-layer contracts traced where needed?
5. Are rollback/recovery paths sufficient for high-risk changes?
6. Is the plan ready for delegation, or are handoffs ambiguous?
7. What minimum changes are required before execution?

Expected output:
- Risk trigger
- Decision: approve / approve with changes / block
- Required plan changes
- Validation gaps
- Blocking questions
```
