# SSE Frontend

Consuming Server-Sent Events in React.

## Basic Connection

```typescript
// hooks/use-sse.ts
import { useEffect, useState } from "react";

export function useSSE(url: string) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const eventSource = new EventSource(url);
    
    eventSource.onopen = () => {
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setData(parsed);
    };
    
    eventSource.onerror = () => {
      setConnected(false);
    };
    
    return () => {
      eventSource.close();
    };
  }, [url]);
  
  return { data, connected };
}
```

## With Reconnection

```typescript
// hooks/use-sse.ts
import { useEffect, useState, useRef } from "react";

export function useSSE(url: string) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const reconnectTimeout = useRef(null);
  
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connect = () => {
      eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        setConnected(true);
        setError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      };
      
      eventSource.onerror = () => {
        setConnected(false);
        setError("Connection lost");
        eventSource?.close();
        
        // Reconnect after 5s
        reconnectTimeout.current = setTimeout(connect, 5000);
      };
    };
    
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout.current);
      eventSource?.close();
    };
  }, [url]);
  
  return { data, connected, error };
}
```

## With Auth Token

```typescript
// hooks/use-sse.ts
import { fetchEventSource } from "@microsoft/fetch-event-source";

export function useSSE(url: string, token: string) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const ctrl = new AbortController();
    
    fetchEventSource(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: ctrl.signal,
      onmessage(event) {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      },
      onerror(err) {
        console.error("SSE error:", err);
      },
    });
    
    return () => ctrl.abort();
  }, [url, token]);
  
  return { data };
}

// Usage
const { data } = useSSE(
  `${API_URL}/events?token=${token}`,
  token
);
```

## Provider Pattern

```tsx
// providers/sse-provider.tsx
const SSEContext = createContext(null);

export function SSEProvider({ children }) {
  const { data, connected } = useSSE("/api/events");
  
  return (
    <SSEContext.Provider value={{ data, connected }}>
      {children}
    </SSEContext.Provider>
  );
}

export const useSSEContext = () => useContext(SSEContext);
```
