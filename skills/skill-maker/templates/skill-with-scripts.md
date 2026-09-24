# Skill with Scripts Template

Template for skills that include executable Python or bash scripts.

---

## When to Use

- Deterministic operations better done by code
- Complex validation or processing
- Need reliable, repeatable results
- Want to save tokens (script code never loads)

---

## Key Benefit

**Scripts are efficient**: Code never enters context, only output does.

```python
# This 100-line script: 0 tokens (never loaded)
# Output: "Validation passed" or error list: ~50 tokens
```

---

## Directory Structure

```
skill-with-scripts/
├── SKILL.md
├── references/
│   └── detailed_guide.md
└── scripts/
    ├── analyze.py
    ├── validate.py
    └── process.sh
```

---

## SKILL.md Template

```markdown
---
name: [skill-name]
description: |
  [What it does]. [When to use]. Keywords: [k1], [k2].
---

# [Skill Title]

[Overview]

## Quick Start

[Basic example without scripts first]

## Utility Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `analyze.py` | [What it does] | `python scripts/analyze.py input.txt` |
| `validate.py` | [What it does] | `python scripts/validate.py data.json` |
| `process.sh` | [What it does] | `bash scripts/process.sh file.pdf` |

## Workflows with Scripts

### Workflow 1: [Name]

Copy this checklist:
```
Task Progress:
- [ ] Step 1: [Action] (run analyze.py)
- [ ] Step 2: [Action] (edit output)
- [ ] Step 3: [Action] (run validate.py)
- [ ] Step 4: [Action] (run process.sh)
```

**Step 1: [Action]**
Run: `python scripts/analyze.py input.txt`

Output: [Describe expected output]

**Step 2: [Action]**
[Manual step description]

**Step 3: [Action]**
Run: `python scripts/validate.py data.json`

If validation fails, return to Step 2.

**Step 4: [Action]**
Run: `bash scripts/process.sh output.pdf`

## Script Details

### analyze.py

**Purpose**: [What it does]

**Input**: [Format and requirements]

**Output**: [Format and content]

**Example**:
```bash
python scripts/analyze.py input.txt
# Output: {"field_count": 5, "valid": true}
```

### validate.py

**Purpose**: [What it does]

**Input**: [Format]

**Output**: [Format]

**Error handling**: [What errors it catches]

## Best Practices

1. **Always validate before processing**: Catch errors early
2. **Check script output**: Look for errors or warnings
3. **Use workflows**: Follow the checklist pattern

## Common Mistakes

❌ **Skipping validation**: Leads to failed processing  
✅ **Run validate.py**: Catch errors before they propagate
```

---

## Script Writing Guidelines

### Python Script Template

```python
#!/usr/bin/env python3
"""
Script purpose: [What it does]

Usage:
    python script_name.py input_file

Output:
    [What it prints/returns]
"""

import sys
import json
from pathlib import Path

def main(input_path: str) -> dict:
    """
    Main logic here.
    
    Args:
        input_path: Path to input file
        
    Returns:
        Dict with results
        
    Raises:
        ValueError: If input is invalid
        FileNotFoundError: If file doesn't exist
    """
    # Validate input
    if not Path(input_path).exists():
        raise FileNotFoundError(f"File not found: {input_path}")
    
    # Process
    result = process_data(input_path)
    
    # Return structured output
    return {
        "status": "success",
        "result": result,
        "errors": []
    }

def process_data(path: str):
    """Helper function"""
    # Implementation
    pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script_name.py input_file", file=sys.stderr)
        sys.exit(1)
    
    try:
        result = main(sys.argv[1])
        print(json.dumps(result, indent=2))
    except Exception as e:
        error = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error, indent=2), file=sys.stderr)
        sys.exit(1)
```

### Bash Script Template

```bash
#!/usr/bin/env bash
# Script purpose: [What it does]
#
# Usage:
#   bash script_name.sh input_file
#
# Output:
#   [What it prints]

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Input validation
if [ $# -lt 1 ]; then
    echo "Usage: $0 input_file" >&2
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File not found: $INPUT_FILE" >&2
    exit 1
fi

# Main logic
process_file() {
    local file="$1"
    # Implementation
    echo "Processing $file..."
}

# Execute
process_file "$INPUT_FILE"
echo "Done"
```

