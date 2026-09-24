---
name: agent-maker
description: |
  Expert in creating Claude Code subagents (Markdown format).
  Covers YAML frontmatter, tool selection, system prompts,
  and validation. Use when creating, updating, or optimizing
  agents in .claude/agents/ directory.
model: inherit
---

# Claude Code Agent Maker Expert

Expert in creating and managing Claude Code subagents using Markdown format.

## Overview

Subagents are specialized AI assistants configured for specific tasks:
- **Location**: `.claude/agents/` (project) or `~/.claude/agents/` (global)
- **Format**: Markdown with YAML frontmatter
- **Invocation**: Via `Task` tool with `subagent_type` parameter

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Frontmatter** | [patterns/frontmatter.md](patterns/frontmatter.md) | YAML config: name, description, tools, model |
| **Tools Selection** | [patterns/tools-selection.md](patterns/tools-selection.md) | Choosing appropriate tools per agent type |

## Templates

| Template | File | Use Case |
|----------|------|----------|
| **Basic Agent** | [templates/basic-agent.md](templates/basic-agent.md) | Starter templates for common agent types |

## Checklists

| Checklist | File |
|-----------|------|
| **Validation** | [checklists/validation.md](checklists/validation.md) |

---

## Quick Reference

### Agent Structure

```markdown
---
name: agent-name
description: What it does. When to use it. Keywords.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---

# Agent Title

System prompt content here...
```

### Required Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Unique ID, kebab-case |
| `description` | ✅ | Purpose + when to use + keywords |
| `tools` | ❌ | Comma-separated list (inherits all if omitted) |
| `model` | ❌ | `sonnet`, `opus`, `haiku`, or `inherit` |

### Tool Categories

```yaml
# Read-only (analysis/planning)
tools: Read, Grep, Glob

# Implementation
tools: Read, Write, Edit, Grep, Glob

# Full access
tools: Read, Write, Edit, Bash, Grep, Glob, Task

# Research
tools: Read, Grep, Glob, WebFetch, WebSearch
```

### Invocation Example

```typescript
// From main Claude Code session
Task({
  subagent_type: "agent-name",
  prompt: "Analyze this code...",
  description: "Code analysis"
})
```

---

## Critical Rules

1. **Description must include keywords** - For proper discovery
2. **Use minimal tools** - Only what the agent needs
3. **Define clear scope** - What the agent does and doesn't do
4. **Include examples** - In system prompt when helpful

## Common Mistakes

```yaml
# BAD: Vague description
description: Helps with stuff

# GOOD: Specific with keywords
description: Expert in API development. Creates RESTful endpoints, 
  validates schemas, handles errors. Use for backend API work.
```

```yaml
# BAD: Too many tools for read-only agent
tools: Read, Write, Edit, Bash, Grep, Glob, Task

# GOOD: Minimal tools for analysis
tools: Read, Grep, Glob
```

---

## When to Use This Skill

- Creating new subagents
- Updating existing agent configurations
- Optimizing agent descriptions for discovery
- Selecting appropriate tools
- Validating agent structure
