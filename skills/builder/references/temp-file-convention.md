# Temporary File Convention

Standard for using scratch files as external session memory.

## Directory

```
~/tmp/builder/
```

Create at session start:
```bash
mkdir -p ~/tmp/builder
```

Do not run `scripts/init-session.sh` without reviewing its cleanup behavior and
obtaining authorization for that cleanup: it currently clears existing files in
this shared directory. Plain `mkdir -p` preserves other sessions' work.

## File Types and Naming

| Type | Prefix | Example |
|------|--------|---------|
| Research notes | `research-` | `research-auth-flow.md` |
| API responses | `api-` | `api-response-users.json` |
| State snapshots | `state-` | `state-before-refactor.txt` |
| Subagent results | `subagent-` | `subagent-worker-auth.md` |
| Task reminders | `reminder-` | `reminder-check-edge-cases.md` |

## When to Write a Temp File

Write when:
- A subagent returns a long response. Save the raw output, then synthesize.
- You discover something important mid-task that you'll need later.
- You need a "before" snapshot of a file or test output.
- The main session context is growing and you need to offload.
- A research finding has file:line references you'll need to revisit.

Do NOT write temp files for:
- Trivial notes that fit in one sentence
- Things you'll act on immediately
- Content already saved elsewhere (plans, delegations, reports)

## Lifecycle

1. **Create**: write to `~/tmp/builder/<type>-<descriptor>.<ext>`
2. **Reference**: read when needed during the session
3. **Cleanup**: delete only scratch files you created for this task
4. **Keep (exception)**: if a file is useful for the next session and the
   user agrees, move it to a permanent location

## Cleanup Boundary

Remove only explicitly identified files owned by this task. Never clear
`~/tmp/builder/*`: the directory may contain user or peer work. If ownership is
uncertain, leave the file untouched.

## Example Session

```bash
# Start
mkdir -p ~/tmp/builder

# During work
echo "## Findings" > ~/tmp/builder/research-auth-flow.md
cat > ~/tmp/builder/api-response-users.json  # paste API response
git diff > ~/tmp/builder/state-before-refactor.txt

# End: only if these exact files were created by this task
rm -- ~/tmp/builder/research-auth-flow.md ~/tmp/builder/api-response-users.json ~/tmp/builder/state-before-refactor.txt
```
