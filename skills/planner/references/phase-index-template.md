# Phase Index Template

Use this structure for `.plans/<plan-name>/phase-index.md` in structured mode.

```markdown
# [Plan Title] Phase Index

## Summary

- Mode: Structured
- Slug: `[plan-name]`
- Requirements File: `requirements.md`
- Phase State: `phases/*.md` frontmatter

## Requirements Coverage

| Requirement | Covered By |
| --- | --- |
| `FR-001` | `phases/01-investigate-root-cause.md` |
| `FR-002` | `phases/02-implement-checkout-renewal-validation.md` |

## Phase List

| Phase ID | Type | File | Purpose | Dependencies |
| --- | --- | --- | --- | --- |
| `P-001` | investigation | `phases/01-investigate-root-cause.md` | [outcome this delegated work unit must achieve] | none |
| `P-002` | implementation | `phases/02-implement-checkout-renewal-validation.md` | [outcome this delegated work unit must achieve] | `P-001` |

## Suggested Execution Order

1. `P-001` - [reason]
2. `P-002` - [reason]
3. `P-003` - [reason]

## Notes

- [important dependency or sequencing note]
```

Notes:

- Treat this file as the navigation layer for the structured plan.
- Keep it synchronized with the phase files and requirement IDs.
- Use phase names and purposes that describe outcomes, not mechanical steps.
- Write it so an execution command such as `/build-plan` can derive ordering and validation from it.
- Do not use `checklist.json` as authored source of truth. Phase status,
  dependencies, phase_type, and requirement coverage live in phase frontmatter.
- Include the phase type in the table so the reader can quickly see what kind
  of work each phase represents.
