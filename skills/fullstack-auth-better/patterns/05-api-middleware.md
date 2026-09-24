# API Middleware

Better Auth-specific middleware patterns layered on top of the canonical backend core. Shared RequestContext and route-structure ownership remains in `fullstack-backend`.

## Better Auth Middleware

```typescript
// middleware/better-auth.ts
import { Elysia } from "elysia";
import { auth } from "../auth/auth";

export const betterAuthPlugin = new Elysia({ name: "better-auth" })
  .resolve({ as: "scoped" }, async ({ request: { headers } }) => {
    const authHeaders = new Headers(headers);
    const authorization = authHeaders.get("authorization");
    
    // Extract Bearer token
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.substring(7);
      authHeaders.set("authorization", `Bearer ${token}`);
    }
    
    // Validate session
    const session = await auth.api.getSession({ headers: authHeaders });
    
    if (!session) {
      throw new Error("Unauthorized");
    }
    
    return {
      user: session.user,
      session: session.session,
    };
  });
```

## Route-Level Protection

```typescript
// api/items.ts
import { Elysia } from "elysia";
import { betterAuthPlugin } from "../middleware/better-auth";

export const itemRoutes = new Elysia({ prefix: "/items" })
  // Apply auth to all routes
  .use(betterAuthPlugin)
  
  .get("/", async ({ user }) => {
    // user is available here
    return { items: [] };
  })
  
  .post("/", async ({ user, body }) => {
    return { created: true };
  });
```

## Public Routes

```typescript
// api/public.ts
import { Elysia } from "elysia";

// NO auth plugin
export const publicRoutes = new Elysia({ prefix: "/public" })
  .get("/catalog", async () => {
    return { items: [] };
  });
```

## API Key Auth

```typescript
// middleware/api-key.ts
import { Elysia } from "elysia";
import { auth } from "../auth/auth";

export const apiKeyPlugin = new Elysia({ name: "api-key" })
  .resolve({ as: "scoped" }, async ({ request: { headers } }) => {
    const apiKey = headers.get("x-api-key");
    
    if (!apiKey) {
      throw new Error("API key required");
    }
    
    const valid = await auth.api.verifyApiKey({ key: apiKey });
    
    if (!valid) {
      throw new Error("Invalid API key");
    }
    
    return { apiKey };
  });
```
