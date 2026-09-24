---
name: planner
description: |
  Create technical implementation plans using an analysis-first workflow and
  return either a non-durable single-task brief or a durable plan under
  `.plans/` (simple file, structured folder, or initiative-level overview).
  Use when the user asks to define a task, create a plan, build a roadmap,
  design an implementation strategy, or decompose a large initiative.
  Triggers: plan, planning, technical plan, implementation plan, execution
  plan, roadmap, feature planning, plan-features.
allowed-tools: Read, Write, Edit, Grep, Glob, Agent, TaskCreate, TaskUpdate, TaskList
---

# Planner Skill

Create evidence-based plan and phase outputs before any implementation begins.

## Scope

Use this skill when the goal is to produce a technical plan that another command
or developer can execute later, or when a large initiative must be decomposed
into multiple phase-level planning units.

When invoked from an ongoing session and no explicit objective is provided,
infer the objective from the current conversation, recent user intent, inspected
files, and existing `.plans/` artifacts. Ask a clarifying question only when the
available context is insufficient to infer a safe planning target.

When the user asks for a single task definition (non-durable), return one task
brief and pause. Do not write files in that mode.

You may write or update files inside `.plans/`.

In structured mode, you may optionally use the bundled checklist CLI (see
"Checklist CLI"); creating it in the project root is never required.

You must not modify application source code while planning.

In initiative-overview mode, do not generate execution-ready implementation
plans for each feature. Only generate the strategic decomposition artifacts.

## Core Strategy

Follow this sequence every time:

1. Analyze the request first
2. Discover the impacted codebase areas
3. Read key files and verify patterns
4. Clarify scope when the request is still ambiguous or underspecified
5. Decide whether the output should be `task`, `goal`, `simple`, `structured`, or `initiative-overview`
6. For `task`, return one concise task brief and pause; for durable modes, write artifacts in `.plans/`
7. Summarize what was produced and where it was saved when applicable

For the full workflow, see `references/planning-strategy.md`.

## Authorization Gate

Do **not** create `structured` or `initiative-overview` artifacts without explicit authorization.

Default to the smallest viable plan surface:

- Use `task` for a non-durable brief.
- Use `simple` (one file) for the majority of durable plans.
- Use `structured` (multi-file folder) only when the work is large, cross-layer,
  and clearly needs independently trackable goal units.
- Use `initiative-overview` only for initiatives that span multiple feature-sized
  planning units.

Before writing a `structured` or `initiative-overview` plan, state the case and
ask the user for explicit approval. Include:

- why `simple` is insufficient
- how many goal units (formerly phases) or features you propose
- what the file footprint will be
- the concrete benefit of the heavier format

If the user does not explicitly approve, fall back to `simple` or `goal` mode.
Never silently switch from a single-file plan to a multi-file plan just because
the request is broad.

## Non-Negotiable Rules

- Never jump straight to writing the plan without analysis
- Never write final plan artifacts before completing analysis and clarification
- Never write vague steps without concrete file or directory references
- Never hide uncertainty; capture it under `Open Questions`
- Never modify code files during planning
- Never save the plan with a generic name like `plan.md` or `new-plan.md`
- Never create a `structured` or `initiative-overview` plan without explicit user authorization
- Never force a large multi-part request into one monolithic markdown file
- Never mix requirements with implementation-specific file edits in structured mode
- Never silently switch `/plan` behavior to an initiative overview without explicit intent
- Never create `checklist.json` as the source of truth for new plans; phase
  frontmatter is the source of truth
- Never use legacy phase fields or statuses such as `dependsOn`, `complete`,
  `done`, `not_started`, or `T01`

## Naming Rule

Create a specific kebab-case slug from the objective, for example:

- `.plans/add-member-permissions.md`
- `.plans/refactor-checkout-state.md`
- `.plans/integrate-whatsapp-webhooks.md`
- `.plans/customer-portal-redesign/`
- `.plans/multi-tenant-billing/`

Keep the slug short, specific, and stable.

## Analysis Protocol

During analysis, classify information into three buckets:

- `Verified`: confirmed by inspected files or docs
- `Inferred`: strong conclusion based on existing patterns
- `Unknown`: still unclear after investigation

