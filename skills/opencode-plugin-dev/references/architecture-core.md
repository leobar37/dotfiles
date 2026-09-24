# Core Architecture: Instance, State, Bus, Flag

Understanding the foundation that every plugin runs on.

---

## Context — Thread-Local for JavaScript

**File:** `packages/opencode/src/util/context.ts` (24 lines)

A wrapper around Node.js `AsyncLocalStorage`. Everything inside `provide(value, fn)` can read that value with `use()`.

```typescript
import { AsyncLocalStorage } from "async_hooks"

export namespace Context {
  export function create<T>(name: string) {
    const storage = new AsyncLocalStorage<T>()
    return {
      use() {
        const result = storage.getStore()
        if (!result) throw new NotFound(name)
        return result
      },
      provide<R>(value: T, fn: () => R) {
        return storage.run(value, fn)
      }
    }
  }
}
```

**Why it matters:** `Instance.directory`, `Instance.project`, and all per-project state are read from `context.use()`. The context is set once in `Instance.provide()` and flows through all async code automatically.

---

## Instance — Everything Lives Inside a Project

**File:** `packages/opencode/src/project/instance.ts` (154 lines)

Each directory OpenCode opens becomes an **Instance** that:
1. Discovers the project (git, worktree)
2. Provides context via `AsyncLocalStorage`
3. Runs bootstrap (plugins, LSP, file watcher)
4. Exposes `Instance.state()` for lazy subsystem initialization

### API

```typescript
export const Instance = {
  // Entry point
  provide<R>(input: { directory: string; init?: () => Promise<any>; fn: () => R }): Promise<R>

  // Getters (read from current Context)
  get directory(): string
  get worktree(): string
  get project(): Project.Info

  // Utility
  containsPath(filepath: string): boolean

  // Lazy state factory
  state<S>(init: () => S, dispose?: (state: Awaited<S>) => Promise<void>): () => S

  // Lifecycle
  reload(input): Promise<Context>
  dispose(): Promise<void>
  disposeAll(): Promise<void>
}
```

### How `Instance.provide()` Works

```
Instance.provide({ directory, init, fn })
  │
  ├─ 1. Resolve absolute path
  ├─ 2. Check cache (Map<directory, Promise<Context>>)
  ├─ 3. Cache miss → boot():
  │     ├─ Project.fromDirectory(directory)
  │     │   ├─ Walk up for .git
  │     │   ├─ Resolve ProjectID (root commit hash)
  │     │   ├─ Detect git worktrees
  │     │   └─ Upsert to SQLite
  │     └─ Build Context: { directory, worktree, project }
  ├─ 4. context.provide(ctx, () => init?.())
  ├─ 5. Cache the Context promise
  └─ 6. context.provide(ctx, () => fn())
```

If boot fails, the failed promise is removed from cache so the next attempt retries.

### Entry Points

**CLI** (`cli/bootstrap.ts`):
```typescript
export async function bootstrap(directory: string, cb: () => Promise<void>) {
  return Instance.provide({
    directory,
    init: InstanceBootstrap,
    fn: cb
  })
}
```

**Server** (`server/server.ts`): Per-request middleware also uses `Instance.provide()`.

### `containsPath()` — Internal vs External Files

```typescript
containsPath(filepath: string) {
  if (Filesystem.contains(Instance.directory, filepath)) return true
  if (Instance.worktree === "/") return false  // no git = everything external
  return Filesystem.contains(Instance.worktree, filepath)
}
```

Returns `false` for external files, triggering `permission.ask` for `external_directory` permission.

---

## State — Lazy Initialization Per Directory

**File:** `packages/opencode/src/project/state.ts` (70 lines)

The most repeated pattern in the codebase. Every subsystem that needs per-project state uses `Instance.state()`.

### How It Works

