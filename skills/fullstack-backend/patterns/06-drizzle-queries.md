# Drizzle Queries

Canonical shared Drizzle query patterns for the backend core. Core examples use `tenantId` consistently for multi-tenant scoping.

## Import Operators

```typescript
import {
  eq,           // Equal
  and,          // AND
  or,           // OR
  isNull,       // IS NULL
  isNotNull,    // IS NOT NULL
  inArray,      // IN (array)
  notInArray,   // NOT IN
  gt, gte,      // Greater than
  lt, lte,      // Less than
  like, ilike,  // Pattern matching
  desc, asc,    // Ordering
  sql,          // Raw SQL
} from "drizzle-orm";
```

## Select Queries

### Find First

```typescript
// Find by ID
const item = await db.query.items.findFirst({
  where: eq(items.id, id),
});

// With multi-tenancy
const item = await db.query.items.findFirst({
  where: and(
    eq(items.id, id),
    eq(items.tenantId, ctx.tenantId),
    isNull(items.deletedAt)
  ),
});

// With relations
const item = await db.query.items.findFirst({
  where: eq(items.id, id),
  with: {
    category: true,
    images: true,
  },
});
```

### Find Many

```typescript
// All items for organization
const allItems = await db.query.items.findMany({
  where: and(
    eq(items.tenantId, ctx.tenantId),
    isNull(items.deletedAt)
  ),
  orderBy: [desc(items.createdAt)],
  limit: 100,
});

// With filters
const filtered = await db.query.items.findMany({
  where: and(
    eq(items.tenantId, ctx.tenantId),
    eq(items.categoryId, categoryId),
    eq(items.available, true),
    isNull(items.deletedAt)
  ),
  orderBy: [items.name],
});
```

### Search

```typescript
// ILIKE search
const searchPattern = `%${query}%`;

const results = await db.query.items.findMany({
  where: and(
    eq(items.tenantId, ctx.tenantId),
    isNull(items.deletedAt),
    or(
      sql`${items.name} ILIKE ${searchPattern}`,
      sql`${items.description} ILIKE ${searchPattern}`
    )
  ),
  limit: 50,
});
```

## Insert Queries

### Single Insert

```typescript
const [newItem] = await db
  .insert(items)
  .values({
    tenantId: ctx.tenantId,
    name: data.name,
    price: data.price,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .returning();
```

### Bulk Insert

```typescript
await db.insert(orderItems).values(
  items.map((item) => ({
    orderId: order.id,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
  }))
);
```

## Update Queries

### Single Update

```typescript
const [updated] = await db
  .update(items)
  .set({
    name: data.name,
    price: data.price,
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(items.id, id),
      eq(items.tenantId, ctx.tenantId),
      isNull(items.deletedAt)
    )
  )
  .returning();
```

### Bulk Update

```typescript
await db
  .update(items)
  .set({
    available: false,
    updatedAt: new Date(),
  })
  .where(
    and(
      inArray(items.id, ids),
      eq(items.tenantId, ctx.tenantId)
    )
  );
```

## Delete Queries

### Soft Delete (Preferred)

```typescript
await db
  .update(items)
  .set({
    deletedAt: new Date(),
    deletedBy: ctx.userId,
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(items.id, id),
      eq(items.tenantId, ctx.tenantId)
    )
  );
```

### Hard Delete

```typescript
await db
  .delete(items)
  .where(eq(items.id, id));
```

## Transactions

```typescript
await db.transaction(async (tx) => {
  // Create order
  const [order] = await tx
    .insert(orders)
    .values({ tenantId: ctx.tenantId, total: 0 })
    .returning();

  // Create order items
  await tx.insert(orderItems).values(
    items.map((item) => ({
      orderId: order.id,
      productId: item.id,
      quantity: item.quantity,
      price: item.price,
    }))
  );

  // Update order total
  await tx
    .update(orders)
    .set({ total: calculateTotal(items) })
    .where(eq(orders.id, order.id));

  return order;
});
```

## Aggregations

```typescript
import { count, sum, avg } from "drizzle-orm";

// Count
const [{ count: total }] = await db
  .select({ count: count() })
  .from(items)
  .where(eq(items.tenantId, ctx.tenantId));

// Sum
const [{ total }] = await db
  .select({ total: sum(orders.total) })
  .from(orders)
  .where(
    and(
      eq(orders.tenantId, ctx.tenantId),
      gte(orders.createdAt, startDate)
    )
  );

// Group by with aggregates
const byStatus = await db
  .select({
    status: orders.status,
    count: count(),
    total: sum(orders.total),
  })
  .from(orders)
  .where(eq(orders.tenantId, ctx.tenantId))
  .groupBy(orders.status);
```

## Raw SQL

```typescript
// For complex queries
const result = await db.execute(
  sql`SELECT * FROM items 
      WHERE org_id = ${ctx.tenantId} 
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100`
);

// Mixed
const result = await db
  .select()
  .from(items)
  .where(
    sql`${items.name} ILIKE ${searchPattern}`
  );
```
