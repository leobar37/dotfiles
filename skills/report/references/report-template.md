# Report template (rendered)

Render and persist using this template. The skeleton mirrors
`code-review`'s template at the metadata and structure level so
reports and reviews look like siblings in the same overall system.

Validation rules:

- Sections in this **exact order**. Drop one only if it is genuinely
  not applicable, and replace with `_(omitido: no aplica)_` so the
  structure stays consistent across reports.
- Every claim traces to a file path or is tagged
  `_(evidence missing)_`.
- Every read/write capability is tagged explicitly.

---

```markdown
# <scope> — <topic> report

> Audience: <audience>. Type: <assistant | feature | audit | investigation | infra>.

## Report metadata

- **Generated at:** <ISO timestamp>
- **Branch:** <git branch or unknown>
- **Repo path:** <absolute path>
- **Scope:** <folders/files/apps>
- **Subagents used:** <lens list, e.g. functional, data, security, ui, integration>
- **Commands run:** `<git status>`, `<git log -1>`, `<other read-only commands>`
- **Not run:** <typechecks/tests/linters not executed, or "none">
- **Companion:** <path to .checklist.json if generated>

---

## TL;DR

- <insight 1>
- <insight 2>
- <insight 3>
- <insight 4>
- <insight 5>

---

## Audience & scope

<one paragraph stating who this report is for and what is explicitly in
or out of scope.>

---

## Modes / variants

<omit only if not applicable>

- **<mode A>**: <prompt + restricted tools summary>.
- **<mode B>**: <prompt + restricted tools summary>.

---

## Capabilities

Capabilities are split **strictly** into read vs write. Auditors rely
on this distinction; do not collapse it.

### Read

- <read capability 1> — `<file path>` via `<tool/prompt name>`
- <read capability 2> — `<file path>` via `<tool/prompt name>`
- _(ninguna)_ if applicable.

### Write

- <write capability 1> — `<file path>`. **Guardrail:** <confirmation,
  role gate, dry-run, quota>.
- <write capability 2> — `<file path>`. **Guardrail:** <...>.
- _(ninguna)_ if applicable.

---

## Multi-tenancy / isolation

- **Tenant key:** `<e.g. ctx.businessId>` at `<repo-relative path>`.
- **Filtering:** `<repo-relative path>` filters on `<key column>`.
- **Cross-tenant check:** <how it is enforced or "not currently enforced">.

---

## Security & sensitive actions

_(drop this section entirely only if the system has zero side effects)_

- Actions touching external systems: <list with file paths>.
- Required confirmations: <list, e.g. "WhatsApp reminders → explicit
  yes/no from operator">.
- Audit trail location: `<path>` or `none`.
- Outstanding gaps: <list with severity `critical|high|medium|low>`.

---

## Data layer (optional)

_(include for assistants or backends with persistent state)_

- **Persistence:** <DB, sessions, files; with paths>.
- **Schemas touched:** <summary or migrations queued>.
- **Multi-turn memory:** <session/chat TTL, compaction, retention>.
- **Retention/cleanup:** <TTL, archival, deletion policy>.

---

## UI surface

- **Entry points:** <button, Cmd+K shortcut, route, modal>.
- **Layout:** <panel, sheet, drawer, full-screen>; responsive notes.
- **Welcome / empty / error states:** <one line each>.
- **Platform constraints:** <e.g. "no mobile", "no /pos">.

---

## Integrations

- **Outbound:** <service, endpoint, auth, quota>.
- **Inbound:** <webhooks; payload shape>.
- **Overlap risk:** <duplicate of X service, with note>.

---

## Constraints & non-goals

- <non-goal 1> — `<source citation>`.
- <non-goal 2> — `<source citation>`.

---

## Open questions

- <conflict or uncertainty that needs human input>.
- <claim without evidence awaiting confirmation>.

---

## References

- Source paths:
  - `<repo-relative path>` — <why>
- Related reports:
  - `reports/<other-report>.md` — <relationship>
- External docs:
  - <url or doc path>
```

---

## Why this order

Mirrors `code-review` so the two skills' outputs feel like siblings:

1. **Metadata** + **TL;DR** first — long reports need a stable
   navigation entry.
2. **Audience & scope** anchors what follows.
3. **Modes** appears early only when there are separated branches.
4. **Capabilities** is split into read/write because that's the most
   common auditor concern.
5. **Multi-tenancy** and **Security** are non-negotiable for any
   assistant-style system — they go before UI.
6. **Data layer** is its own section so backends and assistants stay
   legible.
7. **References** at the end so the body stays readable.

## Existing precedents that already follow this skeleton

- `reports/avileo-business-assistant-admin-report.md`
- `reports/elena-assistant-admin-report.md`

If you are writing a report for El Tech, read 1–2 of these **before**
delegating so your section ordering and audience lines match.
