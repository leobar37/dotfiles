# orchestrate-session-beta — background RPC workers

Authority: `$HOME/.agents/skills/orchestrate-session-beta/SKILL.md`.
Read its references/execution-efficiency.md before sizing work. The goal is time
to a verified feature, not more agents, code, reviews or test counts.

## What runs where

The current coordinator owns the goal and records authoritative progress in Climier
2.x. A persistent supervisor owns a background OMP RPC worker and its stdin/stdout.
A process-group guard handles supervisor death. No new broker, Herdr pane or OS
service is required. RPC and Climier have separate responsibilities.
The execution shape is coordinator → persistent OMP worker → bounded native
children when useful. The worker owns their inputs, scopes, disjoint writes,
IDs/log references, integration and decisive verification. Children do not claim
Climier tasks or need separate plans/tasks; further recursion is forbidden by
default. Wait or stop/reconcile children before handoff, never while they edit.
These are instruction policies, not workerctl child controls or a security sandbox.

Source: [omp/worker-runtime](../../../../omp/worker-runtime/README.md).
Installation is separate from skill synchronization:

```bash
# From the dotfiles repository; copies beta files, starts nothing:
bash omp/worker-runtime/install.sh
workerctl-beta --help
```

Installed runtime: `~/.local/share/omp-worker-runtime-beta`.
CLI: `~/.local/bin/workerctl-beta`. Snapshot/profile selection requires
0.3.0-beta.1 (reads legacy 0.1/0.2 records). Confirm the runtime on each machine;
even launcher --print requires the new runtime (or OMP_WORKER_RUNTIME).

## Prepare one plan

Required: goal.md, phase-index.md, phases/, orchestration/climier-plan.json,
models.yml, execution.json, assignment.md and scripts/run-plan.sh + model-profile.mjs.
Climier is the sole state authority; Markdown is static scope/instructions, not a
tasks.md status ledger. Map every executable unit (including planned verification);
multiple exact task IDs may share a phase/file. No status belongs in the mapping.
Copy templates from the global beta skill with `cp -L`. Ask for missing model
choices; do not borrow another plan's choices silently. Keep all placeholders out
of a launch-ready profile. Read the global beta references/progress.md for authorized,
idempotent discovery-first setup: init once per repo only if new, never init --force,
and create only missing records. No automatic migration of active/historic plans.

The assignment is one coherent feature slice with inputs, owned files, existing
patterns to reuse, non-goals and important unit cases. Keep ordinary corrections
with the same owner/session. Do not create a separate worker for every file/test.
Size Climier tasks by coherent outcomes, not entire large phases or individual
imports/tool calls. Several tasks can share a phase and one persistent worker.
Keep dependent work behind its prerequisites; feature acceptance still requires
the important integrated checks.

## Route tasks through the plan YAML

Read the global beta references/model-profile-beta.md (not the shared stable
model-profile.md symlink). Root `orchestration/models.yml` retains approved choices.
Start automatically copies it byte-for-byte, all seven roles unchanged, into
`orchestration/workers/<id>/models.yml`. The implicit start role is `default`
(coordinator); `--role smol` or another declared role is an explicit choice.
worker aliases smol; coordinator aliases default, not hard-coded providers.

`--profile PATH` selects an existing plan-contained YAML (relative to the plan)
and snapshots it too, never modifying the source. Existing snapshots are reused,
never overwritten; an explicit different source fails with PROFILE_EXISTS. Root
changes do not mutate snapshots. Configure/prompt/resume use the manifest profile
path/hash; editing that active profile blocks them. Legacy records that reference
root retain their original contract. No YAML inheritance macros or prepare command.

Record selected role, rationale, requested selector, actual observed worker model
and profile path/hash. Read references/task-routing.md for idle-only configuration.
Profile roles and parent get_state are not proof of native children's models:
use the installed native API, record requested/observed model and child ID/log
references, and mark unavailable information unknown. Do not invent role forwarding
or automatic child telemetry in workerctl. Report native routing mismatches.

```bash
# No inference: configure an idle worker and verify actual native state.
workerctl-beta configure feature-worker --role slow --thinking high --request-id config-task-2
workerctl-beta status feature-worker --refresh
# Or configure as part of the next explicit assignment:
workerctl-beta prompt feature-worker --file assignment.md --role advisor --thinking high --request-id task-2-attempt-1
```

Reject busy/blocked/compacting/queued workers, unavailable models and silently
clamped thinking levels. Configuration is included in request deduplication.
After a partial failure, inspect actual/unknown state; do not assume rollback.
Workers retain full OMP sessions/tools/context, but the controller does not expose
arbitrary RPC, permission elevation or automatic approval responses.

## Preview, check, start, assign

```bash
# From the project containing the prepared plan:
bash .plans/<slug>/orchestration/scripts/run-plan.sh --print
bash .plans/<slug>/orchestration/scripts/run-plan.sh --check --id feature-worker
# Default inherits the selected profile's coordinator model:
bash .plans/<slug>/orchestration/scripts/run-plan.sh --id feature-worker
# Optional selectors: --profile orchestration/custom.yml --role slow
# Start returns an idle worker; it has NOT started the feature yet.
workerctl-beta prompt feature-worker   --file .plans/<slug>/orchestration/assignment.md --request-id feature-attempt-1
```

