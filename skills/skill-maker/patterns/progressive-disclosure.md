# Progressive Disclosure

How to organize skill content for efficient context management.

---

## The Problem: Context Bloat

Every piece of information in Claude's context window consumes tokens:

- System prompt
- Conversation history
- All skill metadata
- Your actual request
- Responses

**Traditional approach** (everything upfront):
```
System load:
- Skill A full content (5k tokens)
- Skill B full content (5k tokens)
- Skill C full content (5k tokens)
= 15k tokens consumed before you even start
```

**Progressive disclosure** (load on-demand):
```
System load:
- Skill A metadata (100 tokens)
- Skill B metadata (100 tokens)
- Skill C metadata (100 tokens)
= 300 tokens

When Skill A triggers:
+ Skill A instructions (5k tokens)
= 5.3k total
```

---

## Three-Level Architecture

### Level 1: Metadata (Always Loaded)

**Content**: YAML frontmatter only

```yaml
---
name: pdf-processing
description: Extract text and tables from PDFs, fill forms, merge documents.
  Use when working with PDF files. Keywords: pdf, forms, extract, merge.
---
```

**Token cost**: ~100 tokens per skill  
**When loaded**: Always (in system prompt)  
**Purpose**: Skill discovery

### Level 2: Instructions (Loaded When Triggered)

**Content**: SKILL.md body

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
**When loaded**: When skill is triggered  
**Purpose**: Core instructions

### Level 3: Resources (Loaded On-Demand)

**Content**: Referenced files

```markdown
# references/forms.md (only loaded if Claude reads it)

## PDF Form Filling

### Supported field types
1. Text fields: Single or multi-line text
2. Checkboxes: Boolean selections
3. Radio buttons: Exclusive choices
...
```

**Token cost**: 0 until accessed (then varies)  
**When loaded**: When Claude explicitly reads the file  
**Purpose**: Detailed documentation

### Level 4: Script Execution (Output Only)

**Content**: Python/bash scripts

```python
# analyze_form.py
# This code NEVER enters context

import sys
from pypdf import PdfReader

def analyze_form(pdf_path):
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()
    return fields

if __name__ == "__main__":
    result = analyze_form(sys.argv[1])
    print(json.dumps(result))
```

**Token cost**: Output only (~100-500 tokens)  
**When loaded**: Never (only output enters context)  
**Purpose**: Deterministic operations

---

## Implementation Patterns

### Pattern 1: High-Level Guide with References

**Use when**: Skill has multiple distinct areas

**SKILL.md** (~200 lines):
```markdown
---
name: pdf-toolkit
description: PDF processing toolkit...
---

# PDF Toolkit

## Quick start
[Basic example]

## Operations

**Text extraction**: See [EXTRACTION.md](EXTRACTION.md)
**Form filling**: See [references/forms.md](references/forms.md)
**Document merging**: See [references/merging.md](references/merging.md)

## Utility scripts
- `analyze_form.py`: Extract form fields
- `fill_form.py`: Fill PDF forms
- `merge_pdfs.py`: Combine PDFs
```

**Benefits**:
- SKILL.md stays concise
- Load only needed sections
- Easy to expand

### Pattern 2: Domain-Specific Organization

**Use when**: Skill covers multiple business domains

**Structure**:
```
bigquery-skill/
├── SKILL.md
└── references/
    ├── finance.md      # Revenue, billing metrics
    ├── sales.md        # Opportunities, pipeline
    ├── product.md      # API usage, features
    └── marketing.md    # Campaigns, attribution
```

**SKILL.md** (~150 lines):
```markdown
# BigQuery Data Analysis

## Available datasets

**Finance**: Revenue, ARR, billing  
→ See [references/finance.md](references/finance.md)

**Sales**: Opportunities, pipeline, accounts  
→ See [references/sales.md](references/sales.md)

**Product**: API usage, features, adoption  
→ See [references/product.md](references/product.md)

**Marketing**: Campaigns, attribution, email  
→ See [references/marketing.md](references/marketing.md)

## Quick search
Find specific metrics using grep:
```bash
grep -i "revenue" references/finance.md
grep -i "pipeline" references/sales.md
```
```

**Benefits**:
- Users typically need one domain at a time
- No cross-domain token waste
- Easy to maintain

### Pattern 3: Conditional Details

**Use when**: Advanced features are rarely needed

