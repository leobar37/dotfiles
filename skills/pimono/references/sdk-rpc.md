# SDK & RPC

## SDK

The SDK provides programmatic access to pi's agent capabilities.

### Installation

```bash
npm install @mariozechner/pi-coding-agent
```

### Quick Start

```typescript
import { createAgentSession } from "@mariozechner/pi-coding-agent";

const { session } = await createAgentSession();

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("What files are here?");
```

### AgentSession API

```typescript
interface AgentSession {
  // Prompting
  prompt(text: string, options?: PromptOptions): Promise<void>;
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;

  // Events
  subscribe(listener: (event: AgentSessionEvent) => void): () => void;

  // Info
  sessionFile: string | undefined;
  sessionId: string;

  // Model
  setModel(model: Model): Promise<void>;
  setThinkingLevel(level: ThinkingLevel): void;
  cycleModel(): Promise<ModelCycleResult | undefined>;
  cycleThinkingLevel(): ThinkingLevel | undefined;

  // State
  agent: Agent;
  model: Model | undefined;
  thinkingLevel: ThinkingLevel;
  messages: AgentMessage[];
  isStreaming: boolean;

  // Tree navigation
  navigateTree(targetId: string, options?: {
    summarize?: boolean;
    customInstructions?: string;
    replaceInstructions?: boolean;
    label?: string;
  }): Promise<{ editorText?: string; cancelled: boolean }>;

  // Compaction
  compact(customInstructions?: string): Promise<CompactionResult>;
  abortCompaction(): void;

  // Abort
  abort(): Promise<void>;

  // Cleanup
  dispose(): void;
}
```

### PromptOptions

```typescript
interface PromptOptions {
  expandPromptTemplates?: boolean;
  images?: ImageContent[];
  streamingBehavior?: "steer" | "followUp";
  source?: InputSource;
  preflightResult?: (success: boolean) => void;
}
```

### AgentSessionRuntime

For session replacement (new, resume, fork, clone):

```typescript
import { createAgentSessionRuntime, SessionManager } from "@mariozechner/pi-coding-agent";

const runtime = await createAgentSessionRuntime(createRuntime, {
  cwd: process.cwd(),
  agentDir: getAgentDir(),
  sessionManager: SessionManager.create(process.cwd()),
});

// Replace session
await runtime.newSession();
await runtime.switchSession(sessionId);
await runtime.fork(sessionId);
```

**Important**: Subscriptions attach to specific `AgentSession`. Re-subscribe after replacement.

```typescript
let session = runtime.session;
let unsubscribe = session.subscribe(() => {});

await runtime.newSession();

unsubscribe();
session = runtime.session;
unsubscribe = session.subscribe(() => {});
```

## RPC Mode

Headless operation via JSON protocol over stdin/stdout.

```bash
pi --mode rpc [options]
```

### Protocol

- **Commands**: JSON to stdin, one per line
- **Responses**: JSON with `type: "response"`
- **Events**: Agent events as JSON lines

Optional `id` field for request/response correlation.

**Framing**: Strict JSONL with LF (`\n`). Do not use Node `readline` (splits on Unicode separators).

### Commands

#### Prompting

```json
{"id": "req-1", "type": "prompt", "message": "Hello!"}
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
{"type": "steer", "message": "Stop and do this"}
{"type": "follow_up", "message": "After you're done"}
{"type": "abort"}
```

#### State

```json
{"type": "get_state"}
{"type": "get_messages"}
```

#### Model

```json
{"type": "set_model", "model": "claude-sonnet-4-20250514"}
{"type": "set_thinking_level", "level": "medium"}
```

#### Session

```json
{"type": "new_session"}
{"type": "new_session", "parentSession": "/path/to/parent.jsonl"}
{"type": "set_session_name", "name": "my-session"}
```

### Responses

```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true}
```

### Event Types

Base events:
```typescript
type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: AgentMessage[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
  | { type: "message_start"; message: AgentMessage }
  | { type: "message_update"; message: AgentMessage; assistantMessageEvent: AssistantMessageEvent }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
  | { type: "tool_execution_update"; toolCallId: string; toolName: string; args: any; partialResult: any }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: any; isError: boolean };
```

Session events:
```typescript
type AgentSessionEvent =
  | AgentEvent
  | { type: "queue_update"; steering: readonly string[]; followUp: readonly string[] }
  | { type: "compaction_start"; reason: "manual" | "threshold" | "overflow" }
  | { type: "compaction_end"; reason: "manual" | "threshold" | "overflow"; result: CompactionResult | undefined; aborted: boolean }
  | { type: "auto_retry_start"; attempt: number; maxAttempts: number; delayMs: number }
  | { type: "auto_retry_end"; success: boolean; attempt: number };
```

## JSON Event Stream Mode

```bash
pi --mode json "Your prompt"
```

Outputs all events as JSON lines:

```json
{"type":"session","version":3,"id":"uuid","timestamp":"...","cwd":"/path"}
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{...}}
{"type":"message_update","message":{...},"assistantMessageEvent":{"type":"text_delta","delta":"Hello"}}
{"type":"message_end","message":{...}}
{"type":"turn_end","message":{...},"toolResults":[]}
{"type":"agent_end","messages":[...]}
```

Filter with jq:
```bash
pi --mode json "List files" | jq -c 'select(.type == "message_end")'
```

## Examples

See `packages/coding-agent/examples/sdk/` for working examples.

### Minimal SDK Example

```typescript
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "@mariozechner/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
  authStorage,
  modelRegistry,
});

session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await session.prompt("What files are in the current directory?");
```
