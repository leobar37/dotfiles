# Skills

Skills are self-contained capability packages loaded on-demand.

Pi implements the [Agent Skills standard](https://agentskills.io/specification).

## Locations

Pi loads skills from:

| Location | Scope |
|----------|-------|
| `~/.pi/agent/skills/` | Global |
| `~/.agents/skills/` | Global |
| `.pi/skills/` | Project |
| `.agents/skills/` | Project (cwd and ancestors) |
| Packages | `skills/` directories or `pi.skills` in package.json |
| Settings | `skills` array |
| CLI | `--skill <path>` |

Discovery rules:
- Root `.md` files in `~/.pi/agent/skills/` and `.pi/skills/`
- `SKILL.md` in directories (recursive)
- Root `.md` files ignored in `~/.agents/skills/` and `.agents/skills/`

Disable with `--no-skills`.

## How Skills Work

1. Startup: pi scans locations, extracts names/descriptions
2. System prompt includes available skills in XML format
3. When task matches, agent loads full SKILL.md
4. Agent follows instructions, uses relative paths for scripts/assets

## Skill Structure

```
my-skill/
├── SKILL.md              # Required: frontmatter + instructions
├── scripts/              # Helper scripts
│   └── process.sh
├── references/           # Detailed docs
│   └── api-reference.md
└── assets/
    └── template.json
```

### SKILL.md Format

```markdown
---
name: my-skill
description: What this skill does and when to use it. Be specific.
---

# My Skill

## Setup

Run once before first use:
```bash
cd /path/to/skill && npm install
```

## Usage

```bash
./scripts/process.sh <input>
```
```

## Frontmatter

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars, lowercase a-z, 0-9, hyphens |
| `description` | Yes | Max 1024 chars, what + when |
| `license` | No | License name or file |
| `compatibility` | No | Max 500 chars, env requirements |
| `metadata` | No | Key-value mapping |
| `allowed-tools` | No | Pre-approved tools (experimental) |
| `disable-model-invocation` | No | Hide from system prompt |

### Name Rules

- 1-64 characters
- Lowercase letters, numbers, hyphens only
- No leading/trailing hyphens
- No consecutive hyphens
- Must match parent directory

### Description Best Practices

**Good**:
```yaml
description: Extract text and tables from PDF files, fills forms, merges PDFs. Use when working with PDF documents.
```

**Poor**:
```yaml
description: Helps with PDFs.
```

## Skill Commands

Skills register as `/skill:name` commands:

```bash
/skill:brave-search           # Load and execute
/skill:pdf-tools extract      # With arguments
```

Toggle via settings:
```json
{ "enableSkillCommands": true }
```

## Using Skills from Other Harnesses

Add directories to settings:

```json
{
  "skills": [
    "~/.claude/skills",
    "~/.codex/skills"
  ]
}
```

## Validation

Pi validates against Agent Skills standard:
- Name doesn't match directory
- Name exceeds 64 chars or invalid
- Description exceeds 1024 chars

Most issues produce warnings. Missing description = not loaded.

## Example

```
brave-search/
├── SKILL.md
├── search.js
└── content.js
```

**SKILL.md:**
```markdown
---
name: brave-search
description: Web search via Brave API. Use for searching docs, facts, web content.
---

# Brave Search

## Setup

```bash
cd /path/to/brave-search && npm install
```

## Search

```bash
./search.js "query"              # Basic
./search.js "query" --content    # With page content
```

## Extract

```bash
./content.js https://example.com
```
```

## Skill Repositories

- [Anthropic Skills](https://github.com/anthropics/skills)
- [Pi Skills](https://github.com/badlogic/pi-skills)