**SKILL.md**:
```markdown
# Document Processing

## Creating documents
Use docx-js for new documents. Basic usage:
```python
from docx_js import Document
doc = Document()
doc.add_paragraph("Hello")
doc.save("output.docx")
```

## Editing documents

### Simple edits
For basic text changes, use docx-js directly.

### Advanced editing
**For tracked changes**: See [references/redlining.md](references/redlining.md)  
**For OOXML details**: See [references/ooxml.md](references/ooxml.md)  
**For form fields**: See [references/forms.md](references/forms.md)
```

**Benefits**:
- Most users need only basic instructions
- Advanced content loads only when needed
- Clear path to deeper information

---

## Optimizing SKILL.md Size

### Target: Under 500 Lines

**Why 500 lines?**
- Optimal performance
- Fits comfortably in context
- Fast to load and parse

**When approaching 500 lines:**

1. **Identify extraction candidates**:
   - Detailed API documentation
   - Long example sections
   - Reference tables
   - Troubleshooting guides

2. **Extract to separate files**:
   ```markdown
   # Before (in SKILL.md)
   ## API Reference
   [100 lines of API docs]
   
    # After (in SKILL.md)
    ## API Reference
    See [references/api.md](references/api.md)
    ```

3. **Keep in SKILL.md**:
   - Overview (2-3 paragraphs)
   - Quick start (< 10 lines)
   - Common patterns (brief examples)
   - Navigation to references

---

## Reference Organization

### Flat Structure

```
skill/
├── SKILL.md
├── quick-start.md
├── advanced.md
├── api-reference.md
└── examples.md
```

**Use when**:
- Few reference files (< 5)
- Files are independent
- No clear categorization

### Hierarchical Structure

```
skill/
├── SKILL.md
└── references/
    ├── domain-a.md
    ├── domain-b.md
    └── domain-c.md
```

**Use when**:
- Many reference files (5+)
- Clear categories
- Domain-specific organization

### By Resource Type

```
skill/
├── SKILL.md
├── references/         # Documentation
├── examples/           # Code samples
├── templates/          # Boilerplate
└── scripts/            # Utilities
```

**Use when**:
- Multiple types of resources
- Clear separation of concerns
- Large skill with many files

---

## Reference Depth Rules

### ❌ Deep Nesting (Avoid)

```markdown
# SKILL.md
See [intro.md](intro.md)

# intro.md
See [details.md](details.md)

# details.md  
See [advanced.md](advanced.md)  # Claude may not reach here
```

**Problem**: Claude may not follow chains

### ✅ One Level Deep (Good)

```markdown
# SKILL.md

## Documentation
- **Introduction**: [intro.md](intro.md)
- **Details**: [details.md](details.md)
- **Advanced**: [advanced.md](advanced.md)

All linked directly from SKILL.md
```

**Benefits**: Clear navigation, reliable access

---

## Making References Discoverable

### Bad: Buried References

```markdown
Some text here, and more text, and even more text, and then
somewhere in the middle we mention that advanced features are
in another file but it's not very clear or prominent.
```

### Good: Prominent Navigation

```markdown
## Advanced Features

For detailed information:
- **Form filling**: [references/forms.md](references/forms.md)
- **API reference**: [references/api.md](references/api.md)
- **Examples**: [examples.md](examples.md)
```

### Better: Contextual References

```markdown
## Form Filling

Basic usage:
```python
fill_form(pdf, data)
```

For advanced features including validation and error handling,
see [FORMS.md](FORMS.md).
```

---

## Content Tables for Long Files

When reference files are long (> 300 lines), add a table of contents:

```markdown
# API Reference

## Contents
- [Authentication](#authentication)
- [Core Methods](#core-methods)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Authentication

...

## Core Methods

...
```

**Benefits**:
- Claude can jump to sections
- Users can scan quickly
- Better organization

---

## Script Integration

### Scripts Never Load (Efficient!)

```python
# validate_form.py
# This code NEVER enters Claude's context

def validate_form(fields):
    errors = []
    for field, value in fields.items():
        if not value:
            errors.append(f"Missing: {field}")
    return errors

if __name__ == "__main__":
    # Run validation
    result = validate_form(data)
    print(json.dumps(result))
```

**When run**: `python scripts/validate_form.py fields.json`

