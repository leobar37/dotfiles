# CORS Configuration for Better Auth

**CRITICAL**: Better Auth requires special CORS handling. The standard `@elysiajs/cors` plugin does NOT work correctly with Better Auth's handler.

## The Problem

Better Auth's handler bypasses Elysia's middleware lifecycle, causing CORS headers to be missing on:
- OPTIONS preflight requests (most critical)
- Auth endpoints like `/api/auth/sign-in/email`
- Session endpoints like `/api/auth/get-session`

## The Solution

Use **manual CORS handling** instead of the `@elysiajs/cors` plugin:

```typescript
// src/index.ts
import { Elysia } from "elysia";
import { auth } from "./lib/auth";

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

const app = new Elysia()
  // Handle OPTIONS preflight for all routes
  .options("/*", ({ set }) => {
    set.status = 204;
    set.headers["access-control-allow-origin"] = ALLOWED_ORIGIN;
    set.headers["access-control-allow-credentials"] = "true";
    set.headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
    set.headers["access-control-allow-headers"] = "Content-Type, Authorization, Cache-Control, Accept, Accept-Language";
    set.headers["access-control-max-age"] = "86400";
    return null;
  })
  // Add CORS headers to all responses
  .onAfterHandle(({ set }) => {
    set.headers["access-control-allow-origin"] = ALLOWED_ORIGIN;
    set.headers["access-control-allow-credentials"] = "true";
  })
  // Auth routes with manual CORS proxy
  .use(authRoutes)
  // Other routes...
  .listen(3000);
```

## Auth Routes CORS Proxy

Better Auth routes need special handling:

```typescript
// src/api/auth.ts
import { Elysia } from "elysia";
import { auth } from "../lib/auth";

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

export const authRoutes = new Elysia()
  .all("/*", async ({ request, set }) => {
    const response = await auth.handler(request);

    set.status = response.status;

    // Copy Better Auth headers and add CORS
    const newHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      newHeaders[key] = value;
    });
    newHeaders["access-control-allow-origin"] = ALLOWED_ORIGIN;
    newHeaders["access-control-allow-credentials"] = "true";

    set.headers = newHeaders;
    return response.body;
  });
```

## Environment Variables

**ALWAYS verify the frontend URL matches your actual dev server:**

```bash
# .env (backend)
FRONTEND_URL=http://localhost:5173  # Must match Vite's actual port
PORT=3000
```

**Common pitfall**: Vite may use a different port if 5173 is busy (e.g., 5177, 5178). Always check the actual port in the browser.

## What NOT To Do

```typescript
// WRONG: @elysiajs/cors doesn't work with Better Auth
import { cors } from "@elysiajs/cors";

app.use(cors({ origin: "http://localhost:5173" }));
app.mount(auth.handler);  // CORS headers will be missing!

// WRONG: Mounting with prefix breaks Better Auth paths
app.mount("/auth", auth.handler);  // Creates /auth/api/auth/*

// WRONG: Not adding credentials header
set.headers["access-control-allow-origin"] = "*";  // Must be explicit origin with credentials
```

## Testing CORS

Always test with actual Origin header:

```bash
# Test preflight
curl -i -X OPTIONS \
  -H "Origin: http://localhost:5173" \
  http://localhost:3000/api/auth/sign-in/email

# Should see:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Credentials: true
```

## Debugging Checklist

If CORS errors persist:

1. **Check ports match**: Backend `FRONTEND_URL` must match actual frontend URL
2. **Check Origin header**: Browser must send `Origin` header (won't on localhost in some cases)
3. **Check preflight**: Look for OPTIONS request in Network tab - must return 204 with CORS headers
4. **Check auth routes**: Better Auth endpoints must have CORS headers on BOTH preflight AND actual request
5. **Restart backend**: Environment variable changes require restart

## Browser Behavior

- **Preflight**: Browser sends OPTIONS first to check CORS permissions
- **Credentials**: With `credentials: "include"`, `Access-Control-Allow-Origin` cannot be `*`
- **Cache**: Preflight responses are cached for `access-control-max-age` seconds

## References

- Better Auth Elysia docs: https://www.better-auth.com/docs/integrations/elysia
- CORS MDN: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- Common issue: https://github.com/better-auth/better-auth/issues/3384
