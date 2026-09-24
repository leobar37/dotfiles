# Planning Strategy

Use this workflow to generate reliable technical plans.

## Phase 1 - Request Decomposition

Start by extracting:

- feature or bug name
- user goal
- technical constraints
- expected output
- possible system areas involved

Turn the request into search terms using:

- singular and plural nouns
- camelCase and PascalCase
- snake_case and kebab-case
- English and Spanish variants when relevant

## Phase 2 - Codebase Analysis

Search broadly enough to understand impact, then narrow down to the key files.

Inspect these layers when they are relevant:

- frontend
- backend
- database
- tests
- docs

Do not stop at file names. Read the files that define the feature, data flow,
contracts, validations, or UI entry points.

Capture findings as:

- `Verified`
- `Inferred`
- `Unknown`

If the request spans several independent layers and broad discovery passes the
proportional orchestration gate, a read-only `explore` subagent may map one
bounded surface. Being hard to trace or ambiguous does not by itself justify
delegation; inspect locally or ask a focused question first.

## Phase 3 - File Impact Map

List the files and directories that are likely involved.

For each one, note one of:

- `Create`
- `Modify`
- `Review`

If an exact file is unknown, name the smallest reliable directory and explain
why the final file still needs confirmation.

## Phase 4 - Clarification Gate

Before choosing the plan mode, reduce ambiguity with a lightweight interaction
pattern inspired by `/task`.

Produce a short planning brief that includes:

- a concrete request summary
- a preliminary file index
- `Verified`, `Inferred`, and `Unknown` findings
- only the clarifying questions that are truly needed

Ask clarifying questions when:

- the business intent is still ambiguous
- the likely execution units are not yet clear
- the difference between `simple` and `structured` depends on missing details

Do not use ambiguity itself as a reason to choose `structured`.

## Phase 5 - Choose Planning Mode

Prefer the smallest mode that can represent the work accurately.

**Default order:** try `simple` first, then `goal`, then `structured`, then
`initiative-overview`. Only move up when analysis confirms the smaller mode
cannot hold the work.

Choose `task` when:

- the user asked to define a task without writing plan artifacts
- a single actionable task brief is enough
- the response should pause for iteration before execution

`task` mode is non-durable and should not write files under `.plans/`.

Choose `goal` when:

- the task is long-running and framed by one verifiable completion condition
- the user wants a description, an end state, and deliverables without a full
  phase decomposition yet
- the output should be directly consumable by an autonomous completion loop
  (for example a `/goal`-style condition) or by `/build`

`goal` mode writes a single durable file and requires a verifiable `end_state`.

Choose `simple` as the default for durable plans when:

- the task is localized
- the execution path is short or mostly linear
- a single durable markdown file is enough
- clarification still points to one durable execution unit

Most plans should be `simple`. Do not reach for `structured` just because the
request mentions several files or layers.

Choose `structured` only when:

- the request is large or clearly multi-part
- the work spans multiple layers or subsystems
- requirements and implementation phases should be separated
- later execution will benefit from durable phase files
- two or more agent-sized, outcome-oriented phases are clearly confirmed

**Authorization required for `structured`.** Before creating a structured plan,
explain why `simple` is insufficient and ask the user for explicit approval.
Include the number of proposed phases, the file footprint, and the concrete
benefit. If the user does not approve, fall back to `simple` or `goal`.

Choose `initiative-overview` only when:

- the initiative is too large for one implementation plan
- the work should be split into multiple feature-sized planning units
- feature dependencies or parallel branches need explicit mapping
- worktree strategy would benefit from a feature-level decomposition first
- each feature will be planned later via `/plan <feature-brief>`

**Authorization required for `initiative-overview`.** Before creating an overview,
explain why a single plan is insufficient and ask the user for explicit approval.
If the user does not approve, fall back to `simple`, `goal`, or `structured`.

If clarification is still required to determine the real phase boundaries, ask
for it before choosing the mode.

Do not use `initiative-overview` for requests that collapse to one durable
implementation unit.

## Phase 6 - Plan Synthesis

Write outputs directly after analysis, clarification, and mode selection.

In `task` mode, do not write files. Return exactly one task brief and stop for
approval.

In `simple` mode, write `.plans/<plan-name>.md` using
`references/plan-template.md`.

