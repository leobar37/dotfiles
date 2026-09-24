# Testing Patterns for OpenCode Plugins

How to test plugins with Vitest, including unit and integration tests.

---

## Unit Tests

### Basic Structure

```typescript
// test/plugin.test.ts
import { describe, it, expect } from "vitest"
import myPlugin from "../src/index"

const mockInput = {
  client: {} as any,
  project: "/test/project",
  directory: "/test/project",
  $: {} as any
}

describe("myPlugin", () => {
  it("should return hooks", async () => {
    const hooks = await myPlugin(mockInput)
    expect(hooks).toBeDefined()
    expect(hooks.tool).toBeDefined()
  })
})
```

### Testing Tools

```typescript
describe("tools", () => {
  it("should execute greet tool", async () => {
    const hooks = await myPlugin(mockInput)
    const greet = hooks.tool?.greet
    expect(greet).toBeDefined()

    const result = await greet!.execute(
      { name: "Alice" },
      { session: {} as any, callID: "test-1" }
    )

    expect(result.title).toBe("Greeting")
    expect(result.output).toContain("Alice")
  })

  it("should handle errors gracefully", async () => {
    const hooks = await myPlugin(mockInput)
    const tool = hooks.tool?.my_tool

    const result = await tool!.execute(
      { file: "/nonexistent" },
      { session: {} as any, callID: "test-2" }
    )

    expect(result.metadata?.error).toBe(true)
    expect(result.title).toContain("Error")
  })
})
```

### Testing Hooks

```typescript
describe("hooks", () => {
  it("should transform messages", async () => {
    const hooks = await myPlugin(mockInput)
    const message = { role: "user" as const, content: "hello" }

    const result = await hooks["chat.message"]!(
      { session: {} as any, message },
      message
    )

    expect(result.content).toContain("hello")
  })

  it("should modify params for claude", async () => {
    const hooks = await myPlugin(mockInput)
    const params = { temperature: 0.5, maxTokens: 100 }

    await hooks["chat.params"]!(
      { model: "anthropic/claude-3", provider: "anthropic", session: {} as any },
      params
    )

    expect(params.temperature).toBe(0.7)
  })
})
```

### Mocking BunShell

```typescript
const mockInput = {
  client: {} as any,
  project: "/test/project",
  directory: "/test/project",
  $: {
    async template(strings: TemplateStringsArray, ...values: any[]) {
      const command = strings.reduce((acc, str, i) => acc + str + (values[i] || ""), "")
      return {
        stdout: `mock output for: ${command}`,
        stderr: "",
        exitCode: 0,
        duration: 100
      }
    }
  } as any
}
```

### Mocking Filesystem

```typescript
import { mock, beforeEach } from "bun:test"

beforeEach(() => {
  mock.module("fs", () => ({
    existsSync: () => true,
    readFileSync: () => JSON.stringify({ name: "test", version: "1.0.0" })
  }))
})
```

---

## Integration Tests

### Testing Plugin Loading

```typescript
// test/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { execSync } from "child_process"

describe("Plugin Integration", () => {
  it("should load plugin without errors", async () => {
    const plugin = await import("../src/index")
    const hooks = await plugin.default(mockInput)
    expect(Object.keys(hooks)).toHaveLength(3)
  })

  it("should trigger hooks in sequence", async () => {
    const hooks = await myPlugin(mockInput)
    const order: string[] = []

    // Simulate hook chain
    if (hooks["chat.message"]) {
      order.push("chat.message")
    }
    if (hooks["chat.params"]) {
      order.push("chat.params")
    }

    expect(order).toEqual(["chat.message", "chat.params"])
  })
})
```

---

## Test Configuration

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"]
  }
})
```

### test/setup.ts

```typescript
beforeAll(() => {
  process.env.NODE_ENV = "test"
  process.env.PLUGIN_LOG_LEVEL = "DEBUG"
})

afterAll(() => {
  // Cleanup
})
```

---

## Best Practices

1. **Test actual behavior, not implementation** — don't test internal state
2. **Mock external dependencies** — filesystem, network, shell
3. **Test error paths** — tools should return `{ metadata: { error: true } }`
4. **Test hook composition** — multiple plugins' hooks should chain correctly
5. **Keep tests fast** — avoid real network calls, use mocks

---

## Debug Helper

Create a debug plugin for testing:

```typescript
// test/debug-plugin.ts
export default async function debugPlugin(input) {
  return {
    event({ event }) {
      console.log("[EVENT]", event.type, event.properties)
    },
    "tool.execute.before"(input) {
      console.log("[TOOL START]", input.tool, input.args)
    },
    "tool.execute.after"(input, output) {
      console.log("[TOOL END]", input.tool, output.title)
    }
  }
}
```
