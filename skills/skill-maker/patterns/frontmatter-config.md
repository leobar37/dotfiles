# YAML Frontmatter Configuration

Complete guide for configuring skill frontmatter.

---

## Required Structure

```yaml
---
name: skill-name
description: What it does. When to use. Keywords: k1, k2.
---
```

Both `name` and `description` are **REQUIRED**.

---

## Field: `name`

Unique identifier for the skill.

### Requirements

| Rule | Detail |
|------|--------|
| **Max length** | 64 characters |
| **Allowed** | Lowercase letters, numbers, hyphens |
| **Not allowed** | Spaces, underscores, uppercase, special chars |
| **Reserved words** | Cannot contain "anthropic" or "claude" |
| **XML tags** | Not allowed |

### Examples

```yaml
# ✅ GOOD
name: pdf-processing
name: bigquery-analysis
name: react-component-generator
name: api-testing

# ❌ BAD
name: PDF Processing      # No spaces
name: pdf_processing      # No underscores
name: PDFProcessing       # No camelCase
name: PdfProcessing       # No PascalCase
name: anthropic-helper    # Reserved word
name: claude-tools        # Reserved word
```

### Naming Patterns

**Pattern 1: Gerund form** (recommended):
```yaml
name: processing-pdfs
name: analyzing-data
name: managing-databases
name: testing-code
```

**Pattern 2: Noun phrases**:
```yaml
name: pdf-processor
name: data-analyzer
name: database-manager
name: code-tester
```

**Pattern 3: Action-oriented**:
```yaml
name: process-pdfs
name: analyze-data
name: manage-databases
name: test-code
```

**Avoid**:
```yaml
# Too vague
name: helper
name: utils
name: tools

# Too generic
name: documents
name: data
name: files
```

---

## Field: `description`

Natural language description for skill discovery.

### Requirements

| Rule | Detail |
|------|--------|
| **Required** | Yes (non-empty) |
| **Max length** | 1024 characters |
| **XML tags** | Not allowed |
| **Must include** | What, When, Keywords |

### Structure

A good description contains:

1. **What**: What the skill does
2. **When**: When to use it
3. **Keywords**: Discovery triggers

### Format Options

**Single line**:
```yaml
description: Extract text from PDFs, fill forms, merge documents. Use when working with PDF files. Keywords: pdf, forms, extract, merge.
```

**Multi-line (pipe)**:
```yaml
description: |
  Expert in PDF processing. Extracts text and tables from PDFs,
  fills forms, merges documents. Use when working with PDF files
  or when the user mentions PDFs, forms, or document extraction.
  Keywords: pdf, extract, forms, merge, documents.
```

**Multi-line (greater-than)**:
```yaml
description: >
  Expert in PDF processing. Extracts text and tables.
  Use when working with PDFs.
  Keywords: pdf, extract, forms.
```

### Point of View

**Always use third person**:

```yaml
# ✅ GOOD
description: Processes Excel files and generates reports

# ❌ BAD
description: I can help you process Excel files
description: You can use this to process Excel files
```

**Why?** Description is injected into system prompt. First/second person creates confusion.

### Examples by Domain

**Data Analysis**:
```yaml
description: |
  Analyzes Excel spreadsheets, creates pivot tables, generates charts.
  Use when analyzing Excel files, spreadsheets, tabular data, or .xlsx files.
  Keywords: excel, spreadsheet, pivot, chart, xlsx, data analysis.
```

**Development Tools**:
```yaml
description: |
  Git commit message generator. Analyzes git diffs and creates descriptive
  commit messages following conventional commits format. Use when writing
  commit messages or reviewing staged changes.
  Keywords: git, commit, message, conventional commits, changelog.
```

**API/Backend**:
```yaml
description: |
  REST API expert. Creates endpoints with validation, error handling,
  and proper HTTP semantics. Use when building backend APIs or creating
  new endpoints. Keywords: api, rest, endpoint, http, backend, validation.
```

**Frontend/UI**:
```yaml
description: |
  React component builder. Creates TypeScript components with proper typing,
  hooks, and tests. Use when building UI components or React features.
  Keywords: react, component, typescript, hooks, ui, tsx.
```

**Documentation**:
```yaml
description: |
  Technical documentation writer. Creates clear, comprehensive docs with
  examples and proper structure. Use when writing API docs, guides, or
  README files. Keywords: documentation, docs, readme, guide, api docs.
```

### Keyword Strategy

**Include specific triggers**:

```yaml
# Good - Specific keywords
description: |
  PDF form processor. Fills PDF forms, extracts fields, validates data.
  Use when working with PDF files, forms, or document extraction.
  Keywords: pdf, form, fillable, acroform, extract, validate.

# Bad - Generic keywords
description: |
  Processes documents.
  Keywords: files, process, data.
```

**Include variations**:

```yaml
# Include common variations
Keywords: api, rest, endpoint, http, backend, service, controller, route
```

**Include file extensions**:

```yaml
# For file-specific skills
Keywords: excel, xlsx, xls, spreadsheet, workbook
Keywords: pdf, portable document format, acrobat
```

---

## Complete Examples

### Example 1: Simple Skill

