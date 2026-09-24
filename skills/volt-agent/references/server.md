# Server (Hono) in VoltAgent

VoltAgent provides a Hono-based HTTP server with built-in routes for agents, workflows, memory, tools, and observability.

## Source Files

| File | Purpose |
|------|---------|
| `packages/server-hono/src/index.ts` | Main exports |
| `packages/server-hono/src/app-factory.ts` | `createApp()` - app creation |
| `packages/server-hono/src/hono-server-provider.ts` | Server lifecycle |
| `packages/server-hono/src/routes/index.ts` | Route registration |
| `packages/server-hono/src/auth/middleware.ts` | Auth middleware |
| `packages/server-core/src/handlers/agent.handlers.ts` | Agent request handlers |
| `packages/server-core/src/schemas/agent.schemas.ts` | Request/response schemas |

## Creating a Server

### Basic

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

### With Authentication

**File**: `packages/server-hono/src/auth/middleware.ts:109-189`

```typescript
import { jwtAuth } from "@voltagent/server-hono";

new VoltAgent({
  agents: { agent },
  server: honoServer({
    authNext: {
      provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
      publicRoutes: ["/api/health"],
    },
  }),
});
```

### Custom Endpoints

**File**: `packages/server-hono/src/app-factory.ts:132-135`

```typescript
new VoltAgent({
  agents: { agent },
  server: honoServer({
    configureApp: (app) => {
      app.get("/api/health", (c) => c.json({ status: "ok" }));
    },
  }),
});
```

### Integrating with Existing Hono App

**File**: `packages/server-hono/src/app-factory.ts:31-146`

Use `createVoltAgentApp()` to get a Hono app and mount it on your existing app.

```typescript
import { Hono } from "hono";
import { createVoltAgentApp } from "@voltagent/server-hono";
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

// Your existing Hono app
const app = new Hono();

// Your existing routes and middlewares
app.use("/*", myCustomMiddleware);
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/users", getUsersHandler);

// Create agent
const agent = new Agent({
  name: "my-agent",
  model: "openai/gpt-4o-mini",
  instructions: "You are a helpful assistant",
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({ url: "file:./memory.db" }),
  }),
});

// Create VoltAgent app
const { app: voltAgentApp } = await createVoltAgentApp(
  { agentRegistry: new Map([["my-agent", agent]]) },
  {
    enableSwaggerUI: false,  // Disable to avoid conflicts
    configureApp: (vapp) => {
      // Add VoltAgent-specific custom routes
      vapp.get("/ai-status", (c) => c.json({ agent: "my-agent", status: "ready" }));
    },
  }
);

// Mount VoltAgent on a sub-path
app.route("/ai", voltAgentApp);

// Now your app has:
// - GET /health                  (your existing route)
// - GET /users                   (your existing route)
// - POST /ai/agents/my-agent/chat    (VoltAgent route)
// - POST /ai/agents/my-agent/text    (VoltAgent route)
// - GET /ai/api/memory/conversations (VoltAgent route)

export default app;
```

### With Full Control

Use `configureFullApp` for complete control over route registration order:

```typescript
const { app: voltAgentApp } = await createVoltAgentApp(deps, {
  configureFullApp: ({ app, routes, middlewares }) => {
    middlewares.cors();
    middlewares.auth();
    middlewares.landingPage();

    routes.agents();
    routes.memory();
    routes.tools();
    // Skip workflows, observability, etc.

    routes.ui();
    routes.doc();
  },
});
```

## App Factory

**File**: `packages/server-hono/src/app-factory.ts:31-146`

```typescript
export async function createApp(deps, config, port) {
  const app = new OpenAPIHono();

  // Routes object
  const routes = {
    agents: () => registerAgentRoutes(app, deps, logger),
    workflows: () => registerWorkflowRoutes(app, deps, logger),
    logs: () => registerLogRoutes(app, deps, logger),
    observability: () => registerObservabilityRoutes(app, deps, logger),
    memory: () => registerMemoryRoutes(app, deps, logger),
    tools: () => registerToolRoutes(app, deps, logger),
    mcp: () => registerMcpRoutes(app, deps, logger),
    a2a: () => registerA2ARoutes(app, deps, logger),
  };

  // Middlewares object
  const middlewares = {
    cors: () => app.use("*", cors(config.cors)),
    auth: () => app.use("*", createAuthNextMiddleware(config.authNext)),
    landingPage: () => app.get("/", (c) => c.html(getLandingPageHTML())),
  };

  // Apply in order
  middlewares.cors();
  middlewares.auth();
  middlewares.landingPage();

  routes.agents();
  routes.workflows();
  routes.memory();
  routes.tools();
  // ... etc
}
```

