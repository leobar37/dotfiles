# Service Layer Pattern

Bun/Elysia-oriented examples for the canonical repository/service pattern owned by `fullstack-backend/patterns/02-layered-architecture.md`. Keep this file focused on stack-specific translation, not competing ownership.

## Arquitectura

```
Route Handler
     ↓
Business Service (lógica)
     ↓
Repository (acceso a datos)
     ↓
Database (Drizzle)
```

## RequestContext

```typescript
// src/types/context.ts
export interface RequestContext {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}
```

**REGLA:** Todos los métodos de repository y service reciben `ctx` como primer parámetro.

## Repository Layer

El repository SOLO hace acceso a datos. No tiene lógica de negocio.

```typescript
// src/services/repository/item.repository.ts
import { db } from "../../db";
import { items, type NewItem } from "../../db/schema";
import { eq, and, desc, like, sql } from "drizzle-orm";
import type { RequestContext } from "../../types/context";

export class ItemRepository {
  // SIEMPRE filtrar por tenantId
  async findMany(ctx: RequestContext, filters?: { search?: string; isActive?: boolean }) {
    return db.query.items.findMany({
      where: and(
        eq(items.tenantId, ctx.tenantId),
        filters?.search ? like(items.name, `%${filters.search}%`) : undefined,
        filters?.isActive !== undefined ? eq(items.isActive, filters.isActive) : undefined,
      ),
      orderBy: [desc(items.createdAt)],
    });
  }

  async findOne(ctx: RequestContext, id: string) {
    return db.query.items.findFirst({
      where: and(
        eq(items.id, id),
        eq(items.tenantId, ctx.tenantId),
      ),
    });
  }

  async findByIds(ctx: RequestContext, ids: string[]) {
    if (ids.length === 0) return [];
    return db.query.items.findMany({
      where: and(
        sql`${items.id} = ANY(${ids})`,
        eq(items.tenantId, ctx.tenantId),
      ),
    });
  }

  async create(ctx: RequestContext, data: Omit<NewItem, "id" | "tenantId" | "createdAt" | "updatedAt">) {
    const [item] = await db.insert(items)
      .values({
        ...data,
        tenantId: ctx.tenantId,
      })
      .returning();
    return item;
  }

  async update(ctx: RequestContext, id: string, data: Partial<NewItem>) {
    const [item] = await db.update(items)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(items.id, id),
        eq(items.tenantId, ctx.tenantId),
      ))
      .returning();
    return item;
  }

  async delete(ctx: RequestContext, id: string) {
    await db.delete(items)
      .where(and(
        eq(items.id, id),
        eq(items.tenantId, ctx.tenantId),
      ));
  }

  async count(ctx: RequestContext, filters?: { isActive?: boolean }) {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(
        eq(items.tenantId, ctx.tenantId),
        filters?.isActive !== undefined ? eq(items.isActive, filters.isActive) : undefined,
      ));
    return result[0]?.count ?? 0;
  }
}
```

## Business Service Layer

El service contiene lógica de negocio, validaciones, y orquestación.

```typescript
// src/services/business/item.service.ts
import { ItemRepository } from "../repository/item.repository";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "../../utils/http-exceptions";
import type { RequestContext } from "../../types/context";

interface CreateItemDto {
  name: string;
  price: number;
  description?: string;
}

interface UpdateItemDto {
  name?: string;
  price?: number;
  description?: string;
  isActive?: boolean;
}

export class ItemService {
  // Constructor injection - NUNCA usar 'new' dentro
  constructor(private repository: ItemRepository) {}

  async getItems(ctx: RequestContext, filters?: { search?: string }) {
    return this.repository.findMany(ctx, filters);
  }

  async getItem(ctx: RequestContext, id: string) {
    const item = await this.repository.findOne(ctx, id);

    if (!item) {
      throw new NotFoundException("Item no encontrado");
    }

    return item;
  }

  async createItem(ctx: RequestContext, data: CreateItemDto) {
    // Validación de negocio
    if (data.price < 0) {
      throw new BadRequestException("El precio no puede ser negativo");
    }

    // Verificar duplicados (ejemplo)
    const existing = await this.repository.findMany(ctx, { search: data.name });
    if (existing.some(item => item.name.toLowerCase() === data.name.toLowerCase())) {
      throw new ConflictException("Ya existe un item con ese nombre");
    }

    return this.repository.create(ctx, data);
  }

  async updateItem(ctx: RequestContext, id: string, data: UpdateItemDto) {
    // Verificar que existe
    await this.getItem(ctx, id);

    // Validación de negocio
    if (data.price !== undefined && data.price < 0) {
      throw new BadRequestException("El precio no puede ser negativo");
    }

    return this.repository.update(ctx, id, data);
  }

  async deleteItem(ctx: RequestContext, id: string) {
    // Verificar que existe
    await this.getItem(ctx, id);

    // Lógica adicional (ej: verificar no tiene dependencias)
    // ...

    await this.repository.delete(ctx, id);
  }

  async toggleActive(ctx: RequestContext, id: string) {
    const item = await this.getItem(ctx, id);
    return this.repository.update(ctx, id, { isActive: !item.isActive });
  }
}
```

## Service con Múltiples Dependencias

```typescript
// src/services/business/order.service.ts
import { OrderRepository } from "../repository/order.repository";
import { ItemRepository } from "../repository/item.repository";
import { CustomerRepository } from "../repository/customer.repository";
import { emailQueue } from "../../jobs/queues/email.queue";

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private itemRepository: ItemRepository,
    private customerRepository: CustomerRepository,
  ) {}

  async createOrder(ctx: RequestContext, data: CreateOrderDto) {
    // Validar items existen
    const items = await this.itemRepository.findByIds(ctx, data.itemIds);
    if (items.length !== data.itemIds.length) {
      throw new BadRequestException("Algunos items no existen");
    }

    // Validar cliente si se especifica
    if (data.customerId) {
      const customer = await this.customerRepository.findOne(ctx, data.customerId);
      if (!customer) {
        throw new NotFoundException("Cliente no encontrado");
      }
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + item.price, 0);

    // Crear orden
    const order = await this.orderRepository.create(ctx, {
      customerId: data.customerId,
      total,
      items: data.itemIds,
    });

    // Encolar email de confirmación
    await emailQueue.add("confirmation", {
      type: "ORDER_CONFIRMATION",
      orderId: order.id,
    });

    return order;
  }
}
```

## Pagination Pattern

```typescript
// types/pagination.ts
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// En repository
async findManyPaginated(
  ctx: RequestContext,
  filters?: ItemFilters,
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Item>> {
  const page = pagination.page || 1;
  const pageSize = Math.min(pagination.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;

  const [items, countResult] = await Promise.all([
    db.query.items.findMany({
      where: and(
        eq(items.tenantId, ctx.tenantId),
        // ...filters
      ),
      limit: pageSize,
      offset,
      orderBy: [desc(items.createdAt)],
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(items)
      .where(and(
        eq(items.tenantId, ctx.tenantId),
        // ...filters
      )),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasMore: page < totalPages,
  };
}
```

## Checklist

### Repository
- [ ] Todos los métodos reciben `ctx: RequestContext`
- [ ] SIEMPRE filtrar por `ctx.tenantId`
- [ ] Usa `and()` para múltiples condiciones
- [ ] No tiene lógica de negocio
- [ ] Retorna datos crudos

### Service
- [ ] Constructor injection
- [ ] Valida reglas de negocio
- [ ] Lanza HttpException apropiadas
- [ ] Verifica existencia antes de update/delete
- [ ] Orquesta múltiples repositories si necesario
