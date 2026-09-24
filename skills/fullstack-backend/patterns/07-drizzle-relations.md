# Drizzle Relations

Canonical shared relation patterns for the backend core. Core relation examples should follow the same `tenantId` naming used by the rest of the backend core.

## Defining Relations

```typescript
// Import relations helper
import { relations } from "drizzle-orm";
```

## One-to-Many

```typescript
// db/schema/categories.ts
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("org_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  items: many(items),  // Category has many items
}));

// db/schema/items.ts
export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("org_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
});

export const itemsRelations = relations(items, ({ one }) => ({
  category: one(categories, {
    fields: [items.categoryId],
    references: [categories.id],
  }),
}));
```

## Many-to-Many (Junction Table)

```typescript
// db/schema/tags.ts
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("org_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
});

// db/schema/item-tags.ts (junction table)
export const itemTags = pgTable("item_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("idx_item_tag_unique").on(table.itemId, table.tagId),
]);

// Relations
export const itemsRelations = relations(items, ({ many }) => ({
  tags: many(itemTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  items: many(itemTags),
}));

export const itemTagsRelations = relations(itemTags, ({ one }) => ({
  item: one(items, {
    fields: [itemTags.itemId],
    references: [items.id],
  }),
  tag: one(tags, {
    fields: [itemTags.tagId],
    references: [tags.id],
  }),
}));
```

## One-to-One

```typescript
// db/schema/users.ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
});

// db/schema/profiles.ts
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),  // Enforces one-to-one
  bio: text("bio"),
});

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));
```

## Querying with Relations

### Eager Loading

```typescript
// Load item with category
const item = await db.query.items.findFirst({
  where: eq(items.id, id),
  with: {
    category: true,
  },
});

// Result: item.category is populated
```

### Nested Relations

```typescript
// Load category with all items
const category = await db.query.categories.findFirst({
  where: eq(categories.id, id),
  with: {
    items: true,
  },
});

// Result: category.items is an array
```

### Deep Nesting

```typescript
// Load order with items and their products
const order = await db.query.orders.findFirst({
  where: eq(orders.id, id),
  with: {
    items: {
      with: {
        product: {
          with: {
            category: true,
          },
        },
      },
    },
    customer: true,
  },
});

// Result: order.items[0].product.category.name
```

### Many-to-Many Query

```typescript
// Load item with tags
const item = await db.query.items.findFirst({
  where: eq(items.id, id),
  with: {
    tags: {
      with: {
        tag: true,  // Through junction table
      },
    },
  },
});

// Flatten tags
const tags = item.tags.map((t) => t.tag);
```

### Selective Columns

```typescript
const items = await db.query.items.findMany({
  where: eq(items.tenantId, ctx.tenantId),
  with: {
    category: {
      columns: {
        name: true,  // Only select name
      },
    },
  },
});
```

## Repository Pattern with Relations

```typescript
export class ItemRepository {
  async findOne(ctx: RequestContext, id: string) {
    return db.query.items.findFirst({
      where: and(
        eq(items.id, id),
        eq(items.tenantId, ctx.tenantId),
        isNull(items.deletedAt)
      ),
      with: {
        category: true,
        tags: {
          with: { tag: true },
        },
      },
    });
  }

  async findAll(ctx: RequestContext) {
    return db.query.items.findMany({
      where: and(
        eq(items.tenantId, ctx.tenantId),
        isNull(items.deletedAt)
      ),
      with: {
        category: {
          columns: { name: true },
        },
      },
      orderBy: [items.name],
    });
  }
}
```
