# Large Component Detection

## Thresholds (Context-Aware)

The old approach used rigid LOC and hook count limits. In 2025-2026,
thresholds must account for **component type**: a 400-line presentational
table is fine; a 200-line component with 8 useState is not.

| Metric | Warning | Critical | Exception |
|--------|---------|----------|-----------|
| useState count | > 5 | > 10 | Form components (use useReducer instead) |
| useEffect count | > 3 | > 5 | External sync hooks (valid use) |
| Lines of code | > 200 | > 400 | Pure JSX presentational |
| Props count | > 7 | > 12 | Layout/wrapper components |
| Hook count (total) | > 7 | > 12 | Custom hooks extracted |
| Render tree depth | > 4 | > 8 | Recursive structures |
| Re-render blast radius | > 10 components | > 30 | See below |

## Detection Patterns

### 1. Multiple useState (related state)

Component managing too much independent state that should be consolidated:

```jsx
// CRITICAL - 8 useState that all relate to form state
function UserForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({});
}
```

**Fix**: Use `useReducer` when state fields update together:

```jsx
const [state, dispatch] = useReducer(formReducer, {
  name: '', email: '', phone: '', address: '',
  loading: false, error: null, success: false, touched: {},
});
```

See `patterns/04-hooks-separation.md` for useReducer vs useState guidance.

### 2. Multiple Responsibilities

Component doing data fetching, UI, forms, validation all at once:

```jsx
// BAD - Data fetching + form + business logic + UI
function Dashboard() {
  const [users, setUsers] = useState([]);   // fetching
  const [formData, setFormData] = useState({}); // form
  const [processed, setProcessed] = useState([]); // business
  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => { processData(); }, [users]);
  // ... 500+ lines
}
```

### 3. Re-render Blast Radius

The real performance metric: how many components re-render when one
state changes. Measure via React DevTools Profiler.

```jsx
// BAD - State at top causes entire tree to re-render
function App() {
  const [filter, setFilter] = useState('all'); // changes often
  return (
    <Header />        // re-renders on filter change (unnecessary)
    <Sidebar />       // re-renders on filter change (unnecessary)
    <List filter={filter} />
    <Footer />        // re-renders on filter change (unnecessary)
  );
}

// GOOD - State co-located where it's needed
function App() {
  return (
    <Header />
    <Sidebar />
    <FilterableList />  {/* filter state lives here */}
    <Footer />
  );
}
function FilterableList() {
  const [filter, setFilter] = useState('all');
  return <List filter={filter} />;
}
```

### 4. Extract Indicators

Look for comments and patterns indicating the component should be split:

```
// TODO: extract to separate component
// Split this component
// This should be its own hook
```

## Refactoring Strategies

### 1. Extract Custom Hooks

Move reusable stateful logic to hooks (see `patterns/04-hooks-separation.md`):

```jsx
// BEFORE - Logic mixed with UI
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${userId}`).then(setUser).catch(setError).finally(() => setLoading(false));
  }, [userId]);
  // ... rest of component
}

// AFTER - Custom hook
function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/users/${userId}`, { signal: controller.signal })
      .then(r => r.json()).then(setUser).catch(setError)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [userId]);
  return { user, loading, error };
}

function UserProfile({ userId }) {
  const { user, loading, error } = useUser(userId);
  // ... clean UI code
}
```

### 2. Split by Responsibility

Separate fetching, forms, and display into focused components.

### 3. useReducer for Complex State

When multiple state fields transition together, use `useReducer`:

```jsx
const [state, dispatch] = useReducer(formReducer, initialState);
// dispatch({ type: 'SET_FIELD', field: 'name', value: 'John' })
// dispatch({ type: 'SET_LOADING', value: true })
```

### 4. Composition (Children/Slot Pattern)

Pass components as children instead of managing everything:

```jsx
function DashboardLayout({ children }) {
  return <div className="dashboard">{children}</div>;
}
```

## Detection Commands

```bash
# Count useState per file
grep -c "useState(" file.tsx

# Count useEffect per file
grep -c "useEffect(" file.tsx

# Count lines in component
wc -l file.tsx

# Find components with many props (destructured)
grep -P "function \w+\(\{[^}]{50,}\}" file.tsx
```

## Severity Guidelines

| Level | Criteria | Action |
|-------|----------|--------|
| Low | 5-7 useState, 200-300 LOC, presentational | Monitor |
| Medium | 8-10 useState, 300-400 LOC, mixed responsibilities | Extract hooks |
| High | 10+ useState, 400+ LOC, blast radius > 20 | Full refactor |
| Skip | Pure JSX, no logic, cohesive | Not a problem |
