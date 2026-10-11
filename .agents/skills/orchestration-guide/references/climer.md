# orchestrate-climer — Climier-backed progress

Authority: `$HOME/.agents/skills/orchestrate-climer/SKILL.md`.
The skill name is orchestrate-climer; the CLI spelling is **climier**.
Select this variant explicitly when shared ownership/dependencies/history justify
an external progress backend. It is not required for a simple sequential plan.

## State and plan linkage

Plan Markdown defines the goal and phases. orchestration/climier-plan.json maps
each phase to its task ID and phase file; it stores no status. Climier is the only
live progress authority. Do not maintain an independent tasks.md completion ledger.

.climier.json selects the project and optional remote backend. Local state lives
under CLIMIER_HOME; a linked remote project uses its server. Skill sync is not state
sync. Do not hand-edit tasks.json, reset storage or migrate an active project silently.

## Prepare

Use the global skill's layout and templates: models.yml and model-profile.mjs,
climier-plan.json, coordinator.md, copied shared contracts including testing-policy.md,
and scripts/run-plan.sh. Resolve model choices explicitly. Verify Climier 2.x,
existing initiative and mapped task identities. Setup/registration is a separate,
authorized action; the launcher does not initialize or seed anything automatically.

```bash
bash .plans/<slug>/orchestration/scripts/run-plan.sh --print
bash .plans/<slug>/orchestration/scripts/run-plan.sh --check
# Starts the coordinator after model/backend preflight:
bash .plans/<slug>/orchestration/scripts/run-plan.sh
```

## Lifecycle

```text
read context → take → implement → verify → submit → accept/reject
```

Use --as for mutations. Actor names are not authority. Submitted is not done and
does not unblock dependents. Reconcile submitted work before scheduling successors;
do not implement it again after compaction. Existing claims require ownership checks.

No approval gates are created by this workflow by default. Actual operator decisions
or external dependencies may justify gates, but they are not compulsory ceremony.
Acceptance is internal validation, not necessarily a human pause. Use one verification
owner and reuse passing evidence; do not automatically repeat unchanged tests.

Do not mix this skill's executor with an active climier-flow runner on the same task.
Choose the simple or beta workflow when a file checklist is sufficient instead.
