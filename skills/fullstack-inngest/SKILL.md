---
name: fullstack-inngest
description: |
  Background job processing with Inngest.js for TypeScript applications. Covers event-driven
  architecture, function definitions, step functions, scheduled jobs, Elysia integration,
  and WhatsApp integration with Evolution API.
  Use when implementing background jobs, queues, async processing, scheduled tasks, or WhatsApp messaging.
  Keywords: inngest, background jobs, event-driven, step functions, queues, scheduled jobs,
  async processing, cron jobs, workflow engine, job processing, whatsapp, evolution api, qr code, messaging.
---

# Full-Stack Inngest

Event-driven background job processing for modern applications.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Inngest | ^3.48.1 | Job queue engine |
| Elysia | ^1.4.18 | Web framework |
| Bun | Latest | Runtime |
| TypeScript | ^5.x | Type safety |

## Quick Start

```typescript
// 1. Setup client
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app",
});

// 2. Define function
export const sendEmail = inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event, step }) => {
    await step.run("send", async () => {
      await emailService.send(event.data);
    });
  }
);

// 3. Mount handler
import { serve } from "inngest/bun";

app.use("/api/inngest", serve({
  client: inngest,
  functions: [sendEmail],
}));

// 4. Send event
await inngest.send({
  name: "email/send",
  data: { to: "user@example.com", subject: "Hello" },
});
```

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Setup** | `patterns/01-setup.md` | Client configuration |
| **Defining Functions** | `patterns/02-defining-functions.md` | createFunction |
| **Events** | `patterns/03-events.md` | Event types |
| **Step Functions** | `patterns/04-step-functions.md` | step.run, step.sleep |
| **Scheduled Jobs** | `patterns/05-scheduled-jobs.md` | Cron jobs |
| **Sending Events** | `patterns/06-sending-events.md` | Event emission |
| **Elysia Integration** | `patterns/07-elysia-integration.md` | Handler setup |
| **WhatsApp / Evolution API** | `patterns/08-whatsapp-evolution-api.md` | WhatsApp messaging, QR flow, Inngest jobs |

## Architecture

```
┌─────────────────────────────────────┐
│         Application Code            │
│  inngest.send({ name: "job/run" }) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Inngest Cloud/Dev            │
│  - Queue management                 │
│  - Job scheduling                   │
│  - Retry logic                      │
└──────────────┬──────────────────────┘
               │ HTTP POST
┌──────────────▼──────────────────────┐
│         Elysia Handler              │
│  serve({ client, functions })       │
│  Route: /api/inngest                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Inngest Function               │
│  createFunction({ id }, trigger)    │
│  async ({ event, step }) => {...}   │
└─────────────────────────────────────┘
```

## Key Concepts

1. **Events**: Type-safe messages that trigger functions
2. **Functions**: Handlers that process events
3. **Steps**: Durable units of work (automatically retried)
4. **Scheduled**: Cron-based recurring jobs

## When to Use

**Use when:** The project has explicitly chosen Inngest for event-driven workflows, scheduled functions, step-based orchestration, or Inngest-backed integrations like the WhatsApp flow documented here.

**Do not use when:** You only need generic backend architecture, or when the async/job decision has not been made yet. In those cases start with `fullstack-backend` and treat this skill as an Inngest-specific variant.

**Pair with:** `fullstack-backend` for shared Elysia/Drizzle/service-layer architecture.

**Notes:** This is a jobs/async variant, not the default owner of all queue and worker guidance.

## Dev vs Production

**Development**:
```bash
npx inngest-cli@latest dev
# Local UI: http://localhost:8288
```

**Production**:
- Requires INNGEST_EVENT_KEY
- Requires INNGEST_SIGNING_KEY
- Connects to Inngest Cloud

## Dependencies

```json
{
  "inngest": "^3.48.1"
}
```
