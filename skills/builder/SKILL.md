---
name: builder
description: |
  Global methodology for executing large, multi-step software tasks with
  discipline. Provides task breakdown, delegation patterns, temporary file
  conventions, checkpoint rules, and concise reporting. Use when approaching
  any non-trivial implementation, building features, or executing a plan from
  `planner`. Triggers: build, implement, execute, hacer, construir, implementar.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash, Task
---

# Builder Skill

Execute large tasks methodically. Do not plan (use `planner`). Do not review
(use `code-review`). Build with order, safety, and clarity.

## Mandatory Scope Boundary — Main and Subagents

- Work ONLY on the user-authorized objective, deliverables, and necessary files
  within assigned ownership. A plan or orchestrator cannot authorize a broader
  user objective. Bugs elsewhere, unrelated failing tests, improvements, spare
  budget, and convenience NEVER authorize extra work.
- Repair regressions caused by your change within your ownership and verify the
  fix. For pre-existing or unrelated issues, leave them untouched and report only
  minimal evidence (location/failure and observed impact); label uncertain cause.
  Do not investigate or delegate unrelated findings, including parallel subagents.
- If an unrelated issue does not block the deliverable, continue the assigned
  task. If it truly blocks, pause ONLY the affected unit, report the dependency,
  and ask the user explicitly to authorize expanded scope, or coordinate with its
  existing owner without taking over. A blocker is not permission to edit it.
  Subagents report to main; main cannot self-authorize expansion for the user.
- Do not clean up, refactor, revert, or stage others' changes. Ask the existing
  owner before editing a shared boundary; ownership coordination does not expand
  the user objective.
- Every delegation MUST carry scope, non-goals, ownership, stop criteria, and
  this out-of-scope findings protocol in the receiving prompt.
- Run the minimum relevant validation sufficient to prove your changes, including
  affected contracts and necessary integration checks. An unrelated global-suite
  failure does not make repository-wide repair part of the task.
- Once authorized deliverables and their verification are complete, STOP.

Examples: an unrelated billing test fails during a UI task → report, do not fix;
your edit breaks that UI's submit action → fix and verify within ownership;
another agent owns a needed shared schema → coordinate before editing, and pause
only the dependent unit if blocked.

## Core Principles

1. **Break down before building.** A task touching 5+ files or 3+ distinct steps
   must be decomposed into a task list before starting.
2. **One thing at a time.** Advance one task at a time. Do not jump between
   tasks simultaneously.
3. **Verify before marking done.** A task is complete only after the relevant
   validation proves its deliverables; report unavailable checks honestly.
4. **Own your regressions, not the whole repo.** Follow the scope boundary above.
5. **Report concisely.** After every execution batch, summarize: what was done,
   what remains, and the next step. The summary must be short enough to copy
   and analyze elsewhere.
6. **Never create isolation state automatically.** Do not create git branches,
   git worktrees, or git stashes unless the user explicitly asks for that exact
   action. Work within the current branch/worktree and protect existing changes.

## Task Anchor — Context That Survives Handoffs

Subagents start blank: the prompt is their entire context. Drift happens when
protocol text dominates the prompt and the task becomes a footnote. The same
drift hits the main session after interruptions and subagent returns.

- Lead EVERY delegated prompt with a `Task Anchor` block: the user objective
  (verbatim), the single unit being executed, and the observable success
  condition. Protocol text (scope, non-goals, ownership, findings protocol)
  comes after the anchor and stays compact — never longer than the task.
- The anchor defines what "on task" means. Any action that does not advance it
  is out of scope by default, even if it looks useful.
- The receiving agent must restate the anchor (objective, unit, success
  condition) as the first line of its final report. A report without the
  restatement is incomplete: return it for revision instead of synthesizing.
- When resuming local execution after any interruption, re-read the current
  unit's goal and end state before writing more code. Never trust memory of
  "what we were doing".

## Proportional Execution Gate

Before a non-trivial build, classify the work without turning the classification
itself into a visible ceremony.