In `goal` mode, write `.plans/<goal-name>-goal.md` using
`references/goal-template.md`. The `end_state` must be verifiable; reject vague
conditions and add a turn or time budget for unattended runs.

In `structured` mode, write:

- `.plans/<plan-name>/context.md`
- `.plans/<plan-name>/requirements.md`
- `.plans/<plan-name>/phase-index.md`
- `.plans/<plan-name>/phases/*.md`
- optional derived cache only when needed: `.plans/<plan-name>/.state/checklist.json`

The bundled checklist CLI is optional (see SKILL.md "Checklist CLI"); its
source lives at:

- `scripts/planner-checklist.js`

Use these templates:

- `references/context-template.md`
- `references/requirements-template.md`
- `references/phase-index-template.md`
- `references/phase-template.md`

In `initiative-overview` mode, write:

- `.plans/<initiative-name>-overview/context.md`
- `.plans/<initiative-name>-overview/feature-index.md`
- `.plans/<initiative-name>-overview/dependency-graph.md`
- `.plans/<initiative-name>-overview/worktrees.md`
- `.plans/<initiative-name>-overview/features/F-00X-<feature-slug>.md`

Use these templates:

- `references/initiative-context-template.md`
- `references/feature-index-template.md`
- `references/dependency-graph-template.md`
- `references/worktrees-template.md`
- `references/feature-brief-template.md`
- `references/orchestrator-handoff-template.md`

Each structured phase must include:

- description (what it achieves and why)
- a single verifiable end_state (one observable condition that means done)
- verification (a command or observable output that proves the end_state)
- deliverables (concrete artifacts produced)
- files or directories involved
- dependency on earlier steps when applicable
- behavior or context to preserve
- entry criteria (what must be true before starting)
- subagent prompt (exact prompt to pass to the specialized subagent for this phase type)
- expected final report fields
- main risk or note when useful

Each structured phase is an autonomous **goal unit**: it must include enough
context, files, and a verifiable final result that another agent can execute it
without re-reading the whole plan. It is not a vague step toward the top-level
goal; it is a complete outcome package.

Avoid low-value filler such as:

- "review codebase"
- "implement backend"
- "make UI changes"

Avoid phase definitions that prescribe mechanical implementation steps such as:

- "Create `audio.layer.ts`"
- "Update the import in `index.ts`"
- "Add one test case"

Prefer outcome-oriented phases such as:

- "Investigate the root cause of audio skip behavior before any implementation"
- "Design the member permission model across validation, API, and form surfaces"
- "Implement checkout renewal validation consistent between backend contracts and frontend errors"
- "Validate the integration between billing webhooks and order state machine"

Use likely files as orientation for the implementing agent, not as a mandatory
edit recipe. Include a specific implementation decision only when prior
analysis established it as a constraint.

In structured mode:

- keep `requirements.md` focused on the what, not the how
- keep internal implementation files, classes, and methods out of
  `requirements.md` unless the requested outcome is itself a public API or
  package boundary
- assign stable requirement IDs such as `FR-001` and `NFR-001`
- ensure each phase file references requirement IDs it covers
- use declarative outcome file names such as `03-api-contract-compatibility.md`
- generate each phase file with frontmatter fields: `id`, `title`, `status`,
  `phase_type`, `description`, `end_state`, `verification`, `deliverables`, `entry_criteria`, `dependencies`, `requirements`, and `subagent`
- use only canonical phase statuses: `pending`, `in_progress`, `completed`,
  `blocked`, and `skipped`
- use phase IDs like `P-001`; optionally include a phase type suffix for
  clarity: `P-001-INV`, `P-002-IMPL`, `P-003-VAL`
- valid `phase_type` values are: `investigation`, `design`, `implementation`,
  `validation`, `integration`
- do not create `checklist.json` as authored source of truth; if a
  machine-readable view is needed, export derived state to `.state/checklist.json`
- treat phase frontmatter as the operational state during execution; update
  status by editing the phase markdown directly
- use the checklist CLI only as an optional convenience for read-style queries
- confirm that there are at least two independently delegable phases before
  keeping the structured shape
- merge small phases that share the same objective, validation path, or review
  surface
- split phases only on real delegation boundaries: independent objective,
  dependency ordering, validation surface, risk profile, or safe parallelization
- each phase must carry the `subagent` frontmatter field (one of
  `investigation`, `design`, `implementation`, `validation`, `integration`)
  plus a `## Subagent Prompt` section with the exact prompt to pass to the
  specialized subagent for that phase type

