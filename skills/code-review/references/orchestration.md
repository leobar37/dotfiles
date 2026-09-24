# Code Review Orchestration Guide

This document defines how the main session must behave as a lightweight orchestrator during a code review.

## Session role: orchestrator only

The main session must **preserve context** for decision-making and user communication. Heavy work is pushed to subagents.

Allowed main-session work:
- Run `git status`, `git diff --stat`, `git diff --name-only`
- Run `git diff | grep -i` for security auto-detection (see below)
- Run the test suite to establish a baseline before delegating
- Read `.reviews/index.md` for memory from previous reviews
- Read a small number of high-level files to understand feature intent (e.g., README, route definitions, entry points)
- Launch subagents with precise scopes and questions
- Launch the finding-validator for double-check (Phase 2)
- Integrate subagent outputs
- Write the final action-plan report
- Update `.reviews/index.md` with the new review entry
- Write an optional machine-readable review checklist companion
- Optionally launch execution subagents after user approval

Forbidden main-session work:
- Grepping hundreds of files
- Reading every implementation file in detail
- Running static analysis manually
- Drafting fixes before the plan is approved

## Scoping rules

### Rule 1: Prefer uncommitted changes
Always check `git status` first. If there are modified, staged, or untracked files, the review targets those files by default.

```bash
git status --short
git diff --stat
git diff --name-only HEAD
```

### Diff-size limits

| Files changed | Action |
|---|---|
| < 20 files | Review all in one pass |
| 20-50 files | Ask user which feature/subset to focus on |
| 50-100 files | Split by feature slice; launch subagents per slice in batches |
| > 100 files | Mandatory split: group files by directory/feature, run multiple review rounds |

When splitting, each subagent receives only its slice. The orchestrator
merges results across rounds during synthesis.

- Record the branch, base commit or diff source, generated timestamp, and exact
  scope in the report. This prevents old `.reviews/` files from being read as
  current-state truth after the code changes.

### Rule 2: Fall back to prompt folders
If `git status` is clean, use the folders or files explicitly mentioned by the user.

Examples:
- "review the checkout feature" → find checkout-related folders
- "review src/auth" → scope = `src/auth`
- "review my PR" with no changes → ask what PR/branch/feature

### Rule 3: Ask when unclear
If the scope is ambiguous, ask one clarifying question before launching any subagent.

## Test baseline

Before launching subagents, the orchestrator SHOULD run the project's
test suite to establish a baseline. This prevents subagents from
reporting pre-existing failures as new issues.

```bash
# Detect test runner and run tests
if [[ -f "package.json" ]]; then
  npm test 2>/dev/null || yarn test 2>/dev/null || pnpm test 2>/dev/null
elif [[ -f "Cargo.toml" ]]; then
  cargo test
elif [[ -f "go.mod" ]]; then
  go test ./...
elif [[ -f "pyproject.toml" || -f "setup.py" || -f "requirements.txt" ]]; then
  pytest 2>/dev/null || python -m pytest
elif [[ -f "composer.json" ]]; then
  composer test 2>/dev/null || vendor/bin/phpunit
fi
```

Record the result in the review metadata:
- **Tests run:** yes | no
- **Test result:** pass | fail (N failures)
- **Pre-existing failures:** list any failing tests that are NOT caused by the diff

Subagents must be told: "If tests are already failing, only report NEW
failures introduced by the diff. Do not report pre-existing test
failures as findings."

## Tech-stack detection

Before launching subagents, the orchestrator detects the project's tech
stack so droids receive framework-specific context.

```bash
# Check package.json for framework detection
cat package.json 2>/dev/null | grep -iE '"react"|"react-dom"|"next"|"remix"|"vite"' && echo "REACT"
cat package.json 2>/dev/null | grep -iE '"vue"|"nuxt"' && echo "VUE"
cat package.json 2>/dev/null | grep -iE '"@angular"' && echo "ANGULAR"
cat package.json 2>/dev/null | grep -iE '"svelte"|"@sveltejs"' && echo "SVELTE"
cat package.json 2>/dev/null | grep -iE '"@elysiajs"|"express"|"fastify"|"hono"' && echo "BACKEND"
```

Record the detected stack in the review metadata (`techStack` field).

### React integration

When React is detected, the orchestrator MUST:

1. Flag `techStack: react` in the review metadata.
2. When launching `code-quality-reviewer` and `performance-reviewer`,
   append framework-specific instructions to their prompt preamble:

```
Tech stack: React. Apply the react-fix skill patterns from
~/.agents/skills/react-fix/:
- patterns/01-prop-drilling.md — Context/Zustand/Jotai alternatives, false positives
- patterns/02-large-components.md — blast radius, useReducer, context-aware thresholds
- patterns/03-risky-useeffects.md — derived state, data fetching, React Compiler
- patterns/04-hooks-separation.md — extraction, composition, Rules of Hooks violations
- patterns/05-providers-context.md — value identity, split state/dispatch, provider hell
- patterns/06-hocs.md — legacy vs modern, anti-patterns, TS implementation
- patterns/07-memory-leaks.md — cleanup cheat sheet, closures, state management leaks
- references/false-positives.md — MANDATORY: check before reporting any React finding
```

3. The droids read the relevant pattern files and apply them as
   detection lenses during their analysis.
4. The `references/false-positives.md` file from react-fix is
   **mandatory** reading. Droids must check it before reporting any
   React-specific finding to avoid false positives.
5. The `finding-validator` (Phase 2) should also be aware of the
   tech stack. When validating React findings, it should check the
   false-positives guide to confirm the finding is not an accepted
   pattern.

### Other frameworks

When other frameworks are detected, flag accordingly. Framework-specific
skill integrations may be added in the future following the same pattern.

## Security auto-detection

Before launching subagents, the orchestrator checks whether the security
subagent should be included. Run:

```bash
git diff --name-only HEAD | grep -iE 'auth|login|password|token|jwt|session|oauth|role|permission|acl|rbac|admin|scope|webhook|payment|billing|charge|invoice|secret|credential|api-key|\.env|config|upload|import|export|bulk|delete|remove|destroy|purge'
```

Also scan diff content for sensitive patterns:

```bash
git diff HEAD | grep -iE 'password|secret|token|api_key|apiKey|credential|authorization|authenticate|isAdmin|hasRole|canAccess|process\.env|webhook|payment|stripe|paypal'
```

If any match: launch `security-reviewer` in parallel with the other
subagents. If none match: skip to avoid noise.

## Subagent launch strategy

Launch all specialized subagents in parallel using `Task` with
`run_in_background: true`.

Each subagent receives:
1. **Scope statement:** exact files/folders to analyze
2. **Feature intent:** one-sentence summary
3. **Constraint:** do not write files; only report findings

Subagent prompts live as droids in `~/.agents/subagents/`. See
`references/subagent-prompts.md` for the registry and launch instructions.

Default subagents (always launched):
- `functional-reviewer`
- `code-quality-reviewer`
- `performance-reviewer`
- `tests-reviewer`
- `integration-reviewer`

Conditional subagent:
- `security-reviewer` (auto-detected, see above)

## Phase 2: Finding validation (double-check)

After all review subagents return, the orchestrator launches a
`finding-validator` subagent to reduce false positives.

### What gets validated

Only findings marked as `confirmed` or with severity `critical`/`high`
are sent to the validator. Low-confidence or low-severity findings skip
validation (they are already marked as uncertain).

### How it works

1. Collect all `confirmed`, `critical`, and `high` findings from all subagents.
2. Launch `finding-validator` with the list and the original scope.
3. The validator re-reads the code at each cited location.
4. For each finding, the validator returns one of:
   - `confirmed` — finding is real, evidence checks out
   - `downgraded` — finding is real but severity or confidence should be lowered
   - `false-positive` — finding is incorrect, the code handles the case
   - `needs-context` — cannot verify without runtime or additional files
5. The orchestrator applies the validator's verdicts before synthesis.

### False-positive handling

- `false-positive` findings are removed from the report entirely.
- `downgraded` findings get their severity and confidence adjusted.
- `needs-context` findings keep their original classification but get a note
  in the report: "Not independently verified — requires runtime context."

## Integration rules

After subagents return AND the validator has processed findings:

1. **Apply validator verdicts:** remove false-positives, adjust downgrades.
2. **Deduplicate:** if two subagents mention the same file/line/issue, merge them and keep the higher severity.
3. **Resolve conflicts:** if findings contradict each other, note the conflict and ask the user or pick the more conservative recommendation.
4. **Classify:** assign final severity, effort, confidence, and fix type to each merged finding.
5. **Separate:** keep confirmed bugs distinct from risks, refactor opportunities, and measurements suggested.
6. **Prioritize:** sort by severity first, then confidence, then effort (quick wins before large refactors).