```typescript
export namespace State {
  interface Entry {
    state: any
    dispose?: (state: any) => Promise<void>
  }

  const recordsByKey = new Map<string, Map<any, Entry>>()
  //                    ↑ directory    ↑ init function    ↑ cached value

  export function create<S>(
    root: () => string,      // typically () => Instance.directory
    init: () => S,           // factory — called ONCE
    dispose?: (state: Awaited<S>) => Promise<void>
  ) {
    return () => {            // returns a THUNK, not the value
      const key = root()
      let entries = recordsByKey.get(key)
      if (!entries) {
        entries = new Map()
        recordsByKey.set(key, entries)
      }
      const exists = entries.get(init)   // init function as sub-key
      if (exists) return exists.state     // cache hit
      const state = init()                 // cache miss → initialize
      entries.set(init, { state, dispose })
      return state
    }
  }
}
```

**Key design insight:** Uses the **`init` function as a sub-key** within the directory map. Two different `Instance.state(initA)` and `Instance.state(initB)` in the same directory create independent entries. No collisions possible.

### Usage Pattern

```typescript
// Declare state as a lazy thunk
const myState = Instance.state(() => {
  // This runs ONCE per directory, on first call
  return { counter: 0, cache: new Map() }
})

// Use by calling the thunk
function increment() {
  myState().counter++
}

// With cleanup
const myPool = Instance.state(
  () => createConnectionPool(),
  async (pool) => { await pool.close() }
)
```

### Real Examples in the Codebase

```typescript
// Bus — subscriptions per directory
const state = Instance.state(() => ({ subscriptions: new Map() }))

// Plugin — hooks, SDK client, loaded plugins
const state = Instance.state(async () => {
  const client = createOpencodeClient({ ... })
  const hooks = []
  // ... load plugins ...
  return { hooks, input }
})

// Vcs — git branch tracking
const state = Instance.state(() => ({ branch: undefined as string | undefined }))

// FileWatcher — file system watchers
const state = Instance.state(() => new Map())
```

### Dispose Lifecycle

When `Instance.dispose()` is called:

```
Instance.dispose()
  │
  ├─ State.dispose(Instance.directory)
  │   ├─ Iterate all entries for this directory
  │   ├─ Call entry.dispose(state) if exists
  │   ├─ Log warning if takes > 10s
  │   └─ Clear Map and delete key
  │
  └─ InstanceState.dispose(directory)  // Effect version
```

---

## Bus — The Event System

**Files:**
- `bus/bus-event.ts` — Typed event definitions with Zod
- `bus/global.ts` — Cross-instance EventEmitter (10 lines)
- `bus/index.ts` — Per-instance pub/sub (105 lines)

### Two-Level Architecture

```
┌─────────────────────────────────────┐
│  GlobalBus (Node.js EventEmitter)   │
│  Cross-instance events               │
│  • server.instance.disposed          │
│  • project.updated                   │
│  • All events re-emitted from Bus    │
└─────────────────────────────────────┘
              ▲
              │ re-emits
              │
┌─────────────────────────────────────┐
│  Bus (per Instance, via state())     │
│  • Isolated subscriptions per dir    │
│  • Zod-typed (BusEvent.define)       │
│  • Supports wildcard "*"             │
└─────────────────────────────────────┘
```

### BusEvent — Typed Definitions

```typescript
const registry = new Map<string, Definition>()

export function define<Type extends string, Properties extends ZodType>(
  type: Type,
  properties: Properties
) {
  const result = { type, properties }
  registry.set(type, result)
  return result
}
```

### Bus API

```typescript
export namespace Bus {
  publish(def, properties)    // exact subscribers + wildcard + GlobalBus
  subscribe(def, callback)    // returns unsubscribe function
  once(def, callback)         // auto-unsub when callback returns "done"
  subscribeAll(callback)      // wildcard — receives ALL events
}
```

### Internal State

```typescript
const state = Instance.state(
  () => ({ subscriptions: new Map() }),
  async (entry) => {
    // On dispose, notify wildcard subscribers
    const wildcard = entry.subscriptions.get("*")
    if (!wildcard) return
    for (const sub of wildcard) {
      sub({ type: "server.instance.disposed", properties: { directory } })
    }
  }
)
```

### Event Flow

