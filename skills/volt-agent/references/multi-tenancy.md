# Multi-Tenancy in VoltAgent

VoltAgent provides built-in multi-tenancy through `userId` and `conversationId` scoping across all memory operations.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/agent/types.ts` | `OperationContext` definition |
| `packages/server-core/src/schemas/agent.schemas.ts` | `RuntimeMemoryEnvelopeSchema` |
| `packages/server-core/src/handlers/agent.handlers.ts` | Handler processing |
| `packages/server-hono/src/auth/middleware.ts` | `injectUserContext()` |
| `packages/core/src/memory/manager/memory-manager.ts` | Scoped memory operations |
| `packages/core/src/memory/adapters/storage/in-memory.ts` | Storage isolation |

## How It Works

### 1. Request Format

```json
POST /agents/{agentId}/chat
{
  "input": "Hello!",
  "options": {
    "memory": {
      "userId": "user-123",
      "conversationId": "conv-abc-123",
      "options": {
        "contextLimit": 10,
        "semanticMemory": { "enabled": true }
      }
    }
  }
}
```

**Priority**: `memory.userId` > legacy `options.userId` > parent context

### 2. Auth Middleware Injection

**File**: `packages/server-hono/src/auth/middleware.ts:191-217`

```typescript
function injectUserContext(c: Context, user: any) {
  c.set("authenticatedUser", user);

  const originalJson = c.req.json.bind(c.req);
  c.req.json = async () => {
    const body = await originalJson();
    return {
      ...body,
      context: { ...body.context, user },
      userId: user.id || user.sub,
      options: {
        ...body.options,
        context: { ...body.options?.context, user },
        userId: user.id || user.sub,
      },
    };
  };
}
```

The middleware overrides `c.req.json()` to inject `userId` into both `body.userId` and `body.options.userId`.

### 3. Handler Processing

**File**: `packages/server-core/src/handlers/agent.handlers.ts:251-269`

```typescript
const options = processAgentOptions(body, signal, requestHeaders);
const memory = options.memory;

const memoryConversationId =
  memory?.conversationId?.trim().length > 0
    ? memory.conversationId
    : undefined;

const memoryUserId =
  memory?.userId?.trim().length > 0
    ? memory.userId
    : undefined;

const conversationId =
  memoryConversationId ?? options.conversationId;  // legacy fallback

const userId =
  memoryUserId ?? options.userId;  // legacy fallback
```

### 4. OperationContext

**File**: `packages/core/src/agent/types.ts:1293-1350`

```typescript
export type OperationContext = {
  readonly operationId: string;
  userId?: string;
  conversationId?: string;
  resolvedMemory?: CommonResolvedRuntimeMemoryOptions;
  readonly context: Map<string | symbol, unknown>;
  readonly systemContext: Map<string | symbol, unknown>;
  traceContext: AgentTraceContext;
  logger: Logger;
  // ...
};
```

### 5. Memory Scoping

**File**: `packages/core/src/memory/manager/memory-manager.ts:105-206`

```typescript
async saveMessage(context, message, userId, conversationId) {
  if (!this.conversationMemory || !userId) return;

  if (conversationId && userId) {
    const conv = await this.conversationMemory?.getConversation(conversationId);
    if (!conv) {
      await this.conversationMemory?.createConversation({
        id: conversationId,
        userId: userId,
        resourceId: this.resourceId,
        title,
        metadata: {},
      });
    }
    await this.conversationMemory?.saveMessageWithContext(
      message, userId, conversationId, {}, context
    );
  }
}
```

### 6. Storage Isolation

**File**: `packages/core/src/memory/adapters/storage/in-memory.ts:86-92`

```typescript
private storage: Record<string, Record<string, StoredUIMessage[]>> = {};
// storage[userId][conversationId] = messages
```

Structure:
```
storage: {
  "user-123": {
    "conv-abc": [msg1, msg2],
    "conv-xyz": [msg3, msg4]
  },
  "user-456": {
    "conv-123": [msg5, msg6]
  }
}
```

### 7. Tool Access to Context

Tools receive `ToolExecuteOptions` which extends `OperationContext`:

**File**: `packages/core/src/agent/providers/base/types.ts:266`

```typescript
export type ToolExecuteOptions = Partial<OperationContext> & {
  toolContext?: ToolContext;
  abortController?: AbortController;
};
```

**Usage in tool:**

```typescript
execute: async (input, options) => {
  const ctx = options as OperationContext;
  const userId = ctx.userId;
  const conversationId = ctx.conversationId;

  // Query user-specific data
  return db.query("SELECT * FROM data WHERE user_id = ?", [userId]);
}
```

## Complete Flow

```
HTTP Request
     |
Auth Middleware (injectUserContext)
     | - Verifies JWT token
     | - Extracts user.id or user.sub
     | - Injects into request body
     v
Handler (handleChatStream/handleGenerateText)
     | - processAgentOptions()
     | - Extracts memory.userId/memory.conversationId
     v
Agent.generateText()
     | - createOperationContext()
     | - resolveMemoryRuntimeOptions()
     v
MemoryManager.saveMessage() / getMessages()
     | - Uses userId + conversationId for scoping
     v
Storage Adapter (InMemory/LibSQL/PostgreSQL)
     | - storage[userId][conversationId] = messages
     v
Tools receive OperationContext via ToolExecuteOptions
     | - userId, conversationId, resolvedMemory available
     v
Response
```
