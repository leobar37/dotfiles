---
name: fullstack-auth-better
description: |
  Full-stack authentication with Better Auth. Covers JWT sessions, Bearer tokens,
  RBAC with permission matrix, and protected routes.
  Use when implementing authentication, session management, or access control.
  Keywords: better auth, authentication, session management, jwt, bearer token,
  rbac, permissions, protected routes, authorization, api keys.
---

# Full-Stack Auth (Better Auth)

Complete authentication solution with Better Auth.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Better Auth | ^1.3.34 | Authentication |
| Drizzle ORM | ^0.45.1 | Database adapter |
| Elysia | ^1.4.18 | Backend framework |
| React | ^18.3.1 | Frontend |

## Quick Start

```typescript
// 1. Setup Better Auth (backend)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
});

// 2. Create auth client (frontend)
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
});

// 3. Use in components
const { data: session } = authClient.useSession();
```

## Critical Warning

**CORS requires special handling with Better Auth.** The standard `@elysiajs/cors` plugin does NOT work correctly. See [CORS Configuration](./patterns/07-cors.md) for the correct setup.

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Backend Setup** | `patterns/01-backend-setup.md` | Better Auth config |
| **Session Management** | `patterns/02-session-management.md` | JWT, tokens |
| **Frontend Client** | `patterns/03-frontend-client.md` | Client setup |
| **Protected Routes** | `patterns/04-protected-routes.md` | Route protection |
| **API Middleware** | `patterns/05-api-middleware.md` | Backend auth |
| **RBAC** | `patterns/06-rbac.md` | Roles & permissions |
| **CORS Configuration** | `patterns/07-cors.md` | **CRITICAL: CORS with Better Auth** |

## Features

- Email/password authentication
- JWT sessions with Bearer tokens
- Session management
- API keys for integrations
- Role-based access control (RBAC)
- Protected routes

## When to Use

**Use when:** Implementing Better Auth setup, session handling, auth middleware, RBAC, protected routes, or Better Auth-specific CORS behavior on top of the shared backend core.

**Do not use when:** You need the canonical backend architecture itself (DI, RequestContext ownership, Drizzle patterns, service-layer rules, API response rules). Load `fullstack-backend` for those concerns.

**Pair with:** `fullstack-backend` for shared backend architecture.

**Notes:** This is an auth extension, not a parallel backend foundation.

## Dependencies

```json
{
  "better-auth": "^1.3.34"
}
```
