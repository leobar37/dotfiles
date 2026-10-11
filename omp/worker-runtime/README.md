# OMP worker runtime — beta

Opt-in local RPC supervision for `orchestrate-session-beta`. Bun >=1.3.14; POSIX
Linux/macOS process groups and Unix sockets. No broker, database, external runtime
packages, service installation or network listener. Development uses TypeScript
and Bun types from the local lockfile.
Deployment compatibility is tested on Linux x86-64 with Bun 1.4.2 and macOS arm64
with Bun 1.3.14. No global Bun upgrade is required for those tested platforms.
The 0.2 feedback/configuration upgrade is source-contract based; its new offline
tests and live OMP 18.8.8 no-inference compatibility proof must be run before release.

## Deploy to gdev and mac

```bash
python3 omp/worker-runtime/scripts/deploy.py --hosts gdev mac
~/.agents/bin/sync-machines.sh --hosts "gdev mac" --skill planner --skill orchestrate-session --skill orchestrate-session-beta
```

The runtime deployment stages source files and fake-worker tests over SSH/rsync,
runs the offline compatibility suite, then installs the CLI and compares source
hashes. Use `--stage-only` to verify without installing. It copies no credentials,
sessions, task state, node_modules or live plans, and starts no real workers.
Active/unknown beta workers block replacement. Skill distribution remains separate
and uses the standard sync script. A standalone binary is not shipped: the current
supervisor/guard topology intentionally runs portable TypeScript with native Bun.

## Ownership and layout

```text
workerctl-beta (short-lived client)
    -> private Unix socket
        -> supervisor.ts (detached, persistent for one worker)
            -> guard.ts (owned process group; watches supervisor pipe)
                -> omp --mode rpc --no-ui
```

The supervisor owns RPC stdin/stdout, so a client disconnect does not close OMP's
stdin. If the supervisor dies, the separate guard closes native stdin and performs
bounded process-group cleanup. The native session must be resumed explicitly;
this runtime does not reconnect to orphaned pipes or replay the last assignment.
`workerPid` identifies the process-group guard, not the nested native OMP PID.

Code is maintained here, once. A plan holds only instructions, models, execution
policy and a small launch wrapper. The generic runtime preserves legacy tasks.md
plans, but the beta skill now requires Climier 2.x as the sole progress authority.
RPC metadata is process/request state, never a second task database.

## Install and use

```bash
bash omp/worker-runtime/install.sh
workerctl-beta --help
```

The installer copies the runtime to `~/.local/share/omp-worker-runtime-beta` and
creates `~/.local/bin/workerctl-beta`. It starts nothing and refuses to overwrite
an unrelated executable. Run the checkout directly with `omp/worker-runtime/workerctl`
when developing. Skill sync alone does not install this runtime on another host.
Do not update an installation while executing workers depend on it; stop/reconcile
first. Release 0.3.0-beta.1 reads its manifests plus 0.2.0-beta.1 and 0.1.0-beta.1;
other versions fail closed. Offline list/status/report/request/trace do not migrate
old state. Explicit reconciled resume writes the new generation/version and infers
a missing legacy role only from an exact saved-model entry in unchanged YAML.
Legacy request hashes remain valid for commands without configuration. Missing
legacy lifecycle timestamps/text stay unknown; process stop times are not task ends.

### Freeze the installed runtime and isolate experiments (local only)

```bash
bash omp/worker-runtime/scripts/setup-channels.sh
workerctl-beta --help
workerctl-experimental list
```

This copies **installed** code, not this checkout, into a create-only, hash-verified
`~/.local/share/omp-worker-runtime/releases/<version>-<sha256>` release and an
independent `~/.local/share/omp-worker-runtime-experimental` directory. Releases
are immutable by convention (not filesystem-enforced). The original installed
directory remains untouched for active process paths. Existing launchers are
backed up under `~/.local/share/omp-worker-runtime/backups/` before replacement;
`channels.json` records the initial file hashes. Repeating setup verifies that
same installation; it never refreshes changed experimental code or repins drift.
Symlinks, unrelated/modified launchers, and unrecognized nonempty experimental
installations/state are refused. Python 3 is required.

