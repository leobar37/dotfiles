# Agent Validation Checklist

Use this checklist before deploying a new or updated agent.

---

## YAML Frontmatter

### Structure
- [ ] File starts with `---`
- [ ] Frontmatter ends with `---`
- [ ] Valid YAML syntax (no tabs, proper indentation)

### Required Fields
- [ ] `name` field present
- [ ] `name` uses kebab-case (lowercase + hyphens)
- [ ] `name` is unique (no duplicates)
- [ ] `description` field present
- [ ] `description` explains WHAT the agent does
- [ ] `description` explains WHEN to use it
- [ ] `description` includes keywords for discovery

### Optional Fields
- [ ] `tools` configured appropriately (if specified)
- [ ] `tools` uses minimal necessary permissions
- [ ] `model` set correctly (if specified)

---

## System Prompt Content

### Structure
- [ ] Clear title with `#` heading
- [ ] Scope section defines coverage area
- [ ] Instructions are specific and actionable

### Quality
- [ ] No vague language ("helps with stuff")
- [ ] Concrete examples where helpful
- [ ] Clear output format defined
- [ ] Constraints and boundaries stated

### Consistency
- [ ] Follows project conventions
- [ ] Matches existing agent patterns
- [ ] Uses consistent terminology

---

## Tools Validation

### Read-Only Agents
- [ ] No `Write` tool
- [ ] No `Edit` tool
- [ ] `Bash` only if needed for read commands

### Implementation Agents
- [ ] Has `Read`, `Write`, `Edit`
- [ ] Has `Grep`, `Glob` for searching
- [ ] `Bash` only if needs to run commands

### Research Agents
- [ ] Has `WebFetch` or `WebSearch`
- [ ] No write tools unless needed

---

## Quick Validation Commands

### Check YAML Syntax
```bash
# Validate frontmatter
head -20 .claude/agents/agent-name.md
```

### Check for Duplicates
```bash
# List all agent names
grep -h "^name:" ~/.claude/agents/*.md .claude/agents/*.md 2>/dev/null
```

### Verify File Location
```bash
# Project agents
ls -la .claude/agents/

# Global agents
ls -la ~/.claude/agents/
```

---

## Common Issues

### ❌ Invalid YAML

```yaml
# BAD: Tab character
name:	agent-name

# GOOD: Spaces only
name: agent-name
```

### ❌ Missing Description Keywords

```yaml
# BAD: No keywords
description: Creates components

# GOOD: With keywords
description: |
  Creates React components with TypeScript.
  Use for UI development. Keywords: react, component, ui.
```

### ❌ Wrong Tool Permissions

```yaml
# BAD: Reviewer with write access
name: code-reviewer
tools: Read, Write, Edit, Grep, Glob

# GOOD: Read-only for review
name: code-reviewer
tools: Read, Grep, Glob, Bash
```

### ❌ Duplicate Names

```bash
# Check for duplicates
grep -rh "^name:" ~/.claude/agents/ .claude/agents/ 2>/dev/null | sort | uniq -d
```

---

## Pre-Deploy Checklist

Before using the agent:

1. **Syntax Check**
   - [ ] YAML parses correctly
   - [ ] Markdown renders properly

2. **Functionality Check**
   - [ ] Test with simple task
   - [ ] Verify tools work as expected
   - [ ] Check output format

3. **Integration Check**
   - [ ] No conflicts with existing agents
   - [ ] Name is discoverable
   - [ ] Description triggers correctly

---

## Post-Deploy Verification

After deploying:

```bash
# Verify agent is recognized
# In Claude Code, try invoking with Task tool:
# Task({ subagent_type: "agent-name", prompt: "test" })
```

If agent doesn't work:
1. Check file location
2. Verify YAML syntax
3. Check for name conflicts
4. Review description keywords
