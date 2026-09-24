# Agent Validation Checklist

Use this checklist to validate OpenCode agents before deployment.

---

## Pre-Validation

Before validating, ensure:
- [ ] Agent file exists in `.opencode/agent/` directory
- [ ] File has `.md` extension
- [ ] File is readable (no syntax errors)

---

## Frontmatter Validation

### Required Fields

- [ ] **description** field is present
- [ ] Description includes **what** the agent does
- [ ] Description includes **when** to use it
- [ ] Description includes **keywords** for discovery
- [ ] Description is 1-3 sentences (not too short, not too long)

### Optional Fields (if present)

- [ ] **mode** is one of: `all`, `primary`, `subagent`
- [ ] **temperature** is between 0.0 and 1.0
- [ ] **tools** section has valid tool names
- [ ] **permission** section has valid permission values

### Frontmatter Format

```yaml
# ✅ Valid frontmatter
---
description: Expert in API development. Creates endpoints and services. Use when working on backend.
mode: all
temperature: 0.2
tools:
  write: true
  edit: true
  bash: false
---

# ❌ Invalid - missing description
---
mode: all
---

# ❌ Invalid - vague description
---
description: Helps with stuff
---
```

---

## Content Structure Validation

### Title & Scope (REQUIRED)

- [ ] Has H1 title (`# Agent Name`)
- [ ] Has introductory paragraph describing expertise
- [ ] Has **SCOPE** section with explicit directory path
- [ ] Has "Use this agent when:" list
- [ ] Has keywords in scope section

```markdown
# ✅ Valid
# API Developer

You are an expert in API development...

**SCOPE**: This agent is exclusively for `packages/api` directory.
Use this agent when:
- Creating endpoints
- Keywords: "API", "backend"

# ❌ Invalid - No scope
# API Developer

You are an expert in API development...
```

### Core Technologies (REQUIRED)

- [ ] Has `## Core Technologies` section
- [ ] Lists main framework
- [ ] Lists main language
- [ ] Lists key dependencies

### Project Structure (RECOMMENDED)

- [ ] Has `## Project Structure` section
- [ ] Shows directory tree
- [ ] Includes descriptions for key directories/files

### Critical Patterns (REQUIRED)

- [ ] Has `## Critical Patterns` section
- [ ] At least 2 critical patterns documented
- [ ] Each pattern has:
  - [ ] Numbered title with (MANDATORY) or (CRITICAL)
  - [ ] **Reference** with file path
  - [ ] **ALWAYS** or **NEVER** language
  - [ ] Code example with `// ✅ CORRECT`
  - [ ] Code example with `// ❌ WRONG`
  - [ ] **Key Points** list

### Quality Requirements (REQUIRED)

- [ ] Has `## Quality Requirements` section
- [ ] Uses ✅ prefix for each requirement
- [ ] At least 3 requirements listed

### Common Mistakes (REQUIRED)

- [ ] Has `## Common Mistakes` section
- [ ] Uses ❌ prefix or numbered list
- [ ] Each mistake has explanation of why it's wrong
- [ ] At least 3 mistakes listed

### Best Practices (REQUIRED)

- [ ] Has `## Best Practices` section
- [ ] Uses ✅ prefix or numbered list
- [ ] Each practice has explanation of why it's recommended
- [ ] At least 3 practices listed

---

## Code Examples Validation

### Completeness

- [ ] All code examples have imports
- [ ] All code examples have type annotations
- [ ] Examples are complete and runnable
- [ ] No placeholder comments like `// TODO` or `// ...`

### Format

- [ ] Uses TypeScript code blocks (```typescript)
- [ ] Shows both correct (✅) and wrong (❌) approaches
- [ ] Indentation is consistent
- [ ] No trailing whitespace

### Correctness

- [ ] Import paths match project structure
- [ ] Type names exist in the project
- [ ] Patterns match actual project conventions

---

## File References Validation

- [ ] All `**Reference**:` paths are absolute from project root
- [ ] Referenced files actually exist
- [ ] References are up-to-date with current codebase
- [ ] No broken links

```markdown
# ✅ Valid references
**Reference**: `packages/api/src/modules/clients/clients.service.ts`
**Reference Example**: `packages/app/src/features/clients/hooks/use-clients.ts`

# ❌ Invalid references
**Reference**: `./clients.service.ts`  # Relative path
**Reference**: `src/modules/clients/clients.service.ts`  # Missing packages/api
```

---

## Consistency Validation

### Across All Agents

- [ ] Uses same emphasis keywords (CRITICAL, MANDATORY, IMPORTANT)
- [ ] Uses same example format (✅ CORRECT / ❌ WRONG)
- [ ] Uses same reference format (`**Reference**: \`path\``)
- [ ] Has same section order
- [ ] Uses same list formatting

### Package-Specific

- [ ] Agent scope matches package boundaries
- [ ] No overlap with other agents' scopes
- [ ] Complements rather than duplicates other agents

---

## Quick Validation Commands

```bash
# Check frontmatter syntax
head -20 .opencode/agent/{agent-name}.md

# Verify file references exist
grep -o '`packages/[^`]*`' .opencode/agent/{agent-name}.md | while read path; do
  clean_path=$(echo $path | tr -d '`')
  if [ ! -e "$clean_path" ]; then
    echo "Missing: $clean_path"
  fi
done

# Check for required sections
grep -E "^## (Core Technologies|Critical Patterns|Quality Requirements|Common Mistakes|Best Practices)" .opencode/agent/{agent-name}.md

# Validate YAML frontmatter
head -n $(grep -n "^---$" .opencode/agent/{agent-name}.md | sed -n '2p' | cut -d: -f1) .opencode/agent/{agent-name}.md | tail -n +2
```

---

## Validation Report Template

After validation, generate a report:

```markdown
# Agent Validation Report: {agent-name}.md

## Status: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL

## Frontmatter
- [x] description present
- [x] keywords included
- [x] mode valid

## Structure
- [x] Title & Scope
- [x] Core Technologies
- [x] Critical Patterns (3 found)
- [ ] ⚠️ Project Structure missing

## Content Quality
- [x] Code examples complete
- [x] File references valid
- [ ] ⚠️ Missing 1 best practice

## Issues Found
1. Missing `## Project Structure` section
2. Only 2 best practices (need 3+)

## Recommendations
1. Add project structure section
2. Add 1 more best practice
```

---

## Validation Priority

### Must Fix (Blocking)

1. Missing or vague description
2. No Critical Patterns section
3. No Common Mistakes section
4. No Best Practices section
5. Broken file references

### Should Fix (Important)

1. Missing Project Structure
2. Incomplete code examples
3. Less than 3 items in required sections
4. Inconsistent formatting

### Nice to Have (Optional)

1. More detailed explanations
2. Additional examples
3. Development workflow section
4. Cross-references to other agents
