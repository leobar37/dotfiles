# Protected Routes

Frontend route protection with React Router.

## ProtectedRoute Component

```typescript
// components/protected-route.tsx
import { Navigate, useLocation } from "react-router";
import { authClient } from "../lib/auth-client";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { data: session, isLoading } = authClient.useSession();
  
  // Don't redirect while loading (prevents flash)
  if (isLoading) return null;
  
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}
```

## Layout Protection

```typescript
// routes/_protected.tsx
import { Outlet } from "react-router";
import { ProtectedRoute } from "../components/protected-route";
import { DashboardLayout } from "../components/layouts/dashboard";

export default function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

## Route Configuration

```typescript
// routes.ts
import { flatRoutes } from "@react-router/fs-routes";

export default flatRoutes();
```

```typescript
// routes/login.tsx - Public
export default function LoginPage() {
  return <LoginForm />;
}

// routes/_protected.dashboard.tsx - Protected
export default function DashboardPage() {
  return <Dashboard />;
}

// routes/_protected.settings.tsx - Protected
export default function SettingsPage() {
  return <Settings />;
}
```

## Redirect After Login

```typescript
// routes/login.tsx
import { useLocation, useNavigate } from "react-router";

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || "/dashboard";
  
  const handleLogin = async () => {
    const { data } = await authClient.signIn.email({ email, password });
    if (data) {
      navigate(from, { replace: true });
    }
  };
}
```
