# orchestrate-broker — session coordination strategy

Authority: `$HOME/.agents/skills/orchestrate-broker/SKILL.md`.
This is an opt-in strategy with readiness checks, not a claim that the missing
full-control adapter has been implemented.

## Current boundary

The inspected session broker supports authenticated messaging, ask/reply, observation,
history, request identity and durable recovery. Its OMP adapter still marks
session.control.prompt/steer/follow_up/abort unsupported. Recheck the current source
before activation; do not assume a protocol enum means the adapter implements it.

Herdr hosts an existing visible worker. The in-process extension would provide
structured control. The broker does not create, restart or keep worker processes
alive. The separate beta RPC runtime does not automatically implement a broker RPC
adapter; that strategy remains reserved/blocked in the broker templates.

## Plan artifacts and readiness

Use the global skill's models.yml, broker.json, broker-verification.json,
coordinator/worker contracts and scripts. Keep the mandatory run-plan.sh plus its
model validator, public CLI bridge and broker-preflight helper. No credentials in
plan files or argv. The broker, grants and target session must already be provisioned.

```bash
bash .plans/<slug>/orchestration/scripts/run-plan.sh --print
bash .plans/<slug>/orchestration/scripts/run-plan.sh --check
```

Preview is offline. Full preflight requires actual runtime evidence and live
advertised capabilities, exact target/session, an idle worker and valid epoch.
The current unsupported controls must fail closed. Do not edit verification.json
to claim fake-host tests are live-runtime proof, or bypass checks via terminal keys.

Normal run-plan.sh starts only the coordinator after checks pass; it is not a
broker service or worker launcher. Do not call this workflow launch-ready until the
adapter exists, required controls are tested and the selected worker model is verified.

## Recovery and timing

Presence, request state, native job state and task completion are distinct. An ask
completes only with its correlated session_reply, not just agent_end or idle. Request
expiry and cancellation do not roll back effects. Reconcile outcome_unknown rather
than replay blindly. Keep requests short instead of holding one ask across an entire
multi-hour phase. Check current numeric limits from broker's executable contract.

For an existing problematic run, use the global skill's
references/current-run-safety.md: reconcile partial work, recover a green baseline,
and assign a smaller complete outcome. Do not migrate a running plan merely because
this skill was installed. Broker source, service activation and real control smoke
remain separately authorized implementation/operational work.
