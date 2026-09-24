---
name: subagent-delegation
description: "Prepare copy-paste prompts and durable handoffs for delegating implementation, validation, investigation, or refactor work to another agent. Use when planning an agent handoff, creating subagent prompts, delegating tasks from a plan, splitting work across agents, or generating `.delegations/` files for large instructions. Triggers: subagent, delegation, handoff, delegate to agent, prompt for another agent, agent task, refactor delegation."
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Subagent Delegation Skill

Prepare execution-ready prompts that can be copied into another agent or saved
as durable handoff files under `.delegations/`.

## Mandatory Scope Boundary — Orchestrator and Subagents

Work ONLY on the user-authorized objective, deliverables, and necessary files
within assigned ownership. Neither an orchestrator nor a subagent may authorize
expansion of the user's objective. An unrelated bug, failing test, improvement,
spare budget, or convenience is NEVER permission to do more work.

- Repair regressions caused by your changes within ownership and verify the fix.
- Leave pre-existing or unrelated findings untouched. Report minimal evidence
  (location/failure and observed impact; label uncertain cause). If nonblocking,
  continue the assigned task without investigating or delegating the finding.
- If truly blocking, pause ONLY the affected unit and report the dependency.
  Coordinate with its existing owner without taking over, or ask the user for
  explicit authorization to expand scope. Subagents notify main; main cannot
  self-authorize. Blocking does not grant editing permission.
- Do not clean up, refactor, revert, or stage others' changes. Ask the owner before
  editing a shared boundary; coordination cannot expand the user objective.
- Every receiving prompt MUST include this boundary and findings protocol, not
  merely refer to another skill. Do not subdelegate unrelated work in parallel.
- Require the minimum relevant validation sufficient to prove the deliverables
  and affected contracts; unrelated global failures do not authorize repo repair.
- STOP when authorized deliverables and their verification are complete.

## Scope

Use this skill when the user wants to delegate work to another agent, prepare a
subagent prompt from a plan, split implementation across agents, or turn a
refactor proposal into precise execution instructions.

This skill produces delegation text. It does not launch implementation agents by
default and does not modify application source code unless explicitly asked to
create or update delegation artifacts.

For implementation-style delegations, the receiving agent should normally be
the `feature-executor` agent. This keeps execution, validation, drift handling,
and final reporting consistent without repeating the entire operating protocol
inside every handoff.

## Core Workflow

1. Identify the work unit being delegated and the intended recipient.
2. Read the relevant source material: user request, plan files, task files,
   feature briefs, existing code, or prior agent reports.
3. Separate verified context from assumptions and unknowns.
4. Decide whether to output the delegation inline or save it in `.delegations/`.
5. Draft a self-contained prompt led by a `Task Anchor` (user objective
   verbatim, the single authorized unit, the observable success condition)
   with objective, context, constraints, scope, non-goals, ownership, stop
   criteria, findings protocol, validation, and report.
6. For refactors, include the final API contract before implementation details.

## When To Save A File

Save to `.delegations/<slug>.md` when the prompt is long, contains detailed API
contracts, covers multiple files or agents, or the user explicitly wants to take
the delegation to another session.

Use the bundled helper when creating a new delegation shell:

```bash
node skills/subagent-delegation/scripts/delegation-writer.js create <slug> "<Title>"
```

Use `--force` only when intentionally replacing an existing delegation file.

For the file policy, see `references/file-output-policy.md`.

## Delegation Prompt Requirements

Every delegation must include:

- `Task Anchor`: the FIRST section, never a footnote. Contains (a) the original
  user objective verbatim, (b) the single work unit authorized, (c) the
  observable condition that proves success. The executor optimizes whatever
  dominates the prompt: if protocol boilerplate outweighs the task, it drifts.
  Keep the anchor and the work description prominent; keep protocol sections
  compact.
- `Goal`: one specific outcome for the receiving agent
- `Required Agent`: the subagent that should execute this delegation, normally
  `feature-executor` for implementation, correction, validation, and
  integration work
- `Context`: repo root, source plan or task, relevant files, dependency notes
- `Objective`: concrete result expected after execution
- `Scope`: what is included
- `Non-Goals`: what must not be changed
- `Ownership`: authorized paths/areas, read-only areas, and owners to consult
  before editing shared boundaries; likely files do not grant ownership
- `Stop Criteria`: completion of the deliverables and required verification;
  a real external blocker pauses only its affected unit
- `Out-of-Scope Findings`: include the mandatory boundary's protocol verbatim
  or equivalently; no investigation, repair, or subdelegation without user scope
  authorization, and no orchestrator self-authorization
- `Implementation Constraints`: mandatory decisions and behavior to preserve
- `Likely Files`: paths to create, modify, or review, with reasons
- `Validation`: minimum relevant commands/manual checks sufficient to prove
  changed behavior and affected contracts; report missing evidence honestly
- `Expected Final Report`: MUST begin by restating the Task Anchor (objective,
  unit, success condition); then results, verification, blocked dependencies,
  and minimal evidence of out-of-scope findings (not an automatically expanded
  backlog). A report without the restatement is incomplete: return it, do not
  synthesize it.

Use `references/delegation-template.md` for the standard shape.

## Refactor Delegations

When delegating a refactor, include a `Final API Contract` section. It should
define the intended public surface before asking another agent to edit code.

Include whichever are relevant:

- public exports
- function, class, hook, route, component, or CLI signatures
- input and output shapes
- error behavior
- compatibility expectations
- migration notes
- examples of desired usage

If the API cannot be fully specified from current evidence, state the unknowns
instead of inventing a contract.

Use `references/refactor-delegation-template.md` for refactor prompts.

## Quality Rules

- Do not produce vague prompts such as "implement backend" or "clean this up".
- Do not delegate tiny mechanical edits unless they unblock a larger sequence,
  are a focused correction, or the user explicitly asked for that exact split.
- Prefer moderate work units with one coherent outcome, a clear review surface,
  and meaningful validation.
- Do not ask the receiving agent to create another durable plan unless the work
  is still ambiguous or unusually risky.
- Do not prescribe mechanical edits unless they are known constraints.
- Prefer outcome-oriented tasks with concrete validation.
- Never bury the task under protocol text: the Task Anchor and work description
  must be the first and most detailed part of the prompt; boundary and findings
  protocol come last and compact.
- Include prior subagent outputs when they affect the next delegation.
- Include the orchestrator's current classification when the delegation is a
  correction, investigation, blocked follow-up, or plan-invalidation response.
- Assign non-overlapping ownership; ask the existing owner before shared-boundary
  edits, and do not treat an unavailable owner as permission to take over.
- End with the delegation or saved file path, not with an offer to launch work.

## Output Contract

For inline output, return only the delegation text plus a short instruction such
as: `Copy this delegation into the intended execution session.`

For saved output, report the file path and a short summary of what it contains.

If the work is under-specified enough that a useful delegation would be unsafe,
ask the minimum clarifying question before drafting.
