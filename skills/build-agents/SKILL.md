---
name: build-agents
description: |
  Expert in creating agents for OpenCode AND Claude Code platforms.
  Analyzes package structure, patterns, and behaviors to generate specialized
  agents. Supports dual-platform workflows (OpenCode for maintenance, 
  Claude Code for complex tasks). Auto-detects platform and converts formats.
  Keywords: opencode, claude code, agent, monorepo, package, maintenance, patterns.
---

# Agent Builder for Monorepos (OpenCode + Claude Code)

Expert in creating specialized agents for **both platforms**. Analyzes package structure, patterns, and preferences to generate agents that accelerate task resolution.

## Overview

This skill helps you:
- Create agents for **OpenCode** (`.opencode/agent/`) - ideal for maintenance
- Create agents for **Claude Code** (`.claude/agents/`) - ideal for complex tasks
- **Auto-detect** which platform(s) to use
- **Convert** between formats when needed
- Analyze monorepo packages and their patterns
- Infer behavior rules from codebase analysis

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Agent Structure** | [patterns/agent-structure.md](patterns/agent-structure.md) | Both OpenCode & Claude Code formats |
| **Package Analysis** | [patterns/package-analysis.md](patterns/package-analysis.md) | How to analyze packages for agent creation |
| **Behavior Analysis** | [patterns/behavior-analysis.md](patterns/behavior-analysis.md) | How to infer rules from codebase patterns |
| **Platform Detection** | [patterns/platform-detection.md](patterns/platform-detection.md) | Detect platform & convert between formats |

## Templates

| Template | File | Use Case |
|----------|------|----------|
| **Package Agent (OpenCode)** | [templates/package-agent.md](templates/package-agent.md) | OpenCode package-specific agents |
| **Feature Agent** | [templates/feature-agent.md](templates/feature-agent.md) | Feature-specific agents (AI, forms, etc.) |
| **Claude Code Agent** | [templates/claude-code-agent.md](templates/claude-code-agent.md) | Claude Code format templates |

## Checklists

| Checklist | File |
|-----------|------|
| **Agent Validation** | [checklists/agent-validation.md](checklists/agent-validation.md) |

---

## Quick Reference

### Dual-Platform Workflow

```
1. DETECT Platforms
   ├─ .opencode/agent/  → OpenCode available
   ├─ .claude/agents/   → Claude Code available
   └─ Both              → Generate for BOTH

2. ANALYZE Package/Feature
   └─ Same analysis for both platforms

3. GENERATE Agents
   ├─ OpenCode format  → .opencode/agent/{project}-{pkg}-developer.md
   └─ Claude Code      → .claude/agents/{agent-name}.md

4. SYNC Content
   └─ System prompt IDENTICAL, only frontmatter differs
```

See [patterns/platform-detection.md](patterns/platform-detection.md) for details.

### Behavior-First Workflow (Feature Agents)

When user requests a feature-specific agent (e.g., "create agent for AI messages"):

```
1. PARSE Request    → Extract domain keywords (AI, messages, forms, etc.)
2. SEARCH Codebase  → Find related files using grep/glob
3. ANALYZE Patterns → Identify consistent patterns in found code
4. INFER Rules      → Generate MUST/NEVER from patterns
5. EXTRACT Examples → Get real code snippets as references
6. GENERATE Agent   → Create for detected platform(s)
```

See [patterns/behavior-analysis.md](patterns/behavior-analysis.md) for detailed process.

---

## Platform Comparison

| Aspect | OpenCode | Claude Code |
|--------|----------|-------------|
| **Location** | `.opencode/agent/` | `.claude/agents/` |
| **Best For** | Mantenimiento, scope específico | Tareas largas, planning |
| **Tools Format** | `tools: { write: true }` | `tools: Read, Write` |
| **Unique** | `mode`, `temperature` | `name`, `model` |

### When to Use Each

**OpenCode** (mantenimiento):
- Agentes con scope específico (un paquete)
- Control de temperatura para consistencia
- Modos primary/subagent

**Claude Code** (tareas complejas):
- Planning con `model: opus`
- Delegación con `Task` tool
- Agentes de análisis/research

---

### OpenCode Agent Structure

```markdown
---
description: [What + When + Keywords] (REQUIRED)
mode: all|primary|subagent
temperature: 0.0-1.0
tools:
  write: true|false
  edit: true|false
  bash: true|false
  read: true|false
  glob: true|false
  grep: true|false
  list: true|false
  task: true|false
permission:
  edit: ask|allow|deny
  bash: ask|allow|deny
---

# Agent Title

[System prompt content]
```

### Claude Code Agent Structure

```markdown
---
name: agent-name-kebab-case
description: |
  What it does. When to use. Keywords: k1, k2.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---

# Agent Title

[System prompt content]
```

### Package Detection

```bash
# pnpm workspace
cat pnpm-workspace.yaml  # packages: ["packages/*"]

# npm/yarn workspaces
cat package.json  # "workspaces": ["packages/*"]

# lerna
cat lerna.json  # "packages": ["packages/*"]
```

---

## Execution Process

### Step 1: Detect Platforms

```bash
# Detect both platforms
[ -d ".opencode/agent" ] && echo "OpenCode"
[ -d ".claude/agents" ] && echo "Claude Code"

# Create directories if needed
mkdir -p .opencode/agent
mkdir -p .claude/agents
```

**CRITICAL**: Detect which platforms are in use before creating agents.

### Step 2: Detect Monorepo Structure

Read these files to understand the monorepo:

