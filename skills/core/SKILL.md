---
name: core
description: LeoBit project navigation, tRPC patterns, Chakra UI conventions. Use when working with backend routers, services, frontend components, or navigating the monorepo structure.
allowed-tools: Read, Grep, Glob
---

# LeoBit Core Skill

This skill provides navigation and conventions for the LeoBit monorepo.

## Quick Navigation

| Want to... | Go to |
|------------|-------|
| Add a new tRPC router | See [TRPC.md](TRPC.md) |
| Add frontend components | See [UI.md](UI.md) |
| Understand project structure | See below |

## Project Structure

```
leobit/
├── apps/
│   ├── bapp/          # Backend API (Fastify + tRPC + Prisma)
│   │   └── src/
│   │       ├── routers/     # tRPC routers (thin adapters)
│   │       ├── services/    # Business logic (Service Layer)
│   │       ├── lib/         # JWT, Redis, S3, Context, EventBus
│   │       └── utils/       # Utilities
│   └── frapp/         # Frontend (React + Vite + Framework7)
│       └── src/
│           ├── ui/          # Reusable components
│           ├── modules/     # Feature modules
│           └── lib/         # tRPC client, hooks
├── packages/
│   ├── common/        # Shared types & permissions
│   └── database/      # Prisma schema & client
```

## Key Patterns

### Backend: Service Layer Architecture

```
Request → Router (thin adapter) → Service (business logic) → Prisma → DB
```

- **Routers** (`apps/bapp/src/routers/`): Thin adapters, delegate to services
- **Services** (`apps/bapp/src/services/`): Business logic, framework-agnostic
- **Lib** (`apps/bapp/src/lib/`): Infrastructure (JWT, Redis, S3, EventBus)

### Frontend: Component Patterns

- Chakra UI v2.8.2 + Mantine v7.5.1
- Custom theme in `apps/frapp/src/ui/theme/`
- Standard modals/drawers pattern (see [UI.md](UI.md))

## Adding New Features

### 1. Backend (New Entity)

1. Add Prisma schema in `packages/database/prisma/schema.prisma`
2. Create service in `apps/bapp/src/services/{entity}/`
3. Create router in `apps/bapp/src/routers/{entity}.router.ts`
4. Export from `apps/bapp/src/routers/index.ts`

### 2. Frontend (New Module)

1. Create module in `apps/frapp/src/modules/{feature}/`
2. Add routes in `apps/frapp/src/router/`
3. Use UI components from `apps/frapp/src/ui/`

## Related Documentation

- [TRPC.md](TRPC.md) - tRPC patterns, procedures, best practices
- [UI.md](UI.md) - Chakra UI theme, components, modals, forms