```
Bus.publish(MyEvent, { data })
  │
  ├─ 1. Exact subscribers: state().subscriptions.get("my.event")
  │     └─ Execute each callback
  ├─ 2. Wildcard: state().subscriptions.get("*")
  │     └─ Execute each callback (plugins use this for event hook)
  └─ 3. GlobalBus.emit("event", { directory, payload })
        └─ Cross-instance listeners receive it
```

### Plugin Connection

```typescript
// plugin/index.ts — Plugin.init()
Bus.subscribeAll(async (input) => {
  const hooks = await state().then(x => x.hooks)
  for (const hook of hooks) {
    hook["event"]?.({ event: input })
  }
})
```

The `event` hook receives **every** event in the system.

---

## Flag — Environment-Based Feature Flags

**File:** `packages/opencode/src/flag/flag.ts` (118 lines)

Boolean/string/number constants read from `process.env` at module load time. Some are dynamic (getters) for runtime evaluation.

### Pattern

```typescript
// Static — evaluated once on import
function truthy(key: string) {
  return process.env[key]?.toLowerCase() === "true" || process.env[key]?.toLowerCase() === "1"
}

export const OPENCODE_DISABLE_DEFAULT_PLUGINS = truthy("OPENCODE_DISABLE_DEFAULT_PLUGINS")

// Dynamic — evaluated on each access
Object.defineProperty(Flag, "OPENCODE_CLIENT", {
  get() { return process.env["OPENCODE_CLIENT"] ?? "cli" }
})
```

### Plugin-Relevant Flags

| Flag | Effect |
|------|--------|
| `OPENCODE_DISABLE_DEFAULT_PLUGINS` | Skip built-in npm plugins (e.g., Anthropic auth) |
| `OPENCODE_DISABLE_PROJECT_CONFIG` | Skip project-level `opencode.json` |
| `OPENCODE_CLIENT` | `"cli"`, `"app"`, `"desktop"` — plugins may vary behavior |
| `OPENCODE_PERMISSION` | Default permission value (`ask`/`allow`/`deny`) |
| `OPENCODE_EXPERIMENTAL` | Enable cascading experimental features |
| `OPENCODE_CONFIG` | Alternative config file path |
| `OPENCODE_CONFIG_CONTENT` | Inline config JSON (useful in CI) |

### Usage

```typescript
import { Flag } from "../flag/flag"

if (!Flag.OPENCODE_DISABLE_DEFAULT_PLUGINS) {
  plugins = [...BUILTIN, ...plugins]
}
```

---

## Bootstrap Sequence

**File:** `packages/opencode/src/project/bootstrap.ts` (33 lines)

```typescript
export async function InstanceBootstrap() {
  await Plugin.init()         // 1. Plugins first — everything else may depend on hooks
  ShareNext.init()            // 2. Share system
  Format.init()               // 3. Code formatter
  await LSP.init()            // 4. Language servers
  FileWatcher.init()          // 5. File watching
  File.init()                 // 6. File system hooks
  Vcs.init()                 // 7. Git branch tracking
  Snapshot.init()            // 8. Snapshot system
  Truncate.init()            // 9. Tool output truncation

  // Mark project initialized after "init" command
  Bus.subscribe(Command.Event.Executed, async (payload) => {
    if (payload.properties.name === "init") {
      await Project.setInitialized(Instance.project.id)
    }
  })
}
```

**Order matters:** Plugins first because `Plugin.trigger()` is called by all subsequent systems.

---

## System Interconnection Summary

```
Flag
 └─ Controls plugin loading (OPENCODE_DISABLE_DEFAULT_PLUGINS)
 └─ Controls project config (OPENCODE_DISABLE_PROJECT_CONFIG)

Instance
 └─ Plugin uses Instance.state() for its state
 └─ Plugin.init() called from InstanceBootstrap() inside Instance.provide()

State
 └─ Plugin.state is Instance.state() → State.create()
 └─ Instance.dispose() triggers State.dispose() to clean hooks

Config
 └─ Plugin.init() receives merged config via Config.get()
 └─ Each plugin gets config via config(config) hook

Bus
 └─ Plugin.init() subscribes to ALL events via Bus.subscribeAll()
 └─ Every event forwarded to plugin event hooks
 └─ Plugin event hooks see EVERYTHING in the system
```
