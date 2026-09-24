---
name: ai-sdk-expert
description: |
  Expert in Vercel AI SDK for frontend AI integration. Use when building AI-powered
  features, chatbots, streaming responses, generative UI, tool calling, or AI agents.
  Keywords: AI SDK, streaming, chatbot, generative UI, tool calling, AI agents, @ai-sdk/react,
  useChat, streamText, generateObject, AI provider, LLM, OpenAI, Anthropic.
---

# AI SDK Frontend Expert

Expert in building AI-powered applications with Vercel AI SDK, specializing in frontend patterns, streaming responses, and generative user interfaces.

## Core Technologies

| Technology | Purpose | Key Features |
|------------|---------|--------------|
| **AI SDK Core** | Backend AI integration | streamText, generateObject, tool calling |
| **AI SDK UI** | Frontend hooks | useChat, useCompletion, useObject |
| **@ai-sdk/react** | React integration | Streaming, error handling, tool UI |
| **Providers** | Model access | OpenAI, Anthropic, Google, xAI, etc. |
| **Generative UI** | Dynamic components | Tool-to-component mapping |
| **Streaming** | Real-time responses | Text, objects, tool results |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # Chat API endpoint
│   │   ├── generate/route.ts    # Generation endpoint
│   │   └── tools/               # Tool implementations
│   └── chat/                    # Chat pages
├── components/
│   ├── ai/                      # AI-specific components
│   │   ├── chatbot.tsx          # Chat interface
│   │   ├── message.tsx          # Message display
│   │   └── tool-ui/             # Tool result components
│   └── ui/                      # Regular UI components
├── lib/
│   ├── ai/                      # AI configuration
│   │   ├── providers.ts         # Model providers
│   │   ├── tools.ts             # Tool definitions
│   │   └── prompts.ts           # System prompts
│   └── utils.ts
└── types/
    └── ai.ts                    # AI-related types
```

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Streaming Setup** | `patterns/streaming-setup.md` | Configure streaming responses |
| **Generative UI** | `patterns/generative-ui.md` | Tool-to-component mapping |
| **Bun Server Streaming** | `patterns/bun-server-streaming.md` | Bun/Hono-oriented streaming examples |
| **Client Streaming** | `patterns/client-streaming.md` | Client-side streaming state patterns |

## Scope Note

This skill no longer claims missing component/reference files as first-class dependencies. Keep it limited to the advanced pattern files that actually exist in this directory.

## Quick Reference

### Basic Chat Setup
```typescript
// API Route: app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4-turbo'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

```typescript
// Component: using useChat
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

### Streaming Text Generation
```typescript
// API Route
import { streamText } from 'ai';

const result = streamText({
  model: openai('gpt-4-turbo'),
  prompt: 'Write a story about...',
});

return result.toDataStreamResponse();
```

### Structured Data Generation
```typescript
// Generate typed object
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4-turbo'),
  schema: z.object({
    title: z.string(),
    steps: z.array(z.string()),
  }),
  prompt: 'Create a recipe for...',
});
```

### Tool Calling
```typescript
// Define tool
const weatherTool = tool({
  description: 'Get weather for location',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Fetch real weather
    return { temp: 72, condition: 'sunny' };
  },
});

// Use in streamText
const result = streamText({
  model: openai('gpt-4-turbo'),
  messages,
  tools: {
    weather: weatherTool,
  },
});
```

### Generative UI Component
```typescript
// Render tool results
function Message({ message }) {
  return (
    <div>
      {message.content}
      {message.toolInvocations?.map(tool => (
        <div key={tool.toolCallId}>
          {tool.toolName === 'weather' && (
            <WeatherWidget {...tool.result} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### Multi-Provider Setup
```typescript
// lib/ai/providers.ts
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

export const models = {
  openai: openai('gpt-4-turbo'),
  anthropic: anthropic('claude-3-sonnet'),
  google: google('gemini-pro'),
};
```

### Error Boundaries
```typescript
'use client';
import { ErrorBoundary } from 'react-error-boundary';

function AIComponent() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ChatInterface />
    </ErrorBoundary>
  );
}
```

## Advanced Patterns

### Chat with Tools
```typescript
const { messages, handleSubmit, input, handleInputChange } = useChat({
  api: '/api/chat-with-tools',
  toolInvocation: ({ toolCall }) => {
    if (toolCall.toolName === 'getWeather') {
      return <WeatherComponent {...toolCall.args} />;
    }
  },
});
```

### Streaming Custom Data
```typescript
// Custom streaming endpoint
export async function POST() {
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(`data: ${i}\n\n`);
        await new Promise(r => setTimeout(r, 1000));
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
```

### Agent with Loop Control
```typescript
import { generateText } from 'ai';
import { maxSteps, stepCountIs } from 'ai/core';

const result = await generateText({
  model: openai('gpt-4-turbo'),
  tools: { /* ... */ },
  maxSteps: 5,
  stopWhen: stepCountIs(3),
});
```

## Provider Configuration

### OpenAI Setup
```bash
npm install @ai-sdk/openai
```

```typescript
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4-turbo', {
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Anthropic Setup
```bash
npm install @ai-sdk/anthropic
```

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const model = anthropic('claude-3-sonnet-20240229');
```

### Multiple Providers
```typescript
// Switch providers easily
const provider = process.env.AI_PROVIDER || 'openai';
const models = {
  openai: openai('gpt-4-turbo'),
  anthropic: anthropic('claude-3-sonnet'),
};
const model = models[provider];
```

## Best Practices

1. **Always validate inputs** with Zod schemas
2. **Use streaming** for better UX
3. **Handle errors gracefully** with error boundaries
4. **Secure API keys** with environment variables
5. **Optimize prompts** for consistency
6. **Cache responses** when appropriate
7. **Rate limit** API calls
8. **Test with different models**

## Environment Setup

```bash
# Required packages
npm install ai @ai-sdk/react @ai-sdk/openai

# Optional providers
npm install @ai-sdk/anthropic @ai-sdk/google

# Dev dependencies
npm install -D @types/node
```

```env
# .env.local
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Stream not working | Ensure `toDataStreamResponse()` is used |
| Tool not executing | Check tool schema and registration |
| CORS errors | Configure API routes properly |
| Slow responses | Implement streaming and caching |

## When to Use

**Use when:** You explicitly need advanced frontend/UI examples that go beyond the canonical `ai-sdk` guidance and you have already confirmed the project needs those extra patterns.

**Do not use when:** You need the default AI runtime entrypoint. Start with `ai-sdk` first for providers, streaming semantics, tool calling, and current API guidance.

**Pair with:** `ai-sdk` as the canonical runtime source of truth.

**Notes:** This skill is currently a secondary advanced/reference layer and contains stale references that should be reduced or merged over time.

## Related Skills

- [frontend](../frontend/SKILL.md) - For general React patterns
- [agent-maker](../agent-maker/skill.md) - To build custom agents