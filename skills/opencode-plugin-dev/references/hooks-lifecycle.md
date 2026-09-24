# Complete Hook Lifecycle Reference

Every OpenCode plugin hook: when it triggers, its signature, and practical examples.

---

## Registration Hooks (run once at plugin load)

### auth

Register an authentication provider.

**When:** During `Plugin.init()`.

**Signature:**
```typescript
auth?: {
  provider: string
  loader: () => Promise<{ api_key?: string; token?: string; headers?: Record<string, string> }>
  methods: Array<
    | { id: string; type: "oauth"; name: string; auto?: boolean; client_id?: string; client_secret?: string; authorize_url?: string; token_url?: string; scopes?: string[]; redirect_uri?: string }
    | { id: string; type: "api_key"; name: string; placeholder?: string }
  >
}
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    auth: {
      provider: "my-llm",
      async loader() {
        const token = process.env.MY_TOKEN
        if (!token) return {}
        return { headers: { Authorization: `Bearer ${token}` } }
      },
      methods: [{
        id: "api_key",
        type: "api_key",
        name: "API Key",
        placeholder: "sk-..."
      }]
    }
  }
}
```

---

### tool

Register custom tools the LLM can invoke.

**When:** During `Plugin.init()`.

**Signature:**
```typescript
tool?: {
  [toolId: string]: {
    description: string
    parameters: Record<string, { type: "string" | "number" | "boolean" | "array" | "object"; description: string; enum?: string[]; default?: any; required?: boolean }>
    execute: (params: Record<string, any>, context: { session: Session; callID: string }) => Promise<{ title: string; output: string | object; metadata?: Record<string, any> }>
  }
}
```

Use the `tool()` helper for type inference:

```typescript
import { tool } from "@opencode-ai/plugin"

export default async function plugin(input) {
  const { $ } = input
  return {
    tool: {
      "run_tests": tool({
        description: "Run test suite",
        parameters: {
          pattern: { type: "string", description: "Test pattern", default: "**/*.test.ts" },
          coverage: { type: "boolean", description: "Generate coverage", default: false }
        },
        async execute({ pattern, coverage }, ctx) {
          let cmd = `bun test ${pattern}`
          if (coverage) cmd += " --coverage"
          const result = await $`${cmd}`
          return {
            title: "Test Results",
            output: result.stdout || result.stderr,
            metadata: { exitCode: result.exitCode, duration: result.duration }
          }
        }
      })
    }
  }
}
```

---

### config

Modify OpenCode configuration at runtime.

**When:** During `Plugin.init()`, after loading `opencode.json`.

**Signature:**
```typescript
config?: (config: OpenCodeConfig) => void
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    config(config) {
      if (!config.provider["custom"]) {
        config.provider["custom"] = {
          type: "openai-compatible",
          baseUrl: "https://api.example.com/v1"
        }
      }
      config.model = "custom/default"
    }
  }
}
```

---

## Lifecycle Hooks (run repeatedly)

### event

Subscribe to all system events.

**When:** Every time any event is published via `Bus.publish()`.

**Signature:**
```typescript
event?: (event: { event: { type: string; properties?: any } }) => void
```

**Event types:**
- `session.start` / `session.end`
- `message.send` / `message.receive`
- `tool.execute.start` / `tool.execute.end`
- `provider.auth` / `provider.error`
- `project.updated`
- `server.instance.disposed`

**Example:**
```typescript
export default async function plugin(input) {
  return {
    event({ event }) {
      if (event.type === "tool.execute.end") {
        console.log(`Tool ${event.data?.tool} completed`)
      }
    }
  }
}
```

---

### chat.message

Transform each message (user, assistant, system) individually.

**When:** Every time a message is processed.

**Signature:**
```typescript
"chat.message"?: (input: { session: Session; message: Message }, output: Message) => Promise<Message | void>

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  metadata?: Record<string, any>
}
```

**Example — Filter secrets:**
```typescript
const SENSITIVE = [
  /sk-[a-zA-Z0-9]{48}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /password=\S+/g
]

export default async function plugin(input) {
  return {
    async "chat.message"(input, output) {
      if (output.role === "user") {
        for (const pattern of SENSITIVE) {
          output.content = output.content.replace(pattern, "[REDACTED]")
        }
      }
      return output
    }
  }
}
```

**Example — Add timestamp:**
```typescript
export default async function plugin(input) {
  return {
    async "chat.message"(input, output) {
      if (output.role === "user") {
        output.content = `[${new Date().toISOString()}] ${output.content}`
      }
      return output
    }
  }
}
```

