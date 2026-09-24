# Memory Leaks Detection

## Core Principle

JavaScript's GC frees only *unreachable* objects. A React leak is almost
always a **side effect that outlives its component** and keeps references
(state, props, DOM nodes) reachable.

## Known Causes and Cleanup Patterns

### Timers (setInterval / setTimeout)

```jsx
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

### Event Listeners

```jsx
useEffect(() => {
  const handleResize = () => { /* ... */ };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Subscriptions (WebSocket / event emitters / Firebase)

```jsx
useEffect(() => {
  const socket = new WebSocket('wss://example.com');
  socket.onmessage = e => setMessages(prev => [...prev, e.data]);
  return () => socket.close();
}, []);

useEffect(() => {
  const unsubscribe = messageService.subscribe(msg => setMessages(prev => [...prev, msg]));
  return () => unsubscribe();
}, []);
```

### Fetch with AbortController

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/data?id=${id}`, { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(e => { if (e.name !== 'AbortError') throw e; });
  return () => controller.abort();
}, [id]);
```

### Refs holding DOM/media nodes

```jsx
useEffect(() => {
  if (videoRef.current) videoRef.current.play();
  return () => { videoRef.current = null; };
}, []);
```

### Observers (Intersection / Mutation / Resize)

```jsx
useEffect(() => {
  const observer = new IntersectionObserver(entries => { /* ... */ });
  if (targetRef.current) observer.observe(targetRef.current);
  return () => observer.disconnect();
}, []);
```

### requestAnimationFrame loops

```jsx
useEffect(() => {
  let frameId: number;
  const animate = () => {
    frameId = requestAnimationFrame(animate);
  };
  frameId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(frameId);
}, []);
```

## Cleanup Cheat Sheet

| Side effect | Setup | Cleanup return |
|---|---|---|
| `setInterval` / `setTimeout` | store id | `clearInterval(id)` / `clearTimeout(id)` |
| `addEventListener` | add | `removeEventListener(...)` |
| WebSocket | `new WebSocket(...)` | `socket.close()` |
| Pub/sub subscription | `subscribe(cb)` | `unsubscribe()` |
| `fetch` | `AbortController` | `controller.abort()` |
| `requestAnimationFrame` | store frame id | `cancelAnimationFrame(id)` |
| Intersection/Mutation/ResizeObserver | `observe(el)` | `observer.disconnect()` |
| EventSource (SSE) | `new EventSource(...)` | `source.close()` |
| External object | construct | `instance.destroy()` / null ref |

## Memory Leaks from Closures

A closure captures every variable it references. If a callback captured a
large array/object, that object stays alive as long as the callback lives.

```jsx
// BAD: bigData retained until promise settles
const bigData = new Array(1_000_000);
fetch('/api').then(() => { console.log(bigData); });

// BAD: stale state captured in interval
setInterval(() => setCount(count + 1), 1000); // captures old count

// GOOD: functional updater avoids capturing stale state
setInterval(() => setCount(prev => prev + 1), 1000);
```

## Refs Causing Leaks

Refs persist for the component's lifetime and aren't auto-nulled on
unmount. Holding refs to DOM nodes, WebSocket instances, or unmounted
components prevents GC.

```jsx
// BAD: ref never cleared
const wsRef = useRef(null);
useEffect(() => {
  wsRef.current = new WebSocket('wss://...');
}, []);

// GOOD: clear on cleanup
useEffect(() => {
  wsRef.current = new WebSocket('wss://...');
  return () => {
    wsRef.current?.close();
    wsRef.current = null;
  };
}, []);
```

## Memory Leaks in State Management

| Cause | Fix |
|---|---|
| Zustand store growing unbounded (logs, notifications, messages) | Cap/evict collections. Scope transient state to component lifetime. |
| `useSyncExternalStore` without unsubscribe | Store's `subscribe` must return an unsubscribe function. |
| Context values growing unboundedly | Split, prune, or move high-volume data to selector-based store. |
| Selectors creating new objects each call | Use `shallow` equality or `useShallow`. |

```jsx
// BAD: Zustand store grows forever
const useStore = create((set) => ({
  logs: [],
  addLog: (log) => set((s) => ({ logs: [...s.logs, log] })), // unbounded
}));

// GOOD: cap the collection
const useStore = create((set) => ({
  logs: [],
  addLog: (log) => set((s) => ({ logs: [...s.logs, log].slice(-100) })), // max 100
}));
```

## Detection

### Chrome DevTools Memory tab
1. Take heap snapshot.
2. Perform the suspected leak action (mount/unmount, navigate).
3. Force GC (DevTools > Memory > Collect garbage).
4. Take another snapshot.
5. Search for the function/object name. If it persists, something keeps it alive.

### React DevTools Profiler
- Reveals components rendering unexpectedly.
- Effects running without cleanup.
- Components staying mounted longer than expected.

### why-did-you-render
Logs unnecessary re-renders (helps find retention-driven re-renders and
stale closures).

```jsx
// Manual render counter for debugging
function ContextDebugger({ name }) {
  const renderCount = useRef(0);
  renderCount.current += 1;
  useEffect(() => console.log(`${name} rendered ${renderCount.current} times`));
  return null;
}
```

## Common False Positives (Not Real Leaks)

- **"setState on unmounted component" warning (pre-React 19)**: React treats
  the late `setState` as a no-op. The warning was a heads-up, not proof of
  a leak. React 19 removed this warning entirely. The real leak is when
  the surrounding subscription/timer keeps running, not the `setState` itself.

- **Pending fetch promises**: A `fetch` promise resolves/rejects once and is
  then GC-able. By itself not a leak. Leaks come from uncleaned
  subscriptions/timers around it.

- **Large data temporarily captured in a closure**: Transient retention, not
  permanent. It frees when the async op completes. Still worth optimizing
  (abort, capture less).

- **React keeping fiber/commit data briefly**: Normal reconciliation
  bookkeeping. Not user-actionable.

## Detection Commands

```bash
# Find useEffects without cleanup (heuristic)
grep -Pzo "useEffect\(\(\) => \{[^}]*\}, \[" file.tsx | grep -v "return"

# Find intervals/timeouts without cleanup
grep -n "setInterval\|setTimeout" file.tsx

# Find event listeners without removeEventListener
grep -n "addEventListener" file.tsx

# Find WebSocket without close
grep -n "new WebSocket" file.tsx

# Find refs that are never nulled
grep -n "useRef" file.tsx
```

## Severity Guidelines

| Issue | Severity | Impact |
|---|---|---|
| Event listener without cleanup | Critical | Memory leak, duplicate handlers |
| WebSocket/subscription without cleanup | Critical | Memory leak, duplicate connections |
| Timer without cleanup | Critical | Memory leak, continues after unmount |
| Fetch without AbortController | High | Race conditions, closure retention |
| Ref not nulled on unmount | Medium | DOM node retention |
| Unbounded store growth | Medium | Gradual memory increase |
| Observer without disconnect | High | Memory leak, observation continues |
