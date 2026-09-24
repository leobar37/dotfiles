---
name: code-review
description: Run a deep, orchestrated code review of a feature, branch, folder, diff, or set of changes using subagent delegation with double-check validation to reduce false positives. Use when the user asks for code review, feature audit, review my changes, find gaps, detect memory/performance issues, improve existing code, or analyze a feature holistically. Prefer explicit feature scope or branch/base scope over only uncommitted changes.

# Non-frontmatter runtime hints (convention; see Factory docs)
mode: all
temperature: 0.2

# Invocation controls (Factory reference)
user-invocable: true
disable-model-invocation: false
---

# Code Review Orchestrator

Review a feature or set of changes **without burning the main session
context**. The main session acts as a lightweight orchestrator; all heavy
analysis is delegated to specialized droids (subagents). Findings are
**double-checked** by a validation droid before reaching the final report
to reduce false positives.

The output lands under `<repo>/.reviews/` and is **gitignored by
convention** alongside `reports/` (the `report` skill sibling). The author
and date are recorded in the report metadata header.

## Review Memory (Persistent Index)

Between reviews, the orchestrator maintains `.reviews/index.md` as a
durable memory file. This is the loop's memory: it survives every run,
so the next review picks up where the last one stopped.

### What goes in the index

- **Active reviews:** feature name, date, status, open findings count
- **Closed reviews:** feature name, date, final verdict, merged PR
- **Regression watch:** findings that were fixed but reappeared in later diffs
- **Comprehension debt:** findings deferred >30 days without resolution

### Index format

```markdown
# Review History Index

## Active Reviews
| Feature | Date | Status | Critical | High | Open |
|---------|------|--------|----------|------|------|
| auth-refactor | 2026-06-20 | open | 2 | 3 | 5 |

## Closed Reviews
| Feature | Date | Status | Final Verdict |
|---------|------|--------|---------------|
| checkout-v2 | 2026-06-15 | merged | 0 critical, 1 high fixed |

## Regression Watch
- auth-refactor: F-001 (missing validation) — fixed in PR #312

## Comprehension Debt
- F-004 (checkout-v2): Race condition in payment — deferred 2026-05-15, now 38 days
```

### When to update the index

1. **Before the review:** read the index to check for regressions and
   comprehension debt from previous reviews.
2. **After the review:** append the new review to Active or Closed,
   update Regression Watch if any finding was previously fixed,
   and add deferred findings to Comprehension Debt.

## When to activate

- User asks for "code review", "review this feature", "audit these changes"
- User wants to find functional gaps, missing validations, edge cases
- User wants to detect memory/performance issues
- User wants improvement opportunities in existing code
- User wants a prioritized action plan before fixing

## When NOT to use

- For administrative / operator-facing documentation at the assistant or
  subsystem level (capabilities, modes, multi-tenancy, UI). Use the
  sibling `report` skill instead.
- For architectural planning of new work. Use `planner`.
- For executing follow-up actions based on a prior review. Use
  `feature-executor`.
- For pure chat-only summaries that the user does not want persisted.
- For a 1-2 file trivial diff where the cost of orchestration outweighs
  the value -- read the diff inline.

## Core principle

**Main session = orchestrator only.** It scopes, delegates, validates,
integrates, plans, and optionally triggers execution. It does not perform
deep file-by-file analysis itself.

The `code-review` and `report` skills share this model. Use
`code-review` for **feature quality review** across a diff, branch,
folder set, or current implementation slice. Use `report` for
**current-state documentation**. Both land in gitignored folders
(`.reviews/` and `reports/` respectively) with optional `.checklist.json`
companions.

## Workflow

### 1. Scope the review

Do not assume uncommitted files are the complete feature. A feature may
span already-committed files, generated types, tests, routes, shared
schemas, and configuration.

Run read-only git discovery in the main session:

- `git status --short`
- `git diff --stat`
- `git diff --cached --stat`
- if reviewing a branch, compare against the target base branch or commit
  requested by the user

Choose scope in this priority order:

1. **Explicit user scope wins:** files, folders, feature name, PR, branch,
   base commit, ticket, or product area named by the user.
2. **Branch/base scope:** if the user asks to review a branch, PR, or
   feature branch, scope the full branch diff against the chosen base,
   including already-committed files.
