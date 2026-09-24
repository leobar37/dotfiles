# Plugin Examples

Ready-to-use plugin templates. Copy, modify, and register in `opencode.json`.

---

## 1. Minimal Plugin

```typescript
// minimal-plugin.ts
import type { Plugin } from "@opencode-ai/plugin"

const plugin: Plugin = async (input) => {
  return {}
}

export default plugin
```

```json
// opencode.json
{ "plugin": ["./minimal-plugin.ts"] }
```

---

## 2. Tool Plugin

```typescript
// tool-plugin.ts
import { tool } from "@opencode-ai/plugin"
import type { Plugin } from "@opencode-ai/plugin"

const plugin: Plugin = async (input) => {
  const { $ } = input

  return {
    tool: {
      "run_tests": tool({
        description: "Run the test suite with optional filters",
        parameters: {
          pattern: {
            type: "string",
            description: "Test file pattern",
            default: "**/*.test.ts"
          },
          coverage: {
            type: "boolean",
            description: "Generate coverage report",
            default: false
          }
        },
        async execute({ pattern, coverage }, ctx) {
          let cmd = `bun test ${pattern}`
          if (coverage) cmd += " --coverage"
          const result = await $`${cmd}`

          return {
            title: "Test Results",
            output: result.stdout || result.stderr,
            metadata: {
              exitCode: result.exitCode,
              duration: result.duration
            }
          }
        }
      })
    }
  }
}

export default plugin
```

---

## 3. Auth Plugin

```typescript
// auth-plugin.ts
import type { Plugin } from "@opencode-ai/plugin"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"

const plugin: Plugin = async (input) => {
  const tokenPath = join(homedir(), ".my-plugin", "token.json")

  async function loadToken(): Promise<string | null> {
    if (!existsSync(tokenPath)) return null
    const data = readFileSync(tokenPath, "utf-8")
    const { token, expiresAt } = JSON.parse(data)
    if (expiresAt && Date.now() > expiresAt) return null
    return token
  }

  async function saveToken(token: string, expiresIn?: number) {
    const dir = join(homedir(), ".my-plugin")
    if (!existsSync(dir)) {
      const { mkdirSync } = await import("fs")
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(tokenPath, JSON.stringify({
      token,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined
    }))
  }

  return {
    auth: {
      provider: "my-provider",
      async loader() {
        const token = await loadToken()
        if (token) {
          return { headers: { Authorization: `Bearer ${token}` } }
        }
        return {}
      },
      methods: [
        {
          id: "api_key",
          type: "api_key",
          name: "API Key",
          placeholder: "Enter your API key"
        }
      ]
    }
  }
}

export default plugin
```

---

## 4. Message Filtering Plugin

```typescript
// filter-plugin.ts
const SENSITIVE = [
  /sk-[a-zA-Z0-9]{48}/g,
  /sk-ant-[a-zA-Z0-9]{95}/g,
  /AIza[a-zA-Z0-9_-]{35}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /password=\S+/g,
  /pwd=\S+/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END \1PRIVATE KEY-----/g,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
]

export default async function filterPlugin(input) {
  function filter(text: string): string {
    for (const pattern of SENSITIVE) {
      text = text.replace(pattern, "[REDACTED]")
    }
    return text
  }

  return {
    async "chat.message"(input, output) {
      if (output.role === "user") {
        output.content = filter(output.content)
      }
      return output
    },

    "tool.execute.before"(input, output) {
      if (input.args) {
        for (const key of Object.keys(input.args)) {
          if (typeof input.args[key] === "string") {
            input.args[key] = filter(input.args[key])
          }
        }
      }
    }
  }
}
```

---

## 5. System Prompt Injection Plugin

```typescript
// system-prompt-plugin.ts
export default async function systemPromptPlugin(input) {
  const { directory } = input

  return {
    async "experimental.chat.system.transform"(input, output) {
      output.system.unshift("You are an expert TypeScript and React developer.")

      output.system.push(...[
        "",
        "Coding Standards:",
        "- Use const, never let",
        "- Prefer arrow functions",
        "- Use early returns, avoid else",
        "- No try/catch unless strictly necessary",
        "- Follow existing naming conventions",
        "- Add JSDoc for public functions"
      ])

      if (input.model.includes("claude")) {
        output.system.push("You have access to extended thinking mode.")
      }
    }
  }
}
```

---

## 6. Permission Control Plugin

```typescript
// permissions-plugin.ts
export default async function permissionsPlugin(input) {
  const ALLOWED = ["read_file", "search", "list_files", "grep", "glob"]
  const BLOCKED = ["rm -rf /", "sudo", "chmod 777 /", "> /etc/passwd"]
  const PROTECTED = [".env", ".env.local", "credentials.json", "*.pem", "*.key"]

  return {
    "permission.ask"(input, output) {
      if (input.type === "tool" && ALLOWED.includes(input.resource)) {
        return "allow"
      }

      if (input.type === "command") {
        for (const b of BLOCKED) {
          if (input.resource.includes(b)) return "deny"
        }
      }

      const path = input.details?.path || input.details?.file
      if (path) {
        for (const p of PROTECTED) {
          if (p.startsWith("*")) {
            if (path.endsWith(p.slice(1))) return "deny"
          } else if (path.includes(p)) {
            return "deny"
          }
        }
      }

      return "ask"
    }
  }
}
```