Search using multiple naming conventions and language variants when the feature
name may appear in different forms.

Ambiguity alone is not a reason to delegate discovery. Keep localized plans in
the main thread and ask a focused question when product intent is missing.
Delegate to a read-only `explore` subagent only when the request is genuinely
broad or cross-domain and the proportional orchestration gate confirms an
independently valuable discovery unit.

Before choosing the plan mode, build a lightweight planning brief that mirrors
the precision of `/task`:

- summarize the request in concrete terms
- list the likely files or directories involved
- separate `Verified`, `Inferred`, and `Unknown`
- ask only the minimum clarifying questions that are needed to avoid planning the wrong shape

If the plan shape depends on missing product intent or unresolved scope, stop and
ask before proposing artifacts.

## Goal Layer

Every durable plan should be anchored to a single **goal**: the north star that
states the outcome, one verifiable end state, the concrete deliverables, and how
completion is proven. Phases and tasks decompose the goal; they never replace it.

A goal has these parts (see `references/goal-template.md`):

- `Description`: what the goal is and why it matters
- `End State`: one measurable, observable condition that means "done"
- `Deliverables`: concrete artifacts that remain after the work
- `Definition of Done`: observable checks (command, test, exit code, file/queue state)
- `Constraints / Must Not Change` and `Non-Goals`
- `Budget`: optional turn or time cap

Goal frontmatter contract:

- fields: `id`, `title`, `status`, `end_state`, `verification`, `budget`
- valid goal IDs match `G-001`; exactly one goal per plan (multiple goals mean the
  request is an initiative, so use `initiative-overview`)
- valid statuses are `pending`, `in_progress`, `completed`, `blocked`, `skipped`

Verifiability rule (non-negotiable):

- the `end_state` MUST be observable. If no command, test, exit code, file state,
  or other concrete output can prove it, the goal is not ready. Rewrite it as a
  verifiable condition, or route the unknown into an investigation phase first.
- reject vague end states such as "production-ready", "clean code", or "works
  well"; prefer "all tests in <path> pass and the build exits 0".

Where the goal lives by mode:

- `goal`: standalone `.plans/<goal-name>-goal.md`
- `simple`: a `## Goal` block at the top of `.plans/<plan-name>.md`
- `structured`: `.plans/<plan-name>/goal.md`, referenced from `phase-index.md`;
  phases may carry `goal: G-001` in frontmatter
- `initiative-overview`: each feature brief states its own goal

## Plan Modes

Choose the smallest mode that can represent the work accurately. `simple` is the
default for durable plans. Use `structured` or `initiative-overview` only when
analysis shows a genuine need and the user has explicitly authorized the heavier
format.

### `task`

Use a single non-durable task brief when the user wants to define one task
without creating plan files yet.

Output behavior:

- return exactly one task brief in the response
- include objective, scope, files/areas, steps, dependencies, validation, and open questions
- stop with `Ready to proceed?`
- do not write under `.plans/`

### `goal`

Use a single durable goal file when the user wants a long-running task framed by
one verifiable completion condition, with a description, an end state, and
deliverables, when no separate phase decomposition is needed yet.

This mode is ideal for handing off to an autonomous completion loop (for example
a `/goal`-style condition) or to `/build`.

Artifact:

- `.plans/<goal-name>-goal.md`

Use `references/goal-template.md`.

In `goal` mode:

- the `end_state` must be verifiable (see the Goal Layer verifiability rule)
- include deliverables and a definition of done with observable checks
- add a turn or time budget when the goal is meant to run unattended
- if the goal needs more than a short, mostly linear execution path, add a
  `## Decomposition` list or switch to `structured`
- if the request contains several independent verifiable goals, switch to
  `initiative-overview`

### `simple`

Use a single plan file when the task is localized, has limited execution units,
does not need separate requirements and phase artifacts, or still resolves to one
durable implementation unit after clarification.

Artifact:

- `.plans/<plan-name>.md`

Use `references/plan-template.md`.

### `structured`

Use a structured plan folder only when the request is large, cross-layer, or
clearly benefits from decomposition into durable goal-unit files.

Use `structured` only when the investigation has confirmed multiple durable
execution units. Do not use it as a fallback for vague requests.

