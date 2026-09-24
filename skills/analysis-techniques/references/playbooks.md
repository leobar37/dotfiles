# Analysis Playbooks

Use these playbooks to pick techniques quickly without overthinking.

## Bug / Root Cause

Use when behavior is broken, flaky, or poorly understood.

1. Write the observed symptom in one sentence.
2. Build a Hypothesis Tree with 3-6 possible causes.
3. For each hypothesis, define one disproof check.
4. Run the cheapest checks first.
5. Use Dataflow Trace if the bug crosses backend or persistence.
6. Use State Machine Analysis if the bug depends on status, timing, retries, or UI state.

Minimum output:

```text
Symptom:
Top hypotheses:
Evidence checked:
Ruled out:
Most likely cause:
Next action:
```

## Feature Planning

Use when a feature touches more than one layer.

1. Build an Impact Map.
2. Use Contract Trace for every API boundary.
3. Use Risk Matrix for auth, billing, tenant data, migrations, or external integrations.
4. Convert high-risk items into separate phases or validation gates.
5. Use Decision Record for meaningful tradeoffs.
6. Run Plan Validation Gate only if the risk triggers are present.

Minimum output:

```text
Impact map:
Contracts:
Risks:
Open questions:
Plan implications:
```

## Plan Validation

Use only when validating the plan is worth the overhead.

Run this gate when:

- the user asks to validate the plan
- the plan touches frontend + backend + database
- the plan touches auth, payments, permissions, multi-tenancy, migrations, persistent data, or external integrations
- the plan has many phases, hidden dependencies, or multiple subagent handoffs
- rollback is unclear or the blast radius is high

Do not use this playbook for low-risk plans. Do not turn it into a persistent
report. If the user wants a narrative artifact under `reports/`, use `report`.

1. Identify the risk trigger.
2. Check that every requirement maps to a phase or explicit non-goal.
3. Check that every phase has exit criteria and validation.
4. Check dependencies between phases and subagents.
5. Check API/UI/schema/test contracts if cross-layer.
6. Check rollback or recovery for high-risk changes.
7. Decide: approve, approve with changes, or block.

Minimum output:

```text
Risk trigger:
Decision: approve / approve with changes / block
Required plan changes:
Validation gaps:
Blocking questions:
```

## Code Review

Use when reviewing a diff or feature.

1. Identify the claim being reviewed.
2. Pick one technique per concern:
   - correctness: Dataflow Trace, State Machine Analysis
   - integration: Contract Trace
   - security: Risk Matrix, Authorization Trace
   - tests: Test Strategy Matrix
   - operability: Observability Review
3. Report only findings with evidence.
4. Mark confidence as confirmed, likely, or speculative.

Minimum output:

```text
Technique:
Evidence:
Finding:
Severity:
Confidence:
Fix direction:
```

## Frontend Feature

Use when building or reviewing UI, forms, modals, tables, wizards, or complex state.

1. Use Impact Map for route/component/query/form/store boundaries.
2. Use State Machine Analysis for loading, empty, error, success, retry, disabled, and optimistic states.
3. Use Contract Trace for API data consumed by the UI.
4. Use Test Strategy Matrix for user flows and edge states.

Minimum output:

```text
UI states:
API contracts:
Error/empty states:
Tests needed:
Risks:
```

## Backend Feature

Use when building or reviewing APIs, repositories, services, jobs, or persistence.

1. Use Dataflow Trace from route input to response.
2. Use Contract Trace for request/response schemas and clients.
3. Use Tenant Boundary Map when data is scoped by restaurant, gym, business, user, or organization.
4. Use Risk Matrix for writes, migrations, external side effects, or irreversible actions.
5. Use Observability Review for async or external integration paths.

Minimum output:

```text
Request path:
Tenant boundary:
Contracts:
Writes/side effects:
Observability:
Validation:
```

## Test Design

Use before writing tests, not after.

1. Identify behaviors, not implementation details.
2. Fill Test Strategy Matrix.
3. Pick test levels:
   - unit for pure logic
   - integration for component + store/API boundaries
   - e2e for critical user journeys
4. Include negative paths for critical workflows.
5. Add regression cases for confirmed bugs.

Minimum output:

```text
Behaviors:
Happy paths:
Sad paths:
Edge cases:
Test levels:
Mocks/contracts:
```

## Large Implementation

Use before executing a plan or broad refactor.

1. Use Complexity Slicing.
2. Split by risk profile, validation path, and file ownership.
3. Use Risk Matrix for each slice.
4. Delegate only slices with clear boundaries and low file overlap.
5. Run validators after each slice.

Minimum output:

```text
Slices:
Dependencies:
Validation per slice:
Delegation candidates:
Rollback path:
```

## Authorization Trace

Use as a companion technique for auth, permissions, RBAC, tenant isolation, and sensitive actions.

```text
Actor:
Authentication source:
Permission/scopes:
Tenant context:
Guard location:
Data filter:
Write constraint:
Audit trail:
Failure behavior:
```

Rules:

- Check both route guards and repository/data filters.
- Verify denied paths, not only allowed paths.
- Sensitive writes should have confirmation, audit trail, or clear recovery.

## Tenant Boundary Map

Use as a companion technique for multi-tenant systems.

```text
Tenant identifier:
Source of tenant context:
Tables scoped:
Queries scoped:
Writes scoped:
Cross-tenant exceptions:
Background jobs:
External integrations:
Tests:
```

Rules:

- Every query touching tenant data should show the tenant filter.
- Background jobs must carry or derive tenant context safely.
- Admin/superuser exceptions must be explicit.
