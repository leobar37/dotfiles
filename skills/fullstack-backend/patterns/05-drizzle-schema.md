# Drizzle Schema

Canonical shared Drizzle schema guidance for the backend core. Use abstract `tenantId` in core examples; domain-specific names belong in extension-level translations only.

## Setup

```typescript
// db/index.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
```

## Basic Table Definition

```typescript
// db/schema/items.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const items = pgTable("items", {
  // Primary key
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Multi-tenancy
  tenantId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  
  // Basic fields
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  
  // Status
  available: boolean("available").notNull().default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  deletedBy: uuid("deleted_by"),
});

// Type exports
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
```

## Enums

```typescript
// db/schema/orders.ts
import { pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("org_id").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

## Constraints & Indexes

```typescript
// db/schema/users.ts
import { uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("org_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    // Unique constraint: email per organization
    uniqueIndex("idx_user_email_org").on(table.email, table.tenantId),
    
    // Index for common queries
    index("idx_user_org").on(table.tenantId),
    index("idx_user_created").on(table.createdAt),
  ]
);
```

## JSON Columns

```typescript
// db/schema/organizations.ts
import { jsonb } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // JSONB for flexible data
  settings: jsonb("settings").$type<{
    timezone: string;
    currency: string;
    language: string;
    features: string[];
  }>(),
  
  // Business hours
  businessHours: jsonb("business_hours").$type<{
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  }>(),
});
```

## Foreign Keys

```typescript
// db/schema/order-items.ts
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Foreign key with cascade
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  
  // Foreign key without cascade
  productId: uuid("product_id")
    .notNull()
    .references(() => items.id),
  
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});
```

## Self-Referencing (Tree Structure)

```typescript
// db/schema/categories.ts
import { type AnyPgColumn } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("org_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Parent category (self-reference)
  parentId: uuid("parent_id").references((): AnyPgColumn => categories.id),
  
  sortOrder: integer("sort_order").notNull().default(0),
});
```

## Migrations

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```bash
# Generate migration
bun run drizzle-kit generate

# Apply migration
bun run drizzle-kit migrate

# Push changes (dev only)
bun run drizzle-kit push

# Studio GUI
bun run drizzle-kit studio
```

## Schema Checklist

- [ ] Primary key with `defaultRandom()`
- [ ] `tenantId` for multi-tenancy
- [ ] `createdAt` with `defaultNow()`
- [ ] `updatedAt` (update in application)
- [ ] `deletedAt` for soft delete
- [ ] Foreign keys with proper `onDelete`
- [ ] Indexes for query performance
- [ ] Type exports: `$inferSelect`, `$inferInsert`
