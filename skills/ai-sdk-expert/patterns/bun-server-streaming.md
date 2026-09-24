# Bun Server Streaming Pattern

Bun/Hono-oriented streaming examples kept as advanced reference material. This file is not the canonical source of truth for current AI SDK APIs.

## Overview

Bun provides excellent performance for AI streaming applications with its native Web API support and fast JavaScript runtime. This pattern covers setting up streaming AI responses using Bun.

## Bun Project Setup

### Installation
```bash
# Create new Bun project
bun create vite my-ai-app --template react-ts
cd my-ai-app

# Install AI SDK and providers
bun add ai @ai-sdk/react @ai-sdk/openai @ai-sdk/anthropic
bun add -d @types/node
```

### bunfig.toml Configuration
```toml
# bunfig.toml
[install]
cache = true
registry = "https://registry.npmjs.org/"

[run]
shell = ["bash", "-c"]

[test]
preload = ["./test/setup.ts"]
```

## Server Setup with Bun

### Basic Bun Server
```typescript
// server.ts
import { serve } from 'bun';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', runtime: 'Bun' });
});

// Chat streaming endpoint
app.post('/api/chat', async (c) => {
  try {
    const { messages } = await c.req.json();

    const result = await streamText({
      model: openai('gpt-4-turbo'),
      messages,
      temperature: 0.7,
    });

    return new Response(result.toDataStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Start server
const port = process.env.PORT || 3000;
console.log(`🚀 Server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

### Advanced Bun Server with File Routes
```typescript
// server.ts
import { serve } from 'bun';
import { fileRoutes } from 'bun-vite-plugin-routes';
import { Hono } from 'hono';

const app = new Hono();

// Auto-load routes from api directory
app.route('/', await fileRoutes('src/api'));

// Start Bun server
serve({
  port: 3000,
  fetch: app.fetch,
  websocket: {
    message: handleWebSocket,
    open: handleWSOpen,
    close: handleWSClose,
    error: handleWSError,
  },
});
```

### API Routes with Streaming
```typescript
// src/api/chat/stream.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Hono } from 'hono';

const app = new Hono();

app.post('/', async (c) => {
  const { messages, model = 'gpt-4-turbo' } = await c.req.json();

  const result = await streamText({
    model: openai(model),
    messages,
    temperature: 0.7,
    maxTokens: 2000,
    onFinish: ({ text, finishReason }) => {
      console.log('Stream finished:', { finishReason, textLength: text.length });
    },
  });

  // Create Bun ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const reader = result.toDataStream().getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
});

export default app;
```

## Streaming Patterns in Bun

### 1. Server-Sent Events (SSE)
```typescript
// src/api/sse.ts
import { streamText } from 'ai';

app.post('/sse', async (c) => {
  const { prompt } = await c.req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    prompt,
  });

  // Convert to SSE format
  const sseStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.textStream) {
        const data = `data: ${JSON.stringify({ chunk })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      }

      // Send end event
      controller.enqueue(new TextEncoder().encode('event: end\ndata: {}\n\n'));
      controller.close();
    },
  });

  return c.newResponse(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});
```

### 2. WebSocket Streaming
```typescript
// websocket-handler.ts
import { WebSocket } from 'bun';

const wsConnections = new Set<WebSocket>();

export const handleWebSocket = (ws: WebSocket, message: string | Buffer) => {
  const data = JSON.parse(message.toString());

  if (data.type === 'chat') {
    // Handle chat message
    handleChatMessage(ws, data.payload);
  } else if (data.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }));
  }
};

export const handleWSOpen = (ws: WebSocket) => {
  wsConnections.add(ws);
  console.log(`WebSocket opened. Total connections: ${wsConnections.size}`);
};

export const handleWSClose = (ws: WebSocket) => {
  wsConnections.delete(ws);
  console.log(`WebSocket closed. Total connections: ${wsConnections.size}`);
};

async function handleChatMessage(ws: WebSocket, payload: any) {
  try {
    const result = await streamText({
      model: openai('gpt-4-turbo'),
      messages: payload.messages,
    });

    // Send chunks over WebSocket
    for await (const chunk of result.textStream) {
      ws.send(JSON.stringify({
        type: 'chunk',
        data: chunk,
      }));
    }

    // Send completion
    ws.send(JSON.stringify({
      type: 'complete',
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error.message,
    }));
  }
}
```

### 3. Multi-Stream Broadcasting
```typescript
// src/api/broadcast.ts
app.post('/broadcast', async (c) => {
  const { message } = await c.req.json();

  // Broadcast to all WebSocket connections
  for (const ws of wsConnections) {
    ws.send(JSON.stringify({
      type: 'broadcast',
      message,
    }));
  }

  return c.json({ success: true, connections: wsConnections.size });
});
```

## Bun-Specific Optimizations

### 1. Native File System for Caching
```typescript
// cache.ts
import { write, read, exists } from 'bun';

const cache = new Map<string, any>();

export async function getCachedResponse(key: string) {
  // Check memory cache first
  if (cache.has(key)) {
    return cache.get(key);
  }

  // Check file cache
  const file = `.cache/${key}.json`;
  if (await exists(file)) {
    const data = await read(file);
    const parsed = JSON.parse(data.toString());
    cache.set(key, parsed);
    return parsed;
  }

  return null;
}

