# Frontend Auth Client

React client setup for Better Auth.

## Create Client

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  fetchOptions: {
    credentials: "include",
  },
});
```

## With Bearer Plugin

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { bearerClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL,
  plugins: [bearerClient()],
  fetchOptions: {
    credentials: "omit",
    onSuccess: (ctx) => {
      // Capture token from response
      const token = ctx.response.headers.get("set-auth-token");
      if (token) localStorage.setItem("token", token);
    },
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem("token") || "",
    },
  },
});
```

## Sign In

```typescript
import { authClient } from "../lib/auth-client";

function LoginPage() {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const { data, error } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });
    
    if (error) {
      alert(error.message);
    } else {
      navigate("/dashboard");
    }
  };
}
```

## Sign Up

```typescript
const { data, error } = await authClient.signUp.email({
  email,
  password,
  name,
});
```

## useSession Hook

```typescript
import { authClient } from "../lib/auth-client";

function Dashboard() {
  const { data: session, isLoading, error } = authClient.useSession();
  
  if (isLoading) return <Loading />;
  if (!session) return <Navigate to="/login" />;
  
  return <div>Welcome {session.user.name}</div>;
}
```

## Sign Out

```typescript
function LogoutButton() {
  const handleLogout = async () => {
    await authClient.signOut();
    localStorage.removeItem("token");
    navigate("/login");
  };
  
  return <button onClick={handleLogout}>Logout</button>;
}
```
