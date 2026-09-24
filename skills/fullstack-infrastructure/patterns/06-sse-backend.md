# SSE Backend

Server-Sent Events with Elysia.

## Basic Endpoint

```typescript
// api/events.ts
import { Elysia } from "elysia";

export const eventsRoutes = new Elysia({ prefix: "/events" })
  .get("/", async ({ set }) => {
    set.headers["Content-Type"] = "text/event-stream";
    set.headers["Cache-Control"] = "no-cache";
    set.headers["Connection"] = "keep-alive";
    
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      start(controller) {
        // Send initial message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
        );
        
        // Heartbeat every 60s
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(":ping\n\n"));
        }, 60000);
        
        // Cleanup on close
        return () => {
          clearInterval(heartbeat);
        };
      },
    });
    
    return new Response(stream);
  });
```

## With Event Bus

```typescript
// api/events.ts
import { Elysia } from "elysia";

export const eventsRoutes = new Elysia({ prefix: "/events" })
  .get("/", async ({ set, query }) => {
    const { token } = query;
    
    // Validate token
    const user = await validateToken(token);
    if (!user) {
      set.status = 401;
      return "Unauthorized";
    }
    
    set.headers["Content-Type"] = "text/event-stream";
    
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Subscribe to event bus
        const unsubscribe = eventBus.subscribe(user.orgId, (event) => {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        });
        
        // Heartbeat
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(":ping\n\n"));
        }, 60000);
        
        return () => {
          unsubscribe();
          clearInterval(heartbeat);
        };
      },
    });
    
    return new Response(stream);
  });
```

## Event Format

```
data: {"type": "update", "payload": {...}}\n\n
```

## Heartbeat

Send comment lines to keep connection alive:

```
:ping\n\n
```
