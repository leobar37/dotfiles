# Inngest Setup

Inngest-specific setup for the jobs/async variant. Shared backend architecture still comes from `fullstack-backend`.

## Basic Client

```typescript
// inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app",
});
```

## With Event Types

```typescript
// inngest/client.ts
import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./events";

export const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

## Dev vs Production

```typescript
// inngest/client.ts
import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./events";

const isDev = process.env.NODE_ENV !== "production";

export const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromRecord<Events>(),
  
  // Production: API keys required
  ...(!isDev && {
    eventKey: process.env.INNGEST_EVENT_KEY,
    signingKey: process.env.INNGEST_SIGNING_KEY,
  }),
});
```

## Environment Variables

```bash
# Development (optional - uses local dev server)
# No env vars needed

# Production (required)
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

## Development Server

```bash
# Start Inngest Dev Server
npx inngest-cli@latest dev

# UI available at http://localhost:8288
# Shows all functions, events, and runs
```

## File Structure

```
inngest/
├── client.ts          # Client instance
├── events.ts          # Event type definitions
├── functions/         # Job functions
│   ├── index.ts       # Export all
│   └── *.ts           # Individual functions
├── helpers/           # Event senders
│   └── *.ts
└── serve.ts           # Elysia handler
```

## TypeScript Configuration

Ensure strict types:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Verification

Test client setup:

```typescript
// Test event
await inngest.send({
  name: "test/hello",
  data: { message: "Hello Inngest" },
});
```

Check dev server UI for the event.
