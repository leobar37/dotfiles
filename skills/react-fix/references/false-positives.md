# False Positives: When "Anti-Patterns" Are Correct

This guide prevents the skill from flagging code that is actually fine.
Read this before reporting a finding as a problem.

## Prop Drilling is OK When...

| Situation | Why it's fine |
|---|---|
| **1-2 levels of drilling** for a single, stable value | Adding a global store for one prop passed to two children is over-engineering. |
| **Data only relevant to one subtree** | A store forces a global mental model. Props keep coupling local and visible. |
| **React Compiler is enabled** | The perf cost of passing the same object down is near-zero. Only refactor for readability. |
| **Presentational components** receiving props for rendering | This is the correct React pattern, not drilling. |

## Large Components are OK When...

| Situation | Why it's fine |
|---|---|
| **Purely presentational JSX** (big static layout, table, config-driven form) | LOC alone is a bad signal. A 400-line table with no state is fine. |
| **Cohesive state unit** that doesn't decompose cleanly | Splitting arbitrarily to hit a LOC target creates prop drilling and worse readability. |
| **State that must change together** | State that must change together should live together. Extraction would break co-location. |
| **Custom hooks already extracted** | High hook count in the component is fine if the heavy logic is in hooks. |

## useEffect is Correct When...

| Situation | Why it's fine |
|---|---|
| **Subscribing to external systems** (WebSocket, Firebase, IntersectionObserver) | This is the canonical use case for useEffect. |
| **Integrating non-React DOM libs** (Chart.js, maps, editors) | useEffect is the bridge to imperative APIs. |
| **Analytics/performance logging** on mount/unmount | Legitimate lifecycle observation. |
| **Global event listeners** (escape key, window resize) | Correct use; just ensure cleanup. |
| **Async setState in effect** (responding to websocket message) | The lint rule `set-state-in-effect` flags SYNC setState. Async is legitimate. |

**Signs you're misusing it:** fetching every render, syncing two states,
many `useEffect + setState` pairs, debugging stale closures.

## useMemo / useCallback are Still Valid When...

| Situation | Why it's fine |
|---|---|
| **Controlling effect dependency identity** | The escape hatch use case. React Compiler docs acknowledge this. |
| **Existing code already has memo** | Do NOT remove existing memo without testing. Compiler output can change. |
| **React Compiler is not enabled** | If the compiler isn't on, manual memo is still the correct approach. |
| **Expensive computation** that runs on every render | Even with the compiler, explicit memo documents intent. |

## Context is the Right Call When...

| Situation | Why it's fine |
|---|---|
| **Theme/locale/auth user** | Changes rarely, read everywhere. Context's re-render cost is irrelevant. |
| **Router state** | Changes infrequently relative to renders. |
| **Dependency injection** of a service/config | Context is designed for this. |

## HOCs are Acceptable When...

| Situation | Why it's fine |
|---|---|
| **Library wrapping arbitrary components** | `withTranslation`, `connect` - can't rewrite every consumer. |
| **Error/Suspense boundaries** | These MUST be tree components. |
| **Class-component interop** | HOC is the ergonomic option for class sharing. |
| **Cross-cutting concerns on many call sites** | Analytics/auth gating without per-site customization. |

## "Memory Leaks" That Aren't

| Situation | Why it's not a leak |
|---|---|
| **setState on unmounted component** (pre-React 19) | React treats it as a no-op. Warning removed in React 19. The real leak is the surrounding subscription/timer. |
| **Pending fetch promises** | Resolve/reject once, then GC-able. Not a leak by itself. |
| **Large data in a closure temporarily** | Frees when the async op completes. Transient, not permanent. |
| **React fiber/commit data** | Normal reconciliation bookkeeping. Not user-actionable. |

## Rules for the Analyzer

1. **Always check context before flagging.** A 300-line component that is
   purely JSX is not a "large component" problem.
2. **Check if React Compiler is enabled** before recommending useMemo/useCallback.
3. **Check if a hook already extracts the logic** before flagging high hook count.
4. **Check cleanup exists** before flagging "useEffect without cleanup."
5. **Distinguish sync vs async setState in effects.** Only sync is an anti-pattern.
6. **Check prop drilling depth.** 1-2 levels is not a problem.
7. **Check if Context value is memoized** before flagging re-render issues.
