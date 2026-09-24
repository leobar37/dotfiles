# Elysia Integration

Inngest handler integration layered on top of the canonical Elysia backend core. Avoid restating shared backend architecture here.

## Basic Handler

```typescript
// inngest/serve.ts
import { serve } from "inngest/bun";
import { inngest } from "./client";
import { functions } from "./functions";

export const inngestHandler = serve({
  client: inngest,
  functions,
});
```

## Mounting in Elysia

```typescript
// app.ts
import { Elysia } from "elysia";
import { inngestHandler } from "./inngest/serve";

const app = new Elysia()
  .use("/api/inngest", inngestHandler)
  .listen(3000);

console.log("Inngest endpoint: http://localhost:3000/api/inngest");
```

## With Prefix

```typescript
// All routes under /api
app.group("/api", (api) =>
  api.use("/inngest", inngestHandler)
);

// Final URL: /api/inngest
```

## Complete Example

```typescript
// src/index.ts
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { inngestHandler } from "./inngest/serve";
import { itemRoutes } from "./api/items";
import { orderRoutes } from "./api/orders";

const app = new Elysia()
  // Global middleware
  .use(cors())
  .use(swagger())
  
  // Health check
  .get("/health", () => ({ status: "ok" }))
  
  // Inngest handler (MUST be before other routes in some cases)
  .use("/api/inngest", inngestHandler)
  
  // API routes
  .use(itemRoutes)
  .use(orderRoutes)
  
  .listen(3000);

console.log(`🦊 Server running at ${app.server?.hostname}:${app.server?.port}`);
console.log(`⚡ Inngest endpoint: http://${app.server?.hostname}:${app.server?.port}/api/inngest`);
```

## Functions Export

```typescript
// inngest/functions/index.ts
import { sendEmail } from "./send-email";
import { processPayment } from "./process-payment";
import { dailyCleanup } from "./daily-cleanup";

export const functions = [
  sendEmail,
  processPayment,
  dailyCleanup,
];
```

## Handler Configuration

```typescript
// inngest/serve.ts
export const inngestHandler = serve({
  client: inngest,
  functions,
  
  // Optional configuration
  streaming: "allow", // Allow streaming responses
  
  // Custom handler options
  handler: (req) => {
    // Custom logic before handling
    return true; // Continue with Inngest handling
  },
});
```

## Type Safety

```typescript
// Export app type for Eden Treaty
import { Elysia } from "elysia";
import { inngestHandler } from "./inngest/serve";

const app = new Elysia()
  .use("/api/inngest", inngestHandler);

export type App = typeof app;
```

## Development Setup

```bash
# 1. Start your Elysia server
bun run dev

# 2. In another terminal, start Inngest Dev Server
npx inngest-cli@latest dev \
  --url http://localhost:3000/api/inngest

# Dev Server UI: http://localhost:8288
```

## Production Setup

```bash
# Environment variables
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Deploy to Inngest Cloud
npx inngest-cli@latest deploy \
  --prod \
  --url https://your-api.com/api/inngest
```

## Testing the Handler

```bash
# Check if handler is accessible
curl http://localhost:3000/api/inngest

# Should return Inngest introspection response
```

## Troubleshooting

### Handler not responding
- Check route mounting: `.use("/api/inngest", inngestHandler)`
- Verify functions array is not empty
- Check for typos in path

### Functions not appearing in Dev UI
- Ensure Dev Server is pointed to correct URL
- Verify functions are exported in array
- Check for errors in function definitions

### CORS issues
- Mount Inngest handler BEFORE CORS plugin
- Or exclude `/api/inngest` from CORS