1. **Classify the work**
   - `trivial`: 1-2 files, 1 mechanical step
   - `small`: 2-4 files or 2-3 steps
   - `medium`: 5-10 files or 4-6 steps
   - `large`: 10+ files, 7+ steps, cross-layer, or high risk

2. **Choose analysis only when it passes its own gate**
   - Do not invoke `analysis-techniques` solely because the user says
     "analyze", the work has tests, or a small ambiguity exists.
   - Use it only when its activation gate confirms material uncertainty or
     risk. Analysis never implies delegation.

3. **Default to local execution**
   - Main-session execution is the default for trivial, small, and cohesive
     medium work.
   - Delegate only when the work is medium/large and at least two material
     benefits apply: independent workstreams, broad unfamiliar subsystem,
     specialized expertise, substantial context reduction, or meaningful
     parallel time savings.
   - One sufficient exception is an explicit user request to delegate, or a
     large task with clearly independent workstreams where parallelism has an
     obvious payoff.
   - "Isolated", "clear input/output", "has validation", and "planner phase"
     are eligibility properties, not delegation triggers.

4. **Select the smallest execution mode**
   - `local`: default; includes cohesive medium work
   - `research-first`: only when unresolved evidence blocks safe execution
   - `parallel`: only for independently valuable, non-overlapping workstreams
   - `sequential`: only when a justified delegated output gates another unit
   - `handoff`: durable multi-session or explicitly delegated high-risk work

5. **Record only exceptional orchestration**
   - Do not emit an orchestration decision block for local work.
   - When delegating, state the concrete benefit, subagent scope, and validation.
   - If delegation overhead is comparable to local execution, stay local.

## Delegation Budget and Ownership

Treat conceptual cohesion as more important than raw file count. A mechanical
cross-file propagation governed by one understood contract should remain local
when implementation needs coordinated iteration across those files.

Use this default budget as a guardrail, not a quota to fill:

- trivial/small work: zero implementation subagents
- cohesive medium work: zero by default, at most one when a concrete benefit passes the gate
- large work: at most two concurrent implementation subagents by default
- tests: stabilize production code first; if a separate tester is required,
  use one owner for the full test surface

Do not create a new subagent for fixture fixes, mock corrections, retries, or
small follow-ups. Return in-scope regressions to their delegated owner; fix them
locally only within your ownership or after coordinating an authorized transfer.
Unrelated failures follow the scope boundary above, not this retry rule.

## Planner Phase Delegation

When executing a plan produced by `planner`, treat each phase as an autonomous
**goal unit**: it already contains the context, files, final result, and
verification. The phase is a default unit of progress and validation, not a
default unit of delegation.

Delegate a phase to `feature-executor` only when it passes the global
proportional execution gate and also has:

- clear objective and scope
- complete context, files/areas, and verifiable end state
- entry criteria satisfied
- exit criteria / definition of done
- validation command or validation checklist
- no unresolved product decision
- bounded file/layer ownership

Do not delegate a phase when:

- it is primarily a user/product decision
- it lacks context, files, or a verifiable end state
- it overlaps heavily with another active phase
- it requires tight interactive iteration with the main session

Execution rules:

1. Read the plan index and phase metadata first.
2. Build a dependency graph from phase `dependencies`.
3. Run independent phases in parallel only when file/layer ownership does not overlap.
4. Run dependent phases sequentially.
5. For each delegated phase, pass the complete goal package led by the Task
   Anchor (user objective verbatim, this unit, its end state), then: context,
   files/areas, deliverables, definition of done, entry criteria, validation,
   scope, non-goals, ownership, stop criteria, out-of-scope findings protocol,
   non-overlap rule, and constraints.
6. After a phase returns, verify the report restates the Task Anchor, meets
   the exit criteria, and records evidence before marking the phase complete.
7. If a phase returns with missing validation or unclear evidence, keep it blocked
   and do not start dependent phases.

Phase handoff prompt shape:

