# Skill Validation Checklist

Use this checklist to validate skill quality before deployment.

---

## Frontmatter Validation

### Required Fields

- [ ] `name` field present
- [ ] `name` is lowercase with hyphens only
- [ ] `name` is under 64 characters
- [ ] `name` doesn't contain "anthropic" or "claude"
- [ ] `description` field present
- [ ] `description` is under 1024 characters
- [ ] `description` includes "what it does"
- [ ] `description` includes "when to use"
- [ ] `description` includes discovery keywords
- [ ] `description` uses third person voice

### Format

- [ ] YAML frontmatter properly formatted
- [ ] No XML tags in name or description
- [ ] Multi-line description uses `|` or `>` correctly

---

## Structure Validation

### Files and Directories

- [ ] SKILL.md exists at root (uppercase)
- [ ] SKILL.md under 500 lines
- [ ] Skill lives in `.claude/skills/` by default unless global scope is intentional
- [ ] Forward slashes in all paths
- [ ] Descriptive file names (not doc1.md, file2.md)
- [ ] Scripts in `scripts/` directory (if any)
- [ ] `references/` exists for advanced or repo-specific knowledge
- [ ] Reference files organized logically
- [ ] No deeply nested references (max 1 level)

### Organization

- [ ] Clear structure (flat, hierarchical, or by type)
- [ ] Related content grouped together
- [ ] Easy to navigate
- [ ] No duplicate content

---

## Content Quality

### Overview and Introduction

- [ ] Clear overview (1-2 paragraphs)
- [ ] Explains what skill provides
- [ ] Explains when to use it
- [ ] Quick start example included
- [ ] Quick start is minimal (< 10 lines)

### Instructions

- [ ] Concise (no unnecessary verbosity)
- [ ] Clear and actionable
- [ ] Complete code examples (not pseudocode)
- [ ] Examples actually work
- [ ] Consistent terminology throughout
- [ ] No time-sensitive information

### Examples

- [ ] Working code examples provided
- [ ] Examples include necessary imports
- [ ] Examples show both correct and incorrect usage
- [ ] Examples are realistic, not toy examples

---

## Progressive Disclosure

### Structure

- [ ] SKILL.md serves as navigation hub
- [ ] Reference files linked from SKILL.md
- [ ] References are one level deep
- [ ] Long files have table of contents
- [ ] Links use descriptive text

### Efficiency

- [ ] Common tasks don't require reference files
- [ ] Advanced features in separate files
- [ ] Script code not in SKILL.md (in scripts/)
- [ ] No redundancy between SKILL.md and references

---

## Scripts (if applicable)

### Code Quality

- [ ] Scripts are in `scripts/` directory
- [ ] Scripts have proper shebangs
- [ ] Scripts validate input
- [ ] Scripts handle errors gracefully
- [ ] Scripts output structured data (JSON for Python)
- [ ] Script code is self-documenting
- [ ] No "voodoo constants" (all values justified)

### Documentation

- [ ] Each script's purpose documented
- [ ] Usage examples provided
- [ ] Expected output format shown
- [ ] Error conditions explained
- [ ] Clear whether to execute or read as reference

---

## Workflows

### For Complex Tasks

- [ ] Workflows use checklist pattern
- [ ] Each step is clear and actionable
- [ ] Steps include specific commands/files
- [ ] Dependencies between steps noted
- [ ] Feedback loops for validation
- [ ] Error recovery explained

---

## Discovery and Activation

### Keywords

- [ ] Relevant keywords in description
- [ ] Keywords match common queries
- [ ] File extensions included (if relevant)
- [ ] Variations of terms included
- [ ] Domain-specific terms included

### Testing

- [ ] Test: Does skill activate on expected queries?
- [ ] Test: Can Claude find relevant files?
- [ ] Test: Are examples actually helpful?
- [ ] Test: Do workflows complete successfully?

---

## Best Practices

### Content

- [ ] Follows "concise is key" principle
- [ ] Appropriate degree of freedom set
- [ ] Templates provided where useful
- [ ] Conditional details pattern used
- [ ] No deeply nested information