---

## 7. Full-Featured Plugin

```typescript
// full-plugin.ts
import { tool } from "@opencode-ai/plugin"
import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

interface PluginConfig {
  enabled: boolean
  apiKey?: string
  maxRetries: number
  timeout: number
}

function loadConfig(directory: string): PluginConfig {
  const path = join(directory, ".opencode", "full-plugin.json")
  if (existsSync(path)) {
    return { ...defaultConfig, ...JSON.parse(readFileSync(path, "utf-8")) }
  }
  return defaultConfig
}

const defaultConfig: PluginConfig = {
  enabled: true,
  maxRetries: 3,
  timeout: 30000
}

class Logger {
  constructor(private name: string, private level: string = "INFO") {}
  debug(msg: string, data?: any) {
    if (this.level === "DEBUG") console.debug(`[${this.name}] ${msg}`, data || "")
  }
  info(msg: string, data?: any) {
    console.log(`[${this.name}] ${msg}`, data || "")
  }
  error(msg: string, err?: Error) {
    console.error(`[${this.name}] ${msg}`, err || "")
  }
}

const plugin: Plugin = async (input) => {
  const { directory, $ } = input
  const config = loadConfig(directory)

  if (!config.enabled) {
    console.log("[full-plugin] Disabled")
    return {}
  }

  const logger = new Logger("full-plugin", process.env.PLUGIN_LOG_LEVEL || "INFO")
  const stats = { tools: 0, messages: 0, startTime: Date.now() }

  logger.info("Initialized", { directory })

  const hooks: Hooks = {
    tool: {
      "run_command": tool({
        description: "Run a shell command with timeout and retry",
        parameters: {
          command: { type: "string", description: "Command to run" },
          timeout: { type: "number", description: "Timeout in ms", default: config.timeout },
          retry: { type: "number", description: "Retries", default: 0 }
        },
        async execute({ command, timeout, retry }, ctx) {
          const maxRetries = Math.min(retry, config.maxRetries)
          let lastError: Error | null = null

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              const result = await $`${command}`
              if (result.exitCode === 0) {
                return {
                  title: "Command Output",
                  output: result.stdout || result.stderr,
                  metadata: { exitCode: result.exitCode, duration: result.duration, attempts: attempt + 1 }
                }
              }
              throw new Error(`Exit code ${result.exitCode}: ${result.stderr}`)
            } catch (error) {
              lastError = error as Error
              if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000))
            }
          }

          return {
            title: "Command Failed",
            output: lastError?.message || "Unknown error",
            metadata: { error: true, attempts: maxRetries + 1 }
          }
        }
      })
    },

    event(event) {
      if (event.event.type === "session.end") {
        const duration = Math.round((Date.now() - stats.startTime) / 1000)
        logger.info("Session ended", { duration, tools: stats.tools, messages: stats.messages })
      }
    },

    async "chat.message"(input, output) {
      stats.messages++
      output.metadata = output.metadata || {}
      output.metadata.msgNum = stats.messages
      return output
    },

    "chat.params"(input, output) {
      if (input.model.includes("claude")) output.temperature = 0.6
      return output
    },

    "tool.execute.before"(input, output) {
      stats.tools++
      logger.debug(`Starting: ${input.tool}`)
    },

    "tool.execute.after"(input, output) {
      const duration = Date.now() - input.startTime
      logger.debug(`Completed: ${input.tool} in ${duration}ms`)
      output.metadata = output.metadata || {}
      output.metadata.duration = duration
      return output
    },

    "permission.ask"(input, output) {
      const safe = ["read_file", "search", "list_files"]
      if (input.type === "tool" && safe.includes(input.resource)) return "allow"
      return "ask"
    },

    "shell.env"(input, output) {
      output.PLUGIN_ACTIVE = "true"
      return output
    },

    async "experimental.chat.system.transform"(input, output) {
      output.system.push("Always be concise and use markdown for code.")
    }
  }

  return hooks
}

export default plugin
```

**Config file** (`.opencode/full-plugin.json`):
```json
{
  "enabled": true,
  "apiKey": "your-key",
  "maxRetries": 3,
  "timeout": 30000
}
```

---

## 8. Debug Plugin

Use this to observe everything happening in OpenCode:

```typescript
// debug-plugin.ts
export default async function debugPlugin(input) {
  return {
    event({ event }) {
      console.log("[EVENT]", event.type, JSON.stringify(event.properties, null, 2).slice(0, 200))
    },

    "chat.message"(input, output) {
      console.log("[MSG]", output.role, output.content.slice(0, 100))
    },

    "chat.params"(input, output) {
      console.log("[PARAMS]", input.model, output)
    },

    "tool.execute.before"(input) {
      console.log("[TOOL START]", input.tool, JSON.stringify(input.args))
    },

    "tool.execute.after"(input, output) {
      console.log("[TOOL END]", input.tool, output.title, `${Date.now() - input.startTime}ms`)
    },

    "permission.ask"(input, output) {
      console.log("[PERM]", input.type, input.resource, "→", output)
      return output
    }
  }
}
```
