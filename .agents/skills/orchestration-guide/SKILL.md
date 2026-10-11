---
name: orchestration-guide
description: "Repo-local navigation guide to the global orchestrate-session, orchestrate-session-beta, orchestrate-climer and orchestrate-broker skills. Use when choosing a workflow, finding launch/control commands, checking progress ownership or readiness, or locating the maintained runtime and global contracts. Does not start execution."
---

# Orchestration guide — local index for global skills

This repo-local skill is documentation/navigation, not a fifth execution engine.
Use English. Do not launch workers, modify plans or switch strategies merely to
answer a question about these guides.

## Which variant?

| Skill | Choose it for | Progress authority | How execution starts |
|---|---|---|---|
| [orchestrate-session](references/session.md) | Simplest direct goal-driven workflow | Plan tasks.md | Launch OMP with the selected profile and goal |
| [orchestrate-session-beta](references/beta.md) | Opt-in background RPC worker control | Climier 2.x task state | Check all mapped tasks, start idle RPC worker, then explicitly assign |
| [orchestrate-climer](references/climer.md) | Explicit Climier-backed dependency/ownership tracking | Climier task state | Check existing mapping/backend, then launch the coordinator |
| [orchestrate-broker](references/broker.md) | Structured communication with existing visible/remote sessions | Plan tasks.md; broker tracks requests | Capability-gated; current full-control adapter support remains a blocker |

Never switch an active plan automatically. Herdr hosts a process; RPC or an extension
controls the session; a progress backend is a separate choice. The broker strategy
is not automatically enabled just because the local RPC runtime exists.

## Source of truth

Read the selected global skill from `$HOME/.agents/skills/<name>/SKILL.md` before
preparing or executing a plan. Those global files, their linked references, and
the installed CLI's --help are authoritative. These local guides summarize them;
if a guide drifts, report the mismatch instead of guessing or overwriting a plan.

Global skill names are not themselves shell commands. `orchestrate-climer` is the
skill's spelling; the program is `climier`. `workerctl-beta` is an installed CLI.

Runtime source and maintenance instructions:
[omp/worker-runtime/README.md](../../../omp/worker-runtime/README.md).
Personal skills live outside this repo; the guides here are Git-visible local docs.
Synchronizing ~/.agents does not synchronize project plans, runtime installations,
Climier state, or this repo-local guide. Git commit/push requires explicit intent.

## Common rules

- Resolve coordinator and worker choices for this plan; ask if missing.
- Every plan retains orchestration/models.yml and a required run-plan.sh.
- --print is an offline preview, not proof of model/backend readiness.
- Small features use one implementation owner and existing patterns. Delegate only
  when the handoff adds value; avoid separate repair/review pipelines by default.
- Validate complete feature slices with important targeted unit tests and one
  verification owner. Reuse valid evidence instead of repeating unchanged checks.
- Do not confuse command acknowledgment, process idle, and verified task completion.
- Recovery starts by inspecting partial work and ownership, not by blindly replaying.
- Check actual runtime installation on each machine; skill sync alone is insufficient.

For trying the beta, start with [the beta guide](references/beta.md). It explains
preparation, launch, observation, interruption, recovery and the clock boundaries.
