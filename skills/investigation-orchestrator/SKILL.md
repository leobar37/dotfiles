---
name: investigation-orchestrator
description: Use only for genuinely complex investigations that require orchestration across multiple independent subsystems or evidence fronts. Trigger for explicit deep/orchestrated investigations, broad cross-layer root-cause work, or research that may need coordinated subagents. Do not trigger for localized bugs, small configuration issues, one-to-three-file diagnosis, direct runtime checks, or prompts that merely use words such as "investigate" or "root cause".
version: 0.1.0
---

# Investigation Orchestrator

Use this skill only to structure an investigation that has already proven non-trivial.

This skill defines the reusable investigation core shared by commands such as
`/research` and `touch-v2`. Keep the command-specific objective in the command
prompt itself. Keep this skill focused on how to investigate.

## Activation Gate

Activate this skill only when either:

- the user explicitly requests a deep or orchestrated investigation; or
- at least two of these signals are confirmed:
  - three or more independent system boundaries must be traced
  - multiple evidence fronts can be investigated independently
  - several plausible causes remain after focused local checks
  - the investigation is expected to span a broad subsystem rather than a few files
  - security, data integrity, payments, or production reliability raises the cost of omission

Do not activate it for:

- localized bugs or configuration issues
- one to three likely files or a few direct checks
- implementation details specific to one feature
- a single contract, function, command, log, or runtime fact
- requests that merely contain "analyze", "investigate", or "root cause"
- delegating trivial reads, searches, or checks

When the gate does not pass, stop applying this skill and investigate locally.

## Core Workflow

### 1. Inspect Before Investigating

Determine first:

- whether a direct read, reproduction, or command can answer the question
- whether the scope is localized or genuinely cross-layer
- whether uncertainty remains after the cheapest focused checks
- whether there are independent evidence fronts, not merely multiple files
- whether delegation would save more work than handoff and verification add

If one main-thread investigation can answer the question, choose `local` and do
not launch a subagent. Do not manufacture topology for a small task.

### 2. Choose Investigation Topology

Pick one of these modes explicitly:

- `local` - one thread is enough
- `sequential` - later work depends on earlier findings
- `parallel` - independent fronts can be analyzed separately
- `hybrid` - a foundation step first, then parallel branches, then synthesis

Prefer the smallest topology that still preserves coverage.

For detailed selection criteria, read:
- `references/orchestration-patterns.md`

### 3. Decide Whether Skill Discovery Helps

Inspect the available skill metadata in the main thread first. That is usually
cheaper than delegating discovery.

Delegate skill discovery only if the orchestration gate already passed, the
harness exposes a dedicated discovery agent, several specialized skills
genuinely compete, and choosing incorrectly would materially alter independent
workstreams. Do not substitute a general-purpose subagent when no dedicated
discovery agent exists.

### 4. Decide Whether To Delegate With `Task`

Delegation is optional even after this skill activates. Delegate a bounded
investigation unit only when all of these are true:

- it is an independently valuable evidence front or subsystem
- its scope and expected output can be stated precisely
- it is broad enough that handoff plus result verification costs less than
  doing it locally
- the main thread can continue useful non-overlapping work or materially reduce
  context load

Being isolated, easy to describe, or easy to validate makes a task eligible for
delegation; those properties are not reasons to delegate by themselves.

Never delegate a term search, one-to-three-file read, single function, single
command, or fact check. Keep cohesive investigations in the main thread.

For delegation rules and examples, read:
- `references/delegation-guidelines.md`

### 5. Use `TodoWrite` Only When The Investigation Has Real Structure

Use `TodoWrite` only if the work is non-trivial and has multiple meaningful
units or phases.

Keep the todo aligned with the real investigation structure, especially when:

- there is a foundation phase
- there are parallel branches
- there is a final synthesis step

Do not create micro-todos for routine reads or tiny searches.

### 6. Consolidate Evidence Explicitly

When synthesizing findings, classify them as:

- `Verified`
- `Inferred`
- `Unknown`

Do not hide uncertainty behind confident language.

For guidance, read:
- `references/reporting-buckets.md`

### 7. Return Control To The Calling Command

This skill stops at investigation orchestration and evidence synthesis.

The calling command should still decide:

- the final report structure
- whether the closure is about feasibility, audit, or planning
- which sections are mandatory for that command

## Core Rules

- Prefer evidence from code over assumptions.
- Prefer explicit topology over ad hoc searching.
- Do not force subagent use when local analysis is enough.
- Do not force skills when they add little value.
- Do not delegate overlapping scopes in parallel.
- Do not turn command-specific output requirements into shared skill logic.
- Keep recommendations decision-oriented and grounded.

## Additional Resources

- `references/orchestration-patterns.md` - Topology selection rules
- `references/delegation-guidelines.md` - Good delegation boundaries and task prompts
- `references/reporting-buckets.md` - Evidence buckets and synthesis rules
