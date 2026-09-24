# Error Handling

Canonical backend-core error handling guidance. Stack-specific adaptations should extend this file instead of owning the shared exception and response model.

## Custom Error Classes

```typescript
// errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
  }
}
```

## Using Errors in Services

```typescript
// services/business/item.service.ts
export class ItemService {
  async getItem(ctx: RequestContext, id: string): Promise<Item> {
    const item = await this.itemRepo.findOne(ctx, id);
    
    if (!item) {
      throw new NotFoundError("Item");
    }
    
    return item;
  }

  async createItem(ctx: RequestContext, data: CreateItemInput): Promise<Item> {
    // Validation
    if (data.price <= 0) {
      throw new ValidationError("Price must be positive");
    }
    
    // Check duplicate
    const existing = await this.itemRepo.findByName(ctx, data.name);
    if (existing) {
      throw new ConflictError("Item with this name already exists");
    }
    
    return this.itemRepo.create(ctx, data);
  }
}
```

## Elysia Error Plugin

```typescript
// middleware/error-final.ts
import { Elysia } from "elysia";
import { AppError } from "../errors";

export const errorPlugin = new Elysia({ name: "error-handler" })
  .onError({ as: "global" }, ({ code, error, set }) => {
    // Handle AppErrors
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    // Handle validation errors (Zod/Elysia)
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
        },
      };
    }

    // Handle not found
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      };
    }

    // Log unexpected errors
    console.error("Unexpected error:", error);

    // Generic error response (don't leak details)
    set.status = 500;
    return {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  });
```

## Error Response Format

All errors return consistent JSON (HTTP status code indicates error, no `success` flag needed):

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Item not found"
  }
}
```

Success responses (HTTP 200/201 indicates success, return data directly):

```json
{
  "id": "123",
  "name": "Item Name",
  "price": 29.99
}
```

## Route Usage

```typescript
// api/items.ts
export const itemRoutes = new Elysia({ prefix: "/items" })
  .use(errorPlugin)  // Must be early
  
  .get("/:id", async ({ itemService, ctx, params }) => {
    // Errors automatically handled by plugin
    // Returns item directly (HTTP 200)
    return await itemService.getItem(ctx, params.id);
  })
  
  .post("/", async ({ itemService, ctx, body }) => {
    // Returns created item directly (HTTP 201)
    return await itemService.createItem(ctx, body);
  }, {
    body: t.Object({
      name: t.String(),
      price: t.Number({ minimum: 0 }),
    }),
  });
```

## Why No `success` Flag?

❌ **Don't do this** (redundant):
```typescript
return { success: true, data: item };  // HTTP 200 already means success
return { success: false, error: {...} }; // HTTP 4xx/5xx already means error
```

✅ **Do this** (clean, uses HTTP semantics):
```typescript
return item;  // HTTP 200/201 implies success
throw new NotFoundError();  // HTTP 404 implies error
```

## Async Error Handling

```typescript
// Wrap async functions that might throw
try {
  await db.transaction(async (tx) => {
    // Multiple operations
  });
} catch (error) {
  if (error instanceof AppError) {
    throw error; // Re-throw known errors
  }
  
  // Log and convert unknown errors
  console.error("Transaction failed:", error);
  throw new AppError("Transaction failed", "TRANSACTION_ERROR", 500);
}
```

## Error Codes Reference

| Code | Status | Usage |
|------|--------|-------|
| NOT_FOUND | 404 | Resource doesn't exist |
| VALIDATION_ERROR | 400 | Invalid input data |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | No permission |
| CONFLICT | 409 | Resource conflict |
| TRANSACTION_ERROR | 500 | DB transaction failed |
| INTERNAL_ERROR | 500 | Unexpected error |