3. **Feature-slice scope:** if the user names a feature but not files,
   discover related files by routes, components, services, schemas,
   tests, migrations, jobs, and generated clients. Include committed and
   uncommitted files that belong to the feature.
4. **Uncommitted-only scope:** use uncommitted changes only when the user
   explicitly asks for "my current changes", "uncommitted changes", or no
   broader feature scope is available.

If uncommitted changes exist inside a broader feature review, treat them
as **delta context**, not the whole scope.

If ambiguous, ask the user for the target feature, folder, or base branch
before delegating.

- **Scope-size limits:** < 20 files = review all; 20-50 = ask user or
  split by feature slice; 50-100 = split by feature slice; > 100 =
  mandatory split in batches.
- **Test baseline:** Before launching subagents, run the test suite
  (`npm test`, `pytest`, `cargo test`, etc.) and record the baseline.
  If tests are already failing, note which ones in the report metadata
  so subagents do not report them as new issues.
- Capture review metadata before delegating: `generated_at`, current
  branch, base commit or diff source, exact scope, scope mode, diff size,
  and whether findings are feature-scope, branch-diff, current-state, or
  uncommitted-only.

### 2. Tech-stack detection

Before launching subagents, detect the project's tech stack so droids
receive framework-specific context. This is a quick read-only check:

```bash
# Check package.json for React
cat package.json | grep -iE '"react"|"react-dom"|"next"|"remix"|"vite"'
# Check for other frameworks
cat package.json | grep -iE '"vue"|"angular"|"svelte"|"@elysiajs"|"express"|"fastify"'
```

**If React is detected:** flag `techStack: react` in the review metadata.
When launching `code-quality-reviewer` and `performance-reviewer`, append
this instruction to their prompt:

```
Tech stack: React. Apply the react-fix skill patterns:
- patterns/01-prop-drilling.md (Context/Zustand/Jotai alternatives)
- patterns/02-large-components.md (blast radius, useReducer, context-aware thresholds)
- patterns/03-risky-useeffects.md (derived state, data fetching, React Compiler)
- patterns/04-hooks-separation.md (extraction, composition, Rules of Hooks)
- patterns/05-providers-context.md (value identity, split state/dispatch)
- patterns/06-hocs.md (legacy vs modern, anti-patterns)
- patterns/07-memory-leaks.md (cleanup cheat sheet, closures, detection)
- references/false-positives.md (CHECK before reporting any finding)
```

The droids should read the relevant pattern files from the `react-fix`
skill at `~/.agents/skills/react-fix/` and apply them as detection
lenses. The false-positives guide is **mandatory** reading before
reporting any React finding.

**If other frameworks are detected:** flag accordingly (e.g.,
`techStack: vue`, `techStack: elysia`). Future skill integrations may
provide framework-specific patterns.

### 3. Security auto-detection

Before launching subagents, check whether the security droid should be
included. Scan file names and diff content for sensitive patterns (see
`references/subagent-prompts.md` for the full heuristic list).

If any match: launch `security-reviewer` in parallel with the other
droids. If none match: skip to avoid noise.

### 4. Launch specialized droids in parallel

Launch the review droids using `Task` with `run_in_background: true`.
Each droid receives scope, feature intent, and output format constraints.

Droid prompts live in `~/.agents/subagents/` and are synced to Factory
droids (`~/.factory/droids/`) and OpenCode agents (`~/.claude/agents/`).
See `references/subagent-prompts.md` for the registry.

| Droid | Focus | Auto-launch? |
|---|---|---|
| `functional-reviewer` | Missing flows, validations, edge cases, error handling | Always |
| `code-quality-reviewer` | Naming, duplication, coupling, complexity, SOLID | Always |
| `performance-reviewer` | Memory leaks, re-renders, N+1, large allocations | Always |
| `tests-reviewer` | Missing coverage, broken tests, weak mocks | Always |
| `integration-reviewer` | API/type contracts, frontend/backend consistency | Always |
| `security-reviewer` | Auth gaps, secrets, sensitive actions, audit trails | Conditional (Step 2) |

Each droid includes **confidence calibration** rules and **severity caps**
in its prompt to reduce false positives at the source.

### 5. Validate findings (double-check)

After all review droids return, launch the `finding-validator` droid to
reduce false positives.