**Authorization required.** Before creating a structured plan, explain why
`simple` is insufficient and ask the user for explicit approval. If the user does
not approve, fall back to `simple` or `goal` mode.

Artifacts:

- `.plans/<plan-name>/context.md`
- `.plans/<plan-name>/requirements.md`
- `.plans/<plan-name>/phase-index.md`
- `.plans/<plan-name>/phases/*.md`
- optional generated cache only when needed: `.plans/<plan-name>/.state/checklist.json`

Optional project-local helper (convenience only, never required):

- `./planner-checklist.js`

Use these references:

- `references/context-template.md`
- `references/requirements-template.md`
- `references/phase-index-template.md`
- `references/phase-template.md`

In structured mode:

- treat each phase as an autonomous **goal unit**: it must carry enough context
  for another agent to execute it without re-reading the entire plan
- `context.md` captures the general overview so any agent can restore full context
- `requirements.md` captures the what, not the how
- `requirements.md` must not name internal implementation files, classes, or
  methods unless the requested outcome is itself a public API or package
  boundary; put implementation constraints in phase files instead
- phase files must reference requirement IDs such as `FR-001`
- phase file names must be declarative outcomes, not generic labels or mechanical steps
- phase files must describe what to achieve, what to preserve, and how to
  validate it; do not prescribe step-by-step implementation unless a decision
  is mandatory
- phase files must include the **context**, **files/areas involved**, and the
  **final verifiable result** so they can be handed off as standalone goals
- phase files must not include long code blocks or pseudo-implementations unless
  they document a public contract that has already been decided
- if a phase still contains a major unresolved choice, split it into a decision
  or investigation phase plus a later implementation phase instead of hiding the
  choice inside execution instructions
- every phase is a goal-shaped unit: its frontmatter must include `id`, `title`,
  `status`, `phase_type`, `description`, `end_state`, `verification`,
  `deliverables`, `entry_criteria`, `dependencies`, and `requirements`
- every phase `end_state` must be verifiable (a command or observable output can
  prove it); reject vague end states and split an investigation phase if needed
- prefer fewer, larger agent-sized phases over many small phases; merge work that
  shares one objective, validation path, or review surface
- phase frontmatter acts as the durable execution state for phase progress
- there should be at least two durable phases worth tracking independently

Canonical phase frontmatter contract:

- phase fields: `id`, `title`, `status`, `phase_type`, `description`, `end_state`, `verification`, `deliverables`, `entry_criteria`, `dependencies`, `requirements`, `subagent`
- valid phase IDs match `P-001`, `P-002`, etc. Optionally include a phase type suffix for clarity: `P-001-INV`, `P-002-IMPL`
- valid `phase_type` values are: `investigation`, `design`, `implementation`, `validation`, `integration`
- valid statuses are `pending`, `in_progress`, `completed`, `blocked`, and `skipped`
- use `dependencies`, never `dependsOn`
- if a machine-readable checklist is needed and the optional helper exists,
  generate it with `node <skill>/scripts/planner-checklist.js export <plan-name>` into
  `.state/checklist.json` and treat it as derived cache, not authored plan content

If the proposed structured plan collapses to one durable phase, switch back to
`simple`.

Split phases only when there is a real delegation boundary, such as:

- a distinct functional or technical objective
- an independent validation path
- a dependency that should complete before later work starts
- a different risk profile that benefits from isolated review
- a safe parallelization boundary with minimal file overlap

### `initiative-overview`

Use an initiative overview when the request is too large for one implementation
plan and should be split into multiple feature-level briefs that can later be
passed to `/plan` one by one.

Use `initiative-overview` only when the investigation confirms multiple
feature-sized units with meaningful dependency or sequencing relationships.

**Authorization required.** Before creating an initiative overview, explain why
a single plan is insufficient and ask the user for explicit approval. If the user
does not approve, fall back to `simple`, `goal`, or `structured` mode.

Artifacts:

- `.plans/<initiative-name>-overview/context.md`
- `.plans/<initiative-name>-overview/living-map.md`
- `.plans/<initiative-name>-overview/feature-index.md`
- `.plans/<initiative-name>-overview/dependency-graph.md`
- `.plans/<initiative-name>-overview/worktrees.md`
- `.plans/<initiative-name>-overview/features/F-00X-<feature-slug>.md`