---

### chat.params

Modify LLM parameters before each API call.

**When:** Before every LLM request (`session/llm.ts:114`).

**Signature:**
```typescript
"chat.params"?: (input: { model: string; provider: string; session: Session }, output: LLMParams) => Promise<LLMParams | void>

interface LLMParams {
  temperature?: number
  topP?: number
  topK?: number
  maxTokens?: number
  stop?: string[]
  [key: string]: any
}
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    "chat.params"(input, output) {
      if (input.model.includes("claude")) {
        output.temperature = 0.5
        output.maxTokens = 4096
      } else if (input.model.includes("gpt")) {
        output.temperature = 0.8
      }
      return output
    }
  }
}
```

---

### chat.headers

Modify HTTP headers before each LLM request.

**When:** Before every LLM request (`session/llm.ts:133`).

**Signature:**
```typescript
"chat.headers"?: (input: { model: string; provider: string; session: Session }, output: Record<string, string>) => Promise<Record<string, string> | void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    "chat.headers"(input, output) {
      output["X-Request-ID"] = crypto.randomUUID()
      if (input.provider === "anthropic") {
        output["anthropic-beta"] = "prompt-caching-2024-07-31"
      }
      return output
    }
  }
}
```

---

### tool.definition

Modify tool schema (description, parameters) before the LLM sees it.

**When:** During tool registry lookup (`tool/registry.ts:163`).

**Signature:**
```typescript
"tool.definition"?: (input: { toolID: string }, output: { description?: string; parameters?: any }) => Promise<{ description?: string; parameters?: any } | void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    "tool.definition"(input, output) {
      if (input.toolID === "bash") {
        output.description += "\n\n⚠️ This executes shell commands directly."
      }
      if (input.toolID === "write_file") {
        output.parameters.properties.backup = {
          type: "boolean",
          description: "Create backup before overwriting",
          default: true
        }
      }
      return output
    }
  }
}
```

---

### tool.execute.before

Run before any tool executes. Validate, log, or modify arguments.

**When:** Immediately before tool execution (`session/prompt.ts:802`).

**Signature:**
```typescript
"tool.execute.before"?: (input: { tool: string; session: Session; callID: string; args: Record<string, any> }, output: any) => Promise<void>
```

**Example:**
```typescript
export default async function plugin(input) {
  const BLOCKED = ["rm -rf /", "sudo rm", "> /etc/passwd"]
  return {
    "tool.execute.before"(input, output) {
      console.log(`[PRE] ${input.tool}`, input.args)
      if (input.tool === "bash") {
        const cmd = input.args.command || ""
        for (const b of BLOCKED) {
          if (cmd.includes(b)) throw new Error(`Blocked: ${b}`)
        }
      }
    }
  }
}
```

---

### tool.execute.after

Run after any tool completes. Add metadata, measure timing, transform output.

**When:** Immediately after tool execution (`session/prompt.ts:823`).

**Signature:**
```typescript
"tool.execute.after"?: (input: { tool: string; session: Session; callID: string; args: Record<string, any>; startTime: number }, output: ToolResult) => Promise<ToolResult | void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    "tool.execute.after"(input, output) {
      const duration = Date.now() - input.startTime
      output.metadata = output.metadata || {}
      output.metadata.duration_ms = duration
      output.metadata.tool = input.tool
      output.metadata.success = !output.metadata?.error

      if (input.tool === "read_file" && typeof output.output === "string") {
        const lines = output.output.split("\n")
        output.output = lines.map((l, i) => `${i + 1}: ${l}`).join("\n")
      }
      return output
    }
  }
}
```

---

### command.execute.before

Run before external commands (slash commands).

**When:** Before command execution.

**Signature:**
```typescript
"command.execute.before"?: (input: { command: string; args: string[] }, output: CommandPart[]) => Promise<CommandPart[] | void>
```

---

### shell.env

Inject environment variables into shell sessions (bash tool, PTY).

**When:** Every time a shell spawns (`tool/bash.ts:162`, `pty/index.ts:129`).

**Signature:**
```typescript
"shell.env"?: (input: { cwd: string; sessionId: string }, output: Record<string, string>) => Promise<Record<string, string> | void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    "shell.env"(input, output) {
      output.PLUGIN_ACTIVE = "true"
      output.PROJECT_DIR = input.cwd

      // Load .env file
      const envPath = path.join(input.cwd, ".env")
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, "utf-8")
        for (const line of content.split("\n")) {
          const [k, ...v] = line.split("=")
          if (k && v.length) output[k.trim()] = v.join("=").trim()
        }
      }
      return output
    }
  }
}
```

