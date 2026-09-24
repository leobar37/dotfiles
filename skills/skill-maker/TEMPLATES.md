# Skill Templates

Basic templates for creating new skills.

## Basic Skill Template

```yaml
---
name: your-skill-name
description: [What it does] + [When to use it] + [Trigger keywords]. Use when [specific scenarios].
allowed-tools: Read, Write, Bash  # Optional
---

# Your Skill Name

## Purpose
[Clear purpose statement]

## Instructions
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Examples
[Concrete code/usage examples]

## Best Practices
- [Practice 1]
- [Practice 2]
```

## Read-Only Skill Template

```yaml
---
name: safe-analyzer
description: Analyze code without modifications. Use for code review and security audits.
allowed-tools: Read, Grep, Glob, Bash
---

# Safe Analyzer

You can read files and run read-only commands, but cannot modify files.

## Allowed Operations
- Read source files
- Search patterns with grep
- List directory contents
- Run read-only git commands (git log, git diff)

## Restricted
- No file modifications
- No write operations
```

## Progressive Disclosure Template

```markdown
---
name: your-skill
description: Brief description. Use when [specific scenarios].
---

# Your Skill

## Quick Start
[Basic example to get started]

For advanced usage, see [ADVANCED.md](ADVANCED.md).
For complete reference material, see [references/api.md](references/api.md).
```

## Validation Checklist

Before finalizing any skill, verify:

### YAML Frontmatter
- [ ] Opening `---` on line 1
- [ ] Closing `---` before markdown content
- [ ] `name` field: lowercase, hyphens, max 64 chars
- [ ] `description` field: includes what, when, and triggers (max 1024 chars)
- [ ] `allowed-tools` (if used): valid tool names, comma-separated
- [ ] No tabs (use spaces for indentation)
- [ ] Valid YAML syntax

### Description Quality
- [ ] Specific, not vague
- [ ] Includes trigger keywords
- [ ] Explains BOTH what it does AND when to use it
- [ ] Under 1024 characters

### File Structure
- [ ] Skill directory exists in correct location (`.claude/skills/` by default)
- [ ] `SKILL.md` file present (required)
- [ ] `references/` exists when the skill needs repo knowledge or advanced docs
- [ ] Additional files referenced correctly (relative paths)
- [ ] Scripts have execute permissions if needed

### Content Quality
- [ ] Clear, actionable instructions
- [ ] Concrete code examples
- [ ] Focused on single capability
- [ ] Best practices documented
