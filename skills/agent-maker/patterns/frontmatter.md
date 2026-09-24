# YAML Frontmatter Configuration

Complete guide for configuring Claude Code subagent frontmatter.

## Structure

```yaml
---
name: agent-name
description: Description with keywords
tools: Tool1, Tool2, Tool3
model: inherit
---
```

---

## Field Reference

### `name` (REQUIRED)

Unique identifier for the agent.

**Rules:**
- Lowercase letters only
- Use hyphens for spaces
- No special characters
- Must be unique across all agents

```yaml
# ✅ GOOD
name: code-reviewer
name: api-expert
name: react-component-generator

# ❌ BAD
name: Code Reviewer      # No spaces
name: code_reviewer      # No underscores
name: CodeReviewer       # No camelCase
```

---

### `description` (REQUIRED)

Natural language description for agent discovery.

**Must Include:**
1. **What** - What the agent does
2. **When** - When to use it
3. **Keywords** - Terms for discovery

**Format Options:**

```yaml
# Single line
description: Expert in API development. Creates RESTful endpoints. Use for backend work.

# Multi-line (pipe)
description: |
  Expert in API development for the backend.
  Specializes in RESTful endpoints, database queries, and API documentation.
  Use when working on backend services or API controllers.
```

**Examples:**

```yaml
# Analysis agent
description: |
  Code review specialist. Analyzes code quality, security, and maintainability.
  Use after writing or modifying code. Keywords: review, quality, security.

# Implementation agent
description: |
  React component expert. Creates TypeScript components with hooks and tests.
  Use when building new UI components. Keywords: react, component, typescript.

# Research agent
description: |
  Documentation researcher. Finds and summarizes technical documentation.
  Use when learning new APIs or libraries. Keywords: docs, research, learn.
```

---

### `tools` (OPTIONAL)

Comma-separated list of allowed tools.

**If omitted:** Agent inherits all tools from main thread.

**Available Tools:**

| Tool | Purpose |
|------|---------|
| `Read` | Read file contents |
| `Write` | Create new files |
| `Edit` | Modify existing files |
| `Grep` | Search file contents |
| `Glob` | Find files by pattern |
| `Bash` | Execute shell commands |
| `Task` | Delegate to other agents |
| `WebFetch` | Fetch web content |
| `WebSearch` | Search the web |
| `List` | List directory contents |

**Common Combinations:**

```yaml
# Read-only analysis
tools: Read, Grep, Glob

# Code implementation
tools: Read, Write, Edit, Grep, Glob

# Full development
tools: Read, Write, Edit, Bash, Grep, Glob

# Research
tools: Read, Grep, Glob, WebFetch, WebSearch

# Orchestration
tools: Read, Grep, Glob, Task
```

---

### `model` (OPTIONAL)

Model to use for the agent.

| Value | Model | Use Case |
|-------|-------|----------|
| `sonnet` | Claude 3.5 Sonnet | Default, balanced |
| `opus` | Claude Opus 4 | Complex reasoning |
| `haiku` | Claude 3.5 Haiku | Fast, simple tasks |
| `inherit` | Same as main | Consistency |

```yaml
# Use main conversation's model
model: inherit

# Use specific model
model: opus
```

**Recommendations:**
- Use `inherit` for most agents
- Use `opus` for complex analysis/planning
- Use `haiku` for simple, repetitive tasks

---

## Complete Examples

### Analysis Agent

```yaml
---
name: code-analyzer
description: |
  Static code analysis expert. Reviews code for bugs, security issues,
  and best practices. Use after writing code or before commits.
  Keywords: analyze, review, bugs, security.
tools: Read, Grep, Glob, Bash
model: inherit
---
```

### Implementation Agent

```yaml
---
name: react-builder
description: |
  React component builder. Creates TypeScript components with proper
  typing, hooks, and tests. Use when building new UI features.
  Keywords: react, component, typescript, ui.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---
```

### Planning Agent

```yaml
---
name: task-planner
description: |
  Task decomposition expert. Breaks complex tasks into actionable steps.
  Use before starting large features. Keywords: plan, decompose, tasks.
tools: Read, Grep, Glob
model: opus
---
```

---

## Anti-Patterns

### ❌ Vague Description

```yaml
# BAD
description: Helps with code

# GOOD
description: |
  Python code formatter. Applies PEP 8 style, fixes imports, adds type hints.
  Use when cleaning up Python files. Keywords: python, format, pep8.
```

### ❌ Missing Keywords

```yaml
# BAD - No discovery keywords
description: Creates database migrations

# GOOD - Includes keywords
description: |
  Database migration expert. Creates Drizzle/Prisma migrations, handles
  schema changes. Use for database work. Keywords: migration, schema, database.
```

### ❌ Excessive Tools

```yaml
# BAD - Read-only agent with write tools
name: code-reviewer
tools: Read, Write, Edit, Bash, Grep, Glob, Task

# GOOD - Minimal tools for purpose
name: code-reviewer
tools: Read, Grep, Glob, Bash
```
