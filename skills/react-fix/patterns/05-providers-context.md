# Providers and Context Patterns

## Context Value Identity (CRITICAL)

`<Context.Provider value={...}>` triggers a re-render of **every consumer**
when the value's referential identity changes. An inline object literal is
a new object on every render, causing ALL consumers to re-render every
render, even if nothing changed.

```jsx
// BAD: new object every render -> all consumers re-render
<AppContext.Provider value={{ user, theme, setUser, setTheme }}>

// GOOD: stable identity
const contextValue = useMemo(() => ({ user, theme, setUser, setTheme }), [user, theme]);
<AppContext.Provider value={contextValue}>
```

**Note**: Setters from `useState`/`useReducer` are stable references and
do NOT need to be in the `useMemo` dependency array.

## Splitting Contexts

### Split by domain/update frequency

Put rarely-changing data (auth, theme) in its own context so a
high-frequency context (notifications, live data) doesn't re-render
theme-only consumers.

### Split state from dispatch

With a reducer, `dispatch` is stable. Consumers that only dispatch never
need to re-render when state changes.

```jsx
const CartStateContext = createContext(undefined);
const CartDispatchContext = createContext(undefined);

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });
  return (
    <CartStateContext.Provider value={state}>
      <CartDispatchContext.Provider value={dispatch}>
        {children}
      </CartDispatchContext.Provider>
    </CartStateContext.Provider>
  );
}

export const useCartState = () => {
  const ctx = useContext(CartStateContext);
  if (!ctx) throw new Error('useCartState must be used within CartProvider');
  return ctx;
};

export const useCartDispatch = () => {
  const ctx = useContext(CartDispatchContext);
  if (!ctx) throw new Error('useCartDispatch must be used within CartProvider');
  return ctx;
};

// Only re-renders when cart state changes
function CartSummary() {
  const { items, total } = useCartState();
  return <p>{items.length} items</p>;
}

// NEVER re-renders due to cart state changes
function AddToCartButton({ product }) {
  const dispatch = useCartDispatch();
  return <button onClick={() => dispatch({ type: 'ADD_ITEM', payload: product })}>Add</button>;
}
```

## Provider Nesting Anti-Patterns ("Provider Hell")

```jsx
// BAD: provider hell
<ThemeProvider>
  <AuthProvider>
    <UserProvider>
      <NotificationProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </NotificationProvider>
    </UserProvider>
  </AuthProvider>
</ThemeProvider>

// GOOD: compose into one Providers component
function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <NotificationProvider>
            <CartProvider>{children}</CartProvider>
          </NotificationProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
// Usage: <Providers><App /></Providers>
```

## When Context is the Wrong Tool

Context is **not** a full state manager. Avoid it for:

| Case | Why | Use instead |
|---|---|---|
| High-frequency updates (mouse, scroll, animation) | Every consumer re-renders on each change | Zustand with selectors |
| Fine-grained subscriptions | `useContext` has no selector; subscribes to whole value | `use-context-selector` or Zustand |
| Global store with many unrelated slices | Independent slices cause cross-renders | Zustand/Jotai/Redux |
| Rapid form typing across components | Each keystroke re-renders all consumers | Local state or Zustand selector |

## Context vs Zustand vs Jotai

| Tool | Model | Best for |
|---|---|---|
| **Context** | Value injection; whole-value subscription | Rare-changing global data: theme, locale, auth, router |
| **Zustand** | Single store + selector (`useStore(s => s.x)`) | Medium app state, ergonomic, fine-grained selectors |
| **Jotai** | Atomic, bottom-up (`atom` + `useAtom`) | Fine-grained, composable reactive state |
| **Redux Toolkit** | Single store, dispatch + selectors | Large apps, time-travel debugging, strict patterns |

**Rule of thumb (2025-2026)**: Context for *passing* values; Zustand/Jotai
for *state that updates a lot* and needs selective subscriptions. Don't
reach for a store until Context + splitting + selectors are demonstrably
insufficient.

## use-context-selector

For cases where you want Context's simplicity but need selective
subscriptions:

```jsx
import { createContext, useContextSelector } from 'use-context-selector';

const AppContext = createContext({ user: { name: '' }, theme: 'dark', notifications: [] });

function UserName() {
  const userName = useContextSelector(AppContext, ctx => ctx.user.name);
  return <span>{userName}</span>; // re-renders only when name changes
}
```

## Detection Commands

```bash
# Find inline context values (anti-pattern)
grep -Pzo 'Provider value=\{[^}]*[^m][^e][^m][^o]([^}]*)\}' file.tsx

# Find provider nesting depth
grep -c "Provider" file.tsx

# Find contexts without memoized values
grep -B5 "Context.Provider" file.tsx | grep -v "useMemo"
```
