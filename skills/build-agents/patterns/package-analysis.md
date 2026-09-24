# Package Analysis for Agent Creation

Complete guide for analyzing monorepo packages to create specialized OpenCode agents.

---

## Analysis Process

```
1. Read package.json → Core info, dependencies
2. Explore directory structure → Key directories
3. Identify entry points → Main files
4. Analyze patterns → Conventions, styles
5. Extract critical patterns → MUST/NEVER rules
6. Document preferences → Team conventions
```

---

## Step 1: Read package.json

Extract these fields:

```json
{
  "name": "@project/package-name",     // Agent naming
  "description": "...",                 // Agent description
  "main": "src/index.ts",              // Entry point
  "dependencies": {},                   // Core technologies
  "devDependencies": {},               // Development tools
  "scripts": {}                        // Available commands
}
```

### Technology Detection

| Dependency | Technology Type |
|------------|-----------------|
| `react`, `react-dom` | React Frontend |
| `react-native`, `expo` | React Native Mobile |
| `next` | Next.js |
| `@nestjs/*` | NestJS Backend |
| `express`, `fastify`, `hono`, `elysia` | Node.js Backend |
| `prisma`, `@prisma/client` | Prisma ORM |
| `drizzle-orm` | Drizzle ORM |
| `@tanstack/react-query` | TanStack Query |
| `jotai`, `zustand`, `mobx` | State Management |
| `zod` | Schema Validation |
| `axios` | HTTP Client |
| `tailwindcss` | Tailwind CSS |

---

## Step 2: Explore Directory Structure

List directories and identify purpose:

```bash
# List top-level structure
ls -la {package-path}/src/

# Common patterns to look for:
# - components/ or ui/       → UI components
# - hooks/                   → Custom hooks
# - services/ or api/        → API/business logic
# - utils/ or lib/           → Utilities
# - types/                   → Type definitions
# - routes/ or pages/        → Routing
# - modules/                 → Feature modules
# - models/ or entities/     → Data models
```

### Document Structure Format

```markdown
## Project Structure

\`\`\`
packages/{name}/
├── src/
│   ├── {folder1}/           # {Description}
│   │   ├── {subfolder}/     # {Description}
│   │   └── {file}           # {Description}
│   └── index.ts             # Main exports
├── package.json
└── tsconfig.json
\`\`\`
```

---

## Step 3: Identify Entry Points

Find the main files that define the package's architecture:

| Package Type | Entry Points |
|--------------|--------------|
| **Backend** | `main.ts`, `app.module.ts`, `server.ts`, `index.ts` |
| **Frontend** | `App.tsx`, `_app.tsx`, `root.tsx`, `index.tsx` |
| **Mobile** | `App.tsx`, `app/_layout.tsx`, `index.tsx` |
| **SDK** | `index.ts`, `sdk.ts`, `client.ts` |
| **Shared** | `index.ts`, `types.ts` |

---

## Step 4: Analyze Patterns

### 4.1 Import Patterns

```typescript
// Read a few files and identify:

// Absolute imports
import { Something } from '@project/package';
import { Component } from '~/components/Component';

// Relative imports
import { util } from './utils';
import { type } from '../types';

// Path aliases (check tsconfig.json)
{
  "compilerOptions": {
    "paths": {
      "~/*": ["./src/*"],
      "@/*": ["./src/*"]
    }
  }
}
```

### 4.2 Component/Function Patterns

```typescript
// Named exports vs default exports
export function ComponentName() {}  // Named
export default function Page() {}   // Default

// Function vs arrow
function regularFunction() {}
const arrowFunction = () => {}

// Interface vs type
interface Props {}
type Props = {}
```

### 4.3 File Naming Conventions

| Convention | Example |
|------------|---------|
| kebab-case | `user-profile.tsx`, `api-client.ts` |
| PascalCase | `UserProfile.tsx`, `ApiClient.ts` |
| camelCase | `userProfile.tsx`, `apiClient.ts` |
| snake_case | `user_profile.tsx` (rare in TS) |

### 4.4 Directory Conventions

```
# Feature-based
features/
├── users/
│   ├── components/
│   ├── hooks/
│   └── index.ts

# Type-based
src/
├── components/
├── hooks/
├── services/
└── utils/

# Module-based (NestJS)
modules/
├── users/
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   └── dto/
```

