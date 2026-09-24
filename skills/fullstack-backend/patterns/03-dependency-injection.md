# Dependency Injection

Canonical DI container pattern for the backend core. Stack-specific notes should reference this file instead of redefining the shared ownership boundary.

## The Problem

Without DI, creating services becomes messy:

```typescript
// ❌ BAD: Hardcoded dependencies
app.get("/items", () => {
  const repo = new ItemRepository();
  const service = new ItemService(repo, new OtherRepo());
  return service.getItems();
});
```

## The Solution

Single DI container with `decorate()`:

```typescript
// plugins/services.ts
import { Elysia } from "elysia";

export const servicesPlugin = new Elysia({ name: "services" })
  .as("global") // Important: make available everywhere
  
  // SINGLE decorate() call with all services
  .decorate(() => {
    // Create all repositories first
    const itemRepo = new ItemRepository();
    const categoryRepo = new CategoryRepository();
    const storageService = new StorageService();
    
    // Create services with injected repos
    const itemService = new ItemService(itemRepo, categoryRepo, storageService);
    const categoryService = new CategoryService(categoryRepo);
    
    return {
      itemRepo,
      categoryRepo,
      itemService,
      categoryService,
      storageService,
    };
  });
```

## ⚠️ CRITICAL: Single Decorate Rule

**NEVER use multiple decorate() calls - causes Elysia hang**

```typescript
// ❌ WRONG - Will hang Elysia
new Elysia()
  .decorate("itemService", new ItemService())
  .decorate("otherService", new OtherService()) // DON'T

// ✅ CORRECT - Single decorate with all services
new Elysia()
  .decorate(() => ({
    itemService: new ItemService(),
    otherService: new OtherService(),
  }))
```

## Usage in Routes

```typescript
// api/items.ts
import { Elysia } from "elysia";

export const itemRoutes = new Elysia({ prefix: "/items" })
  // Services available via context
  .get("/", async ({ itemService, ctx }) => {
    return itemService.getItems(ctx);
  })
  
  .post("/", async ({ itemService, ctx, body }) => {
    return itemService.createItem(ctx, body);
  });
```

## Service Lifecycle

All services are **singletons** - created once at startup:

```typescript
// Created ONCE when server starts
.decorate(() => {
  const db = createDatabase();
  const cache = createCache();
  
  // These instances live for the entire server lifetime
  return {
    itemRepo: new ItemRepository(db),
    cacheService: new CacheService(cache),
  };
})
```

## Complete Example

```typescript
// plugins/services.ts
import { Elysia } from "elysia";

export const servicesPlugin = new Elysia({ name: "services" })
  .as("global")
  .decorate(() => {
    // Repositories
    const repositories = {
      item: new ItemRepository(),
      category: new CategoryRepository(),
      user: new UserRepository(),
      order: new OrderRepository(),
    };
    
    // Infrastructure services
    const infrastructure = {
      storage: new StorageService(),
      email: new EmailService(),
      cache: new CacheService(),
    };
    
    // Business services
    const services = {
      item: new ItemService(
        repositories.item,
        repositories.category,
        infrastructure.storage
      ),
      order: new OrderService(
        repositories.order,
        repositories.item,
        repositories.user
      ),
      user: new UserService(
        repositories.user,
        infrastructure.email
      ),
    };
    
    // Flatten for easy access
    return {
      ...repositories,
      ...infrastructure,
      ...services,
    };
  });

// app.ts
import { Elysia } from "elysia";
import { servicesPlugin } from "./plugins/services";
import { itemRoutes } from "./api/items";
import { orderRoutes } from "./api/orders";

const app = new Elysia()
  .use(servicesPlugin)  // Must be before routes
  .use(itemRoutes)
  .use(orderRoutes)
  .listen(3000);
```

## Testing with DI

```typescript
// Test setup
const mockItemRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const service = new ItemService(
  mockItemRepo as any,
  mockCategoryRepo as any,
  mockStorage as any
);

test("creates item", async () => {
  mockItemRepo.findOne.mockResolvedValue(null);
  mockItemRepo.create.mockResolvedValue({ id: "1", name: "Test" });
  
  const result = await service.createItem(ctx, { name: "Test", price: 10 });
  
  expect(result.name).toBe("Test");
});
```

## Benefits

1. **Testability**: Easy to mock dependencies
2. **Separation**: Clear dependency graph
3. **Singletons**: Services reused across requests
4. **Type Safety**: Full TypeScript support