`workerctl-beta` defaults to the frozen release, retaining `OMP_WORKER_RUNTIME`
as an explicit pin bypass and the existing stable state default (including
`XDG_STATE_HOME` behavior). `workerctl-experimental` ignores `OMP_WORKER_RUNTIME`;
it accepts only `OMP_EXPERIMENTAL_RUNTIME` for its code override and defaults
`OMP_WORKER_HOME` to `~/.local/state/omp-workers-experimental`, regardless of
`XDG_STATE_HOME`. Explicit `OMP_EXPERIMENTAL_RUNTIME` or `OMP_WORKER_HOME` overrides
can bypass isolation: do not point them at stable code/state. The unchanged
runtime's help still describes its beta fallback; the experimental wrapper sets
the actual default state path. This is launcher/copy isolation, not a sandbox or
an architecture redesign: plan paths, credentials, tools and OMP remain shared.
No workers, services, migrations, upgrades or remote sync are started. Do not run
the ordinary installer/deployer to update these channels: it replaces the beta
launcher and is a separate, explicitly authorized operation.

Prepared plans require goal.md, phase-index.md, phases/, and orchestration/models.yml.
The generic runtime requires tasks.md only when no orchestration/climier-plan.json
exists. If a mapping exists, even if damaged, it selects Climier and fails closed
on invalid mapping/backend/version/task identity; it never falls back to Markdown.
The beta launcher requires that mapping and registers no records automatically.
New workers inherit the coordinator's `default` role unless `--role` is explicit;
no provider/model is baked into the runtime. All seven modelRoles must be filled.
The YAML is a model-only native OMP overlay; exact catalog matches are required.

For beta plans, map every executable unit to its exact Climier task ID and phase
brief. Multiple tasks can share a phase. Before dispatch, the coordinator claims
the mapped task and records worker/request IDs; after verifying evidence it records
submission and policy-permitted acceptance. RPC acknowledgment, idle, agent_end and
process exit never mark a task done. Setup/init/registration and any migration need
explicit authorization; the launcher and runtime preflight perform reads only.
The existing Climier UI must use the same project/state backend to show progress.

```bash
workerctl-beta check --plan /path/to/repo/.plans/example --id example-worker
workerctl-beta start example-worker --plan /path/to/repo/.plans/example
# start is idle: it does not send a prompt or run the implementation.
workerctl-beta prompt example-worker --file assignment.md --role smol --thinking low --request-id p001-first-attempt
workerctl-beta wait example-worker --until attention --after 0 --timeout-ms 60000
workerctl-beta report example-worker --request-id p001-first-attempt
workerctl-beta trace example-worker --request-id p001-first-attempt
workerctl-beta status example-worker --refresh
workerctl-beta events example-worker --after 0 --limit 50
workerctl-beta request example-worker --request-id p001-first-attempt
workerctl-beta steer example-worker --file correction.md --request-id p001-correction
workerctl-beta abort example-worker --request-id p001-interrupt
workerctl-beta stop example-worker
workerctl-beta resume example-worker --reconciled
```

All seven native roles (`default`, `slow`, `plan`, `advisor`, `smol`, `tiny`, `commit`)
are available. Startup defaults to `default` (the coordinator model); an explicit
`--role worker` still aliases `smol`, and `coordinator` aliases `default`. Choose
a role per bounded assignment, never a raw model string. Every selector resolves
from the worker's approved YAML and must match the native model catalog exactly.
Start pins/reads the model before becoming ready. Native --goal is interactive-only;
RPC receives the bounded objective through prompt. Workers remain full OMP sessions
with normal tools/skills/extensions except safe probes.

### Independent worker profiles

The plan's `orchestration/models.yml` remains the coordinator/parent profile.
Start copies its complete, unchanged native overlay (all roles, no custom inheritance
macro) to `orchestration/workers/<id>/models.yml`. `--profile PATH` instead selects
an existing approved model YAML **inside the plan**, also copied to that snapshot.
Relative paths are plan-relative. Lexical and symlink escapes fail before start
effects; snapshot paths reject symlinks entirely. Exact approved selectors are
validated, never substituted. There is no implicit migration of existing workers.

