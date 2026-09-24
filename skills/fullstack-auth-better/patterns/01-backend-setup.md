# Better Auth Backend Setup

Better Auth setup layered on top of the canonical backend core. Reuse `fullstack-backend` for shared Drizzle, RequestContext, DI, and route architecture decisions.

## Basic Configuration

```typescript
// auth/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
});
```

## With All Options

```typescript
// auth/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { apiKey } from "better-auth/plugins/api-key";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
  },
  
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        body: `Click here: ${url}`,
      });
    },
    sendOnSignUp: true,
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Update every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min cache
    },
  },
  
  plugins: [
    bearer(), // Bearer token support
    apiKey({  // API key support
      apiKeyHeaders: ["x-api-key"],
      enableSessionForAPIKeys: true,
    }),
  ],
});
```

## Mount in Elysia

```typescript
// app.ts
import { Elysia } from "elysia";
import { auth } from "./auth/auth";

const app = new Elysia()
  .mount(auth.handler) // Handles /api/auth/*
  .listen(3000);
```

## CORS Configuration (CRITICAL)

**Better Auth requires manual CORS handling.** The `@elysiajs/cors` plugin does NOT work correctly with Better Auth.

See [07-cors.md](./07-cors.md) for complete CORS setup instructions.

## Database Schema

Better Auth creates tables automatically:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth accounts
- `verification` - Email verifications

## Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=your-secret-key

# Optional
BETTER_AUTH_URL=http://localhost:3000
```
