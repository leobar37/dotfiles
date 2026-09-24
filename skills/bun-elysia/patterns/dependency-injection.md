# Dependency Injection Pattern

Bun/Elysia-specific DI notes that extend the canonical guidance in `fullstack-backend/patterns/03-dependency-injection.md`. Do not treat this file as the primary source of truth for shared backend DI rules.

## Concepto

En lugar de crear instancias con `new` dentro de los servicios, las dependencias se pasan por constructor. Elysia maneja esto con `.decorate()`.

## Plugin de Servicios

```typescript
// src/plugins/services.ts
import { Elysia } from "elysia";

// Repositories
import { UserRepository } from "../services/repository/user.repository";
import { ItemRepository } from "../services/repository/item.repository";
import { OrderRepository } from "../services/repository/order.repository";
import { CustomerRepository } from "../services/repository/customer.repository";

// Services
import { UserService } from "../services/business/user.service";
import { ItemService } from "../services/business/item.service";
import { OrderService } from "../services/business/order.service";

// Storage
import { StorageService } from "../services/storage/storage.service";

export const servicesPlugin = new Elysia({ name: "services" })
  // Paso 1: Registrar servicios sin dependencias
  .decorate({
    userRepository: new UserRepository(),
    itemRepository: new ItemRepository(),
    orderRepository: new OrderRepository(),
    customerRepository: new CustomerRepository(),
    storageService: new StorageService(),
  })
  // Paso 2: Registrar servicios que dependen de los anteriores
  .decorate(({ userRepository, itemRepository, orderRepository, customerRepository }) => ({
    userService: new UserService(userRepository),
    itemService: new ItemService(itemRepository),
    orderService: new OrderService(orderRepository, itemRepository, customerRepository),
  }));
```

## Context Plugin

```typescript
// src/plugins/context.ts
import { Elysia } from "elysia";
import { auth } from "../auth";
import type { RequestContext } from "../types/context";

export const contextPlugin = new Elysia({ name: "context" })
  .derive(async ({ request, cookie }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return { ctx: null };
    }

    const ctx: RequestContext = {
      userId: session.user.id,
      tenantId: session.user.currentRestaurantId || "",
      email: session.user.email,
      role: session.user.role || "member",
      permissions: [],
    };

    return { ctx };
  });
```

## Auth Guard

```typescript
// src/middleware/auth.ts
import { Elysia } from "elysia";
import { UnauthorizedException } from "../utils/http-exceptions";

export const authGuard = new Elysia({ name: "authGuard" })
  .onBeforeHandle(({ ctx }) => {
    if (!ctx) {
      throw new UnauthorizedException("Sesión no encontrada");
    }
    if (!ctx.tenantId) {
      throw new UnauthorizedException("Restaurante no seleccionado");
    }
  });
```

## Uso en Rutas

```typescript
// src/api/routes/items.ts
import { Elysia, t } from "elysia";
import { servicesPlugin } from "../../plugins/services";
import { contextPlugin } from "../../plugins/context";
import { authGuard } from "../../middleware/auth";

export const itemRoutes = new Elysia({ prefix: "/items" })
  // Plugins en orden
  .use(servicesPlugin)
  .use(contextPlugin)
  .use(authGuard)

  // Rutas - servicios disponibles via destructuring
  .get("/", async ({ itemService, ctx, query }) => {
    return itemService.getItems(ctx!, { search: query.search });
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
    }),
  })

  .get("/:id", async ({ itemService, ctx, params }) => {
    return itemService.getItem(ctx!, params.id);
  })

  .post("/", async ({ itemService, ctx, body, set }) => {
    const item = await itemService.createItem(ctx!, body);
    set.status = 201;
    return item;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      price: t.Number({ minimum: 0 }),
      description: t.Optional(t.String()),
    }),
  })

  .patch("/:id", async ({ itemService, ctx, params, body }) => {
    return itemService.updateItem(ctx!, params.id, body);
  }, {
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      price: t.Optional(t.Number({ minimum: 0 })),
      isActive: t.Optional(t.Boolean()),
    }),
  })

  .delete("/:id", async ({ itemService, ctx, params, set }) => {
    await itemService.deleteItem(ctx!, params.id);
    set.status = 204;
  });
```

## Agregando Rutas al App

```typescript
// src/api/index.ts
import { Elysia } from "elysia";
import { itemRoutes } from "./routes/items";
import { orderRoutes } from "./routes/orders";
import { userRoutes } from "./routes/users";

export const apiRoutes = new Elysia({ prefix: "/api/v1" })
  .use(itemRoutes)
  .use(orderRoutes)
  .use(userRoutes);

// src/index.ts
import { Elysia } from "elysia";
import { apiRoutes } from "./api";
import { errorPlugin } from "./middleware/error";

const app = new Elysia()
  .use(errorPlugin)
  .use(apiRoutes)
  .listen(3000);

console.log(`Server running at ${app.server?.url}`);
```

## Testing con Mocks

```typescript
// tests/unit/item.service.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemService } from "../../src/services/business/item.service";
import { ItemRepository } from "../../src/services/repository/item.repository";

describe("ItemService", () => {
  let service: ItemService;
  let mockRepository: Partial<ItemRepository>;
  const mockCtx = { userId: "user-1", tenantId: "tenant-1" };

  beforeEach(() => {
    // Mock del repository
    mockRepository = {
      findOne: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    // Inyectar mock
    service = new ItemService(mockRepository as ItemRepository);
  });

  it("should return item when found", async () => {
    const mockItem = { id: "item-1", name: "Test", tenantId: "tenant-1" };
    vi.mocked(mockRepository.findOne).mockResolvedValue(mockItem);

    const result = await service.getItem(mockCtx, "item-1");

    expect(result).toEqual(mockItem);
    expect(mockRepository.findOne).toHaveBeenCalledWith(mockCtx, "item-1");
  });
});
```

## Patrón Incorrecto

```typescript
// MAL - Creando instancias dentro del servicio
class OrderService {
  private itemRepository = new ItemRepository();  // NO hacer esto!
  private customerRepository = new CustomerRepository();  // NO!

  async createOrder() { ... }
}

// BIEN - Inyección por constructor
class OrderService {
  constructor(
    private itemRepository: ItemRepository,
    private customerRepository: CustomerRepository,
  ) {}

  async createOrder() { ... }
}
```

## Checklist

- [ ] Repositories no tienen dependencias (solo DB)
- [ ] Services reciben dependencias por constructor
- [ ] Plugin usa `.decorate()` en orden correcto
- [ ] Primero registrar los que no tienen deps
- [ ] Luego registrar los que sí tienen deps
- [ ] Rutas usan destructuring para acceder
- [ ] Tests pueden inyectar mocks fácilmente
