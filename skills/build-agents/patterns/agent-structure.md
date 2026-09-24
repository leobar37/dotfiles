# Agent Structure (OpenCode & Claude Code)

Complete guide for structuring agents for both platforms.

---

## Platform Comparison

| Aspect | OpenCode | Claude Code |
|--------|----------|-------------|
| **Location** | `.opencode/agent/` | `.claude/agents/` |
| **Naming** | `{project}-{pkg}-developer.md` | `{agent-name}.md` |
| **Tools Format** | Object `{ write: true }` | String `Read, Write` |
| **Unique Features** | `mode`, `temperature` | `name`, `model` |
| **Best For** | Mantenimiento, scope específico | Tareas largas, planning |

See [platform-detection.md](platform-detection.md) for conversion rules.

---

## OpenCode Format

OpenCode agents are Markdown files with YAML frontmatter:

```markdown
---
description: [REQUIRED - What + When + Keywords]
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

---

## Frontmatter Fields

### `description` (REQUIRED)

Natural language description for agent discovery.

**Must Include:**
1. **What** - What the agent specializes in
2. **When** - When to use it
3. **Keywords** - Terms for discovery

```yaml
# GOOD
description: Expert in the Gym Management System API (packages/api).
  Specializes in API endpoint development, service architecture, and
  database schema management. Use this agent when working on backend
  services, API controllers, or database operations.

# BAD - Too vague
description: Helps with API stuff
```

### `mode` (OPTIONAL, default: all)

| Value | Description |
|-------|-------------|
| `primary` | Main agent, accessible via Tab |
| `subagent` | Helper agent, invoked by @ mention |
| `all` | Works as both (default) |

```yaml
# For package developers - use 'all'
mode: all

# For analysis-only agents
mode: subagent
```

### `temperature` (OPTIONAL)

| Range | Use Case |
|-------|----------|
| 0.0-0.2 | Precise, deterministic (code generation) |
| 0.3-0.5 | Balanced (general development) |
| 0.6-1.0 | Creative, varied (brainstorming) |

```yaml
# For package agents - use low temperature
temperature: 0.2
```

### `tools` (OPTIONAL)

Control which tools the agent can use:

```yaml
tools:
  write: true   # Create new files
  edit: true    # Modify existing files
  bash: true    # Execute shell commands
  read: true    # Read files (default true)
  glob: true    # Find files by pattern
  grep: true    # Search content in files
  list: true    # List directory contents
  task: true    # Delegate to other agents