---

### permission.ask

Control permission decisions. Return `"allow"`, `"deny"`, or `"ask"`.

**When:** Every permission request (`permission/index.ts:128`).

**Signature:**
```typescript
"permission.ask"?: (input: { type: string; resource: string; action: string; details?: any }, output: "ask" | "allow" | "deny") => Promise<"ask" | "allow" | "deny" | void>
```

**Example:**
```typescript
export default async function plugin(input) {
  const ALLOWED = ["read_file", "search", "list_files", "grep", "glob"]
  const BLOCKED_CMDS = ["rm -rf /", "sudo", "> /etc/"]
  const PROTECTED = [".env", "credentials.json", "*.pem"]

  return {
    "permission.ask"(input, output) {
      if (input.type === "tool" && ALLOWED.includes(input.resource)) {
        return "allow"
      }
      if (input.type === "command") {
        for (const b of BLOCKED_CMDS) {
          if (input.resource.includes(b)) return "deny"
        }
      }
      const path = input.details?.path || input.details?.file
      if (path) {
        for (const p of PROTECTED) {
          if (path.endsWith(p.replace("*", ""))) return "deny"
        }
      }
      return "ask"
    }
  }
}
```

---

## Experimental Hooks

### experimental.chat.system.transform

**Modify the system prompt.** This is the most powerful hook for prompt engineering.

**When:** During agent preparation, after `messages.transform` (`agent/agent.ts:290`).

**Signature:**
```typescript
"experimental.chat.system.transform"?: (input: { model: string }, output: { system: string[] }) => Promise<void>
```

`output.system` is an array of strings. Use `unshift()` to prepend, `push()` to append.

**Example:**
```typescript
export default async function plugin(input) {
  return {
    async "experimental.chat.system.transform"(input, output) {
      output.system.unshift("You are an expert TypeScript developer.")
      output.system.push(...[
        "Team rules:",
        "- Use const, never let",
        "- Prefer arrow functions",
        "- No try/catch unless strictly necessary"
      ])
      if (input.model.includes("claude")) {
        output.system.push("You have access to extended thinking.")
      }
    }
  }
}
```

---

### experimental.chat.messages.transform

Transform the entire message array before sending to the LLM.

**When:** During message preparation (`session/prompt.ts:652`).

**Signature:**
```typescript
"experimental.chat.messages.transform"?: (input: {}, output: { messages: Message[] }) => Promise<void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    async "experimental.chat.messages.transform"(input, output) {
      const msgs = output.messages
      if (msgs.length > 40) {
        const summary = await summarize(msgs.slice(0, -20))
        output.messages = [
          { role: "system", content: `Previous context: ${summary}` },
          ...msgs.slice(-20)
        ]
      }
    }
  }
}
```

---

### experimental.session.compacting

Customize context compaction strategy (when conversation exceeds token limit).

**When:** During automatic compaction (`session/compaction.ts:169`).

**Signature:**
```typescript
"experimental.session.compacting"?: (input: { sessionId: string }, output: { enabled: boolean; threshold: number; prompt?: string }) => Promise<void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    async "experimental.session.compacting"(input, output) {
      output.threshold = 40000
      output.prompt = `
        Summarize preserving:
        1. Architecture decisions
        2. Files modified and why
        3. Bugs found and status
        4. User preferences
      `.trim()
    }
  }
}
```

---

### experimental.text.complete

Intercept text completed by the LLM before displaying to user.

**When:** After LLM text generation (`session/processor.ts:323`).

**Signature:**
```typescript
"experimental.text.complete"?: (input: { session: Session; message: Message; part: MessagePart }, output: string) => Promise<string | void>
```

**Example:**
```typescript
export default async function plugin(input) {
  return {
    async "experimental.text.complete"(input, output) {
      // Ensure code blocks have language specified
      return output.replace(/```\n/g, "```text\n")
    }
  }
}
```

---

## Hook Execution Order

When a user sends a message:

```
1. experimental.chat.messages.transform
2. chat.message (for each message)
3. experimental.chat.system.transform
4. chat.params
5. chat.headers
6. LLM processes request
7. experimental.text.complete (on generated text)
8. If tool call: permission.ask → tool.definition → tool.execute.before → EXECUTE → tool.execute.after
9. If bash: permission.ask → shell.env → EXECUTE
```
