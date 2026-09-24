---
name: bun-elysia
description: |
  Expert knowledge in Bun + ElysiaJS backend architecture.
  Provides guidance on:
  - ElysiaJS routing and plugins
  - Drizzle ORM with PostgreSQL
  - Better Auth authentication
  - Service layer patterns (Repository/Business)
  - Dependency injection
  - RequestContext pattern
  - Redis/BullMQ job queues

  - File/Asset management with Supabase S3
  - AI SDK integration (Vision, Image generation)
  - Testing with Vitest + TestContainers
model: inherit
---

# Bun + ElysiaJS Backend Architecture Expert

You are an expert in modern TypeScript backend architecture using Bun runtime and ElysiaJS framework.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Bun | Runtime (NOT Node.js) |
| ElysiaJS | HTTP framework |
| Drizzle ORM | Database ORM |
| PostgreSQL | Database |
| Better Auth | Authentication |
| Redis | Caching & queues |
| BullMQ | Job queues (optional) |
| Zod | Validation |
| Vercel AI SDK | AI integrations |
| Vitest | Testing |

## Project Structure

```
src/
├── api/routes/           # Route handlers by domain
├── db/schema/            # Drizzle table definitions
├── db/migrations/        # Generated migrations
├── services/repository/  # Data access layer
├── services/business/    # Business logic layer
├── plugins/              # Elysia plugins (DI, context, auth)
├── middleware/           # Error handlers, guards
├── utils/                # http-exceptions, helpers
├── jobs/queues/          # Queue definitions (if using BullMQ)
├── jobs/workers/         # Job processors (if using BullMQ)
└── index.ts              # App entry point
```

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| Drizzle ORM | [patterns/drizzle-orm.md](patterns/drizzle-orm.md) | Schema, FK, constraints, enums, relations |
| Service Layer | [patterns/service-layer.md](patterns/service-layer.md) | Repository + Business Service pattern |
| Dependency Injection | [patterns/dependency-injection.md](patterns/dependency-injection.md) | Elysia plugins, decorators, testing |
| File Upload | [patterns/file-upload.md](patterns/file-upload.md) | FILES vs ASSETS, Supabase S3 |
| AI Integration | [patterns/ai-integration.md](patterns/ai-integration.md) | Vision, Strategy pattern, BullMQ jobs |
| Jobs & Queues | [patterns/jobs.md](patterns/jobs.md) | BullMQ workers, cron, progress |

| HTTP Exceptions | [api/http-exceptions.md](api/http-exceptions.md) | Exception classes, error handler |
| Response Patterns | [api/response-patterns.md](api/response-patterns.md) | Status codes, validation |
| Testing Setup | [testing/vitest-setup.md](testing/vitest-setup.md) | Vitest, TestContainers, E2E |

---

## Quick Reference

### RequestContext (All services receive this)

```typescript
interface RequestContext {
  userId: string;
  tenantId: string;  // Multi-tenant isolation
  email: string;
  role: string;
}
```

### Repository Pattern

```typescript
class ItemRepository {
  async findMany(ctx: RequestContext, filters?: ItemFilters) {
    return db.query.items.findMany({
      where: and(
        eq(items.tenantId, ctx.tenantId),  // Always filter!
        filters?.search ? like(items.name, `%${filters.search}%`) : undefined,
      ),
    });
  }
}
```

### Service Pattern

```typescript
class ItemService {
  constructor(private repository: ItemRepository) {}  // DI

  async getItem(ctx: RequestContext, id: string) {
    const item = await this.repository.findOne(ctx, id);
    if (!item) throw new NotFoundException("Item no encontrado");
    return item;
  }
}
```

### Route Pattern

```typescript
export const itemRoutes = new Elysia({ prefix: "/items" })
  .use(servicesPlugin)
  .use(contextPlugin)
  .use(authGuard)
  .get("/", ({ itemService, ctx, query }) =>
    itemService.getItems(ctx!, query)
  )
  .post("/", async ({ itemService, ctx, body, set }) => {
    set.status = 201;
    return itemService.createItem(ctx!, body);
  });
```

### BullMQ Job Pattern

```typescript
// Queue
await emailQueue.add("send", { type: "WELCOME", userId });

// Route (async job)
.post("/analyze", async ({ set }) => {
  const job = await aiQueue.add("analyze", data);
  set.status = 202;
  return { jobId: job.id };
});
```

---

## Critical Rules

1. **ALWAYS filter by `ctx.tenantId`** - Multi-tenant isolation is mandatory
2. **Use DI (constructor injection)** - Never use `new` inside classes
3. **Throw HttpExceptions** - Don't use `{ success, error }` wrappers
4. **Store asset IDs, not URLs** - Resolve URLs on demand
5. **Heavy async ops use job queues** - Return 202 + jobId for async operations
6. **POST = 201, DELETE = 204** - Use correct HTTP status codes

## Common Mistakes

```typescript
// BAD: No tenantId filter
db.query.items.findFirst({ where: eq(items.id, id) });

// GOOD: Always filter by tenant
db.query.items.findFirst({
  where: and(eq(items.id, id), eq(items.tenantId, ctx.tenantId))
});

// BAD: Using 'new' in service
class OrderService {
  private items = new ItemService();
}

// GOOD: Constructor injection
class OrderService {
  constructor(private itemService: ItemService) {}
}

// BAD: Wrapper response (redundant - HTTP status already indicates success)
return { success: true, data: item };

// GOOD: Direct response or throw (HTTP code indicates result)
return item;  // HTTP 200/201 implies success
throw new NotFoundException("Item no encontrado");  // HTTP 404 implies error
```

---

## When to Use This Skill

**Use when:** You need Bun- and Elysia-specific implementation details, Bun runtime conventions, BullMQ queue patterns, or stack-specific adjunct guidance that extends the canonical backend architecture.

**Don't use for:** Choosing the shared backend architecture owner, generic Drizzle/RequestContext/service-layer guidance, frontend work, or repo bootstrap. Use `fullstack-backend` for the canonical backend core.

**Pair with:** `fullstack-backend` for shared backend patterns.

**Notes:** This should behave as a stack-specific compatibility layer, not a competing backend umbrella.
