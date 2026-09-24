# Skill Structure

Complete anatomy of a Claude Code skill.

---

## Minimal Structure (Required)

The absolute minimum is a single file:

```
my-skill/
└── SKILL.md        # Only required file
```

**SKILL.md must contain:**
```yaml
---
name: my-skill-name
description: What it does. When to use. Keywords: k1, k2.
---
```

---

## Standard Structure (Recommended)

For most skills, this structure works well:

```
my-skill/
├── SKILL.md                 # Entry point (< 500 lines)
├── references/              # Detailed documentation
│   └── overview.md
├── examples.md              # Usage examples
└── templates/
    └── template.txt         # Boilerplate
```

**When to use:**
- Skill has multiple sections of content
- You want to keep SKILL.md concise
- You have examples or templates

**Examples convention:**
- Use `examples.md` when a single examples file is enough
- Use `examples/` when you need multiple example files grouped by topic

---

## Expert Structure (Complex)

For domain-specific skills with extensive knowledge:

```
bigquery-skill/
├── SKILL.md                 # Overview + navigation
├── references/              # Domain-organized docs
│   ├── finance.md          # Revenue metrics
│   ├── sales.md            # Pipeline data
│   ├── product.md          # Usage analytics
│   └── marketing.md        # Campaign data
├── scripts/                 # Utility scripts
│   ├── query_builder.py
│   └── validate_sql.py
└── templates/
    ├── revenue_query.sql
    └── pipeline_report.sql
```

**When to use:**
- Skill covers multiple domains
- Extensive reference documentation
- Custom utilities needed

---

## Structure with Executable Code

For skills that include deterministic operations:

```
pdf-skill/
├── SKILL.md                 # Instructions
├── references/
│   ├── forms.md            # Form filling guide
│   └── api.md              # API reference
├── examples.md             # Usage examples
└── scripts/
    ├── analyze_form.py      # Extract form fields
    ├── fill_form.py         # Fill PDF forms
    └── validate.py          # Verify output
```

**Scripts considerations:**
- Script code never loads into context (efficient)
- Only script output consumes tokens
- Make scripts self-documenting
- Handle errors explicitly

---

## Directory Organization Patterns

### By Domain

```
skill/
├── SKILL.md
└── references/
    ├── domain-a.md
    ├── domain-b.md
    └── domain-c.md
```

**Use when:**
- Skill covers distinct domains
- Each domain is independent
- Users typically need one domain at a time

### By Feature

```
skill/
├── SKILL.md
├── quick-start.md
├── advanced-features.md
└── troubleshooting.md
```

**Use when:**
- Progressive learning path
- Features build on each other
- Users start simple, go deeper

### By Resource Type

```
skill/
├── SKILL.md
├── references/             # Documentation
├── examples/               # Code samples
├── templates/              # Boilerplate
└── scripts/                # Utilities
```

**Use when:**
- Multiple resource types
- Clear separation of concerns
- Easy to find specific content

**Examples convention:** use `examples/` only when the skill has multiple example documents. Otherwise prefer `examples.md`.

---

## File Naming Conventions

### SKILL.md (Required)

- Must be exactly `SKILL.md` (uppercase)
- Located at skill root
- Contains YAML frontmatter

### Reference Files

Store advanced or repo-specific knowledge in `references/`.

**Good names** (descriptive):
- `form_validation_rules.md`
- `api_reference.md`
- `common_patterns.md`
- `error_handling.md`

**Bad names** (vague):
- `doc1.md`
- `file2.md`
- `notes.md`
- `misc.md`

### Scripts

**Good names** (action-oriented):
- `analyze_form.py`
- `validate_input.py`
- `generate_report.py`

**Bad names**:
- `script1.py`
- `helper.py`
- `utils.py`

### Templates

**Good names** (purpose-clear):
- `api_endpoint_template.ts`
- `react_component_template.tsx`
- `test_suite_template.py`

---

## SKILL.md Structure

### Anatomy of a Good SKILL.md

```markdown
---
name: skill-name
description: |
  What it does. When to use. Keywords: k1, k2, k3.
---

# Skill Title

Brief overview (1-2 paragraphs).

## Quick Start

Minimal working example to get started.

## Core Concepts

Key ideas users need to understand.

## Common Patterns

Frequently used workflows:

**Pattern 1**: Description
[Quick example or reference]

**Pattern 2**: Description
[Quick example or reference]

## Advanced Topics

For detailed info:
- **Topic A**: See [references/topic-a.md](references/topic-a.md)
- **Topic B**: See [references/topic-b.md](references/topic-b.md)

## Utility Scripts

Available scripts:
- `analyze.py`: [What it does]
- `validate.py`: [What it does]

## Examples

See [examples.md](examples.md) for complete examples.
```

### Section Guidelines

**Overview** (Always include):
- 1-2 paragraphs
- What the skill provides
- When to use it

**Quick Start** (Highly recommended):
- Minimal working example
- Gets users productive immediately
- No more than 10 lines

**Core Concepts** (If needed):
- Key ideas
- Terminology
- Mental models

**Common Patterns** (Most useful):
- Frequently used workflows
- Include brief examples
- Reference detailed docs