---

## Complete Example: PDF Form Filler

### SKILL.md

```markdown
---
name: pdf-form-filler
description: |
  PDF form filling toolkit. Analyzes form fields, validates data, fills
  forms programmatically. Use when working with fillable PDFs.
  Keywords: pdf, form, fillable, acroform, fill, extract, validate.
---

# PDF Form Filler

Programmatically fill PDF forms with validation and error checking.

## Quick Start

Manual form filling:
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("form.pdf")
writer = PdfWriter()

writer.add_page(reader.pages[0])
writer.update_page_form_field_values(
    writer.pages[0],
    {"field_name": "value"}
)

with open("filled.pdf", "wb") as f:
    writer.write(f)
```

## Utility Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `analyze_form.py` | Extract all form fields | `python scripts/analyze_form.py input.pdf` |
| `validate_data.py` | Check field values | `python scripts/validate_data.py fields.json` |
| `fill_form.py` | Fill PDF form | `python scripts/fill_form.py input.pdf fields.json output.pdf` |

## Workflow: Fill PDF Form

Copy this checklist:
```
Task Progress:
- [ ] Step 1: Analyze form structure
- [ ] Step 2: Create field mapping
- [ ] Step 3: Validate field values
- [ ] Step 4: Fill the form
- [ ] Step 5: Verify output
```

**Step 1: Analyze form**
```bash
python scripts/analyze_form.py input.pdf > fields.json
```

Output shows all available fields and their types.

**Step 2: Create mapping**
Edit `fields.json` to add values for each field:
```json
{
  "customer_name": "John Doe",
  "email": "john@example.com",
  "signature_date": "2025-03-15"
}
```

**Step 3: Validate**
```bash
python scripts/validate_data.py fields.json
```

If validation fails, fix issues and run again.

**Step 4: Fill form**
```bash
python scripts/fill_form.py input.pdf fields.json output.pdf
```

**Step 5: Verify**
Open `output.pdf` and check all fields are filled correctly.

## Script Details

### analyze_form.py

**Purpose**: Extract all form field names, types, and properties

**Input**: PDF file path

**Output**: JSON with field information

**Example output**:
```json
{
  "fields": [
    {
      "name": "customer_name",
      "type": "text",
      "required": true
    },
    {
      "name": "agree_terms",
      "type": "checkbox",
      "required": true
    }
  ]
}
```

### validate_data.py

**Purpose**: Validate field values before filling

**Input**: JSON file with field values

**Output**: "Validation passed" or list of errors

**Checks**:
- Required fields present
- Correct data types
- Valid email format
- Date format (YYYY-MM-DD)

### fill_form.py

**Purpose**: Fill PDF form with validated data

**Input**: PDF file + JSON data file

**Output**: Filled PDF file

**Error handling**: Stops if field doesn't exist

## Best Practices

1. **Always analyze first**: Know what fields exist
2. **Validate before filling**: Catch errors early
3. **Keep field mapping**: Reuse for similar forms
4. **Verify output**: Manual check of filled PDF

## Common Mistakes

❌ **Skipping validation**: Results in incomplete forms  
✅ **Run validate_data.py**: Catch all issues upfront

❌ **Wrong field names**: Form not filled correctly  
✅ **Use analyze_form.py**: Get exact field names
```

---

## Checklist for Skills with Scripts

- [ ] Scripts are in `scripts/` directory
- [ ] Each script has clear purpose
- [ ] Usage examples provided
- [ ] Script output format documented
- [ ] Error handling explained
- [ ] Workflow uses checklist pattern
- [ ] Scripts have proper shebangs
- [ ] Scripts validate input
- [ ] Scripts output JSON (for Python)
- [ ] Script code is self-documenting

---

## Tips

1. **Make scripts robust**: Handle errors gracefully
2. **Output structured data**: JSON for Python, clear text for bash
3. **Document expected output**: Show examples
4. **Use workflows**: Checklist pattern guides users
5. **Test scripts**: Verify they work before documenting