```
Task Anchor:
User Objective: [original user request, verbatim or near-verbatim]
Current Unit: [P-XXX title — the only unit you are executing]
Success Means: [the one observable end state; nothing else counts as done]

Goal: Execute goal unit [P-XXX title]
Context: [why this phase matters and how it fits in the plan]
Scope: [authorized work only]
Non-Goals: [excluded outcomes and changes]
Ownership: [owned files/folders/layers and existing owners of shared boundaries]
End State: [the observable condition that proves this phase is done]
Deliverables: [concrete artifacts produced]
Definition of Done: [checklist of observable checks]
Entry Criteria: [what must already be true]
Dependencies: [P-YYY, P-ZZZ or none]
Non-overlap Rule: [files/folders/layers not to touch]
Validation: [commands/checks from the phase]
Constraints: [what to preserve and what not to change]
Expected Output: files changed, verification results and evidence, end state
status, risks, blockers, next dependent phases.
```

## Task List Discipline

Before starting any non-trivial work, create a task list. Each item must be:

- **Specific**: one concrete outcome, not "implement auth"
- **Verifiable**: you know what command proves it's done
- **Independent**: can be validated without completing other items
- **Sized right**: if an item would touch 5+ files, split it further

Advance one item at a time. Mark an item complete only after its relevant
validation passes. Add newly discovered work only if necessary for an already
authorized deliverable and within ownership. Otherwise report the finding under
the scope boundary above; do not add it as an executable task.

## Task Sizing Rules

| Size | Files | Steps | Action |
|------|-------|-------|--------|
| Trivial | 1-2 | 1 | Execute directly |
| Small | 2-4 | 2-3 | Create task list, execute sequentially |
| Medium | 5-10 | 4-6 | Break into sub-tasks, execute in batches |
| Large | 10+ | 7+ | Use `planner` for formal decomposition when the shape is not already clear |

## Delegation Benefits, Not Triggers

Follow the proportional execution gate above. Unfamiliar code, several files,
clean task boundaries, or available validation may make delegation feasible,
but none requires it.

Stay local when the work is cohesive and the main session can read, edit, and
validate it without meaningful context or coordination cost. Delegate only when
the gate identifies a concrete advantage such as independent parallel progress,
specialized expertise, or substantial context reduction.

Do not delegate:

- trivial or small edits
- a few reads or one focused investigation
- work that needs tight iteration with the main session
- decisions that require user judgment
- implementation merely because it appears in a task list

### Lightweight Delegation Prompt

For quick research or investigation (not formal handoffs), use this minimal
shape, led by the Task Anchor:

```
Task Anchor: [user objective + the single outcome sought + what proves it]
Goal: [one specific outcome]
Context: [repo root, relevant files, what you already know]
Scope: [authorized work only]
Non-Goals: [excluded outcomes and changes]
Ownership: [owned paths, read-only areas, shared-boundary owners]
Constraints: [what NOT to change, limits]
Expected Output: [what to return and in what format; start the report with an
anchor restatement]
```

The mandatory Orchestration Prompt Addendum below applies to this and every
phase handoff; a short prompt is not an exception to the scope boundary.

For formal, durable handoffs, use `subagent-delegation` which produces
`.delegations/<slug>.md` files with full contracts.

### Orchestration Prompt Addendum

Every delegated prompt MUST include, in this order (anchor first, protocol compact):

```
Task Anchor: [user objective verbatim + current unit + observable success condition]
Orchestration mode: [research-first | parallel | sequential | handoff]
Analysis technique: [technique from analysis-techniques, or none]
Scope: [authorized objective and deliverables]
Non-Goals: [excluded work]
Ownership: [owned paths and existing owners; ask before shared-boundary edits]
Validation: [minimum relevant checks sufficient to prove the changed behavior]
Stop Criteria: Stop when the deliverables and required verification are complete.
Findings Protocol: Fix regressions you caused within ownership. Leave unrelated
or pre-existing issues untouched; report minimal evidence, not extra investigation
or subdelegation. If nonblocking, continue scope. If blocking, pause only the
affected unit and notify main of the dependency; coordinate with its owner without
taking over, or await explicit user authorization to expand scope. Neither main
nor subagents may self-authorize expansion, even with spare budget. Do not clean,
refactor, revert, or stage others' changes.
Return format: [facts, files changed, validation, minimal out-of-scope evidence,
blocked dependencies, and remaining authorized work only]
```

