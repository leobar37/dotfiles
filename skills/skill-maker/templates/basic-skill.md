# Basic Skill Template

Template for simple, single-file skills.

---

## When to Use

- Skill has straightforward purpose
- Instructions fit in < 500 lines
- No need for separate reference files
- No executable scripts required

---

## Template

```markdown
---
name: [skill-name]
description: |
  [What it does]. [When to use it].
  Keywords: [keyword1], [keyword2], [keyword3].
---

# [Skill Title]

[Brief overview: 1-2 paragraphs explaining what this skill provides]

## Quick Start

[Minimal working example to get users started immediately]

```[language]
[code example]
```

## Core Concepts

[Key ideas users need to understand]

- **Concept 1**: [Explanation]
- **Concept 2**: [Explanation]
- **Concept 3**: [Explanation]

## Common Patterns

### Pattern 1: [Name]

[Description and example]

```[language]
[code]
```

### Pattern 2: [Name]

[Description and example]

```[language]
[code]
```

## Best Practices

1. **[Practice 1]**: [Why it matters]
2. **[Practice 2]**: [Why it matters]
3. **[Practice 3]**: [Why it matters]

## Common Mistakes

❌ **[Mistake 1]**: [Why it's wrong]  
✅ **Instead**: [Correct approach]

❌ **[Mistake 2]**: [Why it's wrong]  
✅ **Instead**: [Correct approach]

## When to Use This Skill

- [Use case 1]
- [Use case 2]
- [Use case 3]
```

---

## Example: Code Formatter

```markdown
---
name: code-formatter
description: |
  Code formatting expert. Applies consistent style, fixes imports, adds
  type hints. Use when cleaning up code files.
  Keywords: format, style, lint, prettier, eslint, black, formatting.
---

# Code Formatter

Automatically formats code following project conventions and best practices.

## Quick Start

Format a file:
```bash
npx prettier --write src/file.ts
```

For Python:
```bash
black src/file.py
```

## Core Concepts

- **Consistency**: Same style across entire codebase
- **Automation**: Run on save or pre-commit
- **Configuration**: Project-specific rules in config files

## Common Patterns

### Pattern 1: Format on Save

Add to VS Code settings.json:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Pattern 2: Pre-commit Hook

Add to .husky/pre-commit:
```bash
npx prettier --write $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
```

## Best Practices

1. **Use project config**: Store rules in `.prettierrc` or `pyproject.toml`
2. **Run in CI**: Verify formatting in pull requests
3. **Format entire codebase initially**: Start clean, maintain cleanliness

## Common Mistakes

❌ **Manual formatting**: Too time-consuming and inconsistent  
✅ **Instead**: Use automated tools in editor and CI

❌ **No configuration**: Tools use different defaults  
✅ **Instead**: Commit config files to repo

## When to Use This Skill

- Setting up new projects
- Cleaning up legacy code
- Enforcing team code standards
- Before code reviews
```

---

## Example: API Tester

```markdown
---
name: api-tester
description: |
  API testing expert. Creates test suites for REST APIs with proper
  assertions and error handling. Use when testing API endpoints.
  Keywords: api, test, rest, http, testing, endpoint, validation.
---

# API Testing

Create comprehensive API test suites with proper coverage.

## Quick Start

Basic API test:
```typescript
import { describe, it, expect } from 'vitest';

describe('GET /api/users', () => {
  it('returns list of users', async () => {
    const response = await fetch('/api/users');
    expect(response.status).toBe(200);
    const users = await response.json();
    expect(Array.isArray(users)).toBe(true);
  });
});
```

## Core Concepts

- **Happy path**: Test normal, successful operations
- **Edge cases**: Empty data, boundaries, special values
- **Error cases**: Invalid input, auth failures, not found

## Common Patterns

### Pattern 1: Test Structure

```typescript
describe('Resource', () => {
  // Setup
  beforeEach(() => {
    // Reset state
  });

  // Happy path
  it('should do X when Y', async () => {
    // Arrange, Act, Assert
  });

  // Edge cases
  it('should handle empty list', async () => {});

  // Error cases
  it('should return 404 when not found', async () => {});
});
```

### Pattern 2: Mock External APIs

```typescript
import { vi } from 'vitest';

vi.mock('./external-api', () => ({
  fetchData: vi.fn(() => Promise.resolve(mockData))
}));
```

## Best Practices

1. **Test behavior, not implementation**: Focus on inputs/outputs
2. **One assertion per test**: Makes failures clear
3. **Descriptive test names**: Explain what's being tested
4. **Mock external dependencies**: Tests should be isolated

## Common Mistakes

❌ **No error case tests**: Only testing happy path  
✅ **Instead**: Test errors, edge cases, and boundaries

❌ **Brittle tests**: Depend on exact response structure  
✅ **Instead**: Test essential fields only

## When to Use This Skill

- Creating new API endpoints
- Adding test coverage
- Debugging API issues
- Before deploying changes
```

---

## Checklist for Basic Skills

- [ ] Frontmatter complete (name + description with keywords)
- [ ] Overview explains purpose clearly
- [ ] Quick start provides immediate value
- [ ] Core concepts explain key ideas
- [ ] At least 2-3 common patterns with examples
- [ ] Best practices are actionable
- [ ] Common mistakes shown with corrections
- [ ] When to use section is clear
- [ ] Total length under 500 lines
- [ ] Code examples are complete and working

---

## Tips

1. **Start simple**: Can always expand later
2. **Include working code**: Not pseudocode
3. **Show both good and bad**: Teach by contrast
4. **Be concise**: Every line should add value
5. **Test examples**: Verify code actually works
