# Extensions

Extensions are TypeScript modules that extend pi's behavior. They can register custom tools, commands, events, and UI.

**Security**: Extensions run with full system permissions. Only install from trusted sources.

## Quick Start

Create `~/.pi/agent/extensions/my-extension.ts`:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // React to events
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  // Block dangerous commands
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName === "bash" && event.input.command?.includes("rm -rf")) {
      const ok = await ctx.ui.confirm("Dangerous!", "Allow rm -rf?");
      if (!ok) return { block: true, reason: "Blocked by user" };
    }
  });

  // Register custom tool
  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone",
    parameters: Type.Object({
      name: Type.String({ description: "Name" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: `Hello, ${params.name}!` }],
        details: {},
      };
    },
  });

  // Register command
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify(`Hello ${args || "world"}!`, "info");
    },
  });
}
```

Test:
```bash
pi -e ./my-extension.ts
```

## Extension Locations

Auto-discovered from:

| Location | Scope |
|----------|-------|
| `~/.pi/agent/extensions/*.ts` | Global |
| `~/.pi/agent/extensions/*/index.ts` | Global (subdirectory) |
| `.pi/extensions/*.ts` | Project-local |
| `.pi/extensions/*/index.ts` | Project-local |

Additional paths via `settings.json`:

```json
{
  "extensions": ["/path/to/extension.ts", "/path/to/dir"]
}
```

## Available Imports

| Package | Purpose |
|---------|---------|
| `@mariozechner/pi-coding-agent` | Extension types |
| `typebox` | Schema definitions |
| `@mariozechner/pi-ai` | AI utilities |
| `@mariozechner/pi-tui` | TUI components |
| Node.js built-ins | `node:fs`, `node:path`, etc. |

npm dependencies work too. Add `package.json`, run `npm install`.

## Extension Styles

### Single File

```
~/.pi/agent/extensions/my-extension.ts
```

### Directory

```
~/.pi/agent/extensions/my-extension/
├── index.ts
├── tools.ts
└── utils.ts
```

### Package with Dependencies

```json
{
  "name": "my-extension",
  "dependencies": { "zod": "^3.0.0" },
  "pi": { "extensions": ["./src/index.ts"] }
}
```

## Events

### Lifecycle

```
pi starts
├─► session_start
└─► resources_discover
    │
user sends prompt
├─► input (can intercept)
├─► before_agent_start
├─► agent_start
├─► message_start / message_update / message_end
│   │
│   ├─► turn_start
│   ├─► context
│   ├─► before_provider_request
│   ├─► after_provider_response
│   │   LLM responds:
│   │   ├─► tool_execution_start
│   │   ├─► tool_call (can block)
│   │   ├─► tool_execution_update
│   │   ├─► tool_result (can modify)
│   │   └─► tool_execution_end
│   └─► turn_end
└─► agent_end
```

### Key Events

| Event | When |
|-------|------|
| `session_start` | Session begins |
| `resources_discover` | Resources loaded |
| `input` | User input received |
| `before_agent_start` | Before agent starts |
| `agent_start` / `agent_end` | Agent lifecycle |
| `turn_start` / `turn_end` | Turn lifecycle |
| `message_start` / `message_end` | Message lifecycle |
| `message_update` | Assistant streaming |
| `context` | Context before provider request |
| `before_provider_request` | Before sending to provider |
| `after_provider_response` | After provider response |
| `tool_execution_start` | Tool begins |
| `tool_call` | Tool call (can block) |
| `tool_result` | Tool result (can modify) |
| `tool_execution_end` | Tool completes |
| `session_before_switch` | Before session switch |
| `session_after_switch` | After session switch |

## ExtensionContext

```typescript
interface ExtensionContext {
  ui: {
    notify(message, type): void;
    confirm(title, message): Promise<boolean>;
    input(title, options): Promise<string | undefined>;
    select(title, choices): Promise<string | undefined>;
    setStatus(id, text): void;
    setWidget(id, lines): void;
    custom(component): Promise<any>;
  };
  // Agent, session, tools access
}
```

## Custom Tools

```typescript
pi.registerTool({
  name: "my-tool",
  label: "My Tool",
  description: "Does something",
  parameters: Type.Object({ ... }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    // Stream partial results
    onUpdate({ content: [{ type: "text", text: "Progress..." }] });

    return {
      content: [{ type: "text", text: "Done!" }],
      details: { key: "value" },
      terminate: false, // Set true to skip follow-up LLM call
    };
  },
});
```

## Custom Commands

```typescript
pi.registerCommand("my-command", {
  description: "Does something",
  handler: async (args, ctx) => {
    ctx.ui.notify(`Args: ${args}`, "info");
  },
});
```

## Custom UI

```typescript
const result = await ctx.ui.custom({
  // TUI component configuration
});
```

## State Management

Persist state across restarts:

```typescript
// Append to session
pi.appendEntry({ type: "my-state", data: { ... } });

// Read from session
pi.on("session_start", async (event, ctx) => {
  const entries = event.session.entries.filter(e => e.type === "my-state");
});
```

## Custom Providers

Register custom model providers:

```typescript
pi.registerProvider("my-provider", {
  name: "My Provider",
  baseUrl: "https://api.example.com",
  apiKey: "MY_API_KEY",
  api: "openai-completions",
  models: [{
    id: "my-model",
    name: "My Model",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 4096
  }]
});
```

Override existing provider:

```typescript
pi.registerProvider("anthropic", {
  baseUrl: "https://proxy.example.com"
});
```

## Async Factory

For dynamic model discovery:

```typescript
export default async function (pi: ExtensionAPI) {
  const response = await fetch("http://localhost:1234/v1/models");
  const payload = await response.json();

  pi.registerProvider("local", {
    baseUrl: "http://localhost:1234/v1",
    apiKey: "LOCAL_API_KEY",
    api: "openai-completions",
    models: payload.data.map(m => ({
      id: m.id,
      name: m.name ?? m.id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: m.context_window ?? 128000,
      maxTokens: m.max_tokens ?? 4096,
    })),
  });
}
```

## Mode Behavior

- **Interactive**: Full features, UI, commands
- **Print/JSON**: No UI, structured output
- **RPC**: JSON protocol over stdin/stdout

## Examples

See `packages/coding-agent/examples/extensions/`:
- `subagent/` - Sub-agent extension
- `plan-mode/` - Plan mode extension
- `doom-overlay/` - Game overlay
- `custom-provider-anthropic/` - Custom provider
- `custom-provider-gitlab-duo/` - GitLab Duo provider
