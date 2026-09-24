# Memory in VoltAgent

VoltAgent Memory provides conversation persistence, semantic search, and working memory.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/memory/index.ts` | `Memory` class |
| `packages/core/src/memory/types.ts` | Memory types |
| `packages/core/src/memory/manager/memory-manager.ts` | `MemoryManager` wrapper |
| `packages/core/src/memory/adapters/storage/types.ts` | `StorageAdapter` interface |
| `packages/core/src/memory/adapters/vector/types.ts` | `VectorAdapter` interface |

## Setup

### Basic (In-Memory)

```typescript
import { Memory } from "@voltagent/core";
import { InMemoryStorageAdapter } from "@voltagent/core";

const memory = new Memory({
  storage: new InMemoryStorageAdapter(),
});
```

### With Semantic Search

```typescript
import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./memory.db" }),
  embedding: "openai/text-embedding-3-small",
  vector: new LibSQLVectorAdapter({ url: "file:./vectors.db" }),
  enableCache: true,
});
```

## MemoryConfig

**File**: `packages/core/src/memory/types.ts:257-303`

```typescript
interface MemoryConfig {
  storage: StorageAdapter;                    // REQUIRED
  embedding?: EmbeddingAdapterInput;          // For semantic search
  vector?: VectorAdapter;                     // Vector storage
  enableCache?: boolean;                      // Default: false
  cacheSize?: number;                         // Default: 1000
  cacheTTL?: number;                          // Default: 1 hour
  workingMemory?: WorkingMemoryConfig;         // Working memory
  generateTitle?: boolean;                     // Auto-generate titles
}
```

## Message Operations

**File**: `packages/core/src/memory/index.ts`

```typescript
// Save message
await memory.addMessage(message, userId, conversationId);

// Get messages with filters
const messages = await memory.getMessages(userId, conversationId, {
  limit: 10,
  before: new Date("2024-01-01"),
  roles: ["user", "assistant"],
});

// Clear messages
await memory.clearMessages(userId, conversationId);
```

## Semantic Search

**File**: `packages/core/src/memory/index.ts:321-376`

```typescript
// Get messages + semantic search
const messages = await memory.getMessagesWithSemanticSearch(
  userId,
  conversationId,
  "What was the project deadline?",  // Query
  {
    semanticLimit: 5,
    semanticThreshold: 0.7,
    mergeStrategy: "append",  // "prepend" | "append" | "interleave"
  }
);

// Search across all conversations
const results = await memory.searchSimilar("project deadline", {
  limit: 10,
  filter: { userId },
});
```

## Working Memory

Persistent key-value store for agent context:

```typescript
// Update (replace mode)
await memory.updateWorkingMemory({
  conversationId: "conv-123",
  userId: "user-456",
  content: { preferences: ["detailed"], theme: "dark" },
});

// Update (append mode - deep merge)
await memory.updateWorkingMemory({
  conversationId: "conv-123",
  userId: "user-456",
  content: { preferences: ["concise"] },
  options: { mode: "append" },
});

// Get
const content = await memory.getWorkingMemory({
  conversationId: "conv-123",
  userId: "user-456",
});

// Generate instructions for agent
const instructions = await memory.getWorkingMemoryInstructions({
  conversationId: "conv-123",
  userId: "user-456",
});
```

## Conversation Operations

```typescript
// Create
const conversation = await memory.createConversation({
  id: "conv-123",
  userId: "user-456",
  resourceId: "agent-789",
  title: "Support Chat",
  metadata: { source: "web" },
});

// Query
const conversations = await memory.queryConversations({
  userId: "user-456",
  limit: 20,
  orderBy: "updated_at",
});

// Update
await memory.updateConversation("conv-123", { title: "New Title" });

// Delete
await memory.deleteConversation("conv-123");
```

## Storage Adapters

| Adapter | Package | Use Case |
|---------|---------|----------|
| `InMemoryStorageAdapter` | `@voltagent/core` | Dev/Testing |
| `LibSQLMemoryAdapter` | `@voltagent/libsql` | SQLite/Turso |
| `PostgreSQLMemoryAdapter` | `@voltagent/postgres` | PostgreSQL |

## Vector Adapters

| Adapter | Package | Use Case |
|---------|---------|----------|
| `InMemoryVectorAdapter` | `@voltagent/core` | Dev/Testing |
| `LibSQLVectorAdapter` | `@voltagent/libsql` | SQLite/Turso |

## Using with Agent

```typescript
const agent = new Agent({
  name: "agent",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({ url: "file:./memory.db" }),
    embedding: "openai/text-embedding-3-small",
  }),
});

// Memory automatically loads/saves based on userId/conversationId
await agent.generateText("Hello", {
  memory: {
    userId: "user-123",
    conversationId: "conv-456",
  },
});
```
