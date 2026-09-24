# Delegation Patterns

When and how to delegate work to subagents during a build session.

All patterns are subject to builder's Mandatory Scope Boundary: only the user's
authorized objective and assigned ownership. Findings and delegation capacity do
not authorize expansion. Every prompt must carry the scope/stop/findings protocol
below, including phase handoffs and read-only work.

## Delegation Gate

Local execution is the default. Do not delegate merely because a task can be
delegated.

Delegate when one decisive reason applies:

- [ ] the user explicitly asks for delegation
- [ ] a large task has independently valuable workstreams with obvious parallel payoff

Otherwise, delegate only when the work is medium/large and at least two material
benefits apply:

- [ ] understanding requires broad exploration of an unfamiliar subsystem
- [ ] independent workstreams can progress without shared files or decisions
- [ ] specialized expertise materially reduces risk
- [ ] delegation avoids substantial context growth in the main session
- [ ] an independent validation or security review is valuable because impact is high

These are eligibility properties, not reasons to delegate:

- the task is isolated
- it has clear input, output, and validation
- it maps to a planner phase
- it can technically be split

### When NOT to Delegate

- The task is localized or answerable with a few direct reads/checks
- The task is a cohesive trivial, small, or medium change
- The task needs user judgment or tight interactive iteration
- The overhead of prompting and verifying approaches the local work
- Delegation would only restate analysis the main session already performed

## Cohesion, Budget, and Retry Ownership

File count is not a proxy for independent work. Keep a cross-file propagation
local when one understood contract governs the changes and coordinated
iteration is more valuable than parallelism.

Default delegation budget:

- trivial/small: zero implementation agents
- cohesive medium: zero by default; at most one with a concrete benefit
- large: at most two concurrent implementation agents by default
- required delegated testing: one tester after production behavior stabilizes

These are ceilings, not targets. Do not launch agents merely because budget is
available. Return regressions caused by the assigned work to its original owner;
fix locally only within ownership or after coordinating an authorized transfer.
Leave unrelated failures untouched and follow the findings protocol below.

## Repository Isolation Rule

Do not create git branches, git worktrees, or git stashes as part of builder
orchestration unless the user explicitly requests that exact action.

If a batch looks risky enough to need isolation:

1. stop before editing
2. explain why isolation may be needed
3. ask the user whether to create a branch/worktree/stash
4. proceed only after explicit approval

Delegation is the preferred isolation mechanism for analysis and scoped work.
Git state changes are not automatic safety rails.

## Orchestration Modes

Pick one mode before implementation.

| Mode | Use when | Main session responsibility |
|---|---|---|
| `local` | default for trivial, small, and cohesive medium work | execute directly and validate |
| `research-first` | unresolved evidence blocks safe execution and the research unit passes the delegation gate | verify findings, then build |
| `parallel` | independently valuable workstreams pass the delegation gate and do not overlap | synthesize after all return |
| `sequential` | a justified delegated result truly gates another unit | validate between units |
| `handoff` | explicit delegation or durable, high-risk, multi-session work | preserve contract and verify results |

If the chosen mode is not `local`, the main session must:

1. define non-overlapping scope boundaries
2. include the analysis technique, if any
3. define expected output and validation
4. ask the existing owner before editing any shared boundary
5. spot-check key claims before implementation

## Orchestration Decision Record

Do not emit a decision record for local execution. When delegation is actually
used, record only:

```text
Builder orchestration:
- Mode:
- Concrete benefit:
- Subagent scope:
- Validation:
```

If those fields do not communicate a material advantage over local execution,
cancel the delegation and work locally.

## Planner Phase Delegation

A planner phase is an autonomous **goal unit** (context + files + final result +
verification), not an automatic delegation boundary. Delegate it only when the
global delegation gate passes and all of these eligibility checks are also true:

### Phase delegation checklist

Delegate a planner phase when all are true:

- [ ] phase has a stable `id` and title
- [ ] phase `entry_criteria` are met
- [ ] phase `end_state` is concrete and verifiable
- [ ] phase includes complete context for execution without re-reading the plan
- [ ] phase lists files/areas involved
- [ ] phase lists requirements or objective
- [ ] phase has validation commands or checks
- [ ] phase has bounded files, folders, layers, or contract surface
- [ ] phase dependencies are complete or not required
- [ ] phase prompt carries non-goals, ownership, stop criteria, and findings protocol

Keep the phase in the main session or blocked when any are true:

- [ ] product/user decision is unresolved
- [ ] phase lacks context, files, or a verifiable end state
- [ ] phase lacks validation
- [ ] phase overlaps files with another active phase
- [ ] phase depends on a not-yet-validated phase
- [ ] phase is too broad and needs further slicing

### Phase orchestration modes

