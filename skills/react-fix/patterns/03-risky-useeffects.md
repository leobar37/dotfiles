# Risky useEffects Detection

## The Real Anti-Patterns (2025-2026)

The React team's official line: **"useEffect is for synchronizing with
external systems"**, not for data fetching, not for derived state, not
for transforming props.

### 1. Derived State via Effect (CRITICAL)

The #1 anti-pattern. Computing state from props inside an effect causes
extra renders and stale data.

```jsx
// BAD - derived state via effect (extra render cycle)
function Profile({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    setUser(getUser(userId));  // setState in effect = extra render
  }, [userId]);
  return <div>{user?.name}</div>;
}

// GOOD - compute directly in render
function Profile({ userId }) {
  const user = useMemo(() => getUser(userId), [userId]);
  return <div>{user?.name}</div>;
}

// BEST - if no expensive computation needed
function Profile({ userId }) {
  const user = getUser(userId); // just compute it
  return <div>{user?.name}</div>;
}
```

### 2. Data Fetching in useEffect (CRITICAL)

Race conditions, no cancellation, waterfalls on rapid prop changes.

```jsx
// BAD - race condition: older response overwrites newer
function Search({ query }) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    fetch(`/api/search?q=${query}`).then(r => r.json()).then(setResults);
  }, [query]);
  return <List items={results} />;
}

// GOOD - AbortController + cleanup
function Search({ query }) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(e => { if (e.name !== 'AbortError') throw e; });
    return () => controller.abort();
  }, [query]);
  return <List items={results} />;
}

// BEST - use TanStack Query / SWR (handles caching, dedup, cancellation)
function Search({ query }) {
  const { data: results } = useQuery({
    queryKey: ['search', query],
    queryFn: () => fetch(`/api/search?q=${query}`).then(r => r.json()),
  });
  return <List items={results ?? []} />;
}
```

### 3. State Syncing via Effect (HIGH)

Reinventing lifecycle methods. If you're syncing two states, compute
directly.

```jsx
// BAD - syncing fullName via effect
function NameForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`); // extra render
  }, [firstName, lastName]);
}

// GOOD - compute directly
function NameForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const fullName = `${firstName} ${lastName}`; // no extra render
}
```

### 4. Objects/Arrays in Dependencies (MEDIUM)

Objects and arrays create new references every render, causing the
effect to run unnecessarily.

```jsx
// BAD - new object every render
const options = { timeout: 5000 };
useEffect(() => { fetchData(options); }, [options]);

// FIX - use primitive values
const timeout = 5000;
useEffect(() => { fetchData({ timeout }); }, [timeout]);

// FIX - or useMemo (escape hatch, see React Compiler note below)
const options = useMemo(() => ({ timeout: 5000 }), []);
useEffect(() => { fetchData(options); }, [options]);
```

### 5. Missing Dependencies (HIGH)

Missing dependencies are often "fixed" with eslint-disable, hiding bugs.

```jsx
// BAD - hides missing 'value' dependency
// eslint-disable react-hooks/exhaustive-deps
useEffect(() => { doSomething(value); }, []);

// GOOD - include the dependency
useEffect(() => { doSomething(value); }, [value]);

// ACCEPTABLE - intentional mount-only, documented
useEffect(() => {
  doSomething(value);
  // Intentional: run only on mount. value is stable ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

### 6. Missing Cleanup (CRITICAL)

Missing cleanup causes memory leaks and duplicate handlers. See
`patterns/07-memory-leaks.md` for the full cleanup cheat sheet.

```jsx
// BAD - memory leak
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// GOOD
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

## React Compiler Impact (2025-2026)

React Compiler v1.0 (Oct 2025) auto-memoizes, making manual
`useMemo`/`useCallback` largely unnecessary for new code.

**What changed:**
- The compiler auto-memoizes, including cases manual memoization can't
  handle (after early returns, conditionals).
- New lint rules: `set-state-in-effect`, `set-state-in-render` catch
  render loops at lint time.
- `eslint-plugin-react-hooks` v7 is now compiler-powered (16 rules).

**What still applies:**
- `useMemo`/`useCallback` remain valid as an **escape hatch** to control
  effect dependency identity precisely.
- **Do NOT remove existing memo** from old code without testing. The
  compiler output can change.
- The anti-patterns above (derived state, data fetching) are NOT fixed
  by the compiler. They are logic errors, not memoization issues.

## When useEffect IS Correct (Not a False Positive)

- Subscribing to external systems (WebSocket, Firebase, IntersectionObserver)
- Integrating non-React DOM libs (Chart.js, maps, editors)
- Analytics/performance logging on mount/unmount
- Global event listeners (escape key, window resize)

**Signs you're misusing it:** fetching every render, syncing two states,
many `useEffect + setState` pairs (you're reinventing lifecycle methods),
debugging stale closures.

## Detection Commands

```bash
# Find setState inside useEffect (derived state anti-pattern)
grep -B2 -A5 "useEffect" file.tsx | grep "set[A-Z]"

# Find eslint-disable for exhaustive-deps
grep -n "eslint-disable.*exhaustive-deps" file.tsx

# Find useEffects without return (no cleanup)
grep -Pzo "useEffect\([^)]*\)\s*=>\s*\{[^}]*\}" file.tsx | grep -v "return"

# Find fetch inside useEffect (data fetching anti-pattern)
grep -A10 "useEffect" file.tsx | grep "fetch("
```

## Severity Guidelines

| Issue | Severity | Impact |
|-------|----------|--------|
| Derived state via effect | Critical | Extra render cycle, stale data |
| Data fetching without AbortController | Critical | Race conditions, memory leaks |
| Missing cleanup | Critical | Memory leaks |
| State syncing via effect | High | Extra renders, lifecycle reinvention |
| Missing dependency | High | Stale data |
| eslint-disable without comment | Medium | Hidden bugs |
| Object/array in deps | Medium | Excessive re-runs |
| Function in deps | Medium | Excessive re-runs |
