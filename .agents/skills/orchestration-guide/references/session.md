# orchestrate-session — simple execution

Authority: `$HOME/.agents/skills/orchestrate-session/SKILL.md`.
Use this when you do not need a separate background control layer or task database.

## Prepare

Keep goal.md, phase-index.md, phases/ and tasks.md under `.plans/<slug>/`.
Select coordinator/worker models explicitly for this plan. Copy models.yml,
run-plan.sh and model-profile.mjs from the global skill's templates with `cp -L`.
Put the YAML in orchestration/ and both scripts in orchestration/scripts/.
Replace every model placeholder with an exact catalog ID; never invent choices.

## Commands (from the project root)

```bash
bash .plans/<slug>/orchestration/scripts/run-plan.sh --print
bash .plans/<slug>/orchestration/scripts/run-plan.sh --check
# Starts the goal-driven OMP session in this terminal:
bash .plans/<slug>/orchestration/scripts/run-plan.sh
```

The launcher loads --config plus explicit model flags and native --goal. This is
not the beta RPC launcher and does not automatically create a Herdr pane.

## Progress and recovery

The executor reads the goal/index/task ledger, works through eligible feature
slices, verifies outcomes, and updates tasks.md. No initiative registration, external
DAG or submit/accept cycle is required. Keep one progress writer. After a cut,
inspect pending partial changes and evidence before repeating an operation.

Routine corrections do not need ceremonial approval. Existing limits on spending,
model selection, scope, infrastructure and deployment still apply. Broader tests
are not automatic: use the shared policy in planner/references/testing-policy.md.

Choose beta explicitly if you need a persistent background RPC worker. Do not
replace an already-running executor or reuse its files without a coordinated handoff.
