# Streaming Setup Pattern

Advanced streaming examples that should complement, not replace, the canonical `ai-sdk` runtime guidance.

## Overview

Streaming is essential for responsive AI applications. The AI SDK provides multiple ways to implement streaming responses for better user experience.

## Server-Side Streaming

### Basic Text Streaming
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    temperature: 0.7,
    maxTokens: 1000,
  });

  return result.toDataStreamResponse();
}
```

### Streaming with Tools
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { weatherTool } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    tools: {
      weather: weatherTool,
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### Custom Streaming
```typescript
// Custom stream for non-AI data
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        const data = { step: i, status: 'processing' };
        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
        await new Promise(r => setTimeout(r, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## Client-Side Streaming

### Using useChat Hook
```typescript
'use client';
import { useChat } from '@ai-sdk/react';

export default function StreamingChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onResponse: (response) => {
      console.log('Streaming started');
    },
    onFinish: (message) => {
      console.log('Streaming finished', message);
    },
    onError: (error) => {
      console.error('Streaming error', error);
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => (
          <Message key={m.id} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </form>
    </div>
  );
}
```

### Manual Stream Handling
```typescript
'use client';
import { useState, useEffect } from 'react';

export function ManualStreamComponent() {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const startStream = async () => {
    setIsStreaming(true);
    setCurrentMessage('');

    const response = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Tell me a story' }),
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      setCurrentMessage(prev => prev + text);
    }

    setMessages(prev => [...prev, { content: currentMessage }]);
    setCurrentMessage('');
    setIsStreaming(false);
  };

  return (
    <div>
      <button onClick={startStream} disabled={isStreaming}>
        {isStreaming ? 'Streaming...' : 'Start Streaming'}
      </button>

      <div className="mt-4">
        {messages.map((msg, i) => (
          <div key={i} className="p-2 bg-gray-100 rounded mb-2">
            {msg.content}
          </div>
        ))}
        {isStreaming && (
          <div className="p-2 bg-blue-50 rounded">
            {currentMessage}
            <span className="animate-pulse">▊</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Streaming Patterns

### Progressive Loading
```typescript
// Load and stream progressively
const result = await streamText({
  model: openai('gpt-4-turbo'),
  prompt: 'Generate a detailed report...',
  onFinish: ({ text }) => {
    // Save complete response
    saveReport(text);
  },
});
```

### Chunked Processing
```typescript
// Process stream in chunks
const { textStream } = streamText({
  model: openai('gpt-4-turbo'),
  prompt: 'List 10 items...',
});

for await (const chunk of textStream) {
  // Process each chunk
  updateUI(chunk);

  // Optional: Buffer for performance
  buffer += chunk;
  if (buffer.length > 100) {
    flushBuffer();
    buffer = '';
  }
}
```

### Multi-Modal Streaming
```typescript
// Stream different data types
const multiStream = new MultiStreamResponse();

// Add text stream
multiStream.append('text', textStream);

// Add object stream
multiStream.append('json', objectStream);

// Add custom data
multiStream.append('metadata', metadataStream);

return multiStream.toResponse();
```

## Optimizing Streaming

### Debounce Updates
```typescript
import { useDebouncedCallback } from 'use-debounce';

function StreamingComponent() {
  const [text, setText] = useState('');

  // Debounce UI updates
  const debouncedUpdate = useDebouncedCallback((newText) => {
    setText(newText);
  }, 100);

  // In stream handler
  onChunk: (chunk) => {
    debouncedUpdate(chunk);
  }
}
```

### Virtual Scrolling
```typescript
import { FixedSizeList as List } from 'react-window';

function StreamingMessages({ messages }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {messages[index].content}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={100}
    >
      {Row}
    </List>
  );
}
```

### Memory Management
```typescript
// Limit stored messages
const MAX_MESSAGES = 100;

function addMessage(newMessage) {
  setMessages(prev => {
    const updated = [...prev, newMessage];
    return updated.slice(-MAX_MESSAGES);
  });
}
```

## Error Handling

### Stream Interruption
```typescript
const { messages, error, reload } = useChat({
  api: '/api/chat',
  onError: (error) => {
    console.error('Stream error:', error);
    // Show error UI
    showErrorNotification('Connection lost. Retrying...');
  },
  onFinish: () => {
    // Clear any error state
    clearError();
  },
});

// Retry button
{error && (
  <button onClick={() => reload()}>
    Retry Last Message
  </button>
)}
```

### Timeout Handling
```typescript
// Set timeout for streaming
const streamWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw new Error('Stream timeout');
  }
};
```

## Testing Streams

### Mock Stream for Testing
```typescript
// test-utils/mockStream.ts
export function createMockStream(chunks: string[]) {
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
        await new Promise(r => setTimeout(r, 100));
      }
      controller.close();
    },
  });
}

// Usage in test
test('handles stream correctly', async () => {
  const mockStream = createMockStream(['Hello', ' ', 'World']);
  const result = await processStream(mockStream);
  expect(result).toBe('Hello World');
});
```

## Best Practices

1. **Always show loading state** during streaming
2. **Implement error boundaries** for stream failures
3. **Use appropriate chunk sizes** (not too small, not too large)
4. **Handle backpressure** to prevent memory issues
5. **Provide retry mechanism** for failed streams
6. **Log streaming metrics** for performance monitoring
7. **Optimize for mobile** (consider data usage)
8. **Implement rate limiting** on the server side

## Common Issues

### Stream Not Starting
- Check `toDataStreamResponse()` usage
- Verify API route configuration
- Ensure proper Content-Type headers

### Stream Stopping Early
- Handle network interruptions
- Implement retry logic
- Check for rate limiting

### UI Not Updating
- Verify state updates
- Check React rendering
- Ensure proper key props

### Memory Leaks
- Clean up listeners
- Limit stored data
- Abort incomplete streams