export async function setCachedResponse(key: string, data: any) {
  // Set memory cache
  cache.set(key, data);

  // Write to file cache
  await write(`.cache/${key}.json`, JSON.stringify(data));
}
```

### 2. Bun's native fetch for parallel requests
```typescript
// parallel-stream.ts
app.post('/parallel', async (c) => {
  const { prompts } = await c.req.json();

  // Process prompts in parallel using Bun's fetch
  const streams = await Promise.all(
    prompts.map(async (prompt: string) => {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });

      return response.body;
    })
  );

  // Combine streams
  const combinedStream = new ReadableStream({
    async start(controller) {
      for (const stream of streams) {
        if (!stream) continue;
        const reader = stream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      }
      controller.close();
    },
  });

  return c.newResponse(combinedStream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
});
```

### 3. SQLite for persistence
```typescript
// database.ts
import { Database } from 'bun:sqlite';

const db = new Database('ai-app.db');

// Initialize tables
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    messages TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

export const saveConversation = (userId: string, messages: any[]) => {
  const stmt = db.prepare(`
    INSERT INTO conversations (user_id, messages)
    VALUES (?, ?)
  `);

  return stmt.run(userId, JSON.stringify(messages));
};

export const getConversations = (userId: string) => {
  const stmt = db.prepare(`
    SELECT * FROM conversations
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);

  return stmt.all(userId).map(row => ({
    ...row,
    messages: JSON.parse(row.messages),
  }));
};
```

## Production Setup

### 1. Dockerfile for Bun
```dockerfile
# Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY . .

# Build application
RUN bun run build

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "run", "start"]
```

### 2. Environment Configuration
```typescript
// config/env.ts
import { env } from 'bun';

export const config = {
  port: env.PORT || 3000,
  openaiApiKey: env.OPENAI_API_KEY,
  anthropicApiKey: env.ANTHROPIC_API_KEY,
  databaseUrl: env.DATABASE_URL || 'sqlite:ai-app.db',
  redisUrl: env.REDIS_URL,
};

// Validate required environment variables
const required = ['OPENAI_API_KEY'];
for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

### 3. Graceful Shutdown
```typescript
// server.ts
import { serve } from 'bun';

const server = serve({
  port: config.port,
  fetch: app.fetch,
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.stop();
  process.exit(0);
});
```

## Testing with Bun

### 1. Unit Tests
```typescript
// test/api.test.ts
import { describe, it, expect, beforeAll } from 'bun:test';
import app from '../server';

describe('API Endpoints', () => {
  beforeAll(() => {
    // Setup test environment
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('should handle health check', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  it('should stream chat response', async () => {
    const response = await app.request('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    // Read stream
    const reader = response.body?.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      chunks.push(value);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

### 2. Performance Benchmarks
```typescript
// test/benchmark.ts
import { bench } from 'bun:bench';

bench('Bun streaming performance', async () => {
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Test message' }],
    }),
  });

  const reader = response.body?.getReader();
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    totalBytes += value.length;
  }

  return totalBytes;
});

bench('Concurrent requests', async () => {
  const requests = Array.from({ length: 10 }, () =>
    fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Concurrent test' }],
      }),
    })
  );

  return await Promise.all(requests);
});
```

## Monitoring and Debugging

### 1. Request Logging
```typescript
// middleware/logger.ts
import { Hono } from 'hono';

export const logger = (options: { logBody?: boolean } = {}) => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const url = c.req.url;
    const method = c.req.method;

    console.log(`→ ${method} ${url}`);

    if (options.logBody) {
      const body = await c.req.text();
      console.log('Body:', body);
      c.req.bodyCache = body;
    }

    await next();

    const duration = Date.now() - start;
    console.log(`← ${method} ${url} ${c.res.status} (${duration}ms)`);
  };
};
```

### 2. Error Tracking
```typescript
// middleware/errors.ts
export const errorHandler = (error: Error, c: Context) => {
  console.error('Request error:', {
    error: error.message,
    stack: error.stack,
    url: c.req.url,
    method: c.req.method,
  });

  // Send error to monitoring service
  if (process.env.ERROR_WEBHOOK) {
    fetch(process.env.ERROR_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  return c.json(
    { error: 'Internal server error' },
    500
  );
};
```

## Best Practices

1. **Use Bun's native APIs** for better performance
2. **Leverage SQLite** for local persistence
3. **Implement proper error handling** for streaming failures
4. **Use connection pooling** for database access
5. **Cache responses** to reduce API costs
6. **Monitor resource usage** (memory, CPU)
7. **Implement rate limiting** to prevent abuse
8. **Use environment variables** for configuration

## Performance Tips

1. **Enable HTTP/2** for better multiplexing
2. **Use compression** for large responses
3. **Implement streaming responses** for all AI operations
4. **Batch requests** when possible
5. **Use Bun's built-in profiler** for optimization
6. **Leverage worker threads** for CPU-heavy tasks
7. **Optimize bundle size** for faster startup
8. **Use CDN** for static assets