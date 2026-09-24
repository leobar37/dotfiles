# Naming Conventions

Best practices for naming skills, files, and directories.

---

## Skill Names

### Rules

- **Max 64 characters**
- **Lowercase only**: a-z, 0-9, hyphens
- **No underscores**: Use hyphens instead
- **No reserved words**: "anthropic", "claude"
- **No camelCase or PascalCase**

### Recommended Patterns

**Pattern 1: Gerund Form** (verb + -ing):
```
processing-pdfs
analyzing-data
managing-databases
testing-code
writing-documentation
```

**Pattern 2: Noun Phrases**:
```
pdf-processor
data-analyzer
database-manager
code-tester
documentation-writer
```

**Pattern 3: Domain-Tool**:
```
bigquery-analyst
react-builder
api-designer
git-helper
```

**Pattern 4: Tool-Purpose**:
```
excel-analyzer
pdf-toolkit
sql-optimizer
code-formatter
```

### Good Examples

```
pdf-processing          # Clear purpose
bigquery-analysis       # Domain + action
react-component-builder # Specific functionality
api-testing-framework   # Complete description
code-review-assistant   # Clear role
```

### Bad Examples

```
helper              # Too vague
utils               # Generic
my-tool             # Not descriptive
pdf_processor       # Underscores
PDFProcessor        # PascalCase
pdfProcessor        # camelCase
claude-helper       # Reserved word
anthropic-tools     # Reserved word
```

---

## File Names

### SKILL.md (Required)

**Must be exactly**: `SKILL.md` (uppercase)

```
✅ SKILL.md
❌ skill.md
❌ Skill.md
❌ SKILLS.md
```

### Reference Files

**Use descriptive names** that indicate content:

```
✅ Good:
- api_reference.md
- form_validation_rules.md
- common_patterns.md
- error_handling.md
- quick_start_guide.md
- troubleshooting.md

❌ Bad:
- doc1.md
- file2.md
- notes.md
- misc.md
- temp.md
- stuff.md
```

**Patterns**:

```
# By topic
authentication.md
authorization.md
validation.md

# By function
getting_started.md
advanced_features.md
troubleshooting.md

# By domain
finance_metrics.md
sales_pipeline.md
product_analytics.md
```

### Script Files

**Action-oriented names**:

```
✅ Good:
- analyze_form.py
- validate_input.py
- generate_report.py
- process_data.sh
- build_query.py
- check_status.py

❌ Bad:
- script1.py
- helper.py
- utils.py
- tool.py
- main.py
- run.py
```

**Naming formula**: `verb_noun.extension`

```
analyze_form.py       # verb: analyze, noun: form
validate_input.py     # verb: validate, noun: input
generate_report.py    # verb: generate, noun: report
```

### Template Files

**Purpose-clear names**:

```
✅ Good:
- api_endpoint_template.ts
- react_component_template.tsx
- test_suite_template.py
- database_query_template.sql
- config_template.yaml

❌ Bad:
- template1.ts
- example.tsx
- temp.py
- boilerplate.sql
```

---

## Directory Names

### Lowercase with Hyphens

```
✅ Good:
- references/
- examples/
- templates/
- scripts/
- utils/

❌ Bad:
- Reference/      # Uppercase
- EXAMPLES/       # All caps
- my_templates/   # Underscores
```

### Common Directory Names

**By resource type**:
```
references/       # Documentation
examples/         # Code samples  
templates/        # Boilerplate
scripts/          # Utilities
tests/            # Test files
docs/             # Additional documentation
```

Use `examples/` only when you have multiple example files. If you only need one examples document, prefer `examples.md` at the skill root.

**By domain**:
```
finance/
sales/
product/
marketing/
operations/
```

**By feature**:
```
authentication/
validation/
reporting/
analytics/
```

---

## Path Conventions

### Always Use Forward Slashes

```
✅ Good (cross-platform):
references/api.md
scripts/helper.py
templates/component.tsx

❌ Bad (Windows-only):
references\api.md
scripts\helper.py
templates\component.tsx
```

### Relative Paths from SKILL.md

```
skill/
├── SKILL.md                # Base
├── references/
│   └── api.md             # ./references/api.md
└── scripts/
    └── helper.py          # ./scripts/helper.py
```