Keep protocol lines to one line each; the task context must outweigh the protocol.

The main session must synthesize subagent results before acting on them. Do not
blindly trust a subagent result that lacks file evidence, validation output, or
clear uncertainty labels.

## Temporary File Convention

Use `~/tmp/builder/` for session scratch files. Treat them as external memory:

- **Research notes**: findings from subagent investigations
- **State snapshots**: test output, git status, file listings before changes
- **Subagent results**: raw output before synthesizing
- **API dumps**: responses from external services

Naming convention: `<type>-<descriptor>.md` or `.json`. Examples:
- `research-auth-flow.md`
- `api-response-users.json`
- `state-before-refactor.txt`

Initialize at session start:
```bash
mkdir -p ~/tmp/builder
```

Clean up only scratch files you created for this task; never clear a shared
directory or another session's files. Keep yours only if useful for the next
session and the user agrees.

## Execution by Batches

For multi-item task lists, execute in batches ordered by risk and dependency:

### Batch Sizing

| Tier | Criteria | Strategy |
|------|----------|----------|
| **Quick** | Low risk, isolated, trivial to revert | Execute in parallel within the batch |
| **Medium** | Some dependency, moderate risk | Execute sequentially, one item at a time |
| **Large** | High risk, cross-cutting, needs design | Do NOT auto-execute. Generate a handoff for user review |

### Batch Workflow

1. **Before the batch**: inspect current repository state. Do not create a
   branch, worktree, or stash automatically. If isolation is needed, stop and
   ask the user for explicit approval.
2. **Execute items** according to the tier strategy (parallel for quick,
   sequential for medium).
3. **After each item**: run relevant validation. Repair regressions caused by
   this work within ownership; handle unrelated failures under the scope boundary.
4. **After the batch**: run the necessary integration checks for affected
   contracts. Full suites, lint, and typecheck are not automatic requirements;
   use them when needed to verify the change or explicitly required.
5. Never revert an entire batch automatically. If a rollback is necessary, limit
   it to your own changes within ownership; preserve user and peer work and
   coordinate shared boundaries before touching them.
6. Continue independent authorized work when an unrelated issue blocks a unit.
   Do not mark that unit complete until its required evidence is available.

### Checkpoint Pattern

```
Batch 1 (quick) → relevant validation → record result
Batch 2 (medium) → relevant validation + necessary integration checks → record result
Batch 3 (large) → skip, generate handoff → user decides
```

Checkpoints do not authorize commits. Commit only when explicitly requested,
staging only the authorized task's changes and never user or peer changes.

## Context Hygiene

- Do not read dozens of files into the main session. Delegate heavy reading
  to subagents.
- Summarize subagent findings in `~/tmp/builder/` files, not in the main
  context.
- When resuming after a subagent returns, read the summary file, not the
  raw output.
- If the main session context grows large, pause and offload notes to temp
  files before continuing.

## Conciseness Rule

After every execution batch, report exactly:

```
Done: [what was completed, 1 line per item]
Remaining: [what's next, 1 line per item]
Next: [the single next action]
```

Keep it under 8 lines. It must be scannable in 5 seconds and copyable for
analysis in another tool.

## Relationship to Other Skills

| Skill | Use for |
|-------|---------|
| `planner` | Creating the plan before building |
| `builder` | Executing the plan with discipline |
| `subagent-delegation` | Creating formal, durable handoff files |
| `feature-executor` | Receiving and executing delegated work |
| `code-review` | Reviewing the result after building |

When `code-review` triggers optional execution after a review, it delegates
to `builder` for the execution methodology and adds only what is specific to
review fixes (organizing by fix type, using validation commands from the
review report).

## References

- `references/delegation-patterns.md` -- detailed delegation patterns and
  anti-patterns
- `references/temp-file-convention.md` -- temporary file standard with
  examples and lifecycle rules
