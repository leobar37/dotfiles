# Eden Treaty - Type-Safe API Client

Type-safe API client for Elysia backends using Eden Treaty.

## Overview

Eden Treaty provides end-to-end type safety between your Elysia backend and React frontend. Instead of using `fetch()` with manual type definitions, Eden Treaty infers types directly from your backend routes.

## Installation

```bash
bun add @elysiajs/eden
```

## Setup Client

### Basic Configuration

```typescript
// lib/api-client.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "../../backend/src/index";

export const eden = treaty<App>(
  import.meta.env.VITE_API_URL || "http://localhost:3000",
  {
    fetch: {
      credentials: "omit", // Use JWT instead of cookies
    },
  }
);
```

### With JWT Authentication

```typescript
// lib/api-client.ts
import { treaty } from "@elysiajs/eden";
import type { App } from "../../backend/src/index";

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bearer_token');
}

export const eden = treaty<App>(
  import.meta.env.VITE_API_URL || "",
  {
    fetch: {
      credentials: "omit",
    },
    headers: () => {
      const token = getAuthToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  }
);
```

### With Timeout

```typescript
// lib/api-client.ts
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 30000 } = init || {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const eden = treaty<App>(
  import.meta.env.VITE_API_URL || "",
  {
    fetch: {
      credentials: "omit",
      fetch: fetchWithTimeout,
    },
    headers: () => {
      const token = getAuthToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  }
);
```

## Usage Patterns

### GET Requests

```typescript
// List all items
const { data, error } = await eden.api.v1.items.get();

// With query parameters
const { data, error } = await eden.api.v1.items.get({
  query: { type: 'active', limit: 10 }
});

// Get single item by ID
const { data, error } = await eden.api.v1.items({ id: '123' }).get();
```

### POST Requests

```typescript
// Create item
const { data, error } = await eden.api.v1.items.post({
  name: "New Item",
  price: 29.99,
});
```

### PATCH/PUT Requests

```typescript
// Update item
const { data, error } = await eden.api.v1.items({ id: '123' }).patch({
  name: "Updated Name",
});
```

### DELETE Requests

```typescript
// Delete item
const { data, error } = await eden.api.v1.items({ id: '123' }).delete();
```

### Nested Routes

```typescript
// Access nested routes
const { data, error } = await eden.api.v1
  .items({ id: '123' })
  .availability.patch({ available: false });

// Deep nesting
const { data, error } = await eden.api.v1
  .orders({ id: '456' })
  .items({ itemId: '789' })
  .status.patch({ status: 'prepared' });
```

## Error Handling

### Error Parser

```typescript
// lib/api-error-parser.ts
export interface EdenError {
  status?: number;
  value?: string | { message?: string };
  message?: string;
  type?: string;
  errors?: Array<{ message?: string; path?: string }>;
}

export function parseEdenError(
  error: unknown,
  fallback: string = "An unexpected error occurred"
): string {
  // Handle JS Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle null/undefined
  if (!error) {
    return fallback;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Eden Treaty error structure
  if (typeof error === 'object') {
    const err = error as EdenError;

    // Pattern A: error.value (Eden standard)
    if (err.value) {
      if (typeof err.value === 'string') {
        return err.value;
      }
      if (typeof err.value === 'object' && err.value.message) {
        return err.value.message;
      }
    }

    // Pattern B: error.message
    if (err.message) {
      return err.message;
    }

    // Pattern C: Validation errors array
    if (err.errors && err.errors.length > 0) {
      return err.errors.map(e => e.message).filter(Boolean).join(', ');
    }
  }

  return fallback;
}
```

### Using Error Parser

```typescript
const { data, error } = await eden.api.v1.items.post(newItem);

if (error) {
  const message = parseEdenError(error, 'Failed to create item');
  console.error(message);
  throw new Error(message);
}
```

## Integration with TanStack Query

### Basic Query Hook

```typescript
// hooks/use-items.ts
import { useQuery } from "@tanstack/react-query";
import { eden } from "~/lib/api-client";
import { parseEdenError } from "~/lib/api-error-parser";

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const { data, error } = await eden.api.v1.items.get();
      
      if (error) {
        throw new Error(parseEdenError(error, 'Error loading items'));
      }
      
      if (!data) {
        throw new Error('No data received');
      }
      
      return data;
    },
  });
}
```

### Mutation Hook

```typescript
// hooks/use-create-item.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "~/lib/api-client";
import { parseEdenError } from "~/lib/api-error-parser";

export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemData: CreateItemInput) => {
      const { data, error } = await eden.api.v1.items.post(itemData);
      
      if (error) {
        throw new Error(parseEdenError(error, 'Failed to create item'));
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch items list
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

### With Parameters

```typescript
// hooks/use-item.ts
export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: async () => {
      const { data, error } = await eden.api.v1.items({ id }).get();
      
      if (error) {
        throw new Error(parseEdenError(error, 'Error loading item'));
      }
      
      return data;
    },
    enabled: !!id, // Only run if id exists
  });
}
```

## Best Practices

### 1. Always Check for Errors

```typescript
// ❌ Bad
const { data } = await eden.api.v1.items.get();
return data; // data might be null

// ✅ Good
const { data, error } = await eden.api.v1.items.get();

if (error) {
  throw new Error(parseEdenError(error));
}

if (!data) {
  throw new Error('No data received');
}

return data;
```

### 2. Use Type-Safe Hooks

```typescript
// Create reusable hooks instead of inline calls
const { data, isLoading } = useItems(); // Type-safe
```

### 3. Handle Loading States

```typescript
const { data, isLoading, error } = useItems();

if (isLoading) return <Loading />;
if (error) return <Error message={error.message} />;
return <ItemsList items={data} />;
```

### 4. FormData Workaround

Eden Treaty doesn't handle FormData well. Use native fetch for uploads:

```typescript
// For file uploads, use native fetch
const uploadFile = async (formData: FormData) => {
  const response = await fetch(`${API_URL}/api/v1/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return response.json();
};
```

## Common Patterns

### List with Filters

```typescript
const useItems = (filters: { type?: string; status?: string }) => {
  return useQuery({
    queryKey: ['items', filters],
    queryFn: async () => {
      const { data, error } = await eden.api.v1.items.get({
        query: filters,
      });
      
      if (error) throw new Error(parseEdenError(error));
      return data;
    },
  });
};
```

### Optimistic Updates

```typescript
const useUpdateItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemInput }) => {
      const { data: result, error } = await eden.api.v1.items({ id }).patch(data);
      if (error) throw new Error(parseEdenError(error));
      return result;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['items', id] });
      
      // Snapshot previous value
      const previousItem = queryClient.getQueryData(['items', id]);
      
      // Optimistically update
      queryClient.setQueryData(['items', id], (old: any) => ({ ...old, ...data }));
      
      return { previousItem };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['items', variables.id], context?.previousItem);
    },
  });
};
```

## Type Safety Benefits

- **Autocomplete**: IDE suggests available routes and methods
- **Type Checking**: Compile-time validation of request/response shapes
- **Refactoring**: Rename backend routes, frontend updates automatically
- **Documentation**: Types serve as API documentation

## Dependencies

```json
{
  "dependencies": {
    "@elysiajs/eden": "^1.4.4",
    "@tanstack/react-query": "^5.x"
  }
}
```