Use confidence values:

| Confidence | Meaning |
|---|---|
| `confirmed` | Directly verified in current files, tests, runtime behavior, or diff. **Double-checked by finding-validator.** |
| `likely` | Strongly supported by code inspection, but not reproduced or measured. |
| `speculative` | Plausible concern that needs validation before implementation. |

Use fix types:

| Fix type | Meaning |
|---|---|
| `bugfix` | Corrects broken behavior or a verified edge case. |
| `performance` | Improves measured or strongly evidenced runtime cost. |
| `refactor` | Improves structure without changing expected behavior. |
| `test` | Adds, fixes, or strengthens coverage. |
| `product-decision` | Requires product or UX direction before implementation. |

## Severity definitions and caps

### Base severity

| Severity | Meaning |
|---|---|
| `critical` | Bug, crash, data loss, security flaw, or broken core flow. Fix immediately. |
| `high` | Significant functional gap, maintainability issue, or performance bottleneck. |
| `medium` | Nice-to-fix; risk is moderate or localized. |
| `low` | Polish, style, or minor improvement. Defer unless quick. |

### Severity caps by category

A finding's severity cannot exceed its category cap **unless** the issue
has a reproducible symptom, scale concern, measurement, or broken user flow.

| Category | Max severity without evidence | Can reach `critical`/`high` when |
|---|---|---|
| `performance` | `medium` | Profiler/benchmark shows real impact, or user-facing latency/crash |
| `code-quality` | `medium` | Issue directly blocks a fix for a `critical`/`high` functional bug |
| `tests` (missing coverage) | `high` | Untested path is a confirmed `critical` functional bug |
| `refactor` (opportunity) | `medium` | N/A — refactor opportunities are never `critical` |
| `integration` | `high` | Type mismatch causes runtime crash or data corruption |
| `security` | `critical` | Always — security findings use full severity range |
| `functional` | `critical` | Always — functional findings use full severity range |

Do not mark memoization, component size, or performance style concerns as
`critical` or `high` without a reproducible symptom, scale concern, measurement,
or broken user flow. False-confidence tests are `high` by default unless they
hide a confirmed broken core flow.

## Effort definitions

| Effort | Meaning |
|---|---|
| `quick` | Can be fixed in minutes; safe and localized. |
| `medium` | Requires focused work; may touch several files. |
| `large` | Needs design discussion or significant refactor. |

## Planning rules

- Produce a durable markdown report (default `.reviews/<feature>-<YYYYMMDD>.md`).
- Include a `Review Metadata` section with timestamp, branch, base commit or
  diff source, exact scope, subagents used, and commands run.
- Group findings by category, then sort by priority.
- Include a short executive summary at the top.
- List dependencies between tasks when order matters.
- Propose which items can be fixed safely by a subagent and which need user input.
- Each finding must include `Evidence`, `Confidence`, `Fix type`,
  `Reproduction steps`, and `Validation needed`.
- Every critical finding must appear as a dedicated action-plan row unless the
  report explicitly explains why it was merged.
- If follow-up execution is expected, create
  `.reviews/<feature>-<YYYYMMDD>.checklist.json` using
  `references/review-checklist-template.json`.

## Execution rules

Only execute after explicit user approval.

- Launch a `feature-executor` or `general-purpose` subagent.
- Pass the approved plan and the current scope.
- Instruct the subagent to apply one concern at a time, keep changes minimal, and stop on any design decision.
- The main session receives progress summaries; it does not write the fixes itself.

### Rollback guidance

The execution subagent must follow these rollback rules:

1. After each fix, run the relevant test or typecheck command.
2. If the change breaks existing tests or introduces new type errors:
   - **STOP immediately.** Do NOT continue to the next task.
   - **Revert** the change (`git checkout -- <file>` or equivalent).
   - **Report** which task failed, what tests broke, and the error output.
   - **Ask** the main session for guidance before retrying.
3. After all tasks complete (or stop), run the full validation suite:
   - Typecheck
   - Lint
   - Tests
4. Report what was changed, what was validated, and what remains.

## Context limits

- Keep the main-session prompt window focused on the current review.
- Summarize completed subagent findings and discard raw detail once integrated.
- If a review grows too large, split it into multiple sessions by feature slice.
