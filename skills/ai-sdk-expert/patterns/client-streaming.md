# Client-Side Streaming Pattern

Advanced client streaming state examples that complement the canonical `ai-sdk` skill rather than replace it.

## Overview

Client-side streaming handles real-time AI responses in the browser, providing immediate feedback and smooth user experience. This pattern covers React hooks, state management, and UI optimization for streaming data.

## React Hooks for Streaming

### useChat Hook - Complete Example
```typescript
// hooks/useChatWithTools.ts
'use client';
import { useChat } from '@ai-sdk/react';
import { useState, useCallback, useRef } from 'react';

interface ChatOptions {
  api: string;
  onError?: (error: Error) => void;
  onFinish?: (message: any) => void;
  toolInvocation?: (toolCall: any) => React.ReactNode;
}

export function useChatWithTools({
  api,
  onError,
  onFinish,
  toolInvocation,
}: ChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setInput,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api,
    onResponse: (response) => {
      setIsStreaming(true);
      setCurrentToolCall(null);
    },
    onFinish: (message) => {
      setIsStreaming(false);
      onFinish?.(message);
    },
    onError: (error) => {
      setIsStreaming(false);
      onError?.(error);
    },
    toolInvocation: ({ toolCall }) => {
      setCurrentToolCall(toolCall);
      return toolInvocation?.(toolCall);
    },
    streamProtocol: 'ai-stream',
  });

  const sendMessage = useCallback(async (message: string) => {
    abortControllerRef.current = new AbortController();

    try {
      await handleSubmit(
        new FormData()
      );
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    }
  }, [handleSubmit, onError]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stop();
    setIsStreaming(false);
  }, [stop]);

  return {
    messages,
    input,
    setInput,
    handleInputChange,
    sendMessage,
    isLoading: isLoading || isStreaming,
    error,
    reload,
    cancelStream,
    currentToolCall,
  };
}
```

### Custom Streaming Hook
```typescript
// hooks/useStreamText.ts
'use client';
import { useState, useCallback, useRef } from 'react';

interface UseStreamTextOptions {
  api: string;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export function useStreamText({
  api,
  onChunk,
  onComplete,
  onError,
}: UseStreamTextOptions) {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (prompt: string, options?: any) => {
    setText('');
    setError(null);
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          ...options,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text' && data.text) {
                accumulatedText += data.text;
                setText(accumulatedText);
                onChunk?.(data.text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      onComplete?.(accumulatedText);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error as Error);
        onError?.(error as Error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [api, onChunk, onComplete, onError]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    text,
    stream,
    isLoading,
    error,
    stop,
  };
}
```

### useCompletion Hook
```typescript
// hooks/useCompletion.ts
'use client';
import { useCompletion as useAICompletion } from '@ai-sdk/react';
import { useState } from 'react';

export function useCompletion(options: {
  api: string;
  onFinish?: (prompt: string, completion: string) => void;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');

  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
  } = useAICompletion({
    api: options.api,
    onFinish: (prompt, completion) => {
      setIsStreaming(false);
      options.onFinish?.(prompt, completion);
    },
    onResponse: () => {
      setIsStreaming(true);
    },
    onToken: (token) => {
      setStreamedText(prev => prev + token);
    },
  });

  return {
    completion: streamedText || completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isLoading || isStreaming,
    error,
    stop,
    reset: () => {
      setStreamedText('');
    },
  };
}
```

## Streaming UI Components

### Streaming Text Display
```typescript
// components/StreamingText.tsx
'use client';
import { useEffect, useState } from 'react';

interface StreamingTextProps {
  text: string;
  speed?: number; // Characters per second
  onComplete?: () => void;
}

export function StreamingText({ text, speed = 30, onComplete }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    if (!text) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(prev => prev + text[index]);
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={isComplete ? '' : 'after:content-["▊"] after:animate-pulse'}>
      {displayedText}
    </span>
  );
}
```

### Typing Indicator
```typescript
// components/TypingIndicator.tsx
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }} />
      <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }} />
      <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }} />
    </div>
  );
}
```

### Chat Message with Streaming
```typescript
// components/ChatMessage.tsx
import React, { memo } from 'react';
import { ToolResult } from './ToolResult';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  toolInvocations?: any[];
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isStreaming = false
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-2xl px-4 py-2 rounded-lg ${
        isUser
          ? 'bg-blue-500 text-white ml-auto'
          : 'bg-gray-100 text-gray-800 mr-auto'
      }`}>
        {/* Regular text content */}
        {message.content && (
          <p className={`whitespace-pre-wrap ${isStreaming ? 'after:content-["▊"] after:animate-pulse' : ''}`}>
            {message.content}
          </p>
        )}

        {/* Tool invocations */}
        {message.toolInvocations?.map((tool, index) => (
          <div key={index} className="mt-2">
            <ToolResult
              tool={tool}
              isStreaming={isStreaming && index === message.toolInvocations.length - 1}
            />
          </div>
        ))}

        {/* Timestamp for user messages */}
        {isUser && (
          <div className="text-xs opacity-70 mt-1">
            {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
});
```

## State Management for Streaming

### Zustand Store
```typescript
// store/chatStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolInvocations?: any[];
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentMessage: string;
  activeTools: Set<string>;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setCurrentMessage: (text: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  addActiveTool: (toolName: string) => void;
  removeActiveTool: (toolName: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    messages: [],
    isStreaming: false,
    currentMessage: '',
    activeTools: new Set(),

    addMessage: (message) => {
      const newMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      set(state => ({
        messages: [...state.messages, newMessage],
      }));
    },

    updateMessage: (id, updates) => {
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === id ? { ...msg, ...updates } : msg
        ),
      }));
    },

    setCurrentMessage: (text) => set({ currentMessage: text }),

    setIsStreaming: (streaming) => set({ isStreaming: streaming }),

    addActiveTool: (toolName) =>
      set(state => ({
        activeTools: new Set([...state.activeTools, toolName]),
      })),

    removeActiveTool: (toolName) => {
      const tools = new Set(get().activeTools);
      tools.delete(toolName);
      set({ activeTools: tools });
    },

    clearMessages: () => set({ messages: [] }),
  }))
);
```

### Jotai Store Alternative
```typescript
// store/chatAtoms.ts
import { atom } from 'jotai';

