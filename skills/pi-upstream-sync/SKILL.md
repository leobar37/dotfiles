---
name: pi-upstream-sync
description: Compare local pi-mono packages (packages/ai, packages/agent, packages/coding-agent) against the upstream earendil-works/pi repository, analyze recent commits, detect missing fixes and improvements, and generate a structured report. Use when the user wants to sync with upstream, check for missing upstream fixes, compare pi packages, or generate an upstream divergence report.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# pi-upstream-sync

This skill clones the upstream `earendil-works/pi` repository into a temporary directory, analyzes the latest commits affecting `packages/ai`, `packages/agent`, and `packages/coding-agent`, compares each changed file against the local workspace, and produces a structured Markdown report.

## Trigger phrases

- "sync with upstream pi"
- "compare with earendil-works/pi"
- "what fixes are we missing from upstream"
- "upstream divergence report"
- "check upstream changes for ai/agent/coding-agent"

## Workflow

1. **Validate workspace**
   - Confirm the current directory contains `packages/ai`, `packages/agent`, and `packages/coding-agent`.

2. **Clone upstream**
   - Run the bundled script to clone `https://github.com/earendil-works/pi` at `main` into a fresh temporary directory.
   - This is read-only: no local files are modified.

3. **Analyze commits**
   - Inspect the last 30 commits of `main` that touch any of the three target packages.
   - For each commit, extract SHA, date, author, subject, body, and changed files.

4. **Compare files**
   - For each changed file, compare the upstream version with the local file:
     - `synced`: identical
     - `diverged`: exists locally but differs
     - `missing_local`: exists upstream but not locally
     - `deleted_upstream`: deleted upstream

5. **Infer priority**
   - Use the commit type (`fix`, `feat`, `refactor`, etc.) and changed scope to assign a priority level and recommendation.

6. **Generate report**
   - Output a Markdown report grouped by package and sorted by priority.
   - Optionally write the report to a file (e.g. `.plans/upstream-sync-<date>.md`).

## Running the report

From the workspace root, run:

```bash
bunx tsx ~/.agents/skills/pi-upstream-sync/scripts/sync-report.ts --diff
```

For full diffs inline in the report, add `--diff` or `-d`. Without it, the report only lists file statuses and sizes.

```bash
bunx tsx ~/.agents/skills/pi-upstream-sync/scripts/sync-report.ts \
  --upstream https://github.com/earendil-works/pi \
  --ref main \
  --limit 30 \
  --output .plans/upstream-sync-report.md \
  --diff
```

If the first positional argument is a path, it is treated as the local workspace root.

## Report interpretation

The report contains:

- **Summary by priority**: counts of high/medium/low items.
- **Detailed analysis**: per-package breakdown of each commit.
- For each commit:
  - SHA, date, author
  - Priority and recommendation reason
  - Changed files with divergence status
  - Commit body when available

Use this report to decide which upstream changes to apply manually. The skill does not modify the local workspace.

## Scope

Only these packages are compared:

- `packages/ai`
- `packages/agent`
- `packages/coding-agent`

Local-only packages (`subagents`, `dashboard`, `extensions`, `logger`) and replaced npm packages (`tui`, `web-ui`) are intentionally ignored.

## Important notes

- The upstream clone is always fresh; nothing is cached.
- The comparison is content-based and ignores line endings.
- This is a reporting tool; it never applies changes automatically.
- When summarizing findings to the user, be concise and lead with the highest-priority items.
