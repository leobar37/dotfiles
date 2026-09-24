# Request Context

Canonical multi-tenant request context for shared backend architecture. Use abstract `tenantId` in core examples; Elena-specific names like `restaurantId` should only appear in domain-scoped extensions with explicit translation notes.

## Purpose

RequestContext carries:
- User identity (userId, email)
- Organization scope (tenantId)
- Permissions (role, permissions)
- Preferences (settings, timezone)

Through all layers: Route → Service → Repository

## RequestContext Class

```typescript
// context/request-context.ts
export class RequestContext {
  constructor(
    public readonly userId: string | null,
    public readonly tenantId: string,
    public readonly role: Role | null,
    public readonly permissions: Permission[],
    public readonly email: string | null,
    public readonly isAuthenticated: boolean,
    public readonly preferences: Record<string, any> = {}
  ) {}

  /**
   * Factory: Create from authenticated session
   */
  static fromAuth(session: Session): RequestContext {
    return new RequestContext(
      session.user.id,
      session.user.tenantId,
      session.user.role,
      ROLE_PERMISSIONS[session.user.role] || [],
      session.user.email,
      true,
      session.user.preferences || {}
    );
  }

  /**
   * Factory: Create for background workers
   */
  static forWorker(tenantId: string, jobId: string, workerName: string): RequestContext {
    return new RequestContext(
      null, // System context
      tenantId,
      null,
      [],
      null,
      false,
      { jobId, workerName }
    );
  }

  /**
   * Factory: Create for public/unauthenticated routes
   */
  static forPublic(): RequestContext {
    return new RequestContext(
      null,
      "public",
      null,
      [],
      null,
      false,
      {}
    );
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: Permission): boolean {
    if (this.role === "owner") return true; // Owner has all permissions
    return this.permissions.includes(permission);
  }

  /**
   * Check if context is for a specific organization
   */
  belongsToOrg(tenantId: string): boolean {
    return this.tenantId === tenantId;
  }

  /**
   * Get preference value with fallback
   */
  getPreference<T>(key: string, defaultValue: T): T {
    return (this.preferences[key] as T) ?? defaultValue;
  }
}

// Types
export type Role = "owner" | "admin" | "manager" | "viewer";
export type Permission = 
  | "items.read"
  | "items.write"
  | "items.delete"
  | "orders.read"
  | "orders.write"
  | "users.read"
  | "users.write";

// Permission matrix
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["*"], // All permissions
  admin: ["items.*", "orders.*", "users.read"],
  manager: ["items.read", "items.write", "orders.*"],
  viewer: ["items.read", "orders.read"],
};
```

## Middleware Injection

```typescript
// middleware/context.ts
import { Elysia } from "elysia";
import { auth } from "../auth/auth";
import { RequestContext } from "../context/request-context";

export const contextPlugin = new Elysia({ name: "context" })
  .resolve({ as: "scoped" }, async ({ request, set }) => {
    // Extract Bearer token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Authentication required");
    }

    const token = authHeader.substring(7);
    
    // Validate with Better Auth
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });

    if (!session) {
      set.status = 401;
      throw new Error("Invalid session");
    }

    // Create context
    const ctx = RequestContext.fromAuth(session);
    
    return { ctx };
  });
```

## Usage Flow

```typescript
// 1. Route extracts context
// api/items.ts
export const itemRoutes = new Elysia({ prefix: "/items" })
  .use(contextPlugin)  // Injects ctx
  
  .get("/", async ({ ctx, itemService }) => {
    // ctx available here
    return itemService.getItems(ctx);
  });

// 2. Service receives and uses context
// services/business/item.service.ts
export class ItemService {
  async getItems(ctx: RequestContext): Promise<Item[]> {
    // Pass ctx to repository
    return this.itemRepo.findAll(ctx);
  }

  async createItem(ctx: RequestContext, data: CreateItemInput): Promise<Item> {
    // Check permissions
    if (!ctx.hasPermission("items.write")) {
      throw new Error("Forbidden");
    }
    
    return this.itemRepo.create(ctx, data);
  }
}

// 3. Repository uses context for multi-tenant queries
// services/repository/item.repository.ts
export class ItemRepository {
  async findAll(ctx: RequestContext): Promise<Item[]> {
    // ALWAYS filter by tenantId
    return db.query.items.findMany({
      where: and(
        eq(items.tenantId, ctx.tenantId),  // Multi-tenancy
        isNull(items.deletedAt)       // Soft delete
      ),
    });
  }
}
```

## Context Manager (Caching)

```typescript
// context/request-context-manager.ts
export class RequestContextManager {
  private cache = new WeakMap<object, RequestContext>();

  async getContext(session: Session): Promise<RequestContext> {
    // Check cache
    if (this.cache.has(session)) {
      return this.cache.get(session)!;
    }

    // Fetch organization details
    const org = await this.fetchOrganization(session.user.tenantId);
    
    // Build enriched context
    const ctx = RequestContext.fromAuth({
      ...session,
      preferences: {
        ...session.user.preferences,
        orgName: org.name,
        timezone: org.timezone,
      },
    });

    // Cache it
    this.cache.set(session, ctx);
    return ctx;
  }

  private async fetchOrganization(tenantId: string) {
    // Implementation
  }
}
```

## Multi-Tenancy Enforcement

**Every repository query MUST include tenantId filter**:

```typescript
// ✅ CORRECT
.where(and(
  eq(items.id, id),
  eq(items.tenantId, ctx.tenantId),  // Required!
  isNull(items.deletedAt)
))

// ❌ WRONG - Missing org filter
.where(and(
  eq(items.id, id),
  isNull(items.deletedAt)
))
```

## Worker Context

For background jobs:

```typescript
// Inngest function
export const myJob = inngest.createFunction(
  { id: "my-job" },
  { event: "job/trigger" },
  async ({ event }) => {
    // Create system context
    const ctx = RequestContext.forWorker(
      event.data.tenantId,
      event.id,
      "my-job"
    );
    
    // Use in services
    await itemService.processItems(ctx);
  }
);
```
