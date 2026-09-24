# Session Management

JWT sessions and token handling.

## JWT Mode

Better Auth uses JWT tokens by default:

```typescript
// After login, token returned
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "password",
});

// data.token contains JWT
```

## Bearer Tokens

```typescript
// Store token (frontend)
localStorage.setItem("token", data.token);

// Use in requests
fetch("/api/protected", {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});
```

## Session Validation

```typescript
// Backend - validate session
const session = await auth.api.getSession({
  headers: new Headers({
    Authorization: `Bearer ${token}`,
  }),
});

if (!session) {
  throw new UnauthorizedError("Invalid session");
}
```

## Session Expiration

```typescript
// Config
session: {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24,     // Refresh every 24h
}
```

## Logout

```typescript
// Frontend
await authClient.signOut();
localStorage.removeItem("token");

// Backend (optional)
await auth.api.signOut({ headers });
```