Persist the exact task, worker and request IDs in Climier notes before dispatch.
Reusing a request ID with the same payload reads the recorded outcome rather than
executing again; a changed payload requires a new ID. Do not bypass deduplication.
--print stays offline and reports source/effective snapshot/model/hash/existence
without writes, catalog or backend checks. --check forwards --id/--profile/--role:
without an ID it validates the source; with an ID it checks an existing snapshot
or previews the intended one read-only. Generic CLI equivalents:
`workerctl-beta check --plan PATH [--id ID] [--profile PATH] [--role ROLE]` and
`workerctl-beta start ID --plan PATH [--profile PATH] [--role ROLE]`.
The beta launcher also requires read-only version/initiative/task preflight,
failing closed on errors; neither check nor start creates Climier records.

## Observe without querying a model

```bash
workerctl-beta status feature-worker --refresh
workerctl-beta wait feature-worker --until attention --after <cursor> --timeout-ms 60000
workerctl-beta events feature-worker --after 0 --limit 50
workerctl-beta request feature-worker --request-id feature-attempt-1
workerctl-beta report feature-worker
workerctl-beta trace feature-worker --request-id feature-attempt-1
```

Advance the returned cursor rather than reread everything. A wait timeout stops
the wait, not the worker. `wait --after` waits for new attention beyond that cursor,
not the same latched checkpoint again. report/trace preserve operational milestones
and bounded final user-visible output without token-stream noise. Older missing
timings remain unknown. A turn ending is not task verification or Climier acceptance.
`doctor` is not implemented; check the installed runtime's --help before using
new commands against an older installation.

## Correct or interrupt

```bash
workerctl-beta steer feature-worker --file correction.md --request-id correction-1
workerctl-beta follow-up feature-worker --file next-instruction.md --request-id followup-1
workerctl-beta abort feature-worker --request-id interrupt-1
workerctl-beta stop feature-worker
```

Follow-up requires active work; use prompt for idle work. Stop terminates the owned
process group; abort interrupts a turn. Neither rolls back files or external effects.
No automatic approval-UI response is implemented. Do not treat idle as task done.

## Recover deliberately

Inspect partial files, request state and ownership first. If the processes stopped,
the manifest-recorded profile is unchanged and an exact session file exists
(later root-source edits do not invalidate a snapshot worker):

```bash
workerctl-beta resume feature-worker --reconciled
```

Resume sends no old prompt. If an abandoned dead worker cannot resume, preserve its
evidence and use `workerctl-beta retire feature-worker --reconciled`, then a fresh ID.
Both operations refuse to kill a live PID from stale metadata.

## Time and testing policy

execution.json defaults: checkpoint 8 minutes, soft budget 12 minutes, supervisor
hard cutoff disabled (0). Native child timeouts, parent, provider and tool limits
remain independent. The supervisor emits attention; it does not automatically
prompt the model to checkpoint or disable child limits.
If a small feature needs repeated recovery rounds, simplify its scope/ownership
instead of assigning another broad attempt. Select from approved YAML roles;
introducing another model into the profile requires the applicable authorization.

Read references/testing-policy-beta.md (the shared testing symlink is unchanged).
Children run only explicitly assigned cheap checks; the worker integrates and
runs decisive relevant tests once at the coherent-feature boundary. The coordinator
accepts evidence tied to revision and shared contracts, not routine duplicate
review/tests. Independent focused checks address real security, data-integrity or
shared-contract risk, or evidence gaps. Missing required evidence means incomplete.
No full suites or review pipeline by default. State/logs are private under
`~/.local/state/omp-workers-beta` (or OMP_WORKER_HOME), not a second task ledger.

Beta caveats: no reboot/logout guarantee, no installed OS service, no network API,
no task auto-acceptance and no cleanup guarantee for tools that deliberately detach
into independent process groups. Start is normally ready but may report starting;
confirm readiness before claiming execution is available.

## Progress and tablet visibility

The claim owner takes before dispatch and submits with evidence under the same
explicit --as actor. The coordinator reviews and accepts/rejects using its own
permitted identity. Honor allowed_actions and policy; identity is not permission.
No default human approval gates, automatic acceptance or state changes on RPC
acknowledgment, agent_end or idle. Finish only with every required task accepted
and goal correctness verified. Accepted/total counts tasks, not effort or ETA.

Use the existing Climier UI on the same project_id and state backend as the CLI.
Obtain its actual reachable origin; prefer the workstation's Tailscale IPv4 and
verify the listener binds all interfaces with ss -tlnp. Do not share loopback URLs
or invent a dashboard address. If Tailscale is down, report it rather than fall back.
No implicit service startup or network changes. Generate links with:

```bash
climier --project <repo> urls --initiative <slug> --origin <verified-reachable-origin>
climier --project <repo> urls --id <exact-task-id> --origin <verified-reachable-origin>
```

Check reachability, matching project/backend and visibility of every mapped task
on the tablet before sharing the returned link. urls alone is not a health check;
skill/runtime updates neither seed tasks nor migrate historical plans.