| Phase relationship | Mode |
|---|---|
| no dependencies, no file overlap | parallel `feature-executor` |
| depends on prior phase output | sequential `feature-executor` |
| unclear requirements or architecture | resolve focused unknowns locally; use the `planner` skill only when formal decomposition is needed |
| high-risk, broad, or cross-cutting | durable `subagent-delegation` handoff |

### Phase result synthesis

After a phase returns:

1. Verify exit criteria.
2. Verify validation command output.
3. Check that changed files stayed inside scope boundary.
4. Record blockers or risks.
5. Only then unblock dependent phases.

Do not mark a phase complete from narrative claims alone.

## Lightweight vs Formal Delegation

| Aspect | Lightweight (builder) | Formal (subagent-delegation) |
|--------|----------------------|------------------------------|
| **Format** | Inline prompt in Task tool | `.delegations/<slug>.md` file |
| **When** | Quick research, investigation | Multi-file implementation, refactors |
| **Output** | Text response to main session | Durable file + structured report |
| **Lifetime** | Single use, ephemeral | Reusable across sessions |

## Lightweight Prompt Template

```
Goal: [one specific outcome, 1 sentence]
Context: [repo root, relevant files, what's already known]
Constraints: [what NOT to change, limits, existing behavior to preserve]
Orchestration mode: [research-first | parallel | sequential | handoff]
Analysis technique: [technique name or none]
Scope: [authorized objective and deliverables]
Non-Goals: [excluded work]
Ownership: [owned paths, read-only areas, existing shared-boundary owners]
Validation: [minimum relevant checks sufficient to prove the changed behavior]
Stop Criteria: Stop once deliverables and required verification are complete.
Findings Protocol: Fix regressions caused by your changes within ownership.
Leave unrelated/pre-existing bugs, failing tests, and improvements untouched;
report minimal evidence and label uncertain cause. If nonblocking, continue
without investigating or subdelegating the finding, including parallel agents.
If truly blocking, pause only the affected unit and report the dependency to main;
coordinate with its owner without taking over, or await explicit user permission
to expand scope. Main cannot self-authorize expansion. Blockers, spare budget,
and convenience are not permission. Ask the owner before shared-boundary edits;
do not clean up, refactor, revert, or stage others' changes.
Expected Output: [what to return, format, required fields]
```

### Examples

These examples illustrate the goal/context portion only. Append the scope,
non-goals, ownership, validation, stop criteria, and findings protocol above
before using either as a receiving prompt.

**Good (research):**
```
Goal: Find all places where user roles are checked in the auth module.
Context: Repo at /home/user/project. Auth code lives in src/auth/.
  Check middleware, guards, decorators, and inline checks.
Constraints: Do not modify any files. Read-only.
Expected Output: List of file:line locations with the check type
  (middleware, guard, inline) and the role being checked.
```

**Good (investigation):**
```
Goal: Determine if the payment service supports idempotency keys.
Context: Payment integration at src/payments/gateway.ts. We use
  the Stripe SDK v15. Need to know before implementing retry logic.
Constraints: Read-only. Check source, docs, and test files.
Expected Output: Yes/No answer, with evidence (file:line references).
```

**Bad (too vague):**
```
Look at the auth code and tell me what you find.
```

**Bad (too broad):**
```
Implement the entire checkout flow.
```

## Parallel Delegation Rules

Only launch parallel subagents when ALL conditions are met:

1. No file overlap between delegated scopes
2. Results can be merged cleanly (no merge conflicts expected)
3. No item depends on the output of another in-progress item
4. Validation for each item is independent

If any condition fails, run sequentially instead.

## Synthesis Rules

After a subagent returns:

1. Separate in-scope actionable findings from minimal out-of-scope reports.
2. Classify each key claim as `verified`, `inferred`, or `unknown`.
3. Spot-check at least one file-backed claim before acting.
4. Convert findings into tasks only when necessary for authorized deliverables
   and within ownership; otherwise follow the findings protocol, not auto-expansion.
5. Preserve uncertainty in the final implementation notes.

Do not implement from a subagent result if:

- it lacks file paths or evidence
- it contradicts inspected code
- it proposes changes outside its scope boundary
- it skips the requested validation

## Anti-Patterns

- **Micro-delegation**: delegating a single file, 2-line edit
- **Mega-delegation**: delegating "build the whole feature" as one prompt
- **Chain delegation**: having subagent A depend on subagent B's output
  without the main session validating B's output first
- **Orphan delegation**: launching a subagent and forgetting to check its
  result
- **Blind trust**: accepting subagent output without spot-checking key claims

## Subagent Selection

Choose by capability from agents the current harness actually exposes:

| Work | Preferred capability |
|---|---|
| broad read-only discovery that passed the gate | scout/explore |
| well-scoped implementation that passed the gate | feature executor |
| independent high-impact review that passed the gate | matching review specialist |

Do not invent an unavailable agent name or launch a general agent merely to
mirror a role named in an example.
