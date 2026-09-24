# API Type Reference

Complete type definitions for all plugin hooks, inputs, and outputs.

---

## Core Types

### Plugin

```typescript
type Plugin = (input: PluginInput) => Promise<Hooks>
```

### PluginInput

```typescript
interface PluginInput {
  client: Client
  project: string
  directory: string
  worktree?: string
  serverUrl?: string
  $: BunShell
}

interface Client {
  session: SessionManager
  tools: ToolManager
  state: StateManager
}

interface BunShell {
  (template: TemplateStringsArray, ...args: any[]): Promise<ShellResult>
}

interface ShellResult {
  stdout: string
  stderr: string
  exitCode: number
  duration: number
}
```

### Hooks

```typescript
interface Hooks {
  // Registration hooks
  auth?: AuthHook
  tool?: ToolMap
  config?: ConfigHook

  // Event hooks
  event?: EventHandler

  // Chat hooks
  "chat.message"?: MessageHook
  "chat.params"?: ParamsHook
  "chat.headers"?: HeadersHook

  // Tool hooks
  "tool.definition"?: ToolDefinitionHook
  "tool.execute.before"?: ToolBeforeHook
  "tool.execute.after"?: ToolAfterHook

  // Command hooks
  "command.execute.before"?: CommandBeforeHook

  // Environment hooks
  "shell.env"?: ShellEnvHook
  "permission.ask"?: PermissionHook

  // Experimental hooks
  "experimental.chat.messages.transform"?: MessagesTransformHook
  "experimental.chat.system.transform"?: SystemTransformHook
  "experimental.session.compacting"?: CompactionHook
  "experimental.text.complete"?: TextCompleteHook
}
```

---

## Auth Hook

```typescript
interface AuthHook {
  provider: string
  loader: () => Promise<AuthCredentials>
  methods: AuthMethod[]
}

type AuthCredentials = {
  api_key?: string
  token?: string
  headers?: Record<string, string>
  [key: string]: any
}

type AuthMethod = OAuthMethod | ApiKeyMethod

interface OAuthMethod {
  id: string
  type: "oauth"
  name: string
  auto?: boolean
  client_id?: string
  client_secret?: string
  authorize_url?: string
  token_url?: string
  scopes?: string[]
  redirect_uri?: string
}

interface ApiKeyMethod {
  id: string
  type: "api_key"
  name: string
  placeholder?: string
}
```

---

## Tool Definition

```typescript
interface ToolDefinition {
  description: string
  parameters: ToolParameters
  execute: ToolExecuteFunction
}

type ToolParameters = {
  [paramName: string]: ToolParameter
}

interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object"
  description: string
  enum?: string[]
  default?: any
  required?: boolean
}

type ToolExecuteFunction = (
  params: Record<string, any>,
  context: ToolContext
) => Promise<ToolResult>

interface ToolContext {
  session: Session
  callID: string
}

interface ToolResult {
  title: string
  output: string | object
  metadata?: Record<string, any>
}
```

### tool() Helper

```typescript
import { tool } from "@opencode-ai/plugin"

const myTool = tool({
  description: string,
  parameters: {
    [name]: {
      type: "string" | "number" | "boolean" | "array" | "object"
      description: string
      enum?: string[]
      default?: any
      required?: boolean
    }
  },
  async execute(params, context): Promise<ToolResult> {
    // Implementation
  }
})
```

---

## Lifecycle Hook Types

### config

```typescript
type ConfigHook = (config: OpenCodeConfig) => void
```

### event

```typescript
type EventHandler = (event: { event: { type: string; properties?: any } }) => void
```

### chat.message

```typescript
type MessageHook = (
  input: { session: Session; message: Message },
  output: Message
) => Promise<Message | void>

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  metadata?: Record<string, any>
}
```

### chat.params

```typescript
type ParamsHook = (
  input: { model: string; provider: string; session: Session },
  output: LLMParams
) => Promise<LLMParams | void>

interface LLMParams {
  temperature?: number
  topP?: number
  topK?: number
  maxTokens?: number
  stop?: string[]
  [key: string]: any
}
```

### chat.headers

```typescript
type HeadersHook = (
  input: { model: string; provider: string; session: Session },
  output: Record<string, string>
) => Promise<Record<string, string> | void>
```

### tool.definition

```typescript
type ToolDefinitionHook = (
  input: { toolID: string },
  output: { description?: string; parameters?: any }
) => Promise<{ description?: string; parameters?: any } | void>
```

### tool.execute.before

```typescript
type ToolBeforeHook = (
  input: { tool: string; session: Session; callID: string; args: Record<string, any> },
  output: any
) => Promise<void>
```

### tool.execute.after

```typescript
type ToolAfterHook = (
  input: { tool: string; session: Session; callID: string; args: Record<string, any>; startTime: number },
  output: ToolResult
) => Promise<ToolResult | void>
```

### command.execute.before

```typescript
type CommandBeforeHook = (
  input: { command: string; args: string[] },
  output: CommandPart[]
) => Promise<CommandPart[] | void>

type CommandPart = {
  type: "text" | "tool_result"
  content: string
  toolCallId?: string
}
```

### shell.env

```typescript
type ShellEnvHook = (
  input: { cwd: string; sessionId: string },
  output: Record<string, string>
) => Promise<Record<string, string> | void>
```

### permission.ask

```typescript
type PermissionHook = (
  input: { type: string; resource: string; action: string; details?: any },
  output: PermissionDecision
) => Promise<PermissionDecision | void>

type PermissionDecision = "ask" | "allow" | "deny"
```

---

## Experimental Hook Types

### experimental.chat.messages.transform

```typescript
type MessagesTransformHook = (
  input: {},
  output: { messages: Message[] }
) => Promise<void>
```

### experimental.chat.system.transform

```typescript
type SystemTransformHook = (
  input: { model: string },
  output: { system: string[] }
) => Promise<void>
```

### experimental.session.compacting

```typescript
type CompactionHook = (
  input: { sessionId: string },
  output: CompactionConfig
) => Promise<CompactionConfig | void>

interface CompactionConfig {
  enabled: boolean
  threshold: number
  prompt?: string
}
```

### experimental.text.complete

```typescript
type TextCompleteHook = (
  input: { session: Session; message: Message; part: MessagePart },
  output: string
) => Promise<string | void>
```

---

## Import Reference

```typescript
// Types only
import type {
  Plugin,
  PluginInput,
  Hooks,
  AuthHook,
  ToolDefinition,
  ToolResult,
  ToolContext,
  Message,
  LLMParams,
  Event,
  // ... and more
} from "@opencode-ai/plugin"

// Runtime helpers
import { tool } from "@opencode-ai/plugin"
```
