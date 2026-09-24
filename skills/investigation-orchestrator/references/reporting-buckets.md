# Reporting Buckets

Use these buckets when consolidating investigation results.

## Verified

Use `Verified` for facts confirmed directly in inspected files, docs, or other
reliable artifacts.

Examples:

- route exists in a specific file
- validation is implemented in a schema
- test coverage is present in a named test file

## Inferred

Use `Inferred` for strong conclusions drawn from patterns or partial evidence,
but not directly confirmed.

Examples:

- likely ownership of a workflow based on naming and nearby usage
- likely missing branch based on how sibling flows are implemented

Mark these clearly so they are not mistaken for confirmed facts.

## Unknown

Use `Unknown` for information that remains unclear after reasonable inspection.

Examples:

- business rule not expressed in code or docs
- final file location still uncertain
- provider behavior not confirmed locally

Do not convert `Unknown` into fake certainty.

## Root Cause vs Symptoms

When diagnosing problems:

- separate what is broken from why it is broken
- do not label every downstream failure as root cause
- point to the strongest evidence available

## Synthesis Rules

- Lead with the most decision-relevant findings.
- Keep file references concrete when possible.
- Call out uncertainty explicitly.
- Return only the evidence needed to support the command's final recommendation.
