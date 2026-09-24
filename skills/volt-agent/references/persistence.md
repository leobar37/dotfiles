# Database Persistence in VoltAgent

VoltAgent uses a pluggable `StorageAdapter` architecture for persisting conversations, messages, and workflow state.

## Source Files

| File | Purpose |
|------|---------|
| `packages/core/src/memory/adapters/storage/types.ts` | `StorageAdapter` interface |
| `packages/core/src/memory/adapters/storage/in-memory.ts` | InMemory adapter |
| `packages/libsql/src/memory-v2-adapter.ts` | LibSQL adapter |
| `packages/libsql/src/memory-core.ts` | LibSQL schema |
| `packages/postgres/src/memory-adapter.ts` | PostgreSQL adapter |

## StorageAdapter Interface

**File**: `packages/core/src/memory/adapters/storage/types.ts:397-482`

```typescript
interface StorageAdapter {
  // Messages
  addMessage(message: UIMessage, userId: string, conversationId: string): Promise<void>;
  getMessages(userId: string, conversationId: string, options?: GetMessagesOptions): Promise<UIMessage[]>;
  clearMessages(userId: string, conversationId?: string): Promise<void>;

  // Conversations
  createConversation(input: CreateConversationInput): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  queryConversations(options: ConversationQueryOptions): Promise<Conversation[]>;

  // Working memory
  getWorkingMemory(params: { conversationId?: string; userId?: string; scope: string }): Promise<string | null>;
  setWorkingMemory(params: { ... }): Promise<void>;

  // Workflow state
  getWorkflowState(executionId: string): Promise<WorkflowStateEntry | null>;
  setWorkflowState(executionId: string, state: WorkflowStateEntry): Promise<void>;
}
```

## In-Memory (Development)

**File**: `packages/core/src/memory/adapters/storage/in-memory.ts`

```typescript
import { InMemoryStorageAdapter } from "@voltagent/core";

const storage = new InMemoryStorageAdapter();

const agent = new Agent({
  memory: new Memory({ storage }),
});
```

Data is lost on restart. Good for development and testing.

## LibSQL / Turso (Production)

**File**: `packages/libsql/src/memory-v2-adapter.ts`

### Local File

```typescript
import { LibSQLMemoryAdapter, LibSQLVectorAdapter } from "@voltagent/libsql";

const storage = new LibSQLMemoryAdapter({
  url: "file:./memory.db",
});

const vector = new LibSQLVectorAdapter({
  url: "file:./vectors.db",
});

const memory = new Memory({
  storage,
  vector,
  embedding: "openai/text-embedding-3-small",
});
```

### Remote Turso

```typescript
const storage = new LibSQLMemoryAdapter({
  url: process.env.TURSO_DB_URL,         // "libsql://my-db.turso.io"
  authToken: process.env.TURSO_DB_AUTH_TOKEN,
  tablePrefix: "myapp_memory",            // Optional
});
```

### LibSQL Schema

**File**: `packages/libsql/src/memory-core.ts:149-227`

```sql
CREATE TABLE IF NOT EXISTS voltagent_memory_users (
  id TEXT PRIMARY KEY,
  metadata TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS voltagent_memory_conversations (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voltagent_memory_messages (
  conversation_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  parts TEXT NOT NULL,
  metadata TEXT,
  format_version INTEGER DEFAULT 2,
  created_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, message_id)
);

CREATE TABLE IF NOT EXISTS voltagent_memory_workflow_states (...);
CREATE TABLE IF NOT EXISTS voltagent_memory_steps (...);

-- Indexes
CREATE INDEX idx_voltagent_memory_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_voltagent_memory_messages_conversation_id ON messages(conversation_id);
```

## PostgreSQL (Enterprise)

**File**: `packages/postgres/src/memory-adapter.ts`

### Configuration

```typescript
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";

const storage = new PostgreSQLMemoryAdapter({
  connection: {
    host: "localhost",
    port: 5432,
    database: "voltagent",
    user: "postgres",
    password: "password",
    ssl: false,
  },
  maxConnections: 10,
  tablePrefix: "voltagent_memory",
  schema: "public",
});

const memory = new Memory({ storage });
```

### Connection String

```typescript
const storage = new PostgreSQLMemoryAdapter({
  connection: "postgresql://user:pass@localhost:5432/voltagent",
  tablePrefix: "voltagent_memory",
});
```

### PostgreSQL Schema Differences

- Uses `JSONB` for metadata (better indexing)
- Uses `TIMESTAMPTZ` for timestamps
- Supports PostgreSQL schemas (namespaces)
- Connection pooling via `pg.Pool`

### Vector Search with PostgreSQL

```typescript
import { PostgreSQLMemoryAdapter, PostgreSQLVectorAdapter } from "@voltagent/postgres";

const storage = new PostgreSQLMemoryAdapter({
  connection: { host: "localhost", port: 5432, database: "voltagent", user: "postgres", password: "password" },
});

const vector = new PostgreSQLVectorAdapter({
  connection: { host: "localhost", port: 5432, database: "voltagent", user: "postgres", password: "password" },
});

const memory = new Memory({
  storage,
  vector,
  embedding: "openai/text-embedding-3-small",
});
```

## Edge/Cloudflare Workers

**File**: `packages/libsql/src/memory-v2-adapter-edge.ts`

For edge runtimes, use the edge-specific adapters:

```typescript
import { LibSQLMemoryAdapterEdge, LibSQLVectorAdapterEdge } from "@voltagent/libsql/edge";

const storage = new LibSQLMemoryAdapterEdge({
  url: "libsql://my-db.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

**Note**: Edge adapters only support remote Turso URLs (`libsql://`).

## Adapter Comparison

| Adapter | Persistence | Vector Search | Best For |
|---------|-------------|---------------|----------|
| `InMemoryStorageAdapter` | No | Via `InMemoryVectorAdapter` | Development |
| `LibSQLMemoryAdapter` | Yes | Via `LibSQLVectorAdapter` | Production, SQLite/Turso |
| `PostgreSQLMemoryAdapter` | Yes | Via `PostgreSQLVectorAdapter` | Enterprise, PostgreSQL |
| `LibSQLMemoryAdapterEdge` | Yes | Via `LibSQLVectorAdapterEdge` | Edge/Workers |

## Complete Example with PostgreSQL

```typescript
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import { honoServer } from "@voltagent/server-hono";

const storage = new PostgreSQLMemoryAdapter({
  connection: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT || "5432"),
    database: process.env.POSTGRES_DB || "voltagent",
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "password",
  },
  tablePrefix: "gym_app_memory",
  maxConnections: 10,
});

const agent = new Agent({
  name: "gym-coach",
  model: "openai/gpt-4o",
  instructions: "You are a gym coach",
  memory: new Memory({ storage }),
});

new VoltAgent({
  agents: { "gym-coach": agent },
  server: honoServer({ port: 3141 }),
});
```