export const messagesAtom = atom<ChatMessage[]>([]);
export const isStreamingAtom = atom(false);
export const currentMessageAtom = atom('');
export const activeToolsAtom = atom<Set<string>>(new Set());

// Derived atoms
export const lastMessageAtom = atom(
  (get) => get(messagesAtom)[get(messagesAtom).length - 1]
);

export const assistantMessagesAtom = atom(
  (get) => get(messagesAtom).filter(msg => msg.role === 'assistant')
);
```

## Performance Optimization

### Virtual Scrolling for Long Conversations
```typescript
// components/VirtualizedChat.tsx
import { FixedSizeList as List } from 'react-window';
import { useMemo } from 'react';

interface VirtualizedChatProps {
  messages: ChatMessage[];
  height: number;
}

export function VirtualizedChat({ messages, height }: VirtualizedChatProps) {
  const Row = useMemo(() => ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <ChatMessage message={messages[index]} />
    </div>
  ), [messages]);

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={100}
      overscanCount={5}
    >
      {Row}
    </List>
  );
}
```

### Debounced Input
```typescript
// hooks/useDebouncedInput.ts
import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export function useDebouncedInput(initialValue = '', delay = 300) {
  const [input, setInput] = useState(initialValue);
  const [debouncedInput, setDebouncedInput] = useState(initialValue);

  const debouncedSetInput = useDebouncedCallback((value: string) => {
    setDebouncedInput(value);
  }, delay);

  useEffect(() => {
    debouncedSetInput(input);
  }, [input, debouncedSetInput]);

  return {
    input,
    setInput,
    debouncedInput,
  };
}
```

### Message Limiting
```typescript
// hooks/useMessageLimit.ts
export function useMessageLimit(maxMessages = 100) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => {
      const updated = [...prev, message];
      // Keep only the last N messages
      return updated.slice(-maxMessages);
    });
  };

  return {
    messages,
    addMessage,
  };
}
```

## Error Handling and Retries

### Error Boundary for Streaming
```typescript
// components/StreamingErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class StreamingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Streaming error:', error, errorInfo);

    // Report error to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            The AI response failed to load. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Retry Mechanism
```typescript
// hooks/useRetryableStream.ts
import { useState, useCallback } from 'react';

interface UseRetryableStreamOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
}

export function useRetryableStream({
  maxRetries = 3,
  retryDelay = 1000,
  onRetry,
}: UseRetryableStreamOptions = {}) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(async (streamFn: () => Promise<void>) => {
    if (retryCount >= maxRetries) {
      throw new Error('Max retries exceeded');
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      onRetry?.(retryCount + 1);
      await streamFn();
      setRetryCount(0);
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, retryDelay, onRetry]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retry,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
    reset,
  };
}
```

## Analytics and Monitoring

### Stream Analytics
```typescript
// hooks/useStreamAnalytics.ts
export function useStreamAnalytics() {
  const trackStreamStart = useCallback((prompt: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'stream_start', {
        event_category: 'ai',
        custom_parameter: prompt.length,
      });
    }
  }, []);

  const trackStreamComplete = useCallback((duration: number, tokens: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'stream_complete', {
        event_category: 'ai',
        value: duration,
        custom_parameter: tokens,
      });
    }
  }, []);

  const trackStreamError = useCallback((error: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'stream_error', {
        event_category: 'ai',
        custom_parameter: error,
      });
    }
  }, []);

  return {
    trackStreamStart,
    trackStreamComplete,
    trackStreamError,
  };
}
```

## Best Practices

1. **Always show loading state** during streaming
2. **Implement proper error boundaries**
3. **Use virtual scrolling** for long message lists
4. **Debounce user input** to reduce API calls
5. **Limit message history** to prevent memory issues
6. **Provide retry mechanism** for failed streams
7. **Track performance metrics** for optimization
8. **Handle network interruptions** gracefully
9. **Use React.memo** to prevent unnecessary re-renders
10. **Implement proper cleanup** on component unmount

## Common Issues and Solutions

### Stream Not Updating UI
```typescript
// Problem: State not updating
// Solution: Use functional updates
setMessages(prev => [...prev, newMessage]);
```

### Memory Leaks
```typescript
// Problem: Listener not cleaned up
// Solution: Use AbortController
useEffect(() => {
  const controller = new AbortController();

  streamWithSignal(controller.signal);

  return () => controller.abort();
}, []);
```

### Janky Scrolling
```typescript
// Problem: Manual scrolling causing issues
// Solution: Use scrollIntoView with options
messageRef.current?.scrollIntoView({
  behavior: 'smooth',
  block: 'end'
});
```