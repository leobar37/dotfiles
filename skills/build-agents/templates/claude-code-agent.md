# Claude Code Agent Template

Templates para crear agentes en formato Claude Code (`.claude/agents/`).

---

## Diferencias Clave con OpenCode

| Aspecto | Claude Code | OpenCode |
|---------|-------------|----------|
| Frontmatter | `name`, `tools` (string), `model` | `mode`, `temperature`, `tools` (object) |
| Tools | Lista separada por comas | Objeto con booleans |
| Modelo | Configurable | No soportado |
| Invocación | Via `Task` tool | Tab o @ mention |

---

## Base Template

```markdown
---
name: {agent-name-kebab-case}
description: |
  {What it does}. {When to use it}.
  Keywords: {keyword1}, {keyword2}, {keyword3}.
tools: {Tool1}, {Tool2}, {Tool3}
model: inherit
---

# {Agent Title}

{System prompt content - identical to OpenCode version}
```

---

## Template por Tipo de Agente

### Package Developer (Claude Code)

```markdown
---
name: {project}-{package}-developer
description: |
  Expert in {Package} development for {Project}. Specializes in {specializations}.
  Use for implementing features, fixing bugs, and maintaining {package}.
  Keywords: {package}, {tech1}, {tech2}, development.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---

# {Package} Developer

You are an expert in {detailed description}. You have deep knowledge of {technologies}.

**SCOPE**: This agent is for work within `{package-path}` directory.

Use this agent when:
- {Use case 1}
- {Use case 2}
- {Use case 3}

## Core Technologies

- **Framework**: {Framework}
- **Language**: TypeScript
- **{Category}**: {Technology}

## Critical Patterns

### 1. {Pattern Name} (MANDATORY)

**Reference**: `{path/to/file.ts}`

**ALWAYS** {requirement}:

\`\`\`typescript
// CORRECT
{correct code}

// WRONG
{wrong code}
\`\`\`

## Quality Requirements

- {Requirement 1}
- {Requirement 2}
- {Requirement 3}

## Common Mistakes

1. {Mistake 1} - {Why wrong}
2. {Mistake 2} - {Why wrong}

## Best Practices

1. {Practice 1} - {Why recommended}
2. {Practice 2} - {Why recommended}
```

---

### Feature Expert (Claude Code)

Para agentes especializados en features (AI, forms, tables, etc.):

```markdown
---
name: {feature}-expert
description: |
  Expert in {Feature Domain}. Specializes in {specializations from analysis}.
  Use when {use cases from patterns}. Keywords: {domain keywords}.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---

# {Feature Domain} Expert

You are an expert in {feature domain} with deep knowledge of patterns used in this codebase.

**SCOPE**: {Feature} implementation across the codebase.

Use this agent when:
- {Use case 1 from analysis}
- {Use case 2 from analysis}
- {Use case 3 from analysis}

## Stack (from codebase analysis)

- **Core**: {library found}
- **Provider**: {provider found}
- **Validation**: {validation found}

## Critical Patterns (FROM CODEBASE)

### 1. {Pattern} (MANDATORY)

**Reference**: `{actual/path.ts}:{line}`

{Pattern description with CORRECT/WRONG examples}

## Common Mistakes

{Derived from anti-patterns found}

## Best Practices

{Derived from best examples found}
```

---

### Analyzer/Reviewer (Claude Code)

Para agentes de solo lectura que analizan código:

```markdown
---
name: {domain}-analyzer
description: |
  {Domain} analysis specialist. Reviews code for {aspects}.
  Use after writing code or before commits. Keywords: analyze, review, {domain}.
tools: Read, Grep, Glob, Bash
model: inherit
---

# {Domain} Analyzer

You analyze code focusing on {domain aspects}.

## When Invoked

1. Identify files to analyze
2. Run relevant checks
3. Report findings

## Analysis Checklist

- [ ] {Check 1}
- [ ] {Check 2}
- [ ] {Check 3}

## Output Format

### Critical Issues
- {Issue type}: {description}

### Warnings
- {Warning type}: {description}

### Suggestions
- {Suggestion type}: {description}
```

---

### Task Planner (Claude Code)

Para tareas largas de planning (ideal con `model: opus`):

```markdown
---
name: {domain}-planner
description: |
  Task planning expert for {domain}. Breaks complex tasks into steps.
  Use before starting large features. Keywords: plan, {domain}, tasks.
tools: Read, Grep, Glob
model: opus
---

# {Domain} Planner

You decompose complex {domain} tasks into actionable steps.

## Process

1. **Understand** - Read relevant code
2. **Identify** - List subtasks
3. **Order** - Arrange by dependencies
4. **Detail** - Add specifics

## Output Format

### Task: [Name]

**Context:**
- Current: ...
- Goal: ...

**Steps:**

1. **[Step]**
   - Files: `path/to/file.ts`
   - Action: What to do
   - Depends: None / Step X

**Risks:**
- [Risk and mitigation]

**Complexity:** Low / Medium / High
```

---

## Tool Combinations por Tipo

```yaml
# Read-only (analyzers, planners)
tools: Read, Grep, Glob

# With shell (reviewers, testers)
tools: Read, Grep, Glob, Bash

# Implementation (developers, generators)
tools: Read, Write, Edit, Grep, Glob

# Full access (full-stack, maintainers)
tools: Read, Write, Edit, Bash, Grep, Glob

# Research (documentation, learning)
tools: Read, Grep, Glob, WebFetch

# Orchestration (workflow managers)
tools: Read, Grep, Glob, Task
```

---

## Model Selection

| Task Type | Model | Reason |
|-----------|-------|--------|
| Implementation | `inherit` | Follow conversation model |
| Complex analysis | `opus` | Better reasoning |
| Simple tasks | `haiku` | Faster, cheaper |
| Planning | `opus` | Better decomposition |
| Code review | `inherit` | Balanced |

---

## Naming Convention

```
{scope}-{role}.md

Examples:
├── api-developer.md          # Package developer
├── ai-message-expert.md      # Feature expert
├── code-reviewer.md          # Analyzer
├── feature-planner.md        # Planner
└── react-component-gen.md    # Generator
```

---

## Conversión desde OpenCode

Si ya tienes un agente OpenCode, convertir así:

```markdown
# OpenCode (input)
---
description: Expert in API...
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

# Claude Code (output)
---
name: api-developer
description: |
  Expert in API...
  Keywords: api, backend.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---
```

**Reglas**:
1. Agregar `name` (kebab-case del título)
2. Convertir `tools` object → string list
3. Agregar `model: inherit`
4. Remover `mode`, `temperature`
5. Mantener system prompt idéntico
