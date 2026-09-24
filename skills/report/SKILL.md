---
name: report
description: |
  Generate a standardized, gitignored, persistent markdown report about a
  feature, assistant, subsystem, audit, or investigation. Delegates analysis to
  parallel subagents when scope is large. Use when the user asks for a report,
  analysis writeup, admin/operator-facing documentation, or persistent audit.
  Mirrors the code-review skill: same gitignored convention (like .reviews/),
  same orchestration pattern, and produces a machine-readable checklist
  companion. Invoke manually with /report <topic>.
user-invocable: true
disable-model-invocation: false
mode: all
temperature: 0.2
---

# Report Orchestrator

Produce a **standardized, persistent, gitignored markdown report** about a
feature, assistant, subsystem, audit, or investigation — without burning
the main session context. Mirrors the `code-review` skill conventions so
that `.reviews/` and `reports/` follow the same operational model.

## When to activate

Use this skill when the user asks for any of:

- **Persistable writeup**: "dame un reporte", "háceme un análisis de X",
  "documenta Y", "writeup of Z".
- **Admin / operator / staff-facing documentation** for an assistant or
  subsystem similar to the existing
  `reports/avileo-business-assistant-admin-report.md` and
  `reports/elena-assistant-admin-report.md`.
- **Synthesis after delegated research** that should land in `reports/`
  instead of staying in chat.
- **Audit / investigation / feature writeup** whose output needs to be
  tracked by another agent later.

## When NOT to use

- For raw code-change reviews of an uncommitted diff or PR → use
  `code-review`.
- For short chat-only summaries that the user does not want persisted.
- For architectural planning of new work → use `planner`.
- For executing follow-up actions based on a prior report → use
  `feature-executor`.

## Core principle

**Main session = orchestrator only.** It scopes the topic, decides whether
to delegate, supervises subagents, integrates findings into a consistent
narrative, and writes the final report. It does not perform deep file-by-file
analysis itself. This mirrors `code-review` exactly so both skills produce
durable artifacts with predictable overhead.

The output lands under `<repo>/reports/` and is **gitignored alongside
`.reviews/`** (the `code-review` equivalent). The author and date are
recorded in the report metadata header.

## Workflow

### 1. Scope the report

Capture:

- **Topic** — plain-language name for what is being reported.
- **Audience** — who reads this report (admin, operator, staff,
  engineer, mixed).
- **Scope** — folders/files/apps in and out of scope.
- **Type** — picks the report branch: `assistant`, `feature`, `audit`,
  `investigation`, `infra`. See
  `references/report-template.md`.

If the user is vague, ask **one** round of clarifying questions before
delegating. Do not paraphrase the request into a different scope.

Record the metadata in the report header:

```
- Generated at: <ISO timestamp>
- Branch: <git branch or unknown>
- Repo path: <absolute path>
- Scope: <folders/files/apps>
- Subagents used: <lens list>
- Commands run: <git commands and other read-only commands>
- Companion: <path to .checklist.json if generated>
```

### 2. Decide size and delegation strategy

Use the same rule table as `code-review`:

| Scope                                | Strategy                |
|--------------------------------------|--------------------------|
| Single subsystem, < 5 files          | Main session, no delegation. |
| Single app, < 20 files               | 1–2 subagents (functional + data). |
| Multi-app / cross-cutting            | 3–5 subagents in parallel (full lens set). |
| Auditing diffs/changes of code       | Delegate to `code-review` instead. |

Lens reference list (also in `references/subagent-prompts.md`):

| Lens | Focus |
|---|---|
| `functional` | What the system does, read vs write actions, business logic, modes, user flows |
| `data` | Data model, tenancy/isolation, persistence, multi-tenant boundaries |
| `security` | Auth, scopes, sensitive actions, confirmations, audit trail |
| `ui` | How it surfaces in product (entry points, renderers, responsive) |
| `integration` | External systems, contracts, webhooks, quotas |

Each subagent receives scope + question + output schema + constraint
(no file writes). Spawn all of them in parallel using `subagent` with
`run_in_background: true`.

### 3. Aggregate and synthesize

Same integration rules as `code-review`:

- **Deduplicate**, **resolve conflicts**, **classify claims** (read vs
  write), and **cross-check** against at least one source link per
  claim.
- Tag every claim with confidence:
  - `confirmed` — directly verified in code, tests, runtime, or diff.
  - `likely` — strongly supported but not reproduced or measured.
  - `speculative` — plausible concern needing validation.

Tag every capability claim as **read** or **write** — auditors rely on
this distinction.

### 4. Render and persist

Apply the rendered template `references/report-template.md` and write to
the standard location:

```
reports/<scope>-<topic>-report.md
```

Naming convention: see `references/naming-and-storage.md`. The folder is
**gitignored** alongside `.reviews/`.

If the report will be used for follow-up execution, also write the
machine-readable companion:

```
reports/<scope>-<topic>-report.<YYYYMMDD>.checklist.json
```

Use the schema in `references/report-checklist-template.json`. Companion
files are gitignored together with the report.

### 5. Surface to the user

After writing:

- Print the absolute path of the report file and (if generated) the
  checklist companion.
- Print the TL;DR block.
- Surface the three most distinguishing facts (mode, multi-tenancy,
  UI/UX surface).

### 6. Optional follow-ups

With explicit user approval, you may:

- Generate a `.todos.md` companion beside the report with prioritized
  follow-ups.
- Cross-link to neighbouring reports in the body
  `Reports` section.
- Trigger `feature-executor` for any action items the user approves.

## What to avoid (forbidden main-session work)

The same rules as `code-review`, adapted for report generation:

- Do not perform deep file scanning in the main session when scope is
  large — delegate.
- Do not invent capabilities that the subagents didn't find evidence
  for. Mark them as `_(evidence missing)_`.
- Do not paraphrase isolation claims loosely — they must cite the
  mechanism (`ctx.businessId`, `JWT restaurantId`, etc.).
- Do not commit or push the report file unless the user asks.
- Do not run mutations while generating the report (no writes other
  than the report path itself).
- Do not write reports outside `reports/` without discussing first.

## Output

A standardized markdown report following
`references/report-template.md`, optionally accompanied by a
machine-readable `.checklist.json` companion. Both are gitignored
alongside `.reviews/`.

## References

- `references/naming-and-storage.md` — name patterns, `.gitignore`
  convention (with `.reviews/`), folder rules
- `references/orchestration.md` — main-session discipline and
  classification taxonomies (severity, confidence, capability type)
- `references/subagent-prompts.md` — copy-paste prompts for each lens
- `references/report-template.md` — rendered report template
- `references/report-checklist-template.json` — machine-readable
  companion schema
- Companion skill: `code-review` (same gitignored convention,
  `.reviews/<file>.md`)
