---
name: volt-agent
description: |
  Expert in VoltAgent AI framework - building multi-tenant agents with tools, memory, workflows, and Hono server.
  Use when: creating AI agents, adding tools, setting up chat servers, implementing memory, building subagent systems, or configuring multi-tenant applications.
  Keywords: voltagent, agent, ai agent, chatbot, multi-tenant, tools, memory, subagent, workflow, hono, server, persistence, libsql, turso
---

# VoltAgent Framework Expert

Expert in building AI agents with the VoltAgent TypeScript framework.

## What I Know

- **Multi-tenancy**: `userId`/`conversationId` scoping, auth context injection, isolated memory
- **Server**: Hono HTTP server with agents/workflows/memory/tools routes, JWT auth
- **Agents**: `Agent` class, `PlanAgent`, execution methods, hooks lifecycle
- **Tools**: `createTool()`, Zod schemas, `OperationContext` access, toolkits
- **SubAgents**: `SubAgentManager`, `handoffTask()`, task tool, bail mechanism
- **Workflows**: `createWorkflow()`, typed steps, suspend/resume, state management
- **Memory**: `Memory` class, semantic search, working memory, storage adapters
- **Persistence**: `StorageAdapter` interface, InMemory/LibSQL/PostgreSQL adapters

## When to Use

- Building AI chatbots or assistants
- Creating multi-tenant agent services
- Adding tools to agents
- Setting up agent servers with Hono
- Implementing conversation memory
- Building agent orchestration with subagents
- Creating multi-step AI workflows
- Configuring database persistence for agents

## Quick Reference

### Core Packages

| Package | Purpose |
|---------|---------|
| `@voltagent/core` | Agent, PlanAgent, Memory, Tools, Workflows |
| `@voltagent/server-hono` | Hono HTTP server |
| `@voltagent/libsql` | LibSQL/Turso/SQLite adapter |
| `@voltagent/postgres` | PostgreSQL adapter |

### Minimal Agent

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-agent",
  model: "openai/gpt-4o-mini",
  instructions: "You are a helpful assistant",
  tools: [myTool],
  memory: myMemory,
});
```

### Minimal Server

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Detailed References

- **Multi-Tenancy**: [references/multi-tenancy.md](references/multi-tenancy.md)
- **Server (Hono)**: [references/server.md](references/server.md)
- **Agents**: [references/agents.md](references/agents.md)
- **Tools**: [references/tools.md](references/tools.md)
- **SubAgents**: [references/subagents.md](references/subagents.md)
- **Workflows**: [references/workflows.md](references/workflows.md)
- **Memory**: [references/memory.md](references/memory.md)
- **Persistence**: [references/persistence.md](references/persistence.md)

## Key Source Files

| Component | File |
|-----------|------|
| Agent class | `packages/core/src/agent/agent.ts` |
| Tool system | `packages/core/src/tool/index.ts` |
| SubAgent manager | `packages/core/src/agent/subagent/index.ts` |
| Workflow engine | `packages/core/src/workflow/core.ts` |
| Memory class | `packages/core/src/memory/index.ts` |
| Hono server | `packages/server-hono/src/app-factory.ts` |
| Auth middleware | `packages/server-hono/src/auth/middleware.ts` |
| Agent handlers | `packages/server-core/src/handlers/agent.handlers.ts` |
| Request schemas | `packages/server-core/src/schemas/agent.schemas.ts` |
| LibSQL adapter | `packages/libsql/src/memory-v2-adapter.ts` |
| Postgres adapter | `packages/postgres/src/memory-adapter.ts` |