```

**Available Tools:**

| Tool | Purpose |
|------|---------|
| `write` | Create new files |
| `edit` | Modify existing files |
| `bash` | Execute shell commands |
| `read` | Read file contents |
| `glob` | Find files by pattern (e.g., `**/*.ts`) |
| `grep` | Search content in files |
| `list` | List directory contents |
| `task` | Delegate to other agents |

### `permission` (OPTIONAL)

Control tool permissions:

```yaml
permission:
  edit: ask     # Ask before editing
  bash: ask     # Ask before running commands
```

---

## Content Structure

### 1. Title & Scope (REQUIRED)

```markdown
# {Package Name} Developer

You are an expert in {detailed description}. You have deep knowledge of
{technologies and patterns}.

**SCOPE**: This agent is exclusively for work within `{directory}` directory.
Use this agent when:

- [Use case 1]
- [Use case 2]
- [Use case 3]
- Keywords: "keyword1", "keyword2", "keyword3"
```

**Key Points:**
- Use second person ("You are...")
- Define explicit scope with directory path
- List concrete use cases
- Include keywords for discovery

### 2. Important Constraints (OPTIONAL)

```markdown
**IMPORTANT CONSTRAINTS**:

- **NO {area}** - This agent does NOT work on {area}. Use {other-agent} instead.
- **NO testing** - Do not suggest or write tests unless explicitly requested
- **{area}-only focus** - All work must be within `{directory}` directory
```

### 3. Core Technologies (REQUIRED)

```markdown
## Core Technologies

- **Framework**: NestJS (TypeScript)
- **Database**: Prisma ORM with PostgreSQL
- **API Documentation**: Swagger/OpenAPI
- **Authentication**: JWT with gym context
- **State Management**: Jotai for global, React Hook Form for forms
```

### 4. Project Structure (RECOMMENDED)

```markdown
## Project Structure

**{Package} Structure** (`{path}`):

\`\`\`
{path}/
├── src/
│   ├── {folder1}/           # Description
│   │   ├── {file1}          # Description
│   │   └── {file2}          # Description
│   ├── {folder2}/
│   └── ...
├── {config-file}            # Description
└── package.json
\`\`\`
```

### 5. Critical Patterns (REQUIRED)

```markdown
## Critical Patterns

### 1. {Pattern Name} (MANDATORY)

**Reference**: `{path/to/reference/file}`

**ALWAYS** {requirement}:

\`\`\`typescript
// CORRECT
import { Example } from './path';

export function correctPattern() {
  // Complete implementation
  return result;
}

// WRONG
function wrongPattern() {
  // What not to do and why
}
\`\`\`

**Key Points**:
- [Point 1]
- [Point 2]
```

**Requirements for Critical Patterns:**
- Use MUST/NEVER language
- Include complete code examples with imports
- Show both CORRECT and WRONG approaches
- Reference actual files in the project
- Explain why the pattern matters

### 6. Common Patterns (RECOMMENDED)

```markdown
## Common Patterns

### {Pattern Name}

**Pattern for {scenario}**:

\`\`\`typescript
// Complete code example
\`\`\`

**When to use**: [Explanation]
```

### 7. Development Workflow (OPTIONAL)

```markdown
## Development Workflow

### When Adding {Feature Type}

1. **{Step 1}** - [Description]
2. **{Step 2}** - [Description]
3. **{Step 3}** - [Description]
```

### 8. Quality Requirements (REQUIRED)

```markdown
## Quality Requirements

- **{Requirement 1}** - [Description]
- **{Requirement 2}** - [Description]
- **{Requirement 3}** - [Description]
```

### 9. Common Mistakes (REQUIRED)

```markdown
## Common Mistakes

1. **{Mistake 1}** - [Why it's wrong]
2. **{Mistake 2}** - [Why it's wrong]
3. **{Mistake 3}** - [Why it's wrong]
```

### 10. Best Practices (REQUIRED)

```markdown
## Best Practices

1. **{Practice 1}** - [Why it's recommended]
2. **{Practice 2}** - [Why it's recommended]
3. **{Practice 3}** - [Why it's recommended]
```

---

## Emphasis Conventions

Use consistent emphasis across all agents:

| Emphasis | Usage |
|----------|-------|
| **CRITICAL** | Absolutely required patterns |
| **MANDATORY** | Must-follow requirements |
| **IMPORTANT** | Key information |
| **NEVER/ALWAYS** | Absolute rules |
| `CORRECT` | Right way to do things |
| `WRONG` | What not to do |

---

## File Reference Format

Always use absolute paths from project root:

```markdown
**Reference**: `packages/api/src/modules/clients/clients.service.ts`
**Reference Example**: `packages/mobile/src/app/clients/_layout.tsx`
**Documentation**: `/docs/components/LoadingScreen.md`
```

---

## Code Example Format

Every code example should include:

```typescript
// 1. Imports
import { Required, Imports } from './paths';

// 2. Type definitions
interface ExampleType {
  field: string;
}

// 3. CORRECT implementation
export function correctExample(): ExampleType {
  // Clear implementation with comments where needed
  return { field: 'value' };
}

// 4. WRONG implementation
function wrongExample() {
  // Show what NOT to do
  // Explain why it's wrong
}
```

---

## Agent Types by Package

### Backend API Package

```yaml
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false  # Database operations should be manual
```

Focus on:
- Controllers, Services, DTOs
- Database schema (Prisma/Drizzle)
- API documentation
- Request context patterns

### Frontend Web Package

```yaml
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
```

Focus on:
- Components, Hooks, Pages
- State management
- Form patterns
- Routing conventions

### Mobile Package

```yaml
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
```

Focus on:
- Navigation structure
- Platform-specific patterns
- Performance considerations
- Native module usage

### SDK Package

```yaml
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
```

Focus on:
- Resource classes
- Type definitions
- API transformation
- Error handling

### Shared/Utils Package

```yaml
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
```

Focus on:
- Type exports
- Utility functions
- Constants
- Shared configurations

---

## Claude Code Format

Claude Code agents use a different frontmatter structure:

```markdown
---
name: agent-name-kebab-case
description: |
  What the agent does. When to use it.
  Keywords: keyword1, keyword2, keyword3.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---

# Agent Title

[System prompt content - same as OpenCode]
```

---

## Claude Code Frontmatter Fields

### `name` (REQUIRED)

Unique identifier in kebab-case:

```yaml
# GOOD
name: api-developer
name: ai-message-expert
name: gymspace-mobile-developer

# BAD
name: API Developer      # No spaces
name: apiDeveloper       # No camelCase
```

### `description` (REQUIRED)

Same rules as OpenCode - must include What + When + Keywords:

```yaml
description: |
  Expert in API development for backend services.
  Creates RESTful endpoints with validation and error handling.
  Use when working on API controllers or services.
  Keywords: api, backend, rest, endpoint.
```

### `tools` (OPTIONAL)

Comma-separated list of tools:

```yaml
# Read-only
tools: Read, Grep, Glob

# Implementation
tools: Read, Write, Edit, Grep, Glob

# Full access
tools: Read, Write, Edit, Bash, Grep, Glob

# With delegation
tools: Read, Grep, Glob, Task

# Research
tools: Read, Grep, Glob, WebFetch
```

**Available Tools**:
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
| `List` | List directory contents |

### `model` (OPTIONAL)

```yaml
model: inherit   # Use conversation's model (default)
model: opus      # Claude Opus 4 - complex tasks
model: sonnet    # Claude 3.5 Sonnet - balanced
model: haiku     # Claude 3.5 Haiku - fast/simple
```

**Recommendations**:
- `inherit` - Most agents
- `opus` - Planning, complex analysis
- `haiku` - Simple, repetitive tasks

---

## Agent Types by Package (Claude Code)

### Backend API

```yaml
name: {project}-api-developer
tools: Read, Write, Edit, Grep, Glob
model: inherit
```

### Frontend Web

```yaml
name: {project}-web-developer
tools: Read, Write, Edit, Grep, Glob
model: inherit
```

### Task Planner

```yaml
name: {project}-planner
tools: Read, Grep, Glob
model: opus  # Better for complex reasoning
```

### Code Reviewer

```yaml
name: code-reviewer
tools: Read, Grep, Glob, Bash
model: inherit
```

---

## Dual Platform Generation

When both platforms are detected, generate both versions:

```
project/
├── .opencode/agent/
│   └── project-api-developer.md    # OpenCode format
└── .claude/agents/
    └── api-developer.md            # Claude Code format
```

**Important**: The system prompt (content after frontmatter) should be **identical** in both versions. Only the frontmatter changes.

### Conversion Example

**OpenCode** → **Claude Code**:

```yaml
# OpenCode
---
description: Expert in API development...
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

# Claude Code (converted)
---
name: api-developer
description: |
  Expert in API development...
  Keywords: api, backend.
tools: Read, Write, Edit, Grep, Glob
model: inherit
---
```

**Conversion Rules**:
1. Add `name` from filename (kebab-case)
2. Convert `tools` object → comma-separated string
3. Add `model: inherit`
4. Remove `mode`, `temperature`, `permission`
5. Keep system prompt identical