1. **pnpm-workspace.yaml** (pnpm workspaces)
2. **package.json** (npm/yarn workspaces)
3. **lerna.json** (lerna)
4. **turbo.json** (turborepo)
5. **nx.json** (nx)

Extract the packages pattern (usually `packages/*`).

### Step 3: List All Packages

For each package directory, gather:

| Information | How to Get |
|-------------|------------|
| Package name | `package.json` → `name` field |
| Technologies | `package.json` → `dependencies`, `devDependencies` |
| Entry points | `package.json` → `main`, `exports` |
| Scripts | `package.json` → `scripts` |
| Structure | Directory listing |

### Step 4: Analyze Each Package

For each package, analyze:

1. **Core Technologies** - Framework, language, libraries
2. **Project Structure** - Directories, key files
3. **Critical Patterns** - MUST/NEVER rules, mandatory conventions
4. **Common Patterns** - Frequently used patterns
5. **Quality Requirements** - Standards, checks
6. **Common Mistakes** - Anti-patterns to avoid
7. **Best Practices** - Recommended approaches

See [patterns/package-analysis.md](patterns/package-analysis.md) for detailed instructions.

### Step 5: Create or Update Agent

1. **If agent doesn't exist**: Create using [templates/package-agent.md](templates/package-agent.md)
2. **If agent exists**:
   - Read current agent
   - Compare with current package state
   - Update sections that need changes

### Step 6: Validate Agent

Run through [checklists/agent-validation.md](checklists/agent-validation.md) to ensure quality.

---

## Agent Naming Convention

### OpenCode
```
{project}-{package}-developer.md

Examples:
- gymspace-api-developer.md
- gymspace-sdk-developer.md
- gymspace-mobile-developer.md
```

### Claude Code
```
{agent-name}.md  (kebab-case, name field inside)

Examples:
- api-developer.md          (name: api-developer)
- ai-message-expert.md      (name: ai-message-expert)
- feature-planner.md        (name: feature-planner)
```

---

## Required Agent Sections

Every package agent MUST have:

### 1. Frontmatter (REQUIRED)

```yaml
---
description: [Clear description with when to use and keywords]
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: true
  read: true
  glob: true
  grep: true
permission:
  edit: allow
  bash: allow
---
```

### 2. Title & Scope (REQUIRED)

```markdown
# {Package} Developer

Expert in {description}.

**SCOPE**: This agent is exclusively for work within `{path}` directory.
Use this agent when:
- [Use case 1]
- [Use case 2]
- Keywords: "keyword1", "keyword2"
```

### 3. Core Technologies (REQUIRED)

```markdown
## Core Technologies

- **Framework**: [Name + version if relevant]
- **Language**: [TypeScript, JavaScript, etc.]
- **[Category]**: [Technology]
```

### 4. Project Structure (RECOMMENDED)

```markdown
## Project Structure

**Structure** (`{path}`):
\`\`\`
{directory-tree}
\`\`\`
```

### 5. Critical Patterns (REQUIRED)

```markdown
## Critical Patterns

### 1. [Pattern Name] (MANDATORY)

**Reference**: `{file-path}`

**ALWAYS** [requirement]:

\`\`\`typescript
// CORRECT
[code]

// WRONG
[code]
\`\`\`
```

### 6. Quality Requirements (REQUIRED)

```markdown
## Quality Requirements

[Checkmark list of requirements]
```

### 7. Common Mistakes (REQUIRED)

```markdown
## Common Mistakes

1. [Mistake 1] - [Why it's wrong]
2. [Mistake 2] - [Why it's wrong]
```

### 8. Best Practices (REQUIRED)

```markdown
## Best Practices

1. [Practice 1] - [Why it's recommended]
2. [Practice 2] - [Why it's recommended]
```

---

## When to Use This Skill

- Setting up **OpenCode** or **Claude Code** in a project
- Creating agents for **both platforms** simultaneously
- **Converting** agents between formats
- Adding agents for new packages
- Updating agents after architectural changes
- Standardizing agent quality across a monorepo
- Analyzing package patterns for documentation

---

## Common Mistakes

1. **Not detecting platforms first** - Always check both `.opencode/` and `.claude/`
2. **Vague descriptions** - Must include what, when, and keywords
3. **Missing critical patterns** - Every agent needs MUST/NEVER rules
4. **No file references** - Always include absolute paths to reference files
5. **Generic content** - Agent must be specific to the package
6. **Different content per platform** - System prompt must be IDENTICAL
7. **Wrong tools format** - OpenCode uses object, Claude Code uses string

---

## Best Practices

1. **Generate for both platforms** - If both exist, create both versions
2. **Keep system prompts synced** - Only frontmatter should differ
3. **Read existing agents first** - Understand established patterns
4. **Use consistent structure** - All agents should follow the same format
5. **Include real file references** - Point to actual files in the package
6. **Complete code examples** - Include imports, types, and both correct/wrong examples
7. **Keep agents focused** - One agent per package, clear scope

---

## Quick Conversion Reference

### OpenCode → Claude Code

```yaml
# From OpenCode
tools:
  write: true
  edit: true
  bash: false

# To Claude Code
tools: Read, Write, Edit, Grep, Glob
```

### Claude Code → OpenCode

```yaml
# From Claude Code
tools: Read, Write, Edit, Bash, Grep, Glob

# To OpenCode
tools:
  write: true
  edit: true
  bash: true
```

See [patterns/platform-detection.md](patterns/platform-detection.md) for full conversion rules.
