# Workflows in VoltAgent

Workflows orchestrate multi-step processes with typed inputs/outputs, suspend/resume, and state management.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/workflow/core.ts` | `createWorkflow()` engine |
| `packages/core/src/workflow/types.ts` | Workflow types |
| `packages/core/src/workflow/steps/index.ts` | Step functions |

## Creating a Workflow

**File**: `packages/core/src/workflow/core.ts:384-933`

```typescript
import { createWorkflow, andThen, andBranch } from "@voltagent/core";
import { z } from "zod";

const orderWorkflow = createWorkflow(
  {
    id: "order-processing",
    name: "Order Processing",
    input: z.object({ orderId: z.string(), amount: z.number() }),
    result: z.object({ status: z.enum(["approved", "rejected"]), orderId: z.string() }),
  },
  andThen({
    id: "validate",
    execute: async ({ data }) => ({
      ...data,
      isValid: data.amount < 10000,
    }),
  }),
  andBranch({
    id: "decision",
    branches: [
      {
        condition: ({ data }) => data.isValid,
        step: andThen({
          id: "approve",
          execute: async ({ data }) => ({
            status: "approved",
            orderId: data.orderId,
          }),
        }),
      },
      {
        condition: ({ data }) => !data.isValid,
        step: andThen({
          id: "reject",
          execute: async ({ data }) => ({
            status: "rejected",
            orderId: data.orderId,
          }),
        }),
      },
    ],
  })
);

// Execute
const result = await orderWorkflow.run({ orderId: "ORD-123", amount: 500 });
console.log(result.result); // { status: "approved", orderId: "ORD-123" }
```

## Step Types

**File**: `packages/core/src/workflow/steps/index.ts`

| Function | Type | Purpose |
|----------|------|---------|
| `andThen` | `func` | Basic function step |
| `andAgent` | `agent` | Execute an AI agent |
| `andWhen` | `conditional-when` | Conditional execution |
| `andAll` | `parallel-all` | Run in parallel, wait for all |
| `andRace` | `parallel-race` | Run in parallel, return first |
| `andTap` | `tap` | Side-effect only |
| `andSleep` | `sleep` | Timed delay |
| `andForEach` | `foreach` | Iterate over array |
| `andBranch` | `branch` | Multi-branch conditional |
| `andDoWhile` | `loop` | Do-while loop |
| `andWorkflow` | `workflow` | Nested workflow |

## State Management

**File**: `packages/core/src/workflow/internal/types.ts:31-60`

```typescript
andThen({
  id: "process",
  execute: async ({ data, setWorkflowState, getStepData, workflowState }) => {
    // Persist across ALL steps
    setWorkflowState((prev) => ({ ...prev, processedAt: new Date() }));

    // Access any step's output
    const validation = getStepData("validate")?.output;

    // Current shared state
    const processedAt = workflowState.processedAt;

    return { success: true };
  },
}),
```

## Suspend/Resume

**File**: `packages/core/src/workflow/core.ts:2109-2241`

```typescript
const approvalWorkflow = createWorkflow(
  {
    id: "approval",
    input: z.object({ amount: z.number() }),
    result: z.object({ status: z.enum(["approved", "rejected"]) }),
  },
  andThen({
    id: "check",
    resumeSchema: z.object({ approved: z.boolean(), managerId: z.string() }),
    execute: async ({ data, suspend, resumeData }) => {
      if (resumeData) {
        return { status: resumeData.approved ? "approved" : "rejected" };
      }

      if (data.amount > 1000) {
        await suspend("Manager approval required", { amount: data.amount });
      }

      return { status: "approved" };
    },
  })
);

// Execute
const result = await approvalWorkflow.run({ amount: 5000 });

if (result.status === "suspended") {
  // Resume later with external input
  const resumed = await result.resume({ approved: true, managerId: "MGR-001" });
}
```

## Parallel Execution

```typescript
const workflow = createWorkflow(
  {
    id: "parallel",
    input: z.object({ userId: z.string() }),
    result: z.object({ user: z.any(), posts: z.any() }),
  },
  andAll({
    id: "fetch-data",
    steps: [
      andThen({
        id: "fetch-user",
        execute: async ({ data }) => ({ user: await getUser(data.userId) }),
      }),
      andThen({
        id: "fetch-posts",
        execute: async ({ data }) => ({ posts: await getPosts(data.userId) }),
      }),
    ],
  })
);
```

## Workflow Registry

```typescript
import { VoltAgent } from "@voltagent/core";

new VoltAgent({
  workflows: { "order-processing": orderWorkflow },
  agents: { agent },
  server: honoServer(),
});

// Available at POST /workflows/order-processing/execute
```