---

## Step 5: Extract Critical Patterns

Look for patterns that are **mandatory** in the codebase:

### 5.1 Context/State Patterns

```typescript
// Look for context usage
const ctx = useContext(AppContext);
const { getGymId, getUserId } = ctx;

// Look for required parameters
async function serviceMethod(context: IRequestContext, ...params) {}
```

### 5.2 Error Handling Patterns

```typescript
// Custom exceptions
throw new BusinessException('Message');
throw new NotFoundError('Resource', id);

// Try-catch patterns
try {
  await operation();
} catch (error) {
  handleError(error);
}
```

### 5.3 Validation Patterns

```typescript
// Zod schemas
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// Class-validator (NestJS)
@IsString()
@IsNotEmpty()
name: string;
```

### 5.4 API/Data Patterns

```typescript
// Query patterns
const { data, isLoading } = useQuery({
  queryKey: ['items', id],
  queryFn: () => sdk.items.get(id),
});

// Mutation patterns
const mutation = useMutation({
  mutationFn: (data) => sdk.items.create(data),
  onSuccess: () => queryClient.invalidateQueries(['items']),
});
```

---

## Step 6: Document Preferences

### Team Conventions

```markdown
## Team Preferences

- **Language**: [Spanish/English] for user-facing text
- **Comments**: [Minimal/Detailed], [Spanish/English]
- **Testing**: [Required/Optional/On request only]
- **Documentation**: [Required/Optional/On request only]
```

### Code Style

```markdown
## Code Style

- **Indentation**: [2 spaces/4 spaces/tabs]
- **Quotes**: [single/double]
- **Semicolons**: [always/never/ASI]
- **Trailing commas**: [all/es5/none]
```

---

## Analysis Output Template

After analyzing a package, document:

```markdown
## Package Analysis: {package-name}

### Overview
- **Path**: `packages/{name}`
- **Type**: [Backend/Frontend/Mobile/SDK/Shared]
- **Primary Language**: TypeScript

### Technologies
| Category | Technology |
|----------|------------|
| Framework | [name] |
| State | [name] |
| Styling | [name] |
| Validation | [name] |

### Key Files
- **Entry**: `src/index.ts`
- **Config**: `tsconfig.json`, `package.json`
- **Main**: `src/main.ts`

### Directory Structure
\`\`\`
[structure]
\`\`\`

### Critical Patterns
1. **[Pattern 1]** - [Description]
2. **[Pattern 2]** - [Description]

### Conventions
- [Convention 1]
- [Convention 2]

### Common Mistakes
1. [Mistake 1]
2. [Mistake 2]

### Best Practices
1. [Practice 1]
2. [Practice 2]
```

---

## Package Type Specific Analysis

### Backend (NestJS/Express/Fastify)

Look for:
- Module structure
- Controller patterns
- Service patterns
- DTO patterns
- Database access patterns
- Request context handling
- Authentication/Authorization
- Error handling

### Frontend (React/Next.js)

Look for:
- Component patterns
- Hook patterns
- State management
- Form handling
- Routing patterns
- Data fetching
- Error boundaries

### Mobile (React Native/Expo)

Look for:
- Navigation structure
- Screen patterns
- Platform-specific code
- Native module usage
- Styling approach
- Performance patterns

### SDK/Library

Look for:
- Export patterns
- Type definitions
- Error classes
- Client configuration
- Resource patterns

---

## Quick Analysis Commands

```bash
# List all TypeScript files
find {package-path}/src -name "*.ts" -o -name "*.tsx" | head -20

# Search for specific patterns
grep -r "export function" {package-path}/src --include="*.ts" | head -10
grep -r "export const" {package-path}/src --include="*.ts" | head -10
grep -r "interface " {package-path}/src --include="*.ts" | head -10

# Find main configuration files
ls {package-path}/*.json {package-path}/*.yaml 2>/dev/null

# Check for common patterns
grep -r "useQuery\|useMutation" {package-path}/src --include="*.tsx" | head -5
grep -r "@Injectable\|@Controller" {package-path}/src --include="*.ts" | head -5
```
