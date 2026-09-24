---
name: pimono
description: >-
  Pi Mono monorepo knowledge base. Covers @mariozechner/pi-ai (unified LLM API),
  @mariozechner/pi-coding-agent (terminal coding harness), @mariozechner/pi-agent-core
  (agent runtime), @mariozechner/pi-tui (terminal UI), and @mariozechner/pi-web-ui
  (web components). Use when working with pi-mono packages, building extensions,
  configuring providers, using the SDK, or integrating AI agents. Triggers: pi-mono,
  pi-ai, pi-coding-agent, pi-agent, LLM API, coding agent, terminal AI, agent SDK.
---

# Pi Mono Monorepo

Tools for building AI agents. Repository: `badlogic/pi-mono`.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| `@mariozechner/pi-ai` | Unified multi-provider LLM API with streaming, tools, images | [README](references/ai-package.md) |
| `@mariozechner/pi-agent-core` | Agent runtime with tool calling and state management | [README](references/agent-core.md) |
| `@mariozechner/pi-coding-agent` | Interactive terminal coding harness (pi CLI) | [README](references/coding-agent.md) |
| `@mariozechner/pi-tui` | Terminal UI library with differential rendering | - |
| `@mariozechner/pi-web-ui` | Web components for AI chat interfaces | - |

## Quick Reference

### Pi AI Package

```typescript
import { getModel, stream, complete, Type } from '@mariozechner/pi-ai';

const model = getModel('anthropic', 'claude-sonnet-4-20250514');
const context = {
  systemPrompt: 'You are helpful.',
  messages: [{ role: 'user', content: 'Hello!' }],
  tools: [{
    name: 'get_time',
    description: 'Get current time',
    parameters: Type.Object({ timezone: Type.Optional(Type.String()) })
  }]
};

// Streaming
for await (const event of stream(model, context)) {
  if (event.type === 'text_delta') process.stdout.write(event.delta);
}

// Complete response
const response = await complete(model, context);
```

### Pi Coding Agent CLI

```bash
npm install -g @mariozechner/pi-coding-agent

# API key auth
export ANTHROPIC_API_KEY=sk-ant-...
pi

# OAuth auth
pi
/login
```

### Agent SDK

```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";

const agent = new Agent({
  initialState: {
    systemPrompt: "You are helpful.",
    model: getModel("anthropic", "claude-sonnet-4-20250514"),
  },
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello!");
```

## Detailed Documentation

- [AI Package](references/ai-package.md) - LLM API, streaming, tools, providers
- [Coding Agent](references/coding-agent.md) - Interactive mode, commands, sessions
- [Agent Core](references/agent-core.md) - Agent runtime, events, tool execution
- [Configuration](references/configuration.md) - Settings, auth, providers
- [Extensions](references/extensions.md) - Creating extensions, custom tools, events
- [Skills](references/skills.md) - Creating and using skills
- [SDK & RPC](references/sdk-rpc.md) - Programmatic usage, RPC mode, JSON events
- [Providers](references/providers.md) - Provider setup, models, auth

## Repository

- GitHub: `badlogic/pi-mono`
- Main docs: `packages/coding-agent/docs/`
- Examples: `packages/coding-agent/examples/`
- Test: `./test.sh` (from repo root)
- Check: `npm run check` (requires `npm run build` first)

## License

MIT