```bash
# Read-only: validate a different approved source and preview its intended snapshot.
workerctl-beta check --plan /path/to/repo/.plans/example --id feature-a \
  --profile orchestration/approved-feature.yml --role slow
workerctl-beta start feature-a --plan /path/to/repo/.plans/example \
  --profile orchestration/approved-feature.yml --role slow
```

Creation is exclusive and never overwrites an existing snapshot. A pre-existing
snapshot is reused/validated by default; an explicit source with different bytes
fails with `PROFILE_EXISTS` (use a fresh ID). The manifest saves the actual snapshot
path and SHA-256. Parent edits cannot silently change a running worker's roles.
Configure, prompt and reconciled resume validate that saved profile/hash, not the
root YAML. Changing the saved snapshot blocks these operations; use a new execution
rather than editing live choices. Legacy manifests pointing at the root continue to
validate that root without being silently copied or reassigned.

`check` creates neither a profile nor the state registry. With `--id` it previews
the snapshot selection; without it, only the supplied/root source. The beta thin
launcher supports `--profile`, `--role`, and `--id` for both `--print` and `--check`.
`--print` requires this runtime's selector but is offline: it displays source,
destination, hash, existence and requested role/model, without materialization,
catalog lookup, backend reads or inference. Catalog/progress readiness still needs
`--check`; neither preview proves actual child model use.

### Controlled native subdelegation and verification ownership

The coordinator assigns one bounded coherent feature to a persistent OMP worker.
That worker may use supported native task/subagent tools for bounded subunits,
with explicit scope, inputs, outputs, disjoint write ownership and stopping criteria.
It owns child IDs/log references, integration and decisive feature-level verification.
Children run minimal checks only when assigned; do not build separate
worker/reviewer/repair pipelines by default or create a Climier task/plan per child.
No recursive delegation chains by default, unrelated work, blind child Climier
claims, or final handoff while descendants are still editing. Correct within the
same owner/session; return incomplete when integration or evidence is missing.

This is **instruction policy**, not workerctl child scheduling or enforcement.
workerctl controls only the persistent parent session and does not invent a child
registry, joins, deadlines or model telemetry. Use the installed native tool's
supported model selection; inherited YAML roles alone do not establish the actual
child model. Report requested versus observed child models, IDs, evidence/log
references and remaining work; missing observations stay unknown. Native child,
provider and tool timeouts remain independent of supervisor budgets.

The worker delivers changed paths and a revision/diff fingerprint, commands,
results and evidence tied to that revision, child integration and known gaps.
The coordinator accepts against shared contracts and this evidence rather than
routine full re-review or duplicate unchanged green checks. Focused independent
checks remain appropriate for genuine security, data-integrity or shared-contract
risk. A delivery saying only “implemented” is not completion or Climier acceptance.

```bash
# After reviewing one task's report, configure the same idle worker for another:
workerctl-beta configure example-worker --role advisor --thinking high --request-id config-next
workerctl-beta prompt example-worker --file next-task.md --request-id p001-next
# Or configure and dispatch together under one deduplicated request:
workerctl-beta prompt example-worker --file next-task.md --role tiny --thinking low --request-id p001-next-routed
```

Configuration requires idle, unblocked, non-compacting native state with an empty
queue. It changes only model/thinking, never approval policy or arbitrary RPC.
Explicit thinking levels are `off|minimal|low|medium|high|xhigh|max`; `inherit` is
rejected before effects because it is not an explicit per-task level. A level valid
in the native enum may be unsupported by a model: exact `get_state` equality is
required after native `set_model` / `set_thinking_level`, never silent clamping.
Omitted thinking retains the last observed setting; profiles without thinking keys
continue to work. Do not add non-native task-routing keys to the model-only overlay.
The manifest saves observed role/model/thinking for explicit resume.