- **What gets validated:** all `confirmed` findings and all
  `critical`/`high` severity findings.
- **What the validator does:** re-reads the code at each cited location,
  checks if the issue is real or handled elsewhere, and returns a
  verdict: `confirmed`, `downgraded`, `false-positive`, or `needs-context`.
- **What the orchestrator does:** removes false-positives, adjusts
  downgrades, and notes unverified findings before synthesis.

This step is **mandatory** before synthesis. It is the key mechanism to
prevent false positives from reaching the final report.

### 6. Synthesize findings

After validation, collect results, remove duplicates, resolve conflicts,
and classify each item:

- **Severity:** `critical` | `high` | `medium` | `low` (subject to
  category caps, see `references/orchestration.md`)
- **Effort:** `quick` | `medium` | `large`
- **Confidence:** `confirmed` | `likely` | `speculative`
- **Fix type:** `bugfix` | `performance` | `refactor` | `test` | `product-decision`
- **Validated:** `yes` | `no` | `downgraded` | `false-positive`

Separate confirmed bugs from risks, refactor opportunities, and
suggested measurements. Do not present hypotheses as confirmed current
defects. Each finding must include **reproduction steps** for
`confirmed`/`high` items.

### 7. Generate the action plan + validation guide

Write a durable report using the template in
`references/report-template.md`. Default path:
`.reviews/<feature-slug>-<YYYYMMDD>.md`.

The report must include:
- **Validation Results table:** showing what the double-check found
- **Reproduction steps** for each `confirmed`/`high` finding
- **Validation Guide:** commands to run after each fix to verify it works
- **Rollback Plan:** what to do if a fix breaks existing tests

The `.reviews/` folder is **gitignored** by convention. Do not commit
review artifacts.

When the review will be used for follow-up execution, also write a
machine-readable companion checklist:

- `.reviews/<feature-slug>-<YYYYMMDD>.checklist.json`

Use the template in `references/review-checklist-template.json` (v2).

### 8. Optional execution

If the user approves the action plan, delegate execution to the `builder`
skill for batch methodology, rollback rules, and checkpoint discipline.

Code-review-specific execution rules:

- **Organize batches by fix type**: `bugfix` first, then `performance`,
  then `refactor`, then `test`.
- **Use validation commands from the report**: each finding in the report
  includes a validation command. Pass it to the executor.
- **Launch `feature-executor`** as the receiving agent for each work unit.
- **Large fixes** (effort = `large` in the report) are NOT auto-executed.
  Generate handoffs via `subagent-delegation` for user review.

The `builder` skill handles the rest: batch sizing, parallel vs sequential,
rollback on failure, git checkpoints, and the conciseness rule for
reporting after each batch.

## What to avoid in the main session

- Do not read dozens of files line-by-line.
- Do not run long searches or deep static analysis directly.
- Do not write fixes before producing the plan (unless the user
  explicitly asks).
- Do not commit or push changes.
- Do not commit review artifacts into the repo. `.reviews/` is
  **gitignored**, so accidental `git add .reviews/` is harmless -- but
  do not bypass the gitignore.
- Do not skip the validation phase (Step 4). False positives erode trust
  in the review.

## Output

A prioritized, actionable review report with:
- Double-checked findings (false positives removed)
- Reproduction steps for confirmed issues
- Validation guide for verifying fixes
- Rollback plan for failed fixes

Every critical finding must appear as its own explicit action-plan row
unless the report says why it is intentionally merged into another
task. Performance findings should not be marked `critical` or `high`
without a reproducible symptom, scale concern, measurement, or broken
user flow. Severity caps by category are enforced (see
`references/orchestration.md`).

## References

- `references/orchestration.md` -- detailed orchestration rules,
  severity caps, diff-size limits, validation phase, and rollback
- `references/subagent-prompts.md` -- droid registry, security
  auto-detection heuristics, and execution prompt with rollback
- `references/report-template.md` -- report template with validation
  results, reproduction steps, and validation guide
- `references/review-checklist-template.json` -- machine-readable
  checklist (v2) with validation fields
- Sibling skill: `report` (current-state documentation; same
  gitignored convention under `reports/`)
- Integrated skill: `react-fix` (React-specific patterns for
  code-quality and performance droids; auto-activated when React is
  detected in tech-stack check, Step 2)