```yaml
---
name: code-formatter
description: |
  Code formatting expert. Applies consistent style, fixes imports,
  adds type hints. Use when cleaning up code files.
  Keywords: format, style, lint, prettier, eslint, black.
---
```

### Example 2: Domain Expert

```yaml
---
name: bigquery-analyst
description: |
  BigQuery data analysis expert. Queries revenue, sales, product data.
  Knows table schemas, common patterns, and optimization techniques.
  Use when querying BigQuery or analyzing company data.
  Keywords: bigquery, sql, data, analytics, query, warehouse.
---
```

### Example 3: Tool Specialist

```yaml
---
name: pdf-toolkit
description: |
  PDF processing toolkit. Extracts text and tables from PDFs, fills forms,
  merges documents, analyzes structure. Use when working with PDF files
  or when user mentions PDFs, forms, or document extraction.
  Keywords: pdf, extract, forms, merge, acroform, fillable.
---
```

### Example 4: Framework Expert

```yaml
---
name: react-patterns
description: |
  React architecture expert. Implements modern patterns including hooks,
  context, suspense, and error boundaries. Creates TypeScript components
  with proper typing. Use when building React applications or components.
  Keywords: react, hooks, typescript, tsx, component, context, suspense.
---
```

---

## Validation Rules

### Name Validation

```python
def validate_name(name: str) -> bool:
    # Max 64 characters
    if len(name) > 64:
        return False
    
    # Lowercase, numbers, hyphens only
    if not re.match(r'^[a-z0-9-]+$', name):
        return False
    
    # No reserved words
    if 'anthropic' in name or 'claude' in name:
        return False
    
    return True
```

### Description Validation

```python
def validate_description(description: str) -> bool:
    # Non-empty
    if not description or description.strip() == '':
        return False
    
    # Max 1024 characters
    if len(description) > 1024:
        return False
    
    # No XML tags
    if '<' in description or '>' in description:
        return False
    
    return True
```

---

## Common Mistakes

### ❌ Mistake 1: Vague Description

```yaml
# BAD
description: Helps with code

# GOOD
description: |
  Python code formatter. Applies PEP 8 style, fixes imports, adds type hints.
  Use when cleaning up Python files. Keywords: python, format, pep8, black.
```

### ❌ Mistake 2: Missing Keywords

```yaml
# BAD - No discovery keywords
description: Creates database migrations

# GOOD - Includes keywords
description: |
  Database migration expert. Creates Drizzle/Prisma migrations, handles
  schema changes. Use for database work. Keywords: migration, schema,
  database, drizzle, prisma, sql.
```

### ❌ Mistake 3: Wrong Point of View

```yaml
# BAD - First person
description: I help you process Excel files

# BAD - Second person  
description: You can use this to process Excel

# GOOD - Third person
description: Processes Excel files and generates reports
```

### ❌ Mistake 4: Using Underscores in Name

```yaml
# BAD
name: pdf_processor

# GOOD
name: pdf-processor
```

### ❌ Mistake 5: Reserved Words

```yaml
# BAD
name: claude-helper
name: anthropic-tools

# GOOD
name: code-helper
name: dev-tools
```

---

## Testing Your Frontmatter

### Quick Checklist

- [ ] `name` field present
- [ ] `name` is lowercase-hyphen-case
- [ ] `name` is under 64 characters
- [ ] `name` doesn't contain reserved words
- [ ] `description` field present
- [ ] `description` includes "what"
- [ ] `description` includes "when"
- [ ] `description` includes keywords
- [ ] `description` is under 1024 characters
- [ ] `description` uses third person
- [ ] No XML tags in either field

### Test Discovery

After creating frontmatter, test if Claude will discover your skill:

1. **Test query**: Create a query that should trigger the skill
2. **Check keywords**: Do keywords match the query?
3. **Check description**: Is "when to use" clear?

**Example**:

```yaml
name: pdf-form-filler
description: |
  Fills PDF forms with data. Extracts fields, validates values, saves output.
  Use when filling PDF forms or working with fillable PDFs.
  Keywords: pdf, form, fillable, acroform, fill, extract.
```

**Test queries**:
- "Fill this PDF form with data" ✅ (contains "fill", "PDF", "form")
- "Extract fields from this form" ✅ (contains "extract", "form")
- "Work with this fillable PDF" ✅ (contains "fillable", "PDF")

---

## Frontmatter Templates

### Template 1: Data Processing

```yaml
---
name: [tool-name]-processor
description: |
  [Tool] data processor. [What it does in detail].
  Use when working with [tool] files or [file extensions].
  Keywords: [tool], [file ext], [operations], [related terms].
---
```

### Template 2: Development Tool

```yaml
---
name: [language]-[purpose]
description: |
  [Language] [purpose] expert. [Specific capabilities].
  Use when [context or task]. Keywords: [language], [framework],
  [operations], [file extensions].
---
```

### Template 3: Domain Expert

```yaml
---
name: [domain]-analyst
description: |
  [Domain] analysis expert. [What data/queries it handles].
  Knows [specific knowledge]. Use when [task context].
  Keywords: [domain], [tools], [operations], [data types].
---
```

---

## References

For more on skill structure, see:
- [skill-structure.md](skill-structure.md)
- [naming-conventions.md](naming-conventions.md)
