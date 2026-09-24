---
name: fullstack-backend
description: |
  Full-stack backend architecture with layered patterns (Repository/Business/Infrastructure),
  Drizzle ORM, and ElysiaJS. Covers database layer, dependency injection, request context,
  and service organization.
  Use when building backend APIs, organizing code in layers, or implementing data access.
  Keywords: backend architecture, layered architecture, repository pattern, business logic,
  dependency injection, service layer, drizzle orm, elysia, request context, multi-tenancy.
---

# Full-Stack Backend Architecture

Expert in building scalable backend architectures with clear separation of concerns.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Elysia | ^1.4.18 | Web framework |
| Drizzle ORM | ^0.45.1 | Database ORM |
| PostgreSQL | Latest | Database |
| Zod | ^4.x | Validation |
| TypeScript | ^5.x | Type safety |

## Quick Start

```typescript
// 1. Create project structure
// See patterns/01-folder-structure.md

// 2. Setup Drizzle client
// See patterns/05-drizzle-schema.md

// 3. Create Repository
export class ItemRepository {
  async findOne(ctx: RequestContext, id: string) {
    return db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.tenantId, ctx.tenantId))
    });
  }
}

// 4. Create Business Service
export class ItemService {
  constructor(private repo: ItemRepository) {}
  
  async getItem(ctx: RequestContext, id: string) {
    return this.repo.findOne(ctx, id);
  }
}

// 5. Setup DI Container (patterns/03-dependency-injection.md)
// 6. Create Elysia Route
// 7. Inject RequestContext (patterns/04-request-context.md)
```

## Architecture Layers

```
┌─────────────────────────────────────┐
│           API Routes (Elysia)       │
│  - Validation (Zod)                 │
│  - Auth middleware                  │
│  - Request/Response handling        │
├─────────────────────────────────────┤
│        Business Services            │
│  - Business logic                   │
│  - Transaction coordination         │
│  - Multi-tenancy enforcement        │
├─────────────────────────────────────┤
│         Repositories                │
│  - Data access (Drizzle)            │
│  - Query building                   │
│  - Soft delete patterns             │
├─────────────────────────────────────┤
│      Infrastructure Services        │
│  - External APIs                    │
│  - File storage                     │
│  - Email/SMS                        │
├─────────────────────────────────────┤
│         Database (PostgreSQL)       │
└─────────────────────────────────────┘
```

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Folder Structure** | `patterns/01-folder-structure.md` | Project organization |
| **Layered Architecture** | `patterns/02-layered-architecture.md` | Repository/Business/Infra |
| **Dependency Injection** | `patterns/03-dependency-injection.md` | DI container setup |
| **Request Context** | `patterns/04-request-context.md` | Multi-tenant context |
| **Drizzle Schema** | `patterns/05-drizzle-schema.md` | Table definitions |
| **Drizzle Queries** | `patterns/06-drizzle-queries.md` | Query patterns |
| **Drizzle Relations** | `patterns/07-drizzle-relations.md` | Relationships |
| **API Responses** | `patterns/api-responses.md` | Clean HTTP responses (no `success` flags) |
| **Error Handling** | `patterns/08-error-handling.md` | Error patterns |
| **Assets vs Files** | `patterns/assets-vs-files.md` | File management patterns |

## Key Principles

1. **Single Responsibility**: Each layer has one job
2. **Dependency Inversion**: Services depend on abstractions (repos)
3. **Multi-tenancy**: All queries filtered by tenant context
4. **Soft Delete**: Use deletedAt instead of hard delete
5. **Type Safety**: Full TypeScript coverage

## When to Use

**Use when:** Building or reviewing the canonical Elena-style backend core: Elysia routes, Drizzle schema/query patterns, RequestContext flow, service/repository layering, API responses, and shared error-handling decisions.

**Do not use when:** The task is only initial repo/bootstrap setup, Better Auth-specific flows, Inngest-specific workflows, or AI UI component composition.

**Pair with:** `fullstack-auth-better` for auth, `fullstack-inngest` for Inngest orchestration, `ai-sdk` for AI runtime, and `fullstack-infrastructure` when the repo skeleton still needs to be created.

**Notes:** This is the canonical backend architecture owner. Other backend-adjacent skills should reference this one instead of redefining shared patterns.

## Dependencies

```json
{
  "elysia": "^1.4.18",
  "drizzle-orm": "^0.45.1",
  "postgres": "^3.4.7",
  "zod": "^4.x"
}
```
