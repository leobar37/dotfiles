# Drizzle ORM Patterns

Bun/Elysia stack-specific Drizzle notes. Canonical shared Drizzle ownership lives in `fullstack-backend/patterns/05-drizzle-schema.md`, `06-drizzle-queries.md`, and `07-drizzle-relations.md`.

## Imports Base

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  unique,
  index,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
```

## Schema Básico

```typescript
// src/db/schema/items.ts
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  tenantId: uuid("tenant_id").notNull(),  // Multi-tenant!
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type inference - SIEMPRE usar la variable de tabla correcta
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

## Foreign Keys

```typescript
import { users } from "./users";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  total: integer("total").notNull(),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Self-Referencing FK (Jerarquías)

```typescript
// Categorías con relación padre-hijo
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  // Self-reference requiere AnyPgColumn type cast
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  tenantId: uuid("tenant_id").notNull(),
});
```

## Constraints (Callback Syntax)

```typescript
export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  role: varchar("role", { length: 50 }).notNull(),
}, (t) => [
  // Unique constraint
  unique("unique_user_org").on(t.userId, t.organizationId),
  // Index
  index("idx_org_id").on(t.organizationId),
]);
```

## Enums

```typescript
// Definir enum fuera de la tabla
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: orderStatusEnum("status").notNull().default("pending"),
  // ...
});
```

## Relations (Para Query Builder)

```typescript
// src/db/schema/relations.ts
import { relations } from "drizzle-orm";
import { users, orders, orderItems, products } from "./index";

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
```

## Timestamps Pattern

```typescript
// Campos comunes para auditoría
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
};

// Uso
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  ...timestamps,
});
```

## Soft Delete Pattern

```typescript
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by"),
});

// En repository, filtrar por isDeleted
async findMany(ctx: RequestContext) {
  return db.query.items.findMany({
    where: and(
      eq(items.tenantId, ctx.tenantId),
      eq(items.isDeleted, false),  // Excluir borrados
    ),
  });
}
```

## Queries con Drizzle

### findFirst / findMany

```typescript
// Query simple
const item = await db.query.items.findFirst({
  where: and(
    eq(items.id, id),
    eq(items.tenantId, ctx.tenantId),
  ),
});

// Con relations
const order = await db.query.orders.findFirst({
  where: eq(orders.id, orderId),
  with: {
    user: true,
    items: {
      with: {
        product: true,
      },
    },
  },
});
```

### Insert

```typescript
const [newItem] = await db.insert(items)
  .values({
    name: data.name,
    price: data.price,
    tenantId: ctx.tenantId,
  })
  .returning();
```

### Update

```typescript
const [updated] = await db.update(items)
  .set({
    name: data.name,
    updatedAt: new Date(),
  })
  .where(and(
    eq(items.id, id),
    eq(items.tenantId, ctx.tenantId),
  ))
  .returning();
```

### Delete

```typescript
await db.delete(items)
  .where(and(
    eq(items.id, id),
    eq(items.tenantId, ctx.tenantId),
  ));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  // Crear orden
  const [order] = await tx.insert(orders)
    .values({ userId: ctx.userId, total: 0 })
    .returning();

  // Crear items
  await tx.insert(orderItems)
    .values(items.map(item => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
    })));

  // Actualizar total
  await tx.update(orders)
    .set({ total: calculatedTotal })
    .where(eq(orders.id, order.id));

  return order;
});
```

## Checklist

- [ ] `tenantId` en todas las tablas (multi-tenant)
- [ ] Self-refs usan `(): AnyPgColumn =>`
- [ ] Constraints en callback `(t) => [...]`
- [ ] Types exportados con `$inferSelect` / `$inferInsert`
- [ ] Enums definidos con `pgEnum`
- [ ] Relations definidas para query builder
- [ ] Timestamps en tablas que lo necesiten