Use these references:

- `references/initiative-context-template.md`
- `references/living-map-template.md`
- `references/feature-index-template.md`
- `references/dependency-graph-template.md`
- `references/worktrees-template.md`
- `references/feature-brief-template.md`
- `references/orchestrator-handoff-template.md`

In initiative-overview mode:

- treat the overview as a living map, not a closed implementation plan
- keep planning state and execution history separate: use stable status fields
  in indexes, and put narrative history in `living-map.md` or execution
  supplement files
- include investigation, validation, correction, or integration features when
  they are the safest next units of work
- keep feature IDs stable (for example `F-001`) when intent does not materially change
- represent dependencies between features explicitly
- feature status values should be plain machine-readable words such as
  `planned`, `in_progress`, `done`, or `blocked`; emoji may be display-only, but
  not the only status signal
- document which feature branches can run in parallel and why
- include worktree recommendations without creating branches or worktrees automatically
- make each feature brief directly usable as input to `/plan`
- make the final response directly usable by an orchestration parent session:
  include the next unblocked feature or parallel-safe batch, a sub-agent prompt
  scaffold, required skill to load, required validation commands, expected final
  report fields, and review-loop instructions from
  `references/orchestrator-handoff-template.md`
- if there is only one durable feature-sized unit, fall back to `simple` or `structured`

Human-owned fields (must be preserved across refreshes):

- `Status`
- `Owner`
- `Decision Notes`
- `Manual Overrides`

Auto-managed fields (recomputed on refresh):

- `Verified Context`
- `Living Map`
- `Likely Files or Areas Involved`
- `Feature Dependencies`
- `Parallelization Notes`
- `Worktree Recommendation`

If an overview folder already exists:

- refresh it instead of creating duplicates
- update `living-map.md` with verified knowledge, assumptions, unknowns,
  completed delegations, sub-agent feedback, and plan adjustments
- preserve all human-owned fields exactly
- mark added, removed, split, and merged features in `feature-index.md`
- refresh dependency and parallelization guidance from current verified context
- keep feature briefs under `features/`; do not create root-level `F-*.md`
  feature files
- declare supplemental execution files such as `IMPLEMENTATION-SUMMARY.md`,
  `rollback.md`, and `validation-checklist.md` as supplements instead of
  treating them as required overview artifacts

## Legacy Refresh Behavior

When updating or continuing an existing plan created by older instructions:

- Do not rewrite the whole plan for style alone.
- Preserve human-owned decisions, status, owners, and manual notes.
- If the user wants to execute, continue, or refresh the plan, migrate the
  phase files to the canonical frontmatter contract before relying on them.
- Convert legacy fields (`dependsOn`, `complete`, `done`, `not_started`, `T01`)
  into canonical fields and statuses.
- Remove, move, or explicitly list orphan phase files instead of leaving
  `phases/` and `phase-index.md` out of sync.
- Keep historical execution summaries in markdown summaries or phase files, not
  in JSON state.

## Checklist CLI (optional convenience)

The planner ships a small Node CLI for checklist queries:

- `scripts/planner-checklist.js`

Status authority is the phase markdown itself: **phase frontmatter is the
single source of truth.** Any agent may update `status` by editing the phase
file directly — the CLI adds no enforcement the markdown lacks, so never block
marking a phase `in_progress`, `blocked`, or `completed` on the CLI, and never
copy the helper into a project root just to record progress.

The CLI has two tracks:

- `goal-check <plan-name-or-path>` lints `phases/*.md` (`P-001`), `goal.md`
  (`G-001`), and legacy `tasks/*.md` (`T-001`): missing fields, bad IDs or
  statuses, vague `end_state`. This is the command that operates on phase
  frontmatter.
- `list`, `remaining`, `next`, `export` operate only on the legacy `tasks/*.md`
  (`T-001`) track or `checklist.json`. Do not use them on `phases/` plans;
  they report "no task files found", which is expected, not an error in the plan.
- `export` writes a derived `.state/checklist.json` cache when a
  machine-readable view is genuinely needed (derived cache, never authored
  plan content).