**Token cost**:
- Script code: 0 tokens (never loaded)
- Output only: ~100 tokens

### Clear Execution vs Reference

**For execution** (most common):
```markdown
## Validation

Run the validation script:
```bash
python scripts/validate_form.py fields.json
```

This checks all fields and reports errors.
```

**For reference** (understanding logic):
```markdown
## Validation Algorithm

The validation logic is implemented in `scripts/validate_form.py`.
Read this file to understand the validation rules.
```

---

## Measuring Effectiveness

### Indicators of Good Progressive Disclosure

✅ **SKILL.md under 500 lines**  
✅ **Most tasks don't need reference files**  
✅ **Reference files load only when relevant**  
✅ **Scripts output concise results**  
✅ **No deeply nested references**

### Indicators of Poor Progressive Disclosure

❌ **SKILL.md over 1000 lines**  
❌ **All content in one file**  
❌ **References never used (should be in SKILL.md)**  
❌ **References always used (should be in SKILL.md)**  
❌ **Scripts generate verbose output**

---

## Evolution Example

### Stage 1: Everything in SKILL.md

```
skill/
└── SKILL.md        # 800 lines, getting unwieldy
```

### Stage 2: Extract Examples

```
skill/
├── SKILL.md        # 600 lines
└── examples.md     # 200 lines
```

### Stage 3: Extract Reference

```
skill/
├── SKILL.md        # 400 lines
├── examples.md     # 200 lines
└── reference.md    # 200 lines
```

### Stage 4: Organize by Domain

```
skill/
├── SKILL.md        # 300 lines
├── examples.md
└── references/
    ├── domain-a.md # 150 lines
    ├── domain-b.md # 150 lines
    └── domain-c.md # 150 lines
```

### Stage 5: Add Scripts

```
skill/
├── SKILL.md        # 250 lines (removed procedural details)
├── examples.md
├── references/
└── scripts/
    ├── helper.py
    └── validator.py
```

**Key**: Each stage solves a specific problem, evolve based on needs

---

## Testing Progressive Disclosure

### Test 1: Simple Task

**Task**: "Do basic operation"

**Expected**:
- Loads SKILL.md only
- No reference files accessed
- Completes successfully

**If fails**: Basic instructions not clear enough in SKILL.md

### Test 2: Advanced Task

**Task**: "Do advanced operation"

**Expected**:
- Loads SKILL.md
- Loads relevant reference file
- Doesn't load unrelated references
- Completes successfully

**If fails**: References not discoverable or too nested

### Test 3: Script Task

**Task**: "Run validation"

**Expected**:
- Loads SKILL.md
- Executes script
- Only script output in context (not code)

**If fails**: Unclear whether to run or read script

---

## Checklist: Good Progressive Disclosure

- [ ] SKILL.md under 500 lines
- [ ] References one level deep from SKILL.md
- [ ] Reference files have clear, descriptive names
- [ ] Common tasks don't need reference files
- [ ] Advanced tasks load only relevant references
- [ ] Scripts produce concise output
- [ ] Execution vs reference intent is clear
- [ ] Long files have table of contents
- [ ] Navigation is prominent, not buried
- [ ] Most users don't load all content

---

## Anti-Patterns

### ❌ Monolithic SKILL.md

```
skill/
└── SKILL.md        # 2000 lines of everything
```

**Problem**: Loads everything even for simple tasks

### ❌ Over-Fragmented

```
skill/
├── SKILL.md        # 50 lines, mostly links
├── intro.md        # 20 lines
├── part1.md        # 30 lines
├── part2.md        # 30 lines
├── part3.md        # 30 lines
└── conclusion.md   # 20 lines
```

**Problem**: Overhead of loading many small files

### ❌ Deeply Nested

```markdown
# SKILL.md → intro.md → details.md → advanced.md
```

**Problem**: Claude may not follow full chain

---

## Summary

**Progressive disclosure = Efficient context management**

| Level | Content | Load Time | Token Cost |
|-------|---------|-----------|------------|
| 1 | Metadata | Always | ~100 |
| 2 | SKILL.md | When triggered | ~2-5k |
| 3 | References | On-demand | Varies |
| 4 | Scripts | Execution only | Output only |

**Goal**: Load minimum content needed for each task

**Benefits**:
- Faster responses
- More skills can coexist
- Better long-running conversations
- Lower token costs