**Advanced Topics** (Progressive disclosure):
- Link to reference files
- One level deep
- Descriptive link text

**Utility Scripts** (If applicable):
- List available scripts
- Brief description
- Usage examples

---

## Progressive Disclosure Strategy

### Level 1: Metadata (Always Loaded)

```yaml
---
name: pdf-processing
description: Extract text and tables from PDFs, fill forms, merge documents.
  Use when working with PDF files. Keywords: pdf, forms, extract, merge.
---
```

**Token cost**: ~100 tokens

### Level 2: SKILL.md Body (Loaded When Triggered)

```markdown
# PDF Processing

## Quick start
Extract text with pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

## Advanced features
**Form filling**: See [references/forms.md](references/forms.md)
**API reference**: See [references/api.md](references/api.md)
```

**Token cost**: ~2-5k tokens

### Level 3: Reference Files (Loaded On-Demand)

Only loaded when Claude explicitly reads them:

```markdown
# references/forms.md (not loaded until needed)

## PDF Form Filling

### Field types
1. Text fields
2. Checkboxes
3. Radio buttons
...
```

**Token cost**: 0 until accessed

### Level 4: Script Output (Execution Only)

```python
# analyze_form.py
# This code NEVER enters context

def analyze_form(pdf_path):
    # Extract fields...
    return json.dumps(fields)
```

When run: `python analyze_form.py input.pdf`

**Token cost**: Output only (~100-500 tokens)

---

## Size Guidelines

| File | Recommended Size | Why |
|------|-----------------|-----|
| SKILL.md | < 500 lines | Optimal performance |
| Reference files | No strict limit | Loaded on-demand |
| Scripts | Keep focused | Maintainability |
| Templates | As needed | Not loaded by default |

**When SKILL.md exceeds 500 lines:**
1. Move detailed sections to `references/`
2. Keep overview and navigation in SKILL.md
3. Link to moved content

---

## Path Conventions

**Always use forward slashes** (cross-platform):

```markdown
✅ Good:
- [Reference](references/guide.md)
- See `scripts/helper.py`

❌ Bad:
- [Reference](references\guide.md)
- See `scripts\helper.py`
```

**Relative paths from SKILL.md**:

```
my-skill/
├── SKILL.md                    # Base
├── references/
│   └── api.md                  # ./references/api.md
└── scripts/
    └── helper.py               # ./scripts/helper.py
```

---

## Reference Depth Rules

**Keep references ONE LEVEL DEEP** from SKILL.md:

```markdown
# SKILL.md

✅ Good (one level):
See [advanced.md](advanced.md) for details
See [references/api.md](references/api.md)

❌ Bad (nested):
See [intro.md](intro.md)
  # intro.md links to [details.md](details.md)
    # details.md links to [more.md](more.md)
```

**Why?** Claude may not follow nested references completely.

**Solution:** Reference all files directly from SKILL.md:

```markdown
# SKILL.md

## Documentation
- **Introduction**: [intro.md](intro.md)
- **Details**: [details.md](details.md)
- **Advanced**: [advanced.md](advanced.md)
```

---

## Checklist: Good Structure

- [ ] SKILL.md exists at root
- [ ] YAML frontmatter complete (name + description)
- [ ] SKILL.md under 500 lines
- [ ] References one level deep from SKILL.md
- [ ] Descriptive file names
- [ ] Forward slashes in paths
- [ ] Scripts in separate directory
- [ ] Templates separate from instructions
- [ ] Clear organization (domain/feature/resource)
- [ ] Progressive disclosure implemented

---

## Anti-Patterns

### ❌ Monolithic SKILL.md

```
my-skill/
└── SKILL.md        # 2000 lines of everything
```

**Problem**: Loads all content even when only subset needed

**Fix**: Split into SKILL.md + `references/`

### ❌ Deeply Nested References

```markdown
# SKILL.md
See [start.md](start.md)

# start.md
See [middle.md](middle.md)

# middle.md
See [end.md](end.md)  # Claude may not reach here
```

**Fix**: Reference all from SKILL.md

### ❌ Vague File Names

```
my-skill/
├── SKILL.md
├── doc1.md         # What is this?
├── doc2.md         # What is this?
└── file.md         # What is this?
```

**Fix**: Use descriptive names

### ❌ Mixed Concerns

```
my-skill/
├── SKILL.md
└── everything.md   # Instructions + examples + API docs
```

**Fix**: Separate by concern

---

## Evolution Strategy

### Stage 1: Start Minimal

```
my-skill/
└── SKILL.md        # Everything in one file
```

### Stage 2: Add Examples

```
my-skill/
├── SKILL.md        # Core instructions
└── examples.md     # Working examples
```

### Stage 3: Extract Reference

```
my-skill/
├── SKILL.md        # Overview + navigation
├── examples.md
└── references/
    └── overview.md # Detailed docs
```

### Stage 4: Organize by Domain

```
my-skill/
├── SKILL.md
├── examples.md
└── references/
    ├── domain-a.md
    ├── domain-b.md
    └── domain-c.md
```

### Stage 5: Add Scripts

```
my-skill/
├── SKILL.md
├── examples.md
├── references/
└── scripts/
    └── helper.py
```

**Key**: Evolve based on actual needs, don't over-engineer upfront
