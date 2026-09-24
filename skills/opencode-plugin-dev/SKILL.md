---
name: opencode-plugin-dev
description: Build, test, and debug OpenCode CLI plugins. Covers all 16+ hooks (auth, tool, chat.message, chat.params, experimental.chat.system.transform, tool.execute.before/after, permission.ask, shell.env, etc.), the Instance/State/Bus/Flag architecture, lazy initialization patterns, and plugin publishing. Use when creating OpenCode plugins, writing custom tools, intercepting system prompts, adding auth providers, transforming messages, or modifying LLM parameters. Triggers on "OpenCode plugin", "custom tool", "hook", "system prompt", "chat.message", "plugin auth", "permission control", "intercept tool".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# OpenCode Plugin Developer Skill

Complete guide for building OpenCode CLI plugins.

## Quick Start: Minimal Plugin

```typescript
import { tool } from "@opencode-ai/plugin"

export default async function myPlugin(input) {
  const { directory, $ } = input

  return {
    // Custom tool
    tool: {
      "greet": tool({
        description: "Greet someone",
        parameters: { name: { type: "string", description: "Name to greet" } },
        async execute({ name }, ctx) {
          return { title: "Greeting", output: `Hello ${name}!` }
        }
      })
    },

    // Hook example
    "chat.params"(input, output) {
      output.temperature = 0.7
      return output
    }
  }
}
```

Register in `opencode.json`:
```json
{ "plugin": ["./my-plugin.ts"] }
```

## PluginInput Context

Every plugin receives:

| Field | Type | Description |
|-------|------|-------------|
| `client` | `Client` | Session, tools, state access |
| `project` | `string` | Absolute path to project root |
| `directory` | `string` | Current working directory |
| `worktree` | `string?` | Git worktree path |
| `serverUrl` | `string?` | Remote server URL |
| `$` | `BunShell` | Shell execution helper |

## Hook Categories

### Registration (run once at init)
- `auth` — OAuth/API key provider
- `tool` — Custom LLM-callable tools
- `config` — Modify opencode.json at runtime

### Lifecycle (run repeatedly during session)
- `event` — Subscribe to all system events
- `chat.message` — Transform individual messages
- `chat.params` — Modify LLM parameters (temp, maxTokens)
- `chat.headers` — Modify HTTP request headers
- `tool.definition` — Modify tool schemas
- `tool.execute.before` — Pre-tool execution (validate, log)
- `tool.execute.after` — Post-tool execution (timing, metadata)
- `command.execute.before` — Pre-command hook
- `shell.env` — Inject shell environment variables
- `permission.ask` — Auto-allow/deny/ask decisions

### Experimental (may change in future versions)
- `experimental.chat.system.transform` — **Modify system prompt** (most important for prompt engineering)
- `experimental.chat.messages.transform` — Transform entire message array
- `experimental.session.compacting` — Customize context compaction
- `experimental.text.complete` — Intercept generated text

For complete lifecycle, signatures, and examples of every hook, see [references/hooks-lifecycle.md](references/hooks-lifecycle.md).

## Core Architecture

Plugins run inside an **Instance** scoped to a project directory. Key systems:

- **Instance** (`project/instance.ts`) — `provide()` boots a project, `state()` creates lazy per-directory state
- **State** (`project/state.ts`) — `Map<directory, Map<initFn, value>>` with auto-cleanup
- **Bus** (`bus/index.ts`) — Typed pub/sub with Zod schemas, per-instance subscriptions
- **Flag** (`flag/flag.ts`) — Environment-based feature flags

For deep dive, see [references/architecture-core.md](references/architecture-core.md).

## Type Reference

Quick types:

```typescript
type Plugin = (input: PluginInput) => Promise<Hooks>

interface Hooks {
  auth?: AuthHook
  tool?: ToolMap
  config?: ConfigHook
  event?: EventHandler
  "chat.message"?: MessageHook
  "chat.params"?: ParamsHook
  "chat.headers"?: HeadersHook
  "tool.definition"?: ToolDefinitionHook
  "tool.execute.before"?: ToolBeforeHook
  "tool.execute.after"?: ToolAfterHook
  "command.execute.before"?: CommandBeforeHook
  "shell.env"?: ShellEnvHook
  "permission.ask"?: PermissionHook
  "experimental.chat.system.transform"?: SystemTransformHook
  "experimental.chat.messages.transform"?: MessagesTransformHook
  "experimental.session.compacting"?: CompactionHook
  "experimental.text.complete"?: TextCompleteHook
}
```

For full type definitions, see [references/api-reference.md](references/api-reference.md).

## Testing

```typescript
import { describe, it, expect } from "vitest"
import plugin from "./my-plugin"

const mockInput = {
  client: {} as any,
  project: "/test",
  directory: "/test",
  $: {} as any
}

describe("plugin", () => {
  it("returns hooks", async () => {
    const hooks = await plugin(mockInput)
    expect(hooks.tool).toBeDefined()
  })
})
```

For testing patterns, see [references/testing-patterns.md](references/testing-patterns.md).

## Ready-to-Use Examples

See [examples.md](examples.md) for:
- Minimal plugin
- Tool plugin with shell execution
- Auth provider (OAuth + API key)
- Message filtering plugin
- System prompt injection
- Permission control plugin
- Full-featured plugin with config, logging, and stats

## Key Patterns

### Lazy Initialization
```typescript
// Good: defer expensive work
let dataset = null
async function ensureInit() {
  if (!dataset) dataset = await loadData()
}

// Bad: blocks startup
export default async function plugin(input) {
  await loadLargeDataset()  // DON'T
}
```

### State Sharing Between Hooks
```typescript
export default async function plugin(input) {
  const stats = { tools: 0, errors: 0 }
  return {
    "tool.execute.before"() { stats.tools++ },
    "tool.execute.after"(input, output) {
      if (output.metadata?.error) stats.errors++
    }
  }
}
```

### Error Handling in Tools
```typescript
tool({
  description: "Safe tool",
  parameters: { file: { type: "string" } },
  async execute({ file }, ctx) {
    try {
      const content = await Bun.file(file).text()
      return { title: "Read", output: content }
    } catch (error) {
      return {
        title: "Error",
        output: error.message,
        metadata: { error: true }
      }
    }
  }
})
```

## Hook → Source Code Mapping

| Hook | Triggered in | File |
|------|-------------|------|
| `config` | `Plugin.init()` | `plugin/index.ts:138` |
| `event` | `Bus.subscribeAll()` | `plugin/index.ts:140` |
| `chat.message` | Message prep | `session/prompt.ts` |
| `chat.params` | Before LLM call | `session/llm.ts:114` |
| `chat.headers` | Before LLM call | `session/llm.ts:133` |
| `tool.definition` | Tool registry | `tool/registry.ts:163` |
| `tool.execute.before` | Pre-execution | `session/prompt.ts:802` |
| `tool.execute.after` | Post-execution | `session/prompt.ts:823` |
| `permission.ask` | Permission request | `permission/index.ts:128` |
| `shell.env` | Bash spawn | `tool/bash.ts:162`, `pty/index.ts:129` |
| `experimental.chat.system.transform` | Agent build | `agent/agent.ts:290` |
| `experimental.chat.messages.transform` | Message prep | `session/prompt.ts:652` |
| `experimental.session.compacting` | Compaction | `session/compaction.ts:169` |
| `experimental.text.complete` | Text generation | `session/processor.ts:323` |
