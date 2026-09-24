# HOC (Higher-Order Component) Patterns

## Status in 2025-2026: Largely Legacy

The React legacy docs state: *"Higher-order components are not commonly
used in modern React code."* The community has moved to **hooks** for
code reuse because:
- A hook adds zero nodes to the tree.
- No `displayName`/ref-forwarding bookkeeping.
- Branching logic stays visible inside the component body.
- React Compiler analyzes component bodies better than opaque HOC wrappers.

## When HOCs Still Make Sense

| Use case | Why HOC is valid |
|---|---|
| **Library wrappers** (`withTranslation`, legacy `withRouter`) | Must wrap any component shape without rewriting consumers |
| **Class-component interop** | HOC is the ergonomic option for sharing logic with classes |
| **Error/Suspense boundaries** | These MUST be tree components; `withErrorBoundary` is reasonable |
| **Cross-cutting concerns** (analytics, auth gating) applied to many call sites with no per-site customization | HOC avoids repeating wrapper JSX everywhere |

## Modern Alternatives (Preferred)

| Need | HOC | Modern alternative |
|---|---|---|
| Reusable stateful logic | `withX(Component)` | Custom hook (`useX()`) |
| Cross-cutting render behavior | Wrapper HOC | Composition with `children` / compound components |
| Customizable per-call-site | Parameterized HOC | Render prop / hook with args |
| Sharing state across tree | `withAuth` | Context + `useAuth()` hook |
| Feature flags | `withFeatureFlag` | `useFlag()` hook + branch in component |

```jsx
// HOC version (legacy)
const PricingPage = withFeatureFlag('pricing_redesign', PricingPageNew, PricingPageLegacy);

// Hook version (modern) - no wrapper node, logic visible
function PricingPage(props) {
  const showRedesign = useFlag('pricing_redesign');
  return showRedesign ? <PricingPageNew {...props} /> : <PricingPageLegacy {...props} />;
}
```

## Common HOC Anti-Patterns

1. **Not forwarding refs**: `ref` points at the wrapper, not the wrapped
   component. Use `React.forwardRef` (or on React 19+, pass `ref` as a
   normal prop).

2. **Losing static methods**: `MyComponent.fetchData` doesn't exist on the
   wrapper. Use `hoist-non-react-statics`.

3. **Missing `displayName`**: DevTools shows anonymous wrappers. Always set it.

4. **Prop name collisions**: Injected prop clashes with a parent-supplied
   prop. Prefer namespacing (`auth={...}`, `analytics={...}`).

5. **Wrapper hell**: 10 layers makes DevTools and stack traces unreadable.

## Correct HOC Implementation with TypeScript

```tsx
import { forwardRef, useEffect } from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';

export function withAnalytics<P extends object>(
  Wrapped: React.ComponentType<P>,
  eventName: string,
) {
  const WithAnalytics = forwardRef<HTMLElement, P>((props, ref) => {
    useEffect(() => {
      track(eventName, { path: window.location.pathname });
    }, []);
    return <Wrapped ref={ref} {...props} />;
  });

  hoistNonReactStatics(WithAnalytics, Wrapped);
  WithAnalytics.displayName = `withAnalytics(${Wrapped.displayName ?? Wrapped.name ?? 'Component'})`;
  return WithAnalytics;
}

// Usage - full IntelliSense on CheckoutPageProps preserved
export default withAnalytics(CheckoutPage, 'checkout_viewed');
```

**Key points:**
- Generic `P extends object` preserves the wrapped component's prop types.
- Spread `{...props}`.
- Set `displayName`.
- Use `hoistNonReactStatics` for static method passthrough.
- Use `forwardRef` for ref passthrough.

## Composing Multiple HOCs

```tsx
const compose = (...hocs: HOC[]) => (Component: ComponentType) =>
  hocs.reduceRight((acc, hoc) => hoc(acc), Component);

export default compose(
  withErrorBoundary({ fallback: <ErrorView /> }),
  withAuthorization({ requiredRole: 'admin' }),
  withAnalytics('admin_viewed'),
)(AdminDashboard);
```

## Detection Commands

```bash
# Find HOCs
grep -rn "function with[A-Z]\|const with[A-Z].*=" src/ --include="*.tsx" --include="*.ts"

# Find HOCs without displayName
grep -A20 "function with[A-Z]" file.tsx | grep -v "displayName"

# Find HOCs without forwardRef
grep -A20 "function with[A-Z]" file.tsx | grep -v "forwardRef"

# Find deep HOC composition
grep -P "with\w+\(with\w+\(with\w+\(" src/
```

## Severity Guidelines

| Issue | Severity | Action |
|---|---|---|
| HOC without displayName | Low | Add for DevTools clarity |
| HOC without forwardRef | Medium | Add for ref passthrough |
| HOC without hoistNonReactStatics | Medium | Static methods lost |
| HOC where a hook would work | Medium | Migrate to hook |
| 5+ nested HOCs | High | Refactor to hooks or composition |
| Prop name collision | High | Namespace injected props |
