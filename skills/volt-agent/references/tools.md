# Tools in VoltAgent

Tools extend agent capabilities with custom functions. The AI model decides when to call them.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/tool/index.ts` | `Tool` class, `createTool()` |
| `packages/core/src/tool/toolkit.ts` | `Toolkit` type, `createToolkit()` |
| `packages/core/src/tool/manager/ToolManager.ts` | Tool management |
| `packages/core/src/agent/providers/base/types.ts` | `ToolExecuteOptions` |

## Creating a Tool

**File**: `packages/core/src/tool/index.ts:311-321`

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "getWeather",
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().default("celsius"),
  }),
  execute: async ({ location, unit }, options) => {
    // Access context
    const ctx = options as OperationContext;
    console.log("User:", ctx.userId);

    return {
      location,
      temperature: 22,
      unit,
      condition: "Sunny",
    };
  },
});
```

## Tool Structure

**File**: `packages/core/src/tool/index.ts:198-306`

```typescript
class Tool<T extends ToolSchema, O extends ToolSchema | undefined> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: T;           // Zod schema
  readonly outputSchema?: O;        // Optional output validation
  readonly tags?: string[];
  readonly needsApproval?: boolean; // Require approval before execution
  readonly execute?: (
    args: z.infer<T>,
    options?: ToolExecuteOptions
  ) => ToolExecutionResult;
}
```

## Accessing Context in Tools

**File**: `packages/core/src/agent/providers/base/types.ts:266-287`

```typescript
export type ToolExecuteOptions = Partial<OperationContext> & {
  toolContext?: ToolContext;
  abortController?: AbortController;
};
```

The `options` parameter contains all `OperationContext` fields:

```typescript
execute: async (input, options) => {
  const ctx = options as OperationContext;

  // Available:
  ctx.userId;           // "user-123"
  ctx.conversationId;   // "conv-456"
  ctx.context;          // Map<string, unknown>
  ctx.traceContext;     // OpenTelemetry
  ctx.logger;           // Logger
  ctx.abortController;  // AbortController
}
```

## Toolkits

**File**: `packages/core/src/tool/toolkit.ts`

Group related tools with shared instructions:

```typescript
import { createToolkit } from "@voltagent/core";

const calculatorToolkit = createToolkit({
  name: "calculator",
  description: "Math operations",
  instructions: "Use these for calculations",
  addInstructions: true,  // Adds to system prompt
  tools: [addTool, subtractTool, multiplyTool],
});

// Register with agent
agent.addTools([calculatorToolkit]);
```

## Adding Tools to Agent

```typescript
// Individual tools
agent.addTools([weatherTool, searchTool]);

// Toolkits
agent.addTools([calculatorToolkit]);

// In constructor
const agent = new Agent({
  tools: [weatherTool],
  toolkits: [calculatorToolkit],
});
```

## Async Generator Tools (Streaming)

```typescript
const streamingTool = createTool({
  name: "streamData",
  parameters: z.object({ query: z.string() }),
  execute: async function* ({ query }, options) {
    for await (const chunk of fetchData(query)) {
      yield { partial: chunk };
    }
    return { complete: true };
  },
});
```

## Tool Approval

```typescript
const sensitiveTool = createTool({
  name: "deleteUser",
  parameters: z.object({ userId: z.string() }),
  needsApproval: true,  // Requires user approval
  execute: async ({ userId }) => {
    return await deleteUser(userId);
  },
});
```

## Tool Routing

**File**: `packages/core/src/tool/routing/index.ts`

Route tools using embeddings for large toolsets:

```typescript
const agent = new Agent({
  name: "agent",
  model: "model",
  tools: [tool1, tool2, tool3, /* ... 50 tools ... */],
  toolRouting: {
    embeddingModel: "openai/text-embedding-3-small",
    topK: 5,  // Only send top 5 relevant tools to model
  },
});
```

## Multi-Tenant Tool Example

```typescript
const getUserDataTool = createTool({
  name: "get_user_data",
  description: "Get current user's data",
  parameters: z.object({}),
  execute: async (_input, options) => {
    const ctx = options as OperationContext;
    const userId = ctx.userId;

    if (!userId) {
      return { error: "No user context" };
    }

    // Query ONLY for current user
    const data = await db.query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    return data;
  },
});
```
