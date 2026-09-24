# Anti-Patterns

Common mistakes to avoid when creating Claude Code skills.

---

## 1. Vague Description

### ❌ Problem

```yaml
---
name: helper
description: Helps with code
---
```

**Why it's bad**:
- Claude can't discover when to use it
- No keywords for matching
- Doesn't explain what it does

### ✅ Solution

```yaml
---
name: python-formatter
description: |
  Python code formatter. Applies PEP 8 style, fixes imports, adds type hints.
  Use when cleaning up Python files.
  Keywords: python, format, pep8, black, style, imports, type hints.
---
```

---

## 2. Monolithic SKILL.md

### ❌ Problem

```
my-skill/
└── SKILL.md        # 2000 lines, everything in one file
```

**Why it's bad**:
- Loads all content even for simple tasks
- Consumes unnecessary tokens
- Hard to maintain
- Slow to load

### ✅ Solution

```
my-skill/
├── SKILL.md        # 300 lines, overview + navigation
├── references/
│   ├── domain-a.md
│   └── domain-b.md
└── examples.md
```

Use progressive disclosure - load only what's needed.

---

## 3. Deeply Nested References

### ❌ Problem

```markdown
# SKILL.md
See [intro.md](intro.md)

# intro.md
See [details.md](details.md)

# details.md
See [advanced.md](advanced.md)  # Claude may not reach here
```

**Why it's bad**:
- Claude may not follow full chain
- User gets lost
- Poor navigation

### ✅ Solution

```markdown
# SKILL.md

## Documentation
- **Introduction**: [intro.md](intro.md)
- **Details**: [details.md](details.md)
- **Advanced**: [advanced.md](advanced.md)

All linked directly from SKILL.md (one level deep)
```

---

## 4. Verbose Instructions

### ❌ Problem

```markdown
## Extract PDF text

PDF (Portable Document Format) files are a common file format that
contains text, images, and other content. To extract text from a PDF,
you'll need to use a library. There are many libraries available for
PDF processing, but we recommend pdfplumber because it's easy to use
and handles most cases well. First, you'll need to install it using
pip. Then you can use the code below...

[150 tokens wasted]
```

**Why it's bad**:
- Bloats context window
- Delays getting to useful info
- Claude already knows basics

### ✅ Solution

```markdown
## Extract PDF text

Use pdfplumber:
```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```

[50 tokens, gets straight to the point]
```

---

## 5. Vague File Names

### ❌ Problem

```
my-skill/
├── SKILL.md
├── doc1.md         # What is this?
├── doc2.md         # What is this?
├── file.md         # What is this?
└── misc.md         # What is this?
```

**Why it's bad**:
- Can't tell what files contain
- Hard to navigate
- Poor organization

### ✅ Solution

```
my-skill/
├── SKILL.md
├── api_reference.md
├── form_validation.md
├── common_patterns.md
└── troubleshooting.md
```

Descriptive names make purpose clear.

---

## 6. Wrong Point of View

### ❌ Problem

```yaml
# First person
description: I can help you process Excel files

# Second person
description: You can use this to process Excel
```

**Why it's bad**:
- Description goes into system prompt
- Inconsistent POV causes confusion

### ✅ Solution

```yaml
# Third person
description: Processes Excel files and generates reports
```

---

## 7. No Keywords in Description

### ❌ Problem

```yaml
description: Creates database migrations
```

**Why it's bad**:
- Claude can't discover skill
- No trigger words
- Won't activate when needed

### ✅ Solution

```yaml
description: |
  Database migration expert. Creates Drizzle/Prisma migrations,
  handles schema changes. Use for database work.
  Keywords: migration, schema, database, drizzle, prisma, sql, alter.
```

---

## 8. Windows-Style Paths

### ❌ Problem

```markdown
See [reference](reference\api.md)
Run `python scripts\helper.py`
```

**Why it's bad**:
- Breaks on Linux/Mac
- Not cross-platform
- Poor practice

### ✅ Solution

```markdown
See [reference](references/api.md)
Run `python scripts/helper.py`
```

Always use forward slashes.

---

## 9. Time-Sensitive Information

### ❌ Problem

```markdown
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

**Why it's bad**:
- Becomes wrong after date
- Requires constant updates
- Causes confusion

### ✅ Solution

```markdown
## Current method
Use the v2 API endpoint: `api.example.com/v2`

## Old patterns
Legacy v1 API (deprecated August 2025):
The v1 API used `api.example.com/v1`
This endpoint is no longer supported.
```

---

## 10. Too Many Options

### ❌ Problem

```markdown
You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image,
or pypdf2, or pdfrw, or camelot, or tabula-py...
```

**Why it's bad**:
- Overwhelming
- No clear guidance
- Analysis paralysis

### ✅ Solution

```markdown
Use pdfplumber for text extraction:
```python
import pdfplumber
```

For scanned PDFs requiring OCR, use pdf2image with pytesseract instead.
```

Provide sensible default, with escape hatch.

---

## 11. No Quick Start

### ❌ Problem

```markdown
---
name: my-skill
description: Does stuff
---

# My Skill

[Immediately dives into complex concepts]
[No basic example]
[User has to read 300 lines before trying anything]
```

**Why it's bad**:
- User can't get started quickly
- No immediate value
- Frustrating experience

### ✅ Solution

```markdown
---
name: my-skill
description: Brief description
---

