# Tools Selection Guide

How to choose the right tools for your Claude Code subagent.

## Principle: Minimal Necessary Tools

> Only grant tools the agent actually needs. Less is more.

**Why?**
- Prevents unintended side effects
- Clearer agent boundaries
- Easier to reason about behavior
- Better security

---

## Tool Categories

### 📖 Read-Only Tools

For agents that analyze but don't modify.

| Tool | Purpose |
|------|---------|
| `Read` | Read file contents |
| `Grep` | Search in file contents |
| `Glob` | Find files by pattern |
| `List` | List directory contents |

```yaml
# Use for: reviewers, analyzers, planners
tools: Read, Grep, Glob
```

### ✏️ Write Tools

For agents that create or modify files.

| Tool | Purpose |
|------|---------|
| `Write` | Create new files |
| `Edit` | Modify existing files |

```yaml
# Use for: implementers, generators, formatters
tools: Read, Write, Edit, Grep, Glob
```

### 🖥️ Execution Tools

For agents that run commands.

| Tool | Purpose |
|------|---------|
| `Bash` | Execute shell commands |

```yaml
# Use for: testers, builders, deployers
tools: Read, Write, Edit, Bash, Grep, Glob
```

### 🌐 Web Tools

For agents that fetch external information.

| Tool | Purpose |
|------|---------|
| `WebFetch` | Fetch specific URLs |
| `WebSearch` | Search the web |

```yaml
# Use for: researchers, documentation finders
tools: Read, Grep, Glob, WebFetch, WebSearch
```

### 🔄 Delegation Tools

For agents that coordinate other agents.

| Tool | Purpose |
|------|---------|
| `Task` | Invoke other subagents |

```yaml
# Use for: orchestrators, workflow managers
tools: Read, Grep, Glob, Task
```

---

## Agent Type → Tool Mapping

### Code Reviewer

```yaml
name: code-reviewer
tools: Read, Grep, Glob, Bash
```

**Why Bash?** To run `git diff`, linters, type checkers.

### Component Generator

```yaml
name: component-generator
tools: Read, Write, Edit, Grep, Glob
```

**No Bash:** Doesn't need to run commands.

### Test Runner

```yaml
name: test-runner
tools: Read, Bash, Grep, Glob
```

**No Write/Edit:** Only runs tests, doesn't fix them.

### Documentation Researcher

```yaml
name: docs-researcher
tools: Read, Grep, Glob, WebFetch
```

**WebFetch:** Needs to read external docs.

### Task Planner

```yaml
name: task-planner
tools: Read, Grep, Glob
```

**Minimal:** Only reads to understand, doesn't implement.

### Full-Stack Developer

```yaml
name: fullstack-dev
tools: Read, Write, Edit, Bash, Grep, Glob
```

**Full access:** Needs everything for implementation.

### Workflow Orchestrator

```yaml
name: workflow-orchestrator
tools: Read, Grep, Glob, Task
```

**Task:** Delegates to specialized agents.

---

## Decision Matrix

| Agent Purpose | Read | Write | Edit | Bash | Grep | Glob | Task | Web |
|--------------|:----:|:-----:|:----:|:----:|:----:|:----:|:----:|:---:|
| Analyzer | ✅ | ❌ | ❌ | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Reviewer | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Generator | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Implementer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Tester | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Researcher | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| Planner | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Orchestrator | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

**Legend:**
- ✅ Recommended
- ⚠️ Optional (case by case)
- ❌ Not needed

---

## Common Mistakes

### ❌ Giving Write to Reviewers

```yaml
# BAD: Reviewer shouldn't modify code
name: code-reviewer
tools: Read, Write, Edit, Grep, Glob

# GOOD: Read-only for review
name: code-reviewer
tools: Read, Grep, Glob, Bash
```

### ❌ Missing Bash for Testers

```yaml
# BAD: Can't run tests without Bash
name: test-runner
tools: Read, Grep, Glob

# GOOD: Needs Bash to execute tests
name: test-runner
tools: Read, Bash, Grep, Glob
```

### ❌ Omitting Tools (Inherits All)

```yaml
# BAD: Inherits ALL tools - too permissive
name: simple-analyzer
description: Analyzes code structure
# tools: (omitted)

# GOOD: Explicit minimal tools
name: simple-analyzer
description: Analyzes code structure
tools: Read, Grep, Glob
```

---

## Security Considerations

### High-Risk Tools

| Tool | Risk | Mitigation |
|------|------|------------|
| `Bash` | Can execute any command | Only for trusted agents |
| `Write` | Can create any file | Limit to specific agents |
| `Edit` | Can modify any file | Limit to specific agents |
| `Task` | Can invoke other agents | Use for orchestration only |

### Safe Defaults

For unknown or experimental agents, start with:

```yaml
tools: Read, Grep, Glob
```

Add more tools only when needed.
