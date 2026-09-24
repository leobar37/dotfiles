# Agents in VoltAgent

The `Agent` class is the core unit for AI interactions with tools, memory, and subagents.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/agent/agent.ts` | Main Agent class |
| `packages/core/src/agent/types.ts` | AgentOptions, OperationContext |
| `packages/core/src/agent/hooks/index.ts` | AgentHooks interfaces |
| `packages/core/src/planagent/plan-agent.ts` | PlanAgent with planning/subagents |

## Creating an Agent

### Basic Agent

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  model: "openai/gpt-4o-mini",
  instructions: "You are a helpful assistant",
});
```

### Agent with Tools and Memory

```typescript
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const agent = new Agent({
  name: "my-agent",
  model: "openai/gpt-4o-mini",
  instructions: "You are a helpful assistant with tools",
  tools: [weatherTool, searchTool],
  toolkits: [calculatorToolkit],
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({ url: "file:./memory.db" }),
  }),
  maxSteps: 10,
  maxRetries: 3,
});
```

## AgentOptions

**File**: `packages/core/src/agent/types.ts`

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | **Required** Agent identifier |
| `model` | `AgentModelValue` | **Required** AI model |
| `instructions` | `InstructionsDynamicValue` | System prompt (string or dynamic function) |
| `tools` | `(Tool \| Toolkit \| VercelTool)[]` | Available tools |
| `toolkits` | `Toolkit[]` | Bundled tool collections |
| `memory` | `Memory \| false` | Conversation memory |
| `toolRouting` | `ToolRoutingConfig \| false` | Tool selection routing |
| `hooks` | `AgentHooks` | Lifecycle hooks |
| `maxSteps` | `number` | Max tool iterations (default: 5) |
| `maxRetries` | `number` | Retry attempts (default: 3) |
| `temperature` | `number` | Temperature (default: 0.7) |
| `maxOutputTokens` | `number` | Max tokens (default: 4000) |

## Execution Methods

### generateText

**File**: `packages/core/src/agent/agent.ts:1189-1715`

```typescript
const result = await agent.generateText("What is the weather?", {
  temperature: 0.7,
  maxSteps: 10,
  memory: {
    userId: "user-123",
    conversationId: "conv-456",
  },
});

// result.text - generated text
// result.usage - token usage
// result.toolCalls - tools that were called
// result.toolResults - tool execution results
```

### streamText

**File**: `packages/core/src/agent/agent.ts:1720-2729`

```typescript
const streamResult = await agent.streamText("What is the weather?");

for await (const part of streamResult.fullStream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.textDelta);
  }
  if (part.type === "tool-call") {
    console.log("Tool called:", part.toolName);
  }
}
```

### generateObject

**File**: `packages/core/src/agent/agent.ts:2735-3069`

```typescript
import { z } from "zod";

const result = await agent.generateObject(
  "Extract user info",
  z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number(),
  })
);

// result.object - typed result
```

## Hooks

**File**: `packages/core/src/agent/hooks/index.ts`

```typescript
const agent = new Agent({
  name: "my-agent",
  model: "model",
  hooks: {
    onStart: async ({ agent, context }) => {
      console.log("Starting:", context.operationId);
    },
    onEnd: async ({ agent, output, error, context }) => {
      if (error) console.error("Failed:", error);
    },
    onToolStart: async ({ agent, tool, args, context }) => {
      console.log("Tool:", tool.name, "args:", args);
    },
    onToolEnd: async ({ agent, tool, output, context }) => {
      console.log("Result:", output);
    },
    onError: async ({ agent, error, context }) => {
      console.error("Error:", error);
    },
  },
});
```

### Hook Types

| Hook | When |
|------|------|
| `onStart` | Before execution |
| `onEnd` | After completion (success or error) |
| `onToolStart` | Before tool execution |
| `onToolEnd` | After tool execution |
| `onToolError` | When tool throws error |
| `onHandoff` | When delegating to subagent |
| `onHandoffComplete` | After subagent completes |
| `onPrepareMessages` | Before sending to AI model |
| `onError` | On any error |
| `onStepFinish` | After each agent step |

## PlanAgent

**File**: `packages/core/src/planagent/plan-agent.ts`

`PlanAgent` extends `Agent` with built-in planning, task delegation, and filesystem tools.

```typescript
import { PlanAgent } from "@voltagent/core";

const planAgent = new PlanAgent({
  name: "plan-agent",
  model: "openai/gpt-4o",
  systemPrompt: "You plan and coordinate tasks",
  subagents: [
    {
      name: "researcher",
      systemPrompt: "Research topics thoroughly",
      description: "Research agent",
    },
  ],
  planning: {},  // Enable todo planning
  filesystem: {}, // Enable filesystem tools
  task: {
    maxSteps: 5,
  },
});
```

PlanAgent automatically gets:
- `write_todos` tool for planning
- `task` tool for spawning subagents
- Filesystem tools (if enabled)
- Planning state management

## OperationContext

**File**: `packages/core/src/agent/types.ts:1293-1350`

Created per execution, carries:
- `operationId`: Unique execution ID
- `userId`: Current user
- `conversationId`: Current conversation
- `context`: Map for custom data
- `systemContext`: Map for internal tracking
- `traceContext`: OpenTelemetry context
- `logger`: Logger with execution context
- `abortController`: For cancellation
