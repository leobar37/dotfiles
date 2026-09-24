# Hook Separation and Composition

## When to Extract a Custom Hook

### Extract when:
- The same stateful logic (state + effect) is duplicated across 2+ components.
- An effect synchronizes with an external system and you want to express
  intent over implementation.
- The logic is non-trivial (timers, subscriptions, fetch, observers) and
  hiding it makes the component read top-to-bottom.

### Do NOT extract when:
- The "logic" is a single `useState` wrapping an input. The React docs
  explicitly call `useFormInput` for one `useState` "probably unnecessary."
- The function calls no hooks at all. Name it a regular helper (`getSorted`),
  not `useSorted`, so it can be called conditionally.

```jsx
// GOOD extraction - duplicated fetch logic
function useData(url) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!url) return;
    let ignore = false;
    fetch(url).then(r => r.json()).then(json => { if (!ignore) setData(json); });
    return () => { ignore = true; };
  }, [url]);
  return data;
}

// Usage - two independent instances
function ShippingForm({ country }) {
  const cities = useData(`/api/cities?country=${country}`);
  const [city, setCity] = useState(null);
  const areas = useData(city ? `/api/areas?city=${city}` : null);
}
```

## Hook Composition

Custom hooks can call other hooks. Each call is **completely independent**,
they share stateful logic, not state itself.

```jsx
function useChatRoom({ serverUrl, roomId, onReceiveMessage }) {
  const onMessage = useEffectEvent(onReceiveMessage); // removes from deps
  useEffect(() => {
    const connection = createConnection({ serverUrl, roomId });
    connection.connect();
    connection.on('message', msg => onMessage(msg));
    return () => connection.disconnect();
  }, [roomId, serverUrl]); // onReceiveMessage NOT a dependency
}
```

**Gotchas:**
- Custom hooks re-run on every render of the consuming component. Their
  bodies must be **pure** (like a component body).
- Pass reactive values between hooks to keep them up-to-date.
- Wrap event handlers received as props in `useEffectEvent` so they don't
  retrigger the effect on every render.

## Anti-Patterns in Custom Hooks

| Anti-pattern | Why it's bad | Fix |
|---|---|---|
| **Returning JSX from a hook** | Conflates logic with rendering. Hooks return data, components return JSX. | Return state/handlers; let the component render. |
| **Custom lifecycle hooks** (`useMount`, `useEffectOnce`) | The linter can't see missing deps inside them. Bugs go uncaught. | Use raw `useEffect` with explicit deps, or a focused domain hook. |
| **Hooks managing too many concerns** | Hard to name and reuse. If you can't pick a clear name, split it. | One hook = one responsibility. |
| **Side effects in render** | Mutating refs or external state during render breaks purity. | Confine side effects to event handlers and effects. |
| **`use` prefix on non-hooks** | Misleads readers. | Use a plain helper name (`getSorted`, not `useSorted`). |

```jsx
// BAD: lifecycle hook hides missing dependencies
function useMount(fn) {
  useEffect(() => { fn(); }, []); // 'fn' missing from deps, linter can't warn
}

// BAD: returning JSX from a hook
function useUserCard() {
  const user = useUser();
  return <Card>{user.name}</Card>; // render logic hidden behind a hook
}
```

## useReducer vs Multiple useState

| Prefer `useState` when | Prefer `useReducer` when |
|---|---|
| State is one or a few independent primitives | Many state fields update together |
| Next state is computed simply from new value | Next state depends on previous state in non-trivial ways |
| Logic is local to one component | Same transitions needed in multiple places |
| You want minimal boilerplate | You want explicit, testable transitions |

```jsx
// useReducer for related state
type CartAction = { type: 'ADD_ITEM'; payload: CartItem } | { type: 'CLEAR_CART' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': return { items: [...state.items, action.payload], total: state.total + action.payload.price };
    case 'CLEAR_CART': return { items: [], total: 0 };
    default: return state;
  }
}
const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });
```

## Subtle Rules of Hooks Violations

The Rules: (1) only call Hooks at the top level (not in loops/conditions);
(2) only call Hooks from React functions.

| Violation | Example | Fix |
|---|---|---|
| **Conditional hooks** | `if (x) useState(...)` | Always call the hook; pick initial value conditionally. |
| **Hooks in callbacks** | `onClick={() => useState(...)}` | Lift state up, or render a child component per item. |
| **Hooks after early returns** | `return null` before `useEffect` | Move all hook calls above any early return. |
| **Hooks in loops** | `items.map(() => useState(...))` | Render a child component per item. |

```jsx
// BAD: hook after early return
function Profile({ user }) {
  if (!user) return null;          // changes hook count between renders
  const [tab, setTab] = useState(0);
  useEffect(() => { /* ... */ }, [tab]);
  return <Tabs value={tab} />;
}

// GOOD: all hooks first, then early return
function Profile({ user }) {
  const [tab, setTab] = useState(0);
  useEffect(() => { /* ... */ }, [tab]);
  if (!user) return null;
  return <Tabs value={tab} />;
}
```

## Detection Commands

```bash
# Find custom hooks
grep -rn "function use[A-Z]" src/ --include="*.tsx" --include="*.ts"

# Find hooks after early returns (heuristic)
grep -n "return null" file.tsx  # then check if hooks appear after

# Find lifecycle hooks (anti-pattern)
grep -rn "useMount\|useEffectOnce\|useUpdateEffect\|useDidMount\|useWillUnmount" src/

# Find hooks returning JSX (anti-pattern)
grep -A5 "function use[A-Z]" file.tsx | grep "return <"

# Find use prefix on non-hooks
grep -rn "function use[A-Z]" src/ | xargs grep -L "useState\|useEffect\|useRef\|useMemo\|useCallback\|useContext\|useReducer"
```
