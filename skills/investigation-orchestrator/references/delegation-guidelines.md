# Delegation Guidelines

Use `Task` only for investigation units that another agent can own cleanly.

Delegation must first pass the activation and delegation gates in `SKILL.md`.
The examples below describe tasks that are eligible once those gates pass; they
are not standalone reasons to launch an agent.

## Good Delegation Units

- map all frontend entry points for a workflow
- map backend routes, services, and schemas for a workflow
- inspect tests covering a feature and identify gaps
- map a broad subsystem whose entry points cannot be identified cheaply in the main thread

## Bad Delegation Units

- search for one term
- read one or two files
- verify a tiny fact the main thread can confirm quickly
- ask one subagent to "analyze everything"

## Delegation Contract

Every delegated task should define:

- exact scope
- what is in scope and what is out of scope
- expected output shape
- any file, directory, or layer boundaries already known
- any constraints, such as read-only analysis

## Overlap Control

When launching parallel tasks:

- split by layer, subsystem, or concern
- do not give two agents partial ownership of the same slice
- keep synthesis in the main thread unless there is a strong reason not to

## Skill Discovery

Inspect available skill names and descriptions locally first. If the harness
offers a dedicated skill-discovery agent, it is eligible only for broad,
multi-domain investigations where several specialized skills genuinely compete
and the orchestrator activation gate already passed.

Do not delegate skill discovery when:

- the right skill is already obvious
- reading the available metadata locally answers the question
- the task is small or localized
- no dedicated discovery agent exists

## Prompt Quality

Prefer prompts like:

- "Map frontend routes, forms, hooks, and state involved in checkout. Return only file-backed findings and contract assumptions."
- "Review tests covering invoice generation and report coverage gaps with concrete file references."

Avoid prompts like:

- "Analyze this feature deeply"
- "Look around and tell me what you find"