If the structured proposal collapses to one durable phase, fall back to `simple`.

In initiative-overview mode:

- treat each feature brief as a planning handoff unit, not an implementation phase file
- include per-feature objective, scope boundaries, and likely file impact
- include feature dependency IDs and parallelization notes
- include worktree recommendations without creating branches automatically
- prepare a coordinator handoff in the final response so the parent session can
  prompt one sub-agent per next executable feature or parallel-safe batch
- keep feature IDs stable unless decomposition materially changed
- if an overview already exists, refresh it and preserve human-owned fields (`Status`, `Owner`, `Decision Notes`, `Manual Overrides`) exactly
- recompute auto-managed fields (`Verified Context`, `Likely Files`, `Dependencies`, `Parallelization Notes`, `Worktree Recommendation`) from current evidence
- keep feature briefs under `features/`; do not create root-level `F-*.md`
  feature files
- use machine-readable feature statuses such as `planned`, `in_progress`,
  `done`, or `blocked`; emoji may be display-only
- separate current plan state from execution history in `living-map.md`
- if only one feature remains after clarification, fall back to `simple` or `structured`

## Legacy Plan Refresh

When refreshing or continuing an existing plan:

- Do not rewrite artifacts only for style.
- Preserve human-owned state and notes.
- Before execution, normalize old plan state into phase frontmatter.
- Convert `dependsOn` to `dependencies`, `complete`/`done` to `completed`,
  `not_started` to `pending`, and IDs like `T01` to `P-001`.
- Reconcile `phase-index.md` and `phases/*.md`; list or remove orphan phase files
  rather than leaving them hidden.
- Move long phase summaries out of legacy JSON state into
  `IMPLEMENTATION-SUMMARY.md`, `VALIDATION.md`, or phase files.

## Phase 7 - Save the Plan

Skip this phase for `task` mode.

Persist the result to:

- `.plans/<plan-name>.md`
- or `.plans/<plan-name>/...`
- or `.plans/<initiative-name>-overview/...`

Use a specific slug based on the objective.

Examples:

- `.plans/add-role-based-member-invites.md`
- `.plans/fix-contract-renewal-validation.md`
- `.plans/customer-portal-redesign/`
- `.plans/multi-tenant-billing/`

## Phase 8 - Final Review

Do not finalize the plan unless:

- the plan is grounded in real files or explicit assumptions
- the execution order is clear
- risks are visible
- validation is included
- open questions are separated from verified facts
- the chosen mode is justified

In structured mode, also require:

- `context.md` provides sufficient overview for any agent to understand the full plan
- scope is clarified enough that phase boundaries are evidence-based
- requirements are separated from implementation detail
- phases trace to requirement IDs
- phase file names are declarative outcomes
- phase decomposition is neither too coarse nor too fragmented
- at least two independently delegable phases are present
- each phase says what to achieve, what to preserve, how to validate, and what
  the implementing agent should report back
- each phase includes entry criteria and a verifiable end_state (with a verification command or observable)
- each phase includes a subagent prompt for the specialized subagent
- every phase file has canonical frontmatter and valid status enum
- phase frontmatter stays aligned with phase IDs, requirements, dependencies, and
  file names
- every phase file appears in `phase-index.md`, and there are no orphan or
  duplicate phase files
- phase status lives in frontmatter and can be updated by direct markdown edit
  without any helper or JSON inspection

In initiative-overview mode, also require:

- each feature brief is concrete enough to be used as `/plan` input
- dependency mapping is explicit and internally consistent
- at least one valid execution order exists
- parallelizable features are identified with rationale
- worktree recommendations are practical and non-destructive
- the final response includes a copy-paste sub-agent prompt scaffold for the
  next executable feature, expected final report fields, and review-loop
  instructions for the parent session
- feature IDs remain stable unless split/merge changes are documented
- human-owned fields are preserved during refresh unless the user requested changes
- required overview artifacts exist: `context.md`, `living-map.md`,
  `feature-index.md`, `dependency-graph.md`, `worktrees.md`, and `features/F-*.md`
- feature briefs live under `features/`, not at the overview root
- status markers are coherent between `feature-index.md`, `living-map.md`, and
  feature files, or explicit drift/blocking notes explain the mismatch