If you use it, pass the plan slug or path explicitly (or run it from the
project root); planning must not create or refresh the helper as a side
effect.

Example usage:

- `node <skill>/scripts/planner-checklist.js goal-check <plan-name-or-path>`
- `node <skill>/scripts/planner-checklist.js list <plan-name-or-path>` (legacy tasks/ track only)

## Direct Write

After analysis, clarification (if needed), and mode selection:

- in `task` mode, return the task brief and stop for approval
- in durable modes, write the selected artifacts directly without intermediate approval

If the request is still ambiguous, ask clarifying questions first.

## Required Output Location

Durable planning artifacts must live under `.plans/`.

In `task` mode, no files are created.

Depending on mode, create either:

- `.plans/<plan-name>.md`
- or `.plans/<goal-name>-goal.md`
- or `.plans/<plan-name>/...`
- or `.plans/<initiative-name>-overview/...`

If the directory does not exist, create `.plans/` first.

## Quality Gate

Before saving the plan, verify all of the following:

- Chosen mode is justified by the task size and structure
- Objective is explicit
- Scope and non-scope are clear
- Relevant files or directories are listed
- Steps are ordered and actionable
- Dependencies between steps are clear
- Risks and edge cases are documented
- Validation strategy exists
- Open questions are captured instead of guessed
- If the plan has a goal, its end state is verifiable (a command or observable
  output can prove it), not a vague claim

In structured mode, also verify:

- `context.md` provides enough overview for an agent to restore full context
- the scope was clarified enough to avoid guessed phase boundaries
- `requirements.md` separates requirements from implementation details
- requirement IDs are stable and readable
- every phase traces to one or more requirements
- phase file names are declarative and specific
- phases are agent-sized: large enough to justify context handoff, but still
  focused on one outcome
- phase contents emphasize objective, expected outcome, preservation constraints,
  validation, and final report expectations instead of implementation recipes
- there are at least two durable phases that justify a structured plan
- every phase file includes canonical frontmatter and valid status enum
- phase frontmatter matches phase IDs, requirements, and dependencies in
  `phase-index.md`
- every phase file appears in `phase-index.md`, and there are no orphan or
  duplicate phase files

In initiative-overview mode, also verify:

- the request truly benefits from feature-level decomposition
- every feature brief has objective, scope boundaries, and likely file/area impact
- the living map separates known facts, assumptions, unknowns, feedback, and
  next recommended delegation
- each feature has explicit dependency and parallelization metadata
- the final command response gives a concrete coordinator handoff for the next
  feature or parallel-safe batch without creating a separate `/orchestrator`
  command
- the dependency graph has no unresolved cycles or orphan references
- at least one valid execution order exists from foundation to integration
- worktree recommendations are explicit and non-destructive
- each feature brief can be passed to `/plan` as a direct input
- feature IDs remain stable unless the decomposition materially changed
- human-owned fields remain unchanged during refresh unless the user requested edits
- required overview artifacts exist: `context.md`, `living-map.md`,
  `feature-index.md`, `dependency-graph.md`, `worktrees.md`, and `features/F-*.md`
- feature briefs live under `features/`, not at the overview root
- status markers are coherent between `feature-index.md`, `living-map.md`, and
  feature files, or explicit drift/blocking notes explain the mismatch

In goal mode (or for any plan that carries a goal), also verify:

- the goal has canonical frontmatter (`id`, `title`, `status`, `end_state`,
  `verification`, `budget`) and a valid status enum
- the `end_state` is observable and provable by a concrete command or output
- deliverables and a definition of done with observable checks are present
- constraints and non-goals are explicit
- an unattended goal includes a turn or time budget
- phases or tasks trace back to the goal when a decomposition exists

If any of these fail, improve the plan before finishing.

## Deliverable Standard

The saved output must be useful to `/build`, `/build-plan`, `/plan`, or a human
implementer without extra interpretation. The reader should understand what to
change, where to change it, and what to validate before coding starts.

In structured mode, the saved artifacts should also be directly consumable by a
dedicated execution command such as `/build-plan`.

In initiative-overview mode, the saved artifacts should be directly consumable
as the strategic layer before execution, with each feature brief ready for
follow-up via `/plan <feature-brief-path>`.
