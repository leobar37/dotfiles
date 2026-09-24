# Payload E-commerce

Payload CMS setup for products, orders, and media management.

## Collections

### Products (`src/collections/Products.ts`)

```typescript
import type { CollectionConfig } from "payload";

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    group: "E-commerce",
    defaultColumns: ["title", "category", "price", "inStock"],
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true },
    { name: "description", type: "textarea" },
    { name: "price", type: "number", required: true },
    { name: "currency", type: "text", defaultValue: "PEN" },
    { name: "category", type: "select", options: [
      { label: "Instrumental", value: "instrumental" },
      { label: "Equipment", value: "equipment" },
      { label: "Consumables", value: "consumables" },
      { label: "Supplements", value: "supplements" },
    ]},
    { name: "inStock", type: "checkbox", defaultValue: true },
    { name: "image", type: "upload", relationTo: "media" },
  ],
};
```

### Orders (`src/collections/Orders.ts`)

```typescript
import type { CollectionConfig } from "payload";

export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    defaultColumns: ["customerName", "status", "total", "createdAt"],
  },
  fields: [
    {
      name: "items",
      type: "array",
      fields: [
        { name: "product", type: "relationship", relationTo: "products" },
        { name: "quantity", type: "number" },
        { name: "price", type: "number" },
      ],
    },
    { name: "total", type: "number" },
    { name: "status", type: "select", options: [
      { label: "Pending", value: "pending" },
      { label: "Confirmed", value: "confirmed" },
      { label: "Shipped", value: "shipped" },
      { label: "Delivered", value: "delivered" },
    ], defaultValue: "pending" },
    { name: "customerName", type: "text" },
    { name: "customerEmail", type: "email" },
    { name: "customerPhone", type: "text" },
    { name: "shippingAddress", type: "textarea" },
  ],
};
```

### Media (`src/collections/Media.ts`)

```typescript
import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  upload: {
    staticDir: "public/media",
    imageSizes: [
      { name: "thumbnail", width: 400, height: 300 },
      { name: "card", width: 768, height: 512 },
    ],
    adminThumbnail: "thumbnail",
  },
  fields: [
    { name: "alt", type: "text" },
  ],
};
```

## Payload Config (`src/payload.config.ts`)

```typescript
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";

export default buildConfig({
  admin: {
    user: "users",
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL}?sslmode=verify-full`
        : "",
    },
  }),
  editor: lexicalEditor({}),
  collections: [Users, Media, Products, Orders],
  globals: [Header, Footer],
  plugins: [
    vercelBlobStorage({
      collections: { media: true },
      token: process.env.YURI_READ_WRITE_TOKEN,
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || "",
});
```

## Queries (`src/lib/payload/queries.ts`)

```typescript
import type { Product, Order } from "@/payload-types";
import { getPayload } from "payload";
import configPromise from "@payload-config";

export async function getPayloadClient() {
  return getPayload({ config: configPromise });
}

export async function getProducts(options?: {
  category?: string;
  limit?: number;
}): Promise<{ docs: Product[]; totalDocs: number }> {
  const payload = await getPayloadClient();
  return payload.find({
    collection: "products",
    where: options?.category
      ? { category: { equals: options.category } }
      : undefined,
    limit: options?.limit ?? 50,
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "products",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  return result.docs[0] ?? null;
}

export async function createOrder(data: {
  items: Array<{ product: string | { id: string }; quantity: number; price: number }>;
  total: number;
  customerInfo?: { name: string; email: string; phone: string; address?: string };
}): Promise<Order> {
  const payload = await getPayloadClient();
  return payload.create({
    collection: "orders",
    data: {
      items: data.items.map(item => ({
        product: typeof item.product === "string" ? item.product : item.product.id,
        quantity: item.quantity,
        price: item.price,
      })),
      total: data.total,
      status: "pending",
      customerName: data.customerInfo?.name ?? "",
      customerEmail: data.customerInfo?.email,
      customerPhone: data.customerInfo?.phone,
      shippingAddress: data.customerInfo?.address,
    },
  });
}
```

## Path Aliases

```json
{
  "@/*": ["./src/*"],
  "@payload-config": ["./src/payload.config.ts"],
  "@/payload-types": ["./src/payload-types.ts"]
}
```

## Environment Variables

```env
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=your-secret
YURI_READ_WRITE_TOKEN=vercel-blob-token
```
