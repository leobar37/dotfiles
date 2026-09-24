# SubAgents in VoltAgent

SubAgents delegate tasks to specialized agents with isolated context.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/agent/subagent/types.ts` | `SubAgentConfig` types |
| `packages/core/src/agent/subagent/index.ts` | `SubAgentManager` |
| `packages/core/src/planagent/plan-agent.ts` | PlanAgent task tool |
| `packages/core/src/agent/hooks/index.ts` | `onHandoffComplete` hook |

## Creating SubAgents

### Basic SubAgent

**File**: `packages/core/src/agent/subagent/types.ts`

```typescript
import { Agent, createSubagent } from "@voltagent/core";

const researchAgent = new Agent({
  name: "researcher",
  model: "openai/gpt-4o",
  instructions: "Research topics thoroughly",
});

const supervisor = new Agent({
  name: "supervisor",
  model: "openai/gpt-4o",
  instructions: "Coordinate specialized agents",
  subAgents: [researchAgent],  // Direct agent (defaults to streamText)
});
```

### With Explicit Method

```typescript
const supervisor = new Agent({
  name: "supervisor",
  subAgents: [
    createSubagent({
      agent: researchAgent,
      method: "generateText",  // Use generateText instead of streamText
      options: { temperature: 0.3 },
    }),
  ],
});
```

### SubAgentConfig Types

**File**: `packages/core/src/agent/subagent/types.ts`

```typescript
// Available methods
type SubAgentMethod = "streamText" | "generateText" | "streamObject" | "generateObject";

// Configuration
interface StreamTextSubAgentConfig {
  agent: Agent;
  method: "streamText";
  options?: StreamTextOptions;
}

interface GenerateObjectSubAgentConfig {
  agent: Agent;
  method: "generateObject";
  schema: z.ZodType;  // Required for object generation
  options?: GenerateObjectOptions;
}
```

## Context Flow

**File**: `packages/core/src/agent/subagent/index.ts:319-580`

When delegating, context flows automatically:

```typescript
// From SubAgentManager.handoffTask
const baseOptions = {
  conversationId: handoffConversationId,
  userId,                    // Passed from parent
  parentAgentId: sourceAgent?.id,
  parentOperationContext,    // Full context passed through
  abortSignal: parentOperationContext?.abortController?.signal,
};
```

## PlanAgent Task Tool

**File**: `packages/core/src/planagent/plan-agent.ts:718-807`

PlanAgent provides a `task` tool for spawning ephemeral subagents:

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
      description: "Research agent for gathering information",
      tools: [searchTool],  // Subagent-specific tools
    },
    {
      name: "writer",
      systemPrompt: "Write clear content",
      description: "Writing agent for content creation",
    },
  ],
  task: {
    maxSteps: 5,
  },
});
```

The agent automatically gets a `task` tool with parameter `subagent_type` to select which subagent to use.

## Parallel Execution

**File**: `packages/core/src/agent/subagent/index.ts`

```typescript
const results = await subAgentManager.handoffToMultiple({
  task: "Research these topics",
  targetAgents: [researchAgent1, researchAgent2, researchAgent3],
  context: new Map([["topics", ["AI", "ML", "DL"]]]),
  sourceAgent: supervisor,
  userId: operationContext.userId,
  conversationId: operationContext.conversationId,
});
// All three run in parallel
```

## Bail Mechanism

**File**: `packages/core/src/agent/hooks/index.ts:33-52`

Short-circuit subagent results:

```typescript
const supervisor = new Agent({
  name: "supervisor",
  subAgents: [researchAgent],
  hooks: {
    onHandoffComplete: async ({ agent, result, bail }) => {
      if (result.length > 10000) {
        bail("Summary: " + result.substring(0, 100));
      }
    },
  },
});
```

## SupervisorConfig

**File**: `packages/core/src/agent/types.ts:344-386`

```typescript
type SupervisorConfig = {
  systemMessage?: string;           // Custom supervisor prompt
  includeAgentsMemory?: boolean;    // Include subagent memory (default: true)
  customGuidelines?: string[];      // Additional guidelines
  throwOnStreamError?: boolean;     // Throw on stream error (default: false)
};
```
