# Layered Architecture

Three-layer architecture: Repository → Business → Infrastructure.

## The Three Layers

```
┌─────────────────────────────────────┐
│  3. API Layer (Elysia Routes)       │
│     - HTTP handling                 │
│     - Validation (Zod)              │
│     - Auth middleware               │
├─────────────────────────────────────┤
│  2. Business Layer (Services)       │
│     - Business logic                │
│     - Transaction coordination      │
│     - Multi-tenancy enforcement     │
├─────────────────────────────────────┤
│  1. Data Layer (Repositories)       │
│     - Database queries (Drizzle)    │
│     - Soft delete handling          │
│     - Query optimization            │
├─────────────────────────────────────┤
│  0. Infrastructure Layer            │
│     - External APIs                 │
│     - File storage                  │
└─────────────────────────────────────┘
```

## Layer 1: Repository Pattern

```typescript
// services/repository/item.repository.ts
export class ItemRepository {
  constructor() {}

  async findOne(ctx: RequestContext, id: string): Promise<Item | null> {
    const result = await db.query.items.findFirst({
      where: and(
        eq(items.id, id),
        eq(items.orgId, ctx.orgId),
        isNull(items.deletedAt)
      ),
      with: {
        category: true,
      },
    });
    return result ?? null;
  }

  async findAll(ctx: RequestContext, options?: FilterOptions): Promise<Item[]> {
    const conditions = [
      eq(items.orgId, ctx.orgId),
      isNull(items.deletedAt),
    ];

    if (options?.type) {
      conditions.push(eq(items.type, options.type));
    }

    return db.query.items.findMany({
      where: and(...conditions),
      limit: 5000,
      orderBy: [items.name],
    });
  }

  async create(ctx: RequestContext, data: NewItem): Promise<Item> {
    const result = await db
      .insert(items)
      .values({
        ...data,
        orgId: ctx.orgId,
      })
      .returning();
    return result[0];
  }

  async update(
    ctx: RequestContext,
    id: string,
    data: Partial<Item>
  ): Promise<Item | null> {
    const result = await db
      .update(items)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(items.id, id),
          eq(items.orgId, ctx.orgId),
          isNull(items.deletedAt)
        )
      )
      .returning();
    return result[0] ?? null;
  }

  async softDelete(ctx: RequestContext, id: string): Promise<boolean> {
    const result = await db
      .update(items)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, id), eq(items.orgId, ctx.orgId)))
      .returning();
    return result.length > 0;
  }
}
```

## Layer 2: Business Service

```typescript
// services/business/item.service.ts
export class ItemService {
  constructor(
    private itemRepo: ItemRepository,
    private categoryRepo: CategoryRepository,
    private storageService: StorageService
  ) {}

  async getItem(ctx: RequestContext, id: string): Promise<Item | null> {
    return this.itemRepo.findOne(ctx, id);
  }

  async createItem(
    ctx: RequestContext,
    input: CreateItemInput
  ): Promise<Item> {
    // Business validation
    if (input.price <= 0) {
      throw new Error("Price must be positive");
    }

    // Check duplicates
    const existing = await this.itemRepo.findByName(ctx, input.name);
    if (existing) {
      throw new Error("Item with this name already exists");
    }

    // Create item
    const item = await this.itemRepo.create(ctx, {
      name: input.name,
      price: input.price,
      categoryId: input.categoryId,
    });

    // Handle image if provided
    if (input.image) {
      await this.storageService.uploadFile(ctx, input.image, item.id);
    }

    return item;
  }

  async updateItem(
    ctx: RequestContext,
    id: string,
    input: UpdateItemInput
  ): Promise<Item> {
    const item = await this.itemRepo.findOne(ctx, id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Business rule: Cannot modify deleted items
    if (item.deletedAt) {
      throw new Error("Cannot modify deleted item");
    }

    return this.itemRepo.update(ctx, id, input);
  }

  async deleteItem(ctx: RequestContext, id: string): Promise<void> {
    const item = await this.itemRepo.findOne(ctx, id);
    if (!item) {
      throw new Error("Item not found");
    }

    // Business rule: Check if item is in use
    const isInUse = await this.checkItemUsage(ctx, id);
    if (isInUse) {
      throw new Error("Cannot delete item that is in use");
    }

    await this.itemRepo.softDelete(ctx, id);
  }

  private async checkItemUsage(ctx: RequestContext, id: string): Promise<boolean> {
    // Implementation
    return false;
  }
}
```

## Layer 3: API Routes

```typescript
// api/items.ts
import { Elysia, t } from "elysia";
import { servicesPlugin } from "../plugins/services";

export const itemRoutes = new Elysia({ prefix: "/items" })
  .use(servicesPlugin)
  
  // GET /items
  .get("/", async ({ itemService, ctx }) => {
    return itemService.getItems(ctx);
  })
  
  // GET /items/:id
  .get("/:id", async ({ itemService, ctx, params }) => {
    const item = await itemService.getItem(ctx, params.id);
    if (!item) {
      throw new Error("Item not found");
    }
    return item;
  })
  
  // POST /items
  .post(
    "/",
    async ({ itemService, ctx, body }) => {
      return itemService.createItem(ctx, body);
    },
    {
      body: t.Object({
        name: t.String(),
        price: t.Number(),
        categoryId: t.Optional(t.String()),
      }),
    }
  )
  
  // PATCH /items/:id
  .patch(
    "/:id",
    async ({ itemService, ctx, params, body }) => {
      return itemService.updateItem(ctx, params.id, body);
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          price: t.Number(),
          categoryId: t.Optional(t.String()),
        })
      ),
    }
  )
  
  // DELETE /items/:id
  .delete("/:id", async ({ itemService, ctx, params, set }) => {
    await itemService.deleteItem(ctx, params.id);
    set.status = 204;
  });
```

## Data Flow

```
Request → Route → Service → Repository → Database
             ↓         ↓           ↓
         Validate  Business    Query
           (Zod)    Rules     (Drizzle)
```

## Key Principles

1. **Repositories never call Services**
2. **Services can call multiple Repositories**
3. **Routes never call Repositories directly**
4. **Each layer handles its own errors**
5. **RequestContext flows through all layers**

## Testing Strategy

| Layer | Test Focus | Mock |
|-------|------------|------|
| Repository | SQL queries | Database |
| Service | Business logic | Repositories |
| Routes | HTTP handling | Services |
