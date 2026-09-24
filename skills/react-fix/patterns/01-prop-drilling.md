# Prop Drilling Detection

## What is Prop Drilling

Prop drilling occurs when props are passed through multiple components that
don't actually need them, just to get data from a top-level component to a
deeply nested component that needs it.

## Detection Patterns

### 1. Pass-through Props

Props received but not used directly in the component, only passed to children.

```jsx
// BAD - UserCard receives theme and passes it without using it
function UserCard({ user, theme, onUpdate }) {
  return <UserAvatar theme={theme} onUpdate={onUpdate} />;
}
```

**Detection**: Search for props that appear in JSX but not in component logic.

### 2. Multi-level Prop Passing

Same prop passed 3+ levels down without being used by intermediate components.

```jsx
// Level 1
function App() {
  const theme = useTheme();
  return <Dashboard theme={theme} />;
}
// Level 2
function Dashboard({ theme }) {
  return <Sidebar theme={theme} />;   // not using, just passing
}
// Level 3
function Sidebar({ theme }) {
  return <ThemeToggle theme={theme} />; // still passing
}
// Level 4
function ThemeToggle({ theme }) {
  return <button>{theme.mode}</button>; // finally used
}
```

**Detection**: Trace prop from origin to final consumer, counting levels.

### 3. Context Candidates

When 3+ components at different levels need the same data, consider a
state management solution.

## Refactoring Strategies

### 1. Extract to Context (for rare-changing global values)

Best for: theme, locale, auth user, router. Values that change rarely
and are read everywhere.

```jsx
const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Switch</button>;
}
```

**Critical**: Always memoize the context value. An inline object
`value={{ theme, setTheme }}` creates a new reference every render and
causes ALL consumers to re-render. See `patterns/05-providers-context.md`.

### 2. Zustand (default for app state in 2025-2026)

Best for: medium-complexity app state. Selector subscriptions avoid
Context's whole-tree re-render problem.

```jsx
import { create } from 'zustand';

const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

// Only re-renders when user.name changes (selector)
function UserName() {
  const name = useUserStore((s) => s.user?.name);
  return <span>{name}</span>;
}

// Only re-renders when user changes
function Avatar() {
  const user = useUserStore((s) => s.user);
  return <img src={user?.avatar} />;
}
```

### 3. Jotai (for fine-grained atomic state)

Best for: many independent pieces of state that derive from each other.

```jsx
import { atom, useAtom } from 'jotai';

const userAtom = atom(null);
const userNameAtom = atom((get) => get(userAtom)?.name ?? '');

function UserName() {
  const [name] = useAtom(userNameAtom);
  return <span>{name}</span>; // only re-renders when name changes
}
```

### 4. Composition Pattern (Children/Slots)

Pass components as children instead of data:

```jsx
// BAD - Passing data down
function Layout({ user, content }) {
  return <Sidebar user={user} /><Main>{content}</Main>;
}

// GOOD - Passing components
function Layout({ sidebar, children }) {
  return <Sidebar>{sidebar}</Sidebar><Main>{children}</Main>;
}
```

## Decision Matrix: When to Use What

| Situation | Solution |
|---|---|
| 1-2 levels of drilling, single stable value | **Keep props.** Don't over-engineer. |
| 3+ levels, same prop, rarely changes | **Context** (theme, locale, auth) |
| 3+ levels, same prop, changes often | **Zustand** (selector-based) |
| Many independent derived values | **Jotai** (atomic) |
| Data only relevant to one subtree | **Keep props** or co-locate state |
| Large app, strict structure, time-travel | **Redux Toolkit** |
| React Compiler is enabled | Prop passing is cheap; only refactor for readability |

## Severity Guidelines

| Level | Criteria | Action |
|-------|----------|--------|
| Low | 2 levels of drilling | Monitor. This is often fine. |
| Medium | 3+ levels, same prop | Consider Context or Zustand |
| High | 5+ props passed through 3+ levels | Refactor to state management |

## When Prop Drilling is OK (False Positives)

- **Shallow drilling (1-2 levels)** for a single, stable value. Adding a
  global store for one prop passed to two children is over-engineering.
- **Data only relevant to one subtree.** A store forces a global mental
  model; props keep coupling local and visible.
- **React Compiler is on.** The perf cost of passing the same object down
  is near-zero. The only argument against drilling is readability, not
  performance.
- **Presentational components** receiving props for rendering. This is
  the correct React pattern, not drilling.
