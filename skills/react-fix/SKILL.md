---
name: react-fix
description: |
  Analyze React code for prop drilling, large components, risky useEffects,
  hook separation issues, provider/context anti-patterns, HOC misuse, and
  memory leaks. Detecta codigo con problemas comunes y sugiere refactoring
  usando hooks, context, Zustand/Jotai, y patrones modernos de React 18-19.

  Triggers: react:fix, react:drilling, analyze react, fix react, react analysis,
  componentes grandes, prop drilling, memory leak, hooks, providers, context,
  hoc, useeffect.

  Accepts: path to file/folder (e.g., "src/components") or feature description
  (e.g., "users management")
---

# React Code Quality Analysis

Expert in analyzing React code for common anti-patterns and providing
actionable refactoring suggestions. Updated for React 18-19 and the
React Compiler era (2025-2026).

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18-19 | UI Library |
| TypeScript | Type safety |
| ESLint + eslint-plugin-react-hooks v7 | Static analysis (compiler-powered) |
| React Compiler | Auto-memoization (if enabled) |
| Zustand / Jotai | Modern state management alternatives |
| Grep/Glob | Code searching |

## Quick Start

```typescript
// Given input: "$ARGUMENTS"

// 1. Determine if path or feature description
// 2. Find React files using Glob
// 3. Analyze each category (7 categories)
// 4. Check false positives before reporting (see references/false-positives.md)
// 5. Generate report with severity + reproduction steps
```

## Analysis Categories

```
┌─────────────────────────────────────────────┐
│         React Code Analysis (7 categories)   │
├─────────────────────────────────────────────┤
│  1. Prop Drilling Detection                  │
│     - Pass-through props                     │
│     - Multi-level prop passing               │
│     - Context/Zustand/Jotai candidates       │
│     - When NOT to refactor (false positives) │
├─────────────────────────────────────────────┤
│  2. Large Component Detection                │
│     - useState/useEffect count               │
│     - LOC / Props count                      │
│     - Re-render blast radius                 │
│     - useReducer vs multiple useState        │
│     - Context-aware thresholds               │
├─────────────────────────────────────────────┤
│  3. Risky useEffects Detection               │
│     - Derived state via effect (CRITICAL)    │
│     - Data fetching without AbortController  │
│     - State syncing via effect               │
│     - Missing dependencies / cleanup         │
│     - React Compiler impact                  │
├─────────────────────────────────────────────┤
│  4. Hook Separation & Composition            │
│     - When to extract custom hooks           │
│     - Anti-patterns (JSX in hooks, lifecycles)│
│     - Subtle Rules of Hooks violations       │
│     - useReducer vs useState                 │
├─────────────────────────────────────────────┤
│  5. Providers & Context                      │
│     - Value identity (inline objects)        │
│     - Split state/dispatch                   │
│     - Provider hell                          │
│     - Context vs Zustand vs Jotai            │
├─────────────────────────────────────────────┤
│  6. HOC Patterns                             │
│     - Legacy vs modern alternatives          │
│     - Anti-patterns (refs, displayName)      │
│     - Correct TS implementation              │
│     - When HOCs still make sense             │
├─────────────────────────────────────────────┤
│  7. Memory Leaks                             │
│     - Timers, listeners, subscriptions       │
│     - AbortController for fetch              │
│     - Closures retaining large objects       │
│     - State management leaks                 │
│     - Detection tools                        │
│     - False positives                        │
└─────────────────────────────────────────────┘
```

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Prop Drilling** | `patterns/01-prop-drilling.md` | Detection, Context/Zustand/Jotai, false positives |
| **Large Components** | `patterns/02-large-components.md` | Context-aware thresholds, blast radius, useReducer |
| **Risky useEffects** | `patterns/03-risky-useeffects.md` | Derived state, data fetching, React Compiler impact |
| **Hook Separation** | `patterns/04-hooks-separation.md` | Extraction, composition, anti-patterns, Rules violations |
| **Providers & Context** | `patterns/05-providers-context.md` | Value identity, split, provider hell, Context vs Zustand |
| **HOCs** | `patterns/06-hocs.md` | Legacy vs modern, anti-patterns, TS implementation |
| **Memory Leaks** | `patterns/07-memory-leaks.md` | All causes, cleanup cheat sheet, detection, false positives |
| **False Positives** | `references/false-positives.md` | When each pattern is acceptable. READ BEFORE REPORTING. |

## Detection Thresholds (Context-Aware)

| Metric | Warning | Critical | Exception |
|--------|---------|----------|-----------|
| useState count | > 5 | > 10 | Form components (use useReducer) |
| useEffect count | > 3 | > 5 | External sync hooks (valid) |
| Lines of code | > 200 | > 400 | Pure JSX presentational |
| Props count | > 7 | > 12 | Layout/wrapper components |
| Hook count (total) | > 7 | > 12 | Custom hooks extracted |
| Re-render blast radius | > 10 | > 30 | Measure via DevTools Profiler |
| Prop drilling depth | > 2 levels | > 4 levels | Single stable value (OK at 2) |

## Key Principles

1. **Single Responsibility**: Components should do one thing well
2. **Composition over Prop Passing**: Use Context/Zustand for shared state
3. **useEffect is for external sync**: Not for derived state or data fetching
4. **Always cleanup**: Return cleanup functions for every side effect
5. **Check false positives first**: Not every "anti-pattern" is a problem
6. **React Compiler changes the game**: Don't recommend useMemo/useCallback as first choice
7. **State co-location**: Keep state near where it's read

## Tooling

| Tool | Purpose |
|------|---------|
| `eslint-plugin-react-hooks` v7 | Compiler-powered linting (16 rules) |
| `@eslint-react` v5.8+ | Additional React rules (no leaked rendering, etc.) |
| React Compiler | Auto-memoization + diagnostics |
| React DevTools Profiler | Re-render blast radius measurement |
| Chrome DevTools Memory | Heap snapshots for leak detection |
| `why-did-you-render` | Unnecessary re-render detection |

## When to Use

- Analyzing React codebases for quality issues
- Refactoring large components
- Fixing performance issues from re-renders
- Detecting memory leaks
- Reviewing hook usage and Context patterns
- Auditing HOC usage for modernization
- Implementing Context/Zustand instead of prop drilling

## Output Format

Generates a structured report with:

- **Critical Issues**: High-priority problems requiring immediate attention
  (includes reproduction steps)
- **Warnings**: Medium-priority issues to address
- **Statistics**: Counts of analyzed files and issues found
- **Refactoring Plan**: Actionable steps for each category
- **False Positive Check**: Confirmation that each finding was checked
  against `references/false-positives.md`

## Dependencies

```json
{
  "react": "^18.x || ^19.x",
  "typescript": "^5.x"
}
```