Request deduplication (including requested role/thinking) precedes configuration.
Multi-command failure never sends the prompt or claims rollback: the record reports
`partial-observed` with the read-back actual settings, or `outcome-unknown`. Even an
observed partial failure requires review and stop/resume `--reconciled` before new
work. Resume explicitly reapplies the last saved, YAML-approved settings; unknown
native effects are not silently treated as successful configuration.

`follow-up` queues an instruction only during an active assignment. For idle workers,
use prompt. A safe-probe worker rejects prompt/steer/follow-up entirely.
A safe probe can configure/read model and thinking without inference.

## State, concurrency and durability

Runtime root: `$OMP_WORKER_HOME`, otherwise `$XDG_STATE_HOME/omp-workers-beta`,
otherwise `~/.local/state/omp-workers-beta`.

```text
<worker-id>/
├── manifest.json       # generation/token, model/profile hash, session identity, PIDs
├── status.json         # lifecycle, activity, assignment, heartbeat, event cursor
├── supervisor.lock     # supervisor owner; never blindly removed
├── requests/*.json     # bounded intent, native IDs, lifecycle, milestones, final text
├── events.jsonl[.1-.3] # bounded operational journal; no token/partial-message stream
├── stderr.log[.1]      # bounded native stderr
├── supervisor.log[.1] # rotated on startup
└── sessions/           # OMP's own persisted session files
```

Private directories use 0700, files/socket 0600. The short socket path lives in an
owned private temporary directory and requires a random token plus generation.
Metadata and logs can contain sensitive agent content; do not commit or expose them.

An exclusive start/resume lock plus plan ownership checks prevents duplicate plan
workers. Repeated command IDs with identical payload hashes return the existing
record; conflicting payloads are rejected. Intent is persisted before RPC dispatch.
A timeout/disconnect/crash can leave outcome-unknown: never interpret it as rollback
or automatically re-dispatch. Store the request ID before sending; CLI also prints
it to stderr before transmission. The ledger records the associated native RPC ID.

The operational journal restores its sequence from valid durable records, repairs
incomplete tails, and reports `gap: true` outside retained history. It records
allowlisted control/lifecycle metadata, not `get_state` system prompts/tool schemas,
tool argument/result bodies, partial text, raw thinking, or token deltas. No new raw
thinking telemetry is persisted. Omitted token/partial updates are counted at
lifecycle flushes; a crash tail can be unknown. Existing v0.1 files are not scrubbed.

`report ID` lists the latest 20 assignment summaries (with an omitted count);
`report ID --request-id R` includes sent/ack/start/end observations, observed native
execution interval, settings, retained milestones and the last returned assistant
text. Missing observations are null, never reconstructed from file mtimes or process
stop. The observed first-start/latest-end interval can include queue/idle gaps and
is not verified task duration. Steer/follow-up controls link to the parent prompt's
interval; they do not get invented independent assignment timings.

Final user-visible assistant text is retained separately in the request record,
up to 16,000 characters with explicit truncation metadata, and survives journal
rotation. Session/request file pointers locate further evidence, not verified claims.
`trace ID --request-id R` returns ordered recorded operational milestones only,
up to 128 with a dropped count/gap; it never dumps the chat. Native `rpcId`/`rpcIds`
correlate each command and configuration step. An acknowledgment, final assistant
claim, turn end or report is never task verification, submission, acceptance, or
Climier done; the coordinator still reviews evidence and updates that authority.

Limits: 1 MiB control frames/responses, 8 MiB native frames, 128 KiB instructions,
64 pending RPC commands/connections, 32 waiters, 1,000 mutation records per worker.
Events rotate at approximately 2 MiB with three old files; large operational payloads
carry truncation metadata. Per-request final text/milestones have independent caps.
Stderr rotates at 2 MiB. OMP owns its native sessions/transcripts (not pruned here).
Choose a fresh worker ID after preserving/reconciling a full ledger, rather than
silently discarding deduplication history.

## Timeouts and recovery