**In SKILL.md**, reference as:
```markdown
See [api.md](references/api.md)
Run `python scripts/helper.py`
```

---

## Consistency Rules

### Within a Skill

**Pick a pattern and stick with it**:

```
✅ Consistent:
analyze_data.py
validate_data.py
process_data.py

❌ Inconsistent:
analyzeData.py
validate_data.py
ProcessData.py
```

### Across Skills

**Use similar patterns** for similar purposes:

```
✅ Good:
pdf-processing/references/api.md
excel-analysis/references/api.md
data-toolkit/references/api.md

❌ Bad:
pdf-processing/references/api.md
excel-analysis/docs/reference.md
data-toolkit/API_DOCS.md
```

---

## Avoiding Name Collisions

### Be Specific

```
✅ Specific:
- pdf_form_validation.md
- excel_data_validation.md
- api_input_validation.md

❌ Generic (can collide):
- validation.md
- validation.md
- validation.md
```

### Use Prefixes

```
✅ With prefixes:
- pdf_analyze.py
- pdf_merge.py
- excel_analyze.py
- excel_export.py

❌ Without (ambiguous):
- analyze.py
- merge.py  
- analyze.py   # Collision!
- export.py
```

---

## Version Naming

### For Skills (use git)

```bash
# Tag releases
git tag v1.0.0
git tag v1.1.0
git tag v2.0.0
```

### For Documentation

If you need versioned docs:

```
references/
├── api_v1.md
├── api_v2.md
└── api_latest.md  # Symlink or copy of current
```

Or use directories:

```
references/
├── v1/
│   └── api.md
├── v2/
│   └── api.md
└── current/       # Symlink to latest
    └── api.md
```

---

## Special Characters

### Allowed

- Lowercase letters: a-z
- Numbers: 0-9
- Hyphens: `-`
- Underscores: `_` (in file names, not skill names)
- Periods: `.` (for extensions only)

### Not Allowed

- Spaces
- Uppercase (in skill names)
- Special chars: `@#$%^&*()+=[]{}|;:'",<>?/\`

---

## Examples by Skill Type

### Data Analysis Skill

```
bigquery-analyst/
├── SKILL.md
├── references/
│   ├── finance_metrics.md
│   ├── sales_pipeline.md
│   └── product_analytics.md
├── scripts/
│   ├── build_query.py
│   └── validate_sql.py
└── templates/
    ├── revenue_query.sql
    └── pipeline_report.sql
```

### Development Tool Skill

```
react-builder/
├── SKILL.md
├── references/
│   ├── component_patterns.md
│   ├── hook_patterns.md
│   └── testing_patterns.md
├── templates/
│   ├── functional_component.tsx
│   ├── custom_hook.ts
│   └── test_suite.test.tsx
└── examples/
    ├── button_component.md
    └── form_component.md
```

### Document Processing Skill

```
pdf-toolkit/
├── SKILL.md
├── references/
│   ├── text_extraction.md
│   ├── form_filling.md
│   └── document_merging.md
├── scripts/
│   ├── analyze_form.py
│   ├── fill_form.py
│   └── merge_pdfs.py
└── examples/
    └── common_workflows.md
```

---

## Checklist

- [ ] Skill name is lowercase-hyphen-case
- [ ] Skill name under 64 characters
- [ ] No reserved words in skill name
- [ ] SKILL.md is uppercase
- [ ] File names are descriptive
- [ ] Script names are action-oriented
- [ ] Directory names are lowercase
- [ ] Forward slashes in all paths
- [ ] Consistent naming within skill
- [ ] Similar patterns across skills
- [ ] No name collisions

---

## Quick Reference

| Element | Pattern | Example |
|---------|---------|---------|
| Skill name | lowercase-hyphen | `pdf-processing` |
| Main file | UPPERCASE | `SKILL.md` |
| Reference | descriptive_name.md | `api_reference.md` |
| Script | verb_noun.ext | `analyze_form.py` |
| Template | purpose_template.ext | `component_template.tsx` |
| Directory | lowercase/ | `references/` |
| Path | forward/slash | `references/api.md` |
