# Report orchestration guide

Adaptation of the `code-review` orchestration rules for report
generation. The two skills share the model: the main session delegates
heavy analysis to specialized subagents and integrates their findings.

## Session role: orchestrator only

The main session **must preserve context** for decision-making and
user communication. Heavy work is pushed to subagents.

### Allowed main-session work

- Run `git status`, `git log -1`, `git branch --show-current`,
  `ls <repo>/reports`, and small scans to establish scope.
- Read a small number of high-level files (README, route entries,
  module manifests) to understand the target.
- Launch subagents with precise scopes and questions.
- Integrate subagent outputs into the standard schema.
- Write the final report to `reports/<scope>-<topic>-report.md`.
- Optionally write the machine-readable companion
  `.checklist.json` and `.todos.md`.

### Forbidden main-session work

- Reading every implementation file in detail across the whole repo.
- Running static analysis manually.
- Writing the report draft before subagent findings arrive; only the
  post-integration final write is allowed.
- Drafting fixes for any claim the report mentions (escalate to the
  user instead).
- Branch switching, rebasing, or any history rewrite while a report
  is being generated.

## Scoping rules

### Rule 1: Default to the most relevant app or folder
Scope the report to a single product, app, or module unless the user
explicitly says "cross-cutting" or names multiple products.

### Rule 2: Surface an existing `reports/` neighbour
If `reports/` already contains reports for the same scope (`elena-*`,
`avileo-*`, etc.), read 1–2 of them as **shape references** so the new
report matches the precedent (TL;DR style, section ordering, audience
currency).

### Rule 3: Ask when unclear
If scope, audience, or report type is ambiguous, ask one clarifying
question before launching subagents.

## Subagent launch strategy

Spawn the relevant lenses in parallel using `subagent` with
`run_in_background: true`. Each subagent receives:

1. **Scope** — exact files/folders/apps to analyze.
2. **Question** — what to find.
3. **Output schema** — bullets with file paths and confidence.
4. **Constraint** — no writes, evidence required.

Use the copy-paste prompts in `references/subagent-prompts.md`.

## Integration rules

After subagents return:

1. **Deduplicate** identical claims across lenses. Keep the highest
   confidence level.
2. **Resolve conflicts** by preferring the lens that cited code.
   Note conflicts in the report under `Open questions`.
3. **Classify every capability** as **read** or **write**. This
   distinction is non-negotiable for admin-style reports because
   auditors rely on it.
4. **Tag every claim** with confidence:
   | Confidence | Meaning |
   |---|---|
   | `confirmed` | Directly verified in current files, tests, runtime, or diff. |
   | `likely` | Strongly supported by code inspection, but not reproduced or measured. |
   | `speculative` | Plausible concern that needs validation before any action. |
5. **Cross-check**: every claim must trace to a file path. Anything
   without evidence is marked `_(evidence missing)_` and never
   stated as fact.
6. **Render**: apply `references/report-template.md`. Do not paste
   raw subagent prose.

## Severity definitions for capability claims

Used for security-sensitive sections. Cross-cutting audit-style
reports benefit from tagging capability claims by risk.

| Severity | Meaning |
|---|---|
| `critical` | Confirmed security flaw or write capability without a guardrail. |
| `high` | Capability that can leak cross-tenant data or trigger an external system without confirmation. |
| `medium` | Read capability that exposes data consumers without explicit consent. |
| `low` | Style/cosmetic; defer unless quick. |

Do not mark ambiguous capabilities as `critical` or `high`.

## Effort definitions

Used when the report contains a follow-up action list.

| Effort | Meaning |
|---|---|
| `quick` | Can be fixed in minutes; safe and localized. |
| `medium` | Requires focused work; may touch several files. |
| `large` | Needs design discussion or significant refactor. |

## What to write to disk

- **Required**: `reports/<scope>-<topic>-report.md`.
- **Optional, when the user wants machine consumption**:
  `reports/<scope>-<topic>-report.<YYYYMMDD>.checklist.json` (template in
  `references/report-checklist-template.json`).
- **Optional, when the user wants a follow-up list**:
  `reports/<scope>-<topic>-report.todos.md`.

All three are gitignored together (see `references/naming-and-storage.md`).

## Context limits

- Keep the main session focused on the current report.
- Once subagent findings are integrated and rendered, summarize for
  the user and discard raw detail.
- If a report grows too large, split into multiple reports by feature
  slice or mode (one per file).
