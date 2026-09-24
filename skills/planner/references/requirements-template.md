# Requirements Template

Use this structure for `.plans/<plan-name>/requirements.md` in structured mode.

```markdown
# [Plan Title] Requirements

## Objective

[One paragraph describing the product or technical outcome.]

## Scope

- In scope: [items]
- Out of scope: [items]

## Functional Requirements

- `FR-001` - [clear behavior or capability]
- `FR-002` - [clear behavior or capability]

## Non-Functional Requirements

- `NFR-001` - [performance, security, accessibility, operational constraint]

## Acceptance Criteria

- [observable outcome]
- [observable outcome]

## Technical Decisions Already Made

- [optional; include only decisions already confirmed by analysis or user direction]

## Constraints

- [technical or business constraint]

## Open Questions

- [unknown that still needs confirmation]
```

Notes:

- Keep this file focused on the what, not the how.
- Do not reference specific implementation files, classes, methods, or private
  module names here unless the requirement is specifically about a public API or
  package boundary.
- Put implementation constraints, likely files, and sequencing in phase files
  instead of requirements.
- Use stable IDs because phase files will trace back to them.
