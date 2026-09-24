# Subagent Index for Code Review

The prompts for each subagent now live as **droids** in
`~/.agents/subagents/` and are synced to:
- Factory Droids: `~/.factory/droids/<name>.md`
- OpenCode Agents: `~/.claude/agents/<name>.md` and `~/.opencode/agents/<name>.md`

Do NOT duplicate the prompt text here. Reference the droid by name when
launching via `Task` / `subagent`.

## Common preamble

When launching any subagent, prepend this context to the droid's built-in
prompt:

```
Scope: <files-or-folders>
Scope mode: <feature scope | branch diff | prompt folders | explicit files | uncommitted-only | current-state audit>
Diff source: <base comparison, PR ref, uncommitted diff, or none>
Feature intent: <one-sentence summary from feature scope, branch diff, or user prompt>
Tech stack: <react | vue | angular | svelte | backend | unknown>
```

If `Scope mode` is broader than `uncommitted-only`, do not restrict analysis
to currently modified files. Treat uncommitted changes as delta context and
review the full feature surface in `Scope`.

When tech stack is `react`, additionally append for `code-quality-reviewer`
and `performance-reviewer`:

```
React-specific patterns: Apply the react-fix skill patterns from
~/.agents/skills/react-fix/. Read the relevant pattern files before
analyzing:
- patterns/01-prop-drilling.md through patterns/07-memory-leaks.md
- references/false-positives.md (MANDATORY before reporting)
```

The `finding-validator` should also receive the tech stack so it can
check the false-positives guide when validating React findings.

## Droid registry

| Droid name | Focus | Auto-launch? |
|---|---|---|
| `functional-reviewer` | Missing flows, validations, edge cases, error handling, business-logic gaps | Always |
| `code-quality-reviewer` | Naming, duplication, coupling, complexity, SOLID/clean-code issues | Always |
| `performance-reviewer` | Memory leaks, re-renders, N+1 queries, inefficient data loading, large allocations | Always |
| `tests-reviewer` | Missing coverage, broken tests, weak mocks, untested edge cases | Always |
| `integration-reviewer` | API/type contract alignment, frontend/backend consistency, config/dependency issues | Always |
| `security-reviewer` | Auth gaps, scope/role enforcement, secret handling, sensitive actions, audit trail | Conditional (see below) |
| `finding-validator` | Double-check of confirmed/high findings from other subagents to reduce false positives | Always (Phase 2) |

## Security auto-detection

Launch `security-reviewer` automatically when the review scope or diff source
matches any of these heuristics:

**File path patterns:**
- `**/auth/**`, `**/login/**`, `**/session/**`, `**/oauth/**`
- `**/middleware/**`, `**/guard/**`, `**/permission/**`
- `**/webhook/**`, `**/payment/**`, `**/billing/**`
- `**/config/**`, `**/env/**`, `**/secret/**`

**File name patterns:**
- `*auth*`, `*login*`, `*password*`, `*token*`, `*jwt*`, `*session*`
- `*role*`, `*permission*`, `*acl*`, `*rbac*`, `*admin*`, `*scope*`
- `*webhook*`, `*payment*`, `*billing*`, `*charge*`, `*invoice*`
- `*secret*`, `*credential*`, `*api-key*`, `*.env*`
- `*upload*`, `*import*`, `*export*`, `*bulk*`
- `*delete*`, `*remove*`, `*destroy*`, `*purge*`

**Content triggers** (scan diff with `git diff | grep -i`):
- `password`, `secret`, `token`, `api_key`, `apiKey`, `credential`
- `authorization`, `authenticate`, `isAdmin`, `hasRole`, `canAccess`
- `process.env`, `webhook`, `payment`, `stripe`, `paypal`

If any match: launch `security-reviewer` in parallel with the others.
If none match: skip to avoid noise.

## Execution subagent prompt (batch mode)

Use this only after the user approves the plan. The orchestrator divides
fixes into **batches by effort** and launches one executor per batch.

### Batch 1: Quick fixes (parallel)

```
You are a feature-executor subagent. Apply QUICK fixes only.

Scope: <files-or-folders>
Plan: <only quick-effort items from the approved plan>

Instructions:
1. Apply ALL quick fixes in this batch. Each fix is independent.
2. After each fix, run its validation command from the plan.
3. If ANY fix breaks tests or typecheck: STOP the entire batch.
   Revert ALL changes from this batch (not just the last one).
   Report which task failed, what broke, and the error output.
4. After all quick fixes: run full test suite + lint + typecheck.
5. Report back: what changed, what passed, what remains.

Do not commit or push.
```

### Batch 2: Medium fixes (sequential)

```
You are a feature-executor subagent. Apply MEDIUM fixes one at a time.

Scope: <files-or-folders>
Plan: <only medium-effort items from the approved plan>

Instructions:
1. Apply ONE medium fix at a time, in priority order.
2. After each fix: run validation command + full test suite.
3. If a fix breaks tests: STOP. Revert this fix only.
   Report failure, ask main session before retrying.
4. After all medium fixes: run full validation suite.
5. Report back: what changed, what passed, what remains.

Do not commit or push.
```

### Batch 3: Large fixes (handoff only)

```
Do NOT execute large fixes automatically. Generate a handoff file:

.delegations/<task-slug>.md

Containing: Goal, Context, Scope, Non-Goals, Implementation Constraints,
Likely Files, Validation, Expected Final Report.

The user will decide if they want a separate session for each large fix.
```