### Technical

- [ ] No Windows-style paths
- [ ] Scripts are deterministic
- [ ] Validation included for critical operations
- [ ] Consistent naming conventions
- [ ] Dependencies documented

---

## Common Mistakes Check

### Avoided These?

- [ ] ✅ Not vague description
- [ ] ✅ Not missing keywords
- [ ] ✅ Not wrong point of view
- [ ] ✅ Not using underscores in skill name
- [ ] ✅ Not using reserved words
- [ ] ✅ Not monolithic SKILL.md (> 500 lines)
- [ ] ✅ Not deeply nested references
- [ ] ✅ Not vague file names
- [ ] ✅ Not mixed concerns in files
- [ ] ✅ Not time-sensitive information
- [ ] ✅ Not inconsistent terminology
- [ ] ✅ Not offering too many options
- [ ] ✅ Not missing error handling

---

## Testing Checklist

### Basic Functionality

- [ ] Test 1: Simple task completes successfully
- [ ] Test 2: Advanced task loads correct references
- [ ] Test 3: Scripts execute and output correctly
- [ ] Test 4: Workflows are followable
- [ ] Test 5: Error cases handled gracefully

### Discovery

- [ ] Test: Skill found with expected keywords?
- [ ] Test: Description triggers on relevant queries?
- [ ] Test: Claude navigates to correct files?

### Performance

- [ ] Test: Simple tasks load SKILL.md only?
- [ ] Test: Advanced tasks load only needed files?
- [ ] Test: Scripts output, not code, in context?

---

## Final Review

### Documentation

- [ ] All patterns documented
- [ ] All scripts documented
- [ ] All workflows documented
- [ ] Examples are complete
- [ ] No TODOs or placeholders

### Maintenance

- [ ] Skill is version controlled (git)
- [ ] README exists (if needed)
- [ ] Dependencies listed
- [ ] Installation instructions clear
- [ ] Contact/support info provided (if applicable)

---

## Quality Levels

### ⭐ Minimal (Functional)

- Required frontmatter
- Basic instructions
- At least one example
- Under 500 lines

### ⭐⭐ Good (Production-Ready)

- All Minimal requirements
- Progressive disclosure implemented
- Clear workflows
- Multiple examples
- Validated and tested

### ⭐⭐⭐ Excellent (Best Practice)

- All Good requirements
- Domain-organized
- Scripts included
- Comprehensive examples
- Team-tested
- Well-maintained

---

## Scoring

Count your checkmarks:

- **80-100%**: Excellent, ready to deploy
- **60-79%**: Good, minor improvements needed
- **40-59%**: Functional, significant improvements recommended
- **< 40%**: Needs major revision

---

## Quick Validation Command

```bash
# Run from skill directory
echo "Checking skill structure..."

# Check required file
[ -f "SKILL.md" ] && echo "✅ SKILL.md exists" || echo "❌ SKILL.md missing"

# Check SKILL.md size
lines=$(wc -l < SKILL.md)
[ $lines -lt 500 ] && echo "✅ SKILL.md under 500 lines ($lines)" || echo "⚠️  SKILL.md large ($lines lines)"

# Check for Windows paths
grep -r '\\' *.md && echo "❌ Windows paths found" || echo "✅ No Windows paths"

# Check frontmatter
head -n 5 SKILL.md | grep -q "^name:" && echo "✅ Frontmatter present" || echo "❌ Frontmatter missing"

echo "Done"
```

---

## Priority Issues

Fix these first:

1. **Critical**:
   - Missing or invalid frontmatter
   - SKILL.md over 1000 lines
   - Broken links to references
   - Non-working examples

2. **High**:
   - Missing keywords in description
   - No quick start example
   - Windows-style paths
   - Vague file names

3. **Medium**:
   - SKILL.md 500-1000 lines
   - Missing workflows
   - Incomplete documentation
   - No error handling

4. **Low**:
   - Style inconsistencies
   - Missing optional sections
   - Could use more examples
   - Minor naming improvements
