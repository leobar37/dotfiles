# Folder Structure

Standard folder structure for Elysia + Drizzle backend.

## Root Structure

```
packages/backend/
├── src/
│   ├── api/                    # API Routes
│   ├── auth/                   # Auth configuration
│   ├── context/                # RequestContext
│   ├── db/                     # Database
│   ├── middleware/             # Elysia middleware
│   ├── plugins/                # DI container
│   └── services/               # Business logic
├── drizzle/                    # Migrations
├── tests/                      # Test files
├── package.json
├── drizzle.config.ts
└── tsconfig.json
```

## Source Structure (src/)

```
src/
├── api/                        # API Routes (40+ files)
│   ├── index.ts               # Route exports
│   ├── products.ts
│   ├── orders.ts
│   ├── customers.ts
│   └── ...
│
├── auth/
│   └── auth.ts                # Better Auth configuration
│
├── context/
│   ├── request-context.ts     # RequestContext class
│   └── request-context-manager.ts
│
├── db/
│   ├── index.ts               # Drizzle client
│   ├── schema/                # 40+ schema files
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── customers.ts
│   │   └── ...
│   └── relations.ts           # Central relations
│
├── middleware/
│   ├── authorization.ts       # RBAC middleware
│   ├── better-auth.ts         # Auth middleware
│   ├── context.ts             # RequestContext injection
│   └── error-final.ts         # Error handling
│
├── plugins/
│   └── services.ts            # DI container (CRITICAL)
│
└── services/
    ├── ai/                    # AI services
    ├── business/              # Business logic (20+ services)
    ├── context/               # Context management
    ├── infrastructure/        # External services
    └── repository/            # Data access (30+ repos)
```

## Services Organization

```
services/
├── business/                   # Business Logic
│   ├── product.service.ts
│   ├── order.service.ts
│   ├── customer.service.ts
│   └── ...
│
├── repository/                 # Data Access
│   ├── product.repository.ts
│   ├── order.repository.ts
│   ├── customer.repository.ts
│   └── ...
│
├── infrastructure/            # External Services
│   ├── storage.service.ts
│   ├── email.service.ts
│   └── ...
│
└── ai/                        # AI Services
    ├── chat/
    ├── agents/
    └── providers/
```

## Key Files

### Entry Point
```typescript
// src/index.ts
import { Elysia } from "elysia";
import { productRoutes } from "./api/products";
import { servicesPlugin } from "./plugins/services";

const app = new Elysia()
  .use(servicesPlugin)  // DI container
  .use(productRoutes)   // Routes
  .listen(3000);
```

### DI Container Location
```typescript
// src/plugins/services.ts
// SINGLE decorate() call - see patterns/03-dependency-injection.md
```

### Database Client
```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
export const db = drizzle(client, { schema });
```

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Routes | `*.routes.ts` | `product.routes.ts` |
| Services | `*.service.ts` | `product.service.ts` |
| Repositories | `*.repository.ts` | `product.repository.ts` |
| Schemas | `*.ts` | `products.ts` |
| Middleware | `*.ts` | `authorization.ts` |

## Why This Structure?

1. **Separation of Concerns**: Each layer independent
2. **Testability**: Easy to mock layers
3. **Scalability**: 40+ routes, 30+ repos manageable
4. **Team Work**: Parallel development possible
