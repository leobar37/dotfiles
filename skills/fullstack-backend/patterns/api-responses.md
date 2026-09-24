# API Response Patterns

Canonical API response guidance for the backend core. Stack-specific route examples should reference this file instead of redefining shared response semantics.

## The Problem with `success` Flags

❌ **Don't do this** (redundant and verbose):
```typescript
// Redundant - HTTP 200 already means success
return { success: true, data: item };

// Redundant - HTTP 404/500 already means error  
return { success: false, error: { code: "NOT_FOUND", message: "..." } };
```

✅ **Do this** (clean, uses HTTP semantics):
```typescript
// HTTP 200/201 implies success
return item;

// HTTP error code implies failure
throw new NotFoundError("Item not found");
```

## Success Responses (2xx)

### GET - Return Single Item
```typescript
.get("/:id", async ({ itemService, ctx, params }) => {
  const item = await itemService.getItem(ctx, params.id);
  
  if (!item) {
    throw new NotFoundError("Item");
  }
  
  // Returns: HTTP 200 + item object
  return item;
})
```

Response:
```json
{
  "id": "123",
  "name": "Product Name",
  "price": 29.99
}
```

### GET - Return Collection
```typescript
.get("/", async ({ itemService, ctx }) => {
  const items = await itemService.getItems(ctx);
  
  // Returns: HTTP 200 + array
  return items;
})
```

Response:
```json
[
  { "id": "1", "name": "Item 1" },
  { "id": "2", "name": "Item 2" }
]
```

### POST - Create Item
```typescript
.post("/", async ({ itemService, ctx, body }) => {
  const item = await itemService.createItem(ctx, body);
  
  // Returns: HTTP 201 + created item
  return item;
}, {
  body: t.Object({
    name: t.String(),
    price: t.Number(),
  }),
})
```

### PATCH - Update Item
```typescript
.patch("/:id", async ({ itemService, ctx, params, body }) => {
  const item = await itemService.updateItem(ctx, params.id, body);
  
  if (!item) {
    throw new NotFoundError("Item");
  }
  
  // Returns: HTTP 200 + updated item
  return item;
})
```

### DELETE - Remove Item
```typescript
.delete("/:id", async ({ itemService, ctx, params }) => {
  await itemService.deleteItem(ctx, params.id);
  
  // Returns: HTTP 204 (No Content) or 200 with deleted id
  return { id: params.id };
})
```

## Error Responses (4xx/5xx)

Throw errors instead of returning error objects:

```typescript
// errors.ts
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

### Error Handler

```typescript
// middleware/error-handler.ts
export const errorPlugin = new Elysia({ name: "error-handler" })
  .onError({ as: "global" }, ({ code, error, set }) => {
    if (error instanceof NotFoundError) {
      set.status = 404;
      return {
        error: {
          code: "NOT_FOUND",
          message: error.message,
        },
      };
    }
    
    if (error instanceof ValidationError) {
      set.status = 400;
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      };
    }
    
    // Generic error
    set.status = 500;
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  });
```

## Response Format Summary

| Operation | HTTP Status | Response Body |
|-----------|-------------|---------------|
| GET (single) | 200 | Item object |
| GET (list) | 200 | Array of items |
| POST | 201 | Created item |
| PATCH | 200 | Updated item |
| DELETE | 204/200 | Empty or `{ id }` |
| Error | 4xx/5xx | `{ error: { code, message } }` |

## Benefits

1. **Cleaner code** - No wrapper objects
2. **HTTP semantics** - Status codes have meaning
3. **Standard REST** - Follows HTTP conventions
4. **Frontend friendly** - Eden Treaty handles automatically
5. **Type safe** - No `any` types from wrapper objects

## Eden Treaty Integration

When using Eden Treaty, the client automatically handles HTTP codes:

```typescript
const { data, error } = await eden.api.v1.items({ id }).get();

if (error) {
  // HTTP error occurred (4xx/5xx)
  console.error(error.message);
  return;
}

// HTTP 200, data is the item directly (no .data wrapper)
console.log(data.name);
```

## Migration Guide

### From `success` wrapper:
```typescript
// Before
return { success: true, data: item };
return { success: false, error: { message: "Not found" } };

// After
return item;
throw new NotFoundError("Item");
```

### Frontend changes:
```typescript
// Before
const response = await fetch('/api/items/1');
const json = await response.json();
if (json.success) {
  console.log(json.data.name);
} else {
  console.error(json.error.message);
}

// After (with Eden Treaty)
const { data, error } = await eden.api.v1.items({ id: '1' }).get();
if (error) {
  console.error(error.message);
} else {
  console.log(data.name); // Direct access, no .data wrapper
}
```
