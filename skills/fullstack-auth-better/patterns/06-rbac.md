# RBAC

Role-based access control as an auth extension layered on top of the canonical backend core.

## Role Definitions

```typescript
// types/auth.ts
export type Role = "owner" | "admin" | "manager" | "viewer";

export type Permission = 
  | "items.read"
  | "items.write"
  | "items.delete"
  | "orders.read"
  | "orders.write"
  | "users.read"
  | "users.write"
  | "settings.read"
  | "settings.write";
```

## Permission Matrix

```typescript
// auth/permissions.ts
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["*"], // All permissions
  
  admin: [
    "items.*",
    "orders.*",
    "users.read",
    "users.write",
    "settings.*",
  ],
  
  manager: [
    "items.read",
    "items.write",
    "orders.read",
    "orders.write",
    "users.read",
  ],
  
  viewer: [
    "items.read",
    "orders.read",
    "users.read",
  ],
};
```

## Check Permissions

```typescript
// context/request-context.ts
export class RequestContext {
  constructor(
    public readonly userId: string,
    public readonly role: Role,
    public readonly permissions: Permission[],
  ) {}
  
  hasPermission(permission: Permission): boolean {
    // Owner has all permissions
    if (this.role === "owner") return true;
    
    // Check specific permission
    if (this.permissions.includes(permission)) return true;
    
    // Check wildcard (e.g., "items.*" matches "items.read")
    const [resource] = permission.split(".");
    if (this.permissions.includes(`${resource}.*`)) return true;
    
    return false;
  }
}
```

## Middleware Factory

```typescript
// middleware/authorization.ts
import { Elysia } from "elysia";
import type { Permission, Role } from "../types/auth";

export function requirePermission(permission: Permission) {
  return async ({ ctx }: { ctx: RequestContext }) => {
    if (!ctx.hasPermission(permission)) {
      throw new Error(`Forbidden: ${permission}`);
    }
  };
}

export function requireRole(roles: Role | Role[]) {
  const roleList = Array.isArray(roles) ? roles : [roles];
  
  return async ({ ctx }: { ctx: RequestContext }) => {
    if (!roleList.includes(ctx.role)) {
      throw new Error(`Required role: ${roleList.join(" or ")}`);
    }
  };
}
```

## Usage in Routes

```typescript
// api/items.ts
import { requirePermission } from "../middleware/authorization";

export const itemRoutes = new Elysia({ prefix: "/items" })
  .use(betterAuthPlugin)
  
  // Anyone with items.read can view
  .get("/", requirePermission("items.read"), async ({ ctx }) => {
    return itemService.getItems(ctx);
  })
  
  // Only items.write can create
  .post("/", requirePermission("items.write"), async ({ ctx, body }) => {
    return itemService.createItem(ctx, body);
  })
  
  // Only owner/admin can delete
  .delete("/:id", requireRole(["owner", "admin"]), async ({ ctx, params }) => {
    return itemService.deleteItem(ctx, params.id);
  });
```
