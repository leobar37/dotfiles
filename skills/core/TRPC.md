# tRPC Conventions for LeoBit

This document covers the tRPC setup, patterns, and best practices used in the LeoBit backend.

## Setup Overview

**File:** `apps/bapp/src/router.ts`

```typescript
import { initTRPC } from "@trpc/server";
import superJson from "superjson";
import { ZodError } from "zod";

// SuperJSON for date serialization
export const t = initTRPC
  .context<Context>()
  .meta<Metadata>()
  .create({
    transformer: superJson,
    errorFormatter(opts) {
      const { shape, error } = opts;
      // Custom error formatting with Zod validation
      return shape;
    },
  });
```

## Procedures

| Procedure | Middleware | Use For |
|-----------|------------|---------|
| `publicProcedure` | None | Public endpoints (login, health check) |
| `isAuthedProcedure` | `isAuthedMiddleware` | Authenticated requests |
| `isAdminProcedure` | `isAdminMiddleware` | Admin-only endpoints |

### Middleware Chain

```
isAuthedMiddleware
  └─> Validates JWT token
  └─> Builds request context with user & permissions
  └─> Injects eventBus

isAdminMiddleware
  └─> Extends isAuthedMiddleware
  └─> Adds user to ctx
```

## DO: Follow These Patterns

### 1. Router Should Be Thin Adapter

```typescript
// ✅ GOOD - Router delegates to service
export const clientsRouterNew = {
  create: isAuthedProcedure
    .meta({ permissions: [PermissionsEnum.CreateClientPermission] })
    .input(createClientDTO)
    .mutation(async ({ ctx, input }) => {
      const requestContext = await RequestContextFactory.fromTRPC(ctx, {
        permissions: [PermissionsEnum.CreateClientPermission],
      });
      return ctx.services.clients.create(requestContext, input);
    }),
};
```

### 2. Use Zod for Input Validation

```typescript
import { z } from "zod";

export const createClientDTO = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
```

### 3. Define Permissions in Meta

```typescript
.meta({ permissions: [PermissionsEnum.ReadClientPermission] })
```

### 4. Use RequestContextFactory for Context

```typescript
import { RequestContextFactory } from "../lib/context";

const requestContext = await RequestContextFactory.fromTRPC(ctx, {
  permissions: [PermissionsEnum.CreateClientPermission],
});
```

### 5. Emit Events for Real-time Updates

```typescript
ctx.eventBus.emit(
  clientCrudOperationEvent(
    { type: "create", client },
    { businessId: ctx.businessId }
  )
);
```

## DON'T: Anti-Patterns

### 1. Business Logic in Router

```typescript
// ❌ BAD - Business logic in router
export const clientsRouterNew = {
  create: isAuthedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions here
      // Validate uniqueness here
      // Create in DB here
      // ❌ All business logic in router!
    }),
};
```

**Fix:** Delegate to service layer.

### 2. Direct Prisma Calls Without Service

```typescript
// ❌ BAD - Bypassing service layer
export const clientsRouterNew = {
  list: isAuthedProcedure.query(async ({ ctx }) => {
    return ctx.db.client.findMany({ where: { deletedAt: null } });
  }),
};
```

**Fix:** Use `ctx.services.clients.list(ctx)`.

### 3. Missing Permission Checks

```typescript
// ❌ BAD - No permission meta
export const clientsRouterNew = {
  delete: isAuthedProcedure
    .input(z.number())
    .mutation(async ({ ctx, input }) => {
      // No permission check!
      return ctx.services.clients.delete(ctx, input);
    }),
};
```

**Fix:** Add `.meta({ permissions: [...] })`.

### 4. Hardcoded Business ID

```typescript
// ❌ BAD - Hardcoded businessId
const client = await ctx.db.client.create({
  data: { ...input, businessId: 1 },
});
```

**Fix:** Use `ctx.businessId` from context.

## Router Structure

```
apps/bapp/src/routers/
├── auth.router.ts           # Authentication
├── clients.router.ts        # Clients CRUD
├── products.router.ts       # Products
├── sales-operations.router.ts # Sales
├── expenses.router.ts       # Expenses
├── suppliers.router.ts      # Suppliers
├── channels.router.ts       # Channels
├── boxes.router.ts          # Boxes
├── users.router.ts          # Users
└── index.ts                 # Export all routers
```

## Adding a New Router

1. Create `apps/bapp/src/routers/{entity}.router.ts`:

```typescript
import { router, isAuthedProcedure } from "../router";
import { RequestContextFactory } from "../lib/context";
import { PermissionsEnum } from "@leobit/common";
import { createEntityDTO, updateEntityDTO } from "../services/entity";

export const entityRouterNew = {
  create: isAuthedProcedure
    .meta({ permissions: [PermissionsEnum.CreateEntityPermission] })
    .input(createEntityDTO)
    .mutation(async ({ ctx, input }) => {
      const requestContext = await RequestContextFactory.fromTRPC(ctx, {
        permissions: [PermissionsEnum.CreateEntityPermission],
      });
      return ctx.services.entity.create(requestContext, input);
    }),
  // ... other endpoints
};
```

2. Export from `apps/bapp/src/routers/index.ts`:

```typescript
import { entityRouterNew } from "./entity.router";

export const appRouter = router({
  // ... other routers
  entity: entityRouterNew,
});
```

## Error Handling

Errors are formatted automatically with Zod validation errors:

```typescript
// Zod errors are flattened and included in response
errorFormatter(opts) {
  const { shape, error } = opts;
  let data = {
    ...shape.data,
    zodError:
      error.code === "BAD_REQUEST" && error.cause instanceof ZodError
        ? error.cause.flatten()
        : null,
  };
  return { ...shape, data };
}
```

## Subscription Support

WebSocket setup exists separately in `apps/bapp/src/ws-setup/` for real-time subscriptions.

## Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied | Check `.meta({ permissions: [...] })` |
| Context missing user | Use `isAuthedProcedure`, not `publicProcedure` |
| Dates not serialized | SuperJSON handles dates automatically |
| Business ID missing | Use `ctx.businessId` from context |