# My Skill

## Quick Start

[Minimal working example in < 10 lines]

```code
[actual working code]
```

Now you can do X. For advanced features, see below.
```

---

## 12. Inconsistent Terminology

### ❌ Problem

Uses different terms for same thing:

- "API endpoint" / "URL" / "API route" / "path"
- "field" / "box" / "element" / "control"
- "extract" / "pull" / "get" / "retrieve"

**Why it's bad**:
- Confusing
- Hard to search
- Unprofessional

### ✅ Solution

Pick one term and use consistently:

- Always "API endpoint"
- Always "field"
- Always "extract"

---

## 13. Pseudocode Instead of Real Code

### ❌ Problem

```python
# Get the data
data = getData()

# Process it
result = processData(data)

# Return something
return result
```

**Why it's bad**:
- Not executable
- Doesn't help user
- Wastes context

### ✅ Solution

```python
import requests

def fetch_user(user_id: int) -> dict:
    response = requests.get(f"https://api.example.com/users/{user_id}")
    response.raise_for_status()
    return response.json()

user = fetch_user(123)
print(user['name'])
```

Real, working, complete code.

---

## 14. Missing Error Handling

### ❌ Problem

```python
def process_file(path):
    return open(path).read()  # Just fail if anything wrong
```

**Why it's bad**:
- Unhelpful error messages
- No guidance on recovery
- Poor user experience

### ✅ Solution

```python
def process_file(path):
    """Process a file, creating it if it doesn't exist."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('')
        return ''
    except PermissionError:
        print(f"Cannot access {path}, using default")
        return ''
```

---

## 15. Over-Fragmentation

### ❌ Problem

```
my-skill/
├── SKILL.md        # 50 lines, mostly links
├── intro.md        # 20 lines
├── part1.md        # 30 lines
├── part2.md        # 30 lines
├── part3.md        # 30 lines
├── part4.md        # 30 lines
└── conclusion.md   # 20 lines
```

**Why it's bad**:
- Overhead of loading many files
- Navigation burden
- Unnecessary complexity

### ✅ Solution

```
my-skill/
├── SKILL.md        # 400 lines, comprehensive
└── reference.md    # 200 lines, advanced topics
```

Balance between monolithic and over-fragmented.

---

## 16. Reserved Words in Name

### ❌ Problem

```yaml
name: claude-helper
name: anthropic-tools
```

**Why it's bad**:
- Against naming rules
- May cause conflicts
- Not allowed

### ✅ Solution

```yaml
name: code-helper
name: dev-tools
```

Avoid "claude" and "anthropic".

---

## 17. Mixed Concerns

### ❌ Problem

```markdown
# everything.md

[Instructions]
[API reference]
[Examples]
[Templates]
[Troubleshooting]
[Everything else]

[800 lines of mixed content]
```

**Why it's bad**:
- Hard to find information
- Poor organization
- Difficult to maintain

### ✅ Solution

```
my-skill/
├── SKILL.md          # Instructions only
├── api_reference.md  # API docs
├── examples.md       # Examples
└── troubleshooting.md
```

Separate concerns into focused files.

---

## 18. No Workflow for Complex Tasks

### ❌ Problem

```markdown
To process forms:

Run analyze_form.py, then create fields.json, then validate,
then fill, and check output. [No structure, easy to miss steps]
```

**Why it's bad**:
- Easy to skip steps
- No progress tracking
- Confusing

### ✅ Solution

```markdown
## Form Processing Workflow

Copy this checklist:
```
Task Progress:
- [ ] Step 1: Analyze form (run analyze_form.py)
- [ ] Step 2: Create mapping (edit fields.json)
- [ ] Step 3: Validate (run validate_fields.py)
- [ ] Step 4: Fill form (run fill_form.py)
- [ ] Step 5: Verify output
```

**Step 1: Analyze form**
Run: `python analyze_form.py input.pdf`

[etc...]
```

Checklist pattern guides users.

---

## 19. Underscores in Skill Name

### ❌ Problem

```yaml
name: pdf_processor
name: code_helper
```

**Why it's bad**:
- Against naming convention
- Should use hyphens
- Not valid

### ✅ Solution

```yaml
name: pdf-processor
name: code-helper
```

Use hyphens, not underscores.

---

## 20. No Validation in Scripts

### ❌ Problem

```python
#!/usr/bin/env python3

import sys
result = process(sys.argv[1])  # Crashes if no arg
print(result)
```

**Why it's bad**:
- Cryptic error messages
- Poor user experience
- Hard to debug

### ✅ Solution

```python
#!/usr/bin/env python3

import sys

if len(sys.argv) < 2:
    print("Usage: script.py input_file", file=sys.stderr)
    sys.exit(1)

input_file = sys.argv[1]

if not os.path.exists(input_file):
    print(f"Error: File not found: {input_file}", file=sys.stderr)
    sys.exit(1)

result = process(input_file)
print(result)
```

---

## Summary

**Top 5 Most Critical Anti-Patterns to Avoid:**

1. **Vague description** without keywords
2. **Monolithic SKILL.md** over 500 lines
3. **No quick start** example
4. **Windows-style paths**
5. **Deeply nested references**

Fix these first for immediate improvement.