## Routes

### Agent Routes

**File**: `packages/server-hono/src/routes/agent.routes.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List agents |
| POST | `/agents/:id/text` | Generate text |
| POST | `/agents/:id/stream` | Stream text (raw SSE) |
| POST | `/agents/:id/chat` | Chat stream (UI SSE) |
| GET | `/agents/:id/chat/:conversationId/stream` | Resume chat stream |
| POST | `/agents/:id/object` | Generate object |
| POST | `/agents/:id/stream-object` | Stream object |
| GET | `/agents/:id/history` | Get history |

### Memory Routes

**File**: `packages/server-hono/src/routes/memory.routes.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memory/conversations` | List conversations |
| POST | `/api/memory/conversations` | Create conversation |
| GET | `/api/memory/conversations/:id` | Get conversation |
| GET | `/api/memory/conversations/:id/messages` | List messages |
| POST | `/api/memory/save-messages` | Save messages |
| GET | `/api/memory/search` | Search memory |
| GET | `/api/memory/conversations/:id/working-memory` | Get working memory |
| POST | `/api/memory/conversations/:id/working-memory` | Update working memory |

### Workflow Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workflows` | List workflows |
| POST | `/workflows/:id/execute` | Execute workflow |
| POST | `/workflows/:id/stream` | Stream workflow |
| POST | `/workflows/:id/suspend/:executionId` | Suspend workflow |
| POST | `/workflows/:id/resume/:executionId` | Resume workflow |

## Auth Systems

### authNext (Recommended)

**File**: `packages/server-hono/src/auth/middleware.ts:109-189`

```typescript
export function createAuthNextMiddleware(config) {
  return async (c, next) => {
    const access = resolveAuthNextAccess(method, path, config);

    if (access === "public") return next();
    if (access === "console") {
      if (hasConsoleAccess(c.req.raw)) return next();
      return c.json({ error: "Console access required" }, 401);
    }

    // User auth
    const token = extractToken(c.req.raw);
    const user = await authProvider.verifyToken(token, c.req.raw);
    injectUserContext(c, user);  // Injects userId into request body
    return next();
  };
}
```

Three access levels:
- `public`: No auth required
- `console`: Requires `VOLTAGENT_CONSOLE_ACCESS_KEY`
- `user`: Requires valid JWT token

### JWT Auth Provider

```typescript
import { jwtAuth } from "@voltagent/server-hono";

const auth = jwtAuth({
  secret: process.env.JWT_SECRET!,
  publicRoutes: ["GET /health"],
  mapUser: (payload) => ({ id: payload.sub, email: payload.email }),
});
```

## Configuration

**File**: `packages/server-hono/src/types.ts`

```typescript
interface HonoServerConfig {
  port?: number;
  hostname?: string;
  enableSwaggerUI?: boolean;
  cors?: CORSOptions | false;
  resumableStream?: {
    adapter: ResumableStreamAdapter;
    defaultEnabled?: boolean;
  };
  auth?: AuthProvider;         // Legacy (deprecated)
  authNext?: AuthNextConfig;   // Recommended
  configureApp?: (app) => void | Promise<void>;
  configureFullApp?: ({ app, routes, middlewares }) => void | Promise<void>;
}
```

## Request/Response Schemas

**File**: `packages/server-core/src/schemas/agent.schemas.ts:261-384`

```typescript
// Runtime memory envelope (preferred)
const RuntimeMemoryEnvelopeSchema = z.object({
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  options: z.object({
    contextLimit: z.number().optional(),
    semanticMemory: z.object({ enabled: z.boolean() }).optional(),
    readOnly: z.boolean().optional(),
  }).optional(),
}).passthrough();

// Text request
const TextRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.any())]),
  options: z.object({
    memory: RuntimeMemoryEnvelopeSchema.optional(),
    temperature: z.number().optional().default(0.7),
    maxSteps: z.number().optional(),
    maxOutputTokens: z.number().optional().default(4000),
  }).optional(),
});
```