- `wait --timeout-ms`: caller wait only; never cancels execution.
- Native command response timeout: durable outcome-unknown, no implicit abort.
  Mutating commands exit nonzero with COMMAND_UNCONFIRMED and the saved request
  details if native delivery is pending, rejected or uncertain. Read it with
  `request`; do not treat that error as permission to blindly retry.
- `--checkpoint-ms` (default 480000): emit a checkpoint attention event.
- `--soft-budget-ms` (default 720000): emit an over-budget attention event.
- `--max-runtime-ms` (default 0): explicit assignment cutoff; 0 disables only this
  supervisor's cutoff. Native child, other OMP/provider/tool limits are independent.

Checkpoint/soft-budget alerts do not automatically inject new model prompts.
The coordinator chooses whether to steer, wait, or interrupt. `wait --until attention
--after SEQ` wakes only for a new checkpoint, soft budget, block/error, interruption
or native agent-end observation beyond that cursor. It returns `cursor` (latest
operational event sequence observed when returning) and `attentionSeq` (latest
attention event sequence). Reuse `cursor` as the next `--after`, even after a timeout;
ordinary token/control traffic never re-latches an old checkpoint. Omitted `--after`
means 0 and can intentionally return existing attention. Disconnect removes the
waiter, not execution. A hard deadline performs abort and bounded process-group
cleanup; partial workspace changes are retained, not rolled back.

`resume --reconciled` requires both recorded processes to be dead, no competing
worker for the same plan, an unchanged model profile, and the exact saved session
inside this worker's directory. It sends no prior prompt. If no resumable session
exists, or a dead generation must be abandoned, inspect effects then use:

```bash
workerctl-beta retire example-worker --reconciled
```

Retirement only marks a dead worker record closed; it never kills a process or
removes evidence. A new worker ID can then own the plan. Do not infer process
identity from a recycled PID; ambiguous liveness blocks recovery conservatively.

Beta limitations: no automatic reboot/logout survival, no OS service management,
no remotely exposed API, no interactive extension-approval response command,
no automatic acceptance/merge/task completion, no transparent profile upgrade.
Ordinary descendants share the guarded process group; tools deliberately creating
their own independent sessions/process groups are outside its cleanup guarantee.

## Tests

```bash
cd omp/worker-runtime
bun install --frozen-lockfile --ignore-scripts
bun run typecheck
bun test tests
```

The integration suite uses disposable Git repos, private state directories, a fake
OMP catalog and a fake JSONL process. No inference, network, real project writes,
or real broker. It exercises client independence, dedup, waits, steering/abort,
hard deadlines, model gating, private sockets, duplicate starts/resume, supervisor
death, stop-during-startup, malformed frames, retirement, journal rotation/recovery.
The feedback/configuration cases additionally cover delta floods, retained final
text after rotation, legacy unknown data, bounded trace gaps, attention cursors,
per-task routing/dedup, busy/queued/blocked/compacting refusal, exact model/thinking
verification, partial/unknown configuration outcomes, and selected-settings resume.
Profile cases cover coordinator defaults, explicit role/source selection, create-only
snapshots, read-only checks, path/symlink boundaries, parent-versus-snapshot mutation,
and reconciled resume of independent snapshots and legacy root-profile sessions.
Real clock waits are limited to cross-process integration semantics; event signals
are used instead of guessed delays wherever possible.

Opt-in installed-runtime proof:

```bash
bun run smoke:omp
```

This creates a disposable plan/profile with models selected from installed chat
catalog entries, then launches one real OMP RPC session with extensions/skills/rules/
tools disabled. It checks read-only profile preflight, the coordinator-role default,
independent snapshot identity and isolation from a parent-profile edit, handshake,
exact model pinning, role configuration, thinking equality when the catalog
advertises high support, saved settings/session identity, trace/events and abort/
EOF/stop. It sends **zero prompts** and performs no paid
inference. No provider/model ID is hard-coded. Installed OMP is 18.8.8; available
RPC source verifies command shapes but is older, so live proof remains pending until
this smoke runs. Detailed steering/follow-up, inference-time response extraction,
and recovery semantics are fake-worker coverage, not paid live-model validation.
Bounded smoke evidence is retained under the printed temporary fixture path.
