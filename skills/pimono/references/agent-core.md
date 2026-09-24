# @mariozechner/pi-agent-core

Stateful agent with tool execution and event streaming. Built on `@mariozechner/pi-ai`.

## Installation

```bash
npm install @mariozechner/pi-agent-core
```

## Quick Start

```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are helpful.",
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
  },
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello!");
```

## Core Concepts

### AgentMessage vs LLM Message

`AgentMessage` supports:
- Standard LLM messages (`user`, `assistant`, `toolResult`)
- Custom app-specific message types via declaration merging

`convertToLlm()` bridges the gap by filtering/transforming before each LLM call.

### Message Flow

```
AgentMessage[] → transformContext() → AgentMessage[] → convertToLlm() → Message[] → LLM
```

### Event Flow

**prompt() sequence:**
```
prompt("Hello")
├─ agent_start
├─ turn_start
├─ message_start { message: userMessage }
├─ message_end
├─ message_start { message: assistantMessage }
├─ message_update { assistantMessageEvent }
├─ message_end
├─ turn_end { message, toolResults }
└─ agent_end { messages }
```

**With tool calls:**
```
prompt("Read config.json")
├─ agent_start
├─ turn_start
├─ message_start/end { userMessage }
├─ message_start { assistantMessage with toolCall }
├─ message_update...
├─ message_end
├─ tool_execution_start
├─ tool_execution_update
├─ tool_execution_end
├─ message_start/end { toolResultMessage }
├─ turn_end
│
├─ turn_start
├─ message_start { assistantMessage }
├─ message_update...
├─ message_end
├─ turn_end
└─ agent_end
```

## Event Types

| Event | Description |
|-------|-------------|
| `agent_start` | Agent begins |
| `agent_end` | Final event |
| `turn_start` | New turn begins |
| `turn_end` | Turn completes |
| `message_start` | Message begins |
| `message_update` | Assistant streaming chunk |
| `message_end` | Message completes |
| `tool_execution_start` | Tool begins |
| `tool_execution_update` | Tool streams progress |
| `tool_execution_end` | Tool completes |

## Agent Options

```typescript
const agent = new Agent({
  initialState: {
    systemPrompt: string,
    model: Model,
    thinkingLevel: "off" | "minimal" | "low" | "medium" | "high" | "xhigh",
    tools: AgentTool[],
    messages: AgentMessage[],
  },

  // Convert AgentMessage[] to LLM Message[]
  convertToLlm: (messages) => messages.filter(...),

  // Transform context before convertToLlm
  transformContext: async (messages) => pruneOldMessages(messages),

  // Message queue modes
  steeringMode: "one-at-a-time",
  followUpMode: "one-at-a-time",

  // Custom stream function
  streamFn: streamProxy,

  // Session ID for provider caching
  sessionId: "session-123",

  // Dynamic API key resolution
  getApiKey: async (provider) => refreshToken(),

  // Tool execution: "parallel" (default) or "sequential"
  toolExecution: "parallel",

  // Preflight hook (can block)
  beforeToolCall: async ({ toolCall, args, context }) => {
    if (toolCall.name === "bash") {
      return { block: true, reason: "bash disabled" };
    }
  },

  // Postprocess hook
  afterToolCall: async ({ toolCall, result, isError }) => {
    if (toolCall.name === "notify_done" && !isError) {
      return { terminate: true };
    }
  },

  // Custom thinking budgets
  thinkingBudgets: {
    minimal: 128,
    low: 512,
    medium: 1024,
    high: 2048,
  },
});
```

## Tool Execution Modes

- **parallel** (default): Preflight sequential, execute allowed tools concurrently
- **sequential**: Execute one by one

Set globally via `toolExecution` or per-tool via `executionMode` on `AgentTool`.

## continue()

Resumes from existing context without adding a new message:

```typescript
await agent.continue();
```

Last message must be `user` or `toolResult` (not `assistant`).

## Subscribers

`Agent.subscribe()` listeners are awaited in registration order.

```typescript
agent.subscribe(async (event) => {
  if (event.type === "agent_end") {
    await saveState();
  }
});
```

`agent_end` means no more loop events, but `await agent.waitForIdle()` only settles after `agent_end` listeners finish.
