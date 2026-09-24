# File-Based Routing

flatRoutes() configuration.

## Setup

```typescript
// app/routes.ts
import { type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default flatRoutes() satisfies RouteConfig;
```

## Route Conventions

| File | Route | Description |
|------|-------|-------------|
| `_index.tsx` | `/` | Home page |
| `about.tsx` | `/about` | Static page |
| `_protected.tsx` | - | Layout wrapper |
| `_protected.dashboard.tsx` | `/dashboard` | Protected route |
| `$id.tsx` | `/:id` | Dynamic segment |
| `products.$id.tsx` | `/products/:id` | Nested dynamic |
| `_layout.tsx` | - | Layout (no path) |

## Examples

### Home Route

```tsx
// app/routes/_index.tsx
export default function Home() {
  return <h1>Home</h1>;
}
```

### Protected Layout

```tsx
// app/routes/_protected.tsx
import { Outlet } from "react-router";

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

### Protected Route

```tsx
// app/routes/_protected.dashboard.tsx
export default function Dashboard() {
  return <h1>Dashboard</h1>;
}
```

### Dynamic Route

```tsx
// app/routes/products.$id.tsx
import { useParams } from "react-router";

export default function Product() {
  const { id } = useParams();
  return <h1>Product {id}</h1>;
}
```

## Data Loading

```tsx
// app/routes/products.$id.tsx
import { LoaderFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  const product = await api.products.get(params.id);
  return { product };
}

export default function Product() {
  const { product } = useLoaderData();
  return <h1>{product.name}</h1>;
}
```
