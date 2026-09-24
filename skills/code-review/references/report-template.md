# Code Review Report: <Feature Name>

Date: <YYYY-MM-DD>
Scope: <files/folders reviewed>
Reviewer: Claude Code Review (orchestrated)

---

## Review Metadata

- **Generated at:** <ISO timestamp>
- **Branch:** <branch name or unknown>
- **Base commit / diff source:** <commit, branch comparison, PR ref, uncommitted diff, or prompt scope>
- **Scope mode:** feature scope | branch diff | prompt folders | explicit files | uncommitted-only | current-state audit
- **Diff size:** <N files, M lines changed>
- **Tech stack:** react | vue | angular | svelte | backend | unknown
- **Framework skill used:** react-fix | none
- **Subagents used:** functional | code-quality | performance | tests | integration | security
- **Validator run:** yes | no (findings double-checked)
- **Test baseline:** <pass | fail (N failures) | not run>
- **Pre-existing failures:** <list or "none">
- **Commands run:** `git status --short`, `git diff --stat`, <other commands or "none">
- **Not run:** <tests/typechecks/runtime checks not run>
- **Previous review:** <link to .reviews/index.md entry or "none">

---

## Executive Summary

- **Top critical issues:** <count>
- **High-priority issues:** <count>
- **Total findings:** <count>
- **False positives removed:** <count> (by finding-validator)
- **Recommended first step:** <one sentence>

<2-3 sentences summarizing the overall health and biggest risks.>

---

## Findings

### Critical

#### 1. <Short title>
- **ID:** F-001
- **Files:** `path/to/file.ts:42`
- **Category:** functional | code-quality | performance | tests | integration | security
- **Severity:** critical
- **Effort:** quick | medium | large
- **Confidence:** confirmed | likely | speculative
- **Validated:** yes (finding-validator confirmed) | no (not sent to validator) | downgraded | false-positive
- **Fix type:** bugfix | performance | refactor | test | product-decision
- **Evidence:** <file line, diff hunk, runtime result, test result, or subagent source>
- **Description:** <what is wrong or missing>
- **Impact:** <what could break>
- **Reproduction steps:** <exact steps to trigger: input, action, expected vs actual>
- **Recommendation:** <concrete fix>
- **Validation needed:** <how to prove the fix or confirm the issue>

### High

#### 2. <Short title>
- **ID:** F-002
- **Files:** `path/to/file.ts:67`
- **Category:** functional | code-quality | performance | tests | integration | security
- **Severity:** high
- **Effort:** quick | medium | large
- **Confidence:** confirmed | likely | speculative
- **Validated:** yes | no | downgraded | false-positive
- **Fix type:** bugfix | performance | refactor | test | product-decision
- **Evidence:** ...
- **Description:** ...
- **Impact:** ...
- **Reproduction steps:** ...
- **Recommendation:** ...
- **Validation needed:** ...

### Medium

#### 3. <Short title>
- **ID:** F-003
- **Files:** ...
- **Category:** ...
- **Severity:** medium
- **Effort:** ...
- **Confidence:** ...
- **Validated:** yes | no
- **Fix type:** ...
- **Evidence:** ...
- **Description:** ...
- **Recommendation:** ...
- **Validation needed:** ...

### Low

#### 4. <Short title>
- **ID:** F-004
- **Files:** ...
- **Category:** ...
- **Severity:** low
- **Effort:** quick
- **Confidence:** ...
- **Validated:** no
- **Fix type:** ...
- **Evidence:** ...
- **Description:** ...
- **Recommendation:** ...
- **Validation needed:** ...

---

## Validation Results (Phase 2)

Summary of the finding-validator's double-check results.

| Finding ID | Original Severity | Original Confidence | Validator Verdict | Adjusted Severity | Adjusted Confidence | Reason |
|---|---|---|---|---|---|---|
| F-001 | critical | confirmed | confirmed | critical | confirmed | Evidence verified at line 42 |
| F-002 | high | confirmed | downgraded | medium | likely | Guard exists in middleware |
| F-005 | high | confirmed | false-positive | removed | removed | Handled by type system |

---

## Refactor Opportunities

Items that improve maintainability but are not confirmed bugs. Do not mix these
with critical/high defects unless they block a fix.

- <opportunity, files, confidence, and why now or later>

## Measurements Suggested

Performance or memory concerns that need profiling, runtime proof, or scale
validation before implementation.

- <measurement to run and expected signal>

---

## Prioritized Action Plan

Order considers severity first, then confidence, then effort. Dependencies are noted.

| # | ID | Finding | Task | Files | Severity | Confidence | Effort | Depends on | Owner |
|---|---|---------|------|-------|----------|------------|--------|------------|-------|
| 1 | F-001 | <Fix critical validation> | <task> | `src/...` | critical | confirmed | quick | — | subagent/user |
| 2 | F-002 | <Add missing error handling> | <task> | `src/...` | high | likely | medium | #1 | subagent |
| 3 | F-003 | <Refactor duplicated logic> | <task> | `src/...` | medium | speculative | large | — | user decision |

Every critical finding must have a dedicated row unless this section explicitly
states why it was merged into another task.

---

## Validation Guide

How to verify each fix after implementation. Run these commands in order.

| # | ID | Validation Command | Expected Result |
|---|---|---|---|
| 1 | F-001 | `npm test -- auth.test.ts` | All tests pass |
| 2 | F-002 | `npx tsc --noEmit` | No type errors |
| 3 | F-003 | `npm run lint && npm test` | Lint clean, tests pass |

### Rollback Plan

If any fix breaks existing behavior:

1. Revert the specific file: `git checkout -- <file>`
2. Re-run the validation command to confirm baseline is restored
3. Report the failure to the orchestrator with:
   - Which task failed
   - What test/command broke
   - Error output
4. Do NOT continue to the next task until the failure is resolved

---

## Quick Wins

Items marked as `quick` effort, grouped by category.

- [ ] `file.ts:12` — <description>
- [ ] `file.ts:34` — <description>

---

## Security findings (optional)

Include this section **only when the security subagent was used** or
when the diff touches auth, secrets, sensitive actions, or webhooks.
Otherwise omit it entirely so reports stay focused.

### Critical

- **F-S-001** — `<file:line>` <short description> — recommendation.
  (Severity, confidence, fix type, reproduction steps as in Findings above.)

### High

- **F-S-002** — `<file:line>` <short description>.

_(drop Medium/Low if none)_

### Audit trail notes

- Where sensitive actions would be recorded: `<path>` or `none`.

---

## Risks and Dependencies

- <Any known risk: e.g., "Refactor in task #3 may change public API.">
- <Any cross-team or cross-service impact.>

---

## Notes for Follow-up

- <Anything the subagents could not determine and needs human input.>
- <Findings marked as `needs-context` by the validator.>
- <Suggested next review session focus.>

## Checklist Companion

- Optional tracking file: `.reviews/<feature>-<YYYYMMDD>.checklist.json`
- Template: `references/review-checklist-template.json`

---

## Memory Update

After completing this review, append the following entry to
`.reviews/index.md`:

```markdown
## <Feature Name>
- **Date:** <YYYY-MM-DD>
- **Status:** open | closed | merged
- **Findings:** <N total> (<N critical> critical, <N high> high)
- **Report:** `.reviews/<feature>-<YYYYMMDD>.md`
- **Checklist:** `.reviews/<feature>-<YYYYMMDD>.checklist.json`
- **Deferred findings:** <list or "none">
- **Regression risk:** <list or "none">
```

If any finding was previously fixed and reappears, add it to the
**Regression Watch** section of `.reviews/index.md`.
