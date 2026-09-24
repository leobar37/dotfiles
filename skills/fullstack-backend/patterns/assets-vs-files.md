# Assets vs Files Management

## Overview

Two distinct file management patterns for different use cases:

| Aspect | **Assets** | **Files** |
|--------|-----------|-----------|
| **Purpose** | Shared gallery for reusable content | Private/entity-specific attachments |
| **Use Cases** | Product images, category photos, menu items | Logos, profile photos, payment vouchers |
| **Gallery UI** | Yes - browsable gallery | No - direct entity association |
| **Sharing** | Multiple entities can reference same asset | One-to-one with entity |
| **File Types** | Images (jpeg, png, webp, gif) + Videos (mp4, quicktime) | Images only (jpeg, png, webp) |
| **Max Size** | 5MB | 5MB |
| **Access** | Public URLs with auth | Public URLs with auth |
| **API Prefix** | `/api/v1/assets` | `/api/v1/files` |

## Key Principle: ID References (Not Relations)

Both patterns use **ID references** instead of database relations. This provides maximum flexibility:

```typescript
// ✅ CORRECT: Store ID, not foreign key relation
// products.ts
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  // Store asset ID directly - no relation constraint
  imageId: uuid("image_id").references(() => assets.id),
  // Multiple products CAN reference same asset
});

// categories.ts
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  // Same asset can be used for category AND product
  imageId: uuid("image_id").references(() => assets.id),
});

// restaurants.ts - files for private data
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  // Logo is specific to this restaurant - no gallery
  logoId: uuid("logo_id"), // Reference to files table
});
```

### Why IDs Instead of Relations?

1. **Flexibility**: Change image without affecting other entities
2. **Reusability**: Same asset across multiple products/categories
3. **Simpler Migrations**: No cascade constraints
4. **Soft Deletes**: References stay intact even after deletion
5. **Onboarding Support**: Files can be uploaded before entity exists

## Backend Implementation

### 1. Schema Definitions

```typescript
// db/schema/assets.ts
import { pgTable, uuid, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { user } from "./auth.schema";

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),

  // File metadata
  filename: varchar("filename", { length: 255 }).notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by").references(() => user.id),
});

// db/schema/files.ts
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Nullable for onboarding uploads (entity doesn't exist yet)
  orgId: uuid("org_id").references(() => organizations.id),

  filename: varchar("filename", { length: 255 }).notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by").references(() => user.id),
});
```

### 2. Storage Service

```typescript
// services/infrastructure/storage.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      },
    });
    this.bucket = process.env.STORAGE_BUCKET!;
  }

  /**
   * Upload asset to shared assets folder
   */
  async uploadAsset(orgId: string, file: File): Promise<string> {
    const key = `${orgId}/assets/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    }));

    return key;
  }

  /**
   * Upload file to private files folder
   * Supports onboarding (no orgId yet)
   */
  async uploadFile(orgId: string | "onboarding", file: File): Promise<string> {
    const key = `${orgId}/files/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
    
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    }));

    return key;
  }

  /**
   * Generate signed URL for file access
   */
  async getFileUrl(storagePath: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    });

    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  /**
   * Delete file from storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
    }));
  }
}
```

### 3. Repository Pattern

```typescript
// services/repository/asset.repository.ts
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import { assets, type NewAsset } from "../../db/schema/assets";
import type { RequestContext } from "../../context/request-context";

export class AssetRepository {
  async create(ctx: RequestContext, data: Omit<NewAsset, "orgId">): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values({
        ...data,
        orgId: ctx.orgId!,
      })
      .returning();
    
    return asset;
  }

  async findById(ctx: RequestContext, id: string): Promise<Asset | undefined> {
    return db.query.assets.findFirst({
      where: and(
        eq(assets.id, id),
        eq(assets.orgId, ctx.orgId!),
        isNull(assets.deletedAt)
      ),
    });
  }

  async findByIds(ctx: RequestContext, ids: string[]): Promise<Asset[]> {
    return db.query.assets.findMany({
      where: and(
        inArray(assets.id, ids),
        eq(assets.orgId, ctx.orgId!),
        isNull(assets.deletedAt)
      ),
    });
  }

  async findAll(ctx: RequestContext): Promise<Asset[]> {
    return db.query.assets.findMany({
      where: and(
        eq(assets.orgId, ctx.orgId!),
        isNull(assets.deletedAt)
      ),
      orderBy: (assets, { desc }) => [desc(assets.createdAt)],
    });
  }

  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    await db
      .update(assets)
      .set({
        deletedAt: new Date(),
        deletedBy: ctx.userId,
      })
      .where(and(eq(assets.id, id), eq(assets.orgId, ctx.orgId!)));
  }
}

// services/repository/file.repository.ts
// Same pattern as AssetRepository
export class FileRepository {
  // Identical CRUD operations for files table
  // Supports nullable orgId for onboarding
}
```

### 4. Business Service

```typescript
// services/business/asset.service.ts
import type { RequestContext } from "../../context/request-context";
import { AssetRepository } from "../repository/asset.repository";
import { StorageService } from "../infrastructure/storage.service";
import type { Asset } from "../../db/schema/assets";

export class AssetService {
  constructor(
    private repository: AssetRepository,
    private storageService: StorageService
  ) {}

  /**
   * Upload asset and create DB record
   */
  async upload(ctx: RequestContext, file: File): Promise<Asset> {
    this.validateFile(file);

    // Upload to storage
    const storagePath = await this.storageService.uploadAsset(
      ctx.orgId!,
      file
    );

    // Create DB record
    const asset = await this.repository.create(ctx, {
      filename: file.name,
      storagePath,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    return asset;
  }

  /**
   * Get asset with public URL
   */
  async getWithUrl(
    ctx: RequestContext,
    id: string
  ): Promise<{ asset: Asset; url: string }> {
    const asset = await this.repository.findById(ctx, id);
    if (!asset) {
      throw new Error("Asset not found");
    }

    const url = await this.storageService.getFileUrl(asset.storagePath);
    return { asset, url };
  }

  /**
   * Batch get assets with URLs (prevents N+1)
   */
  async getWithUrls(
    ctx: RequestContext,
    ids: string[]
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();

    const assets = await this.repository.findByIds(ctx, ids);
    const urlMap = new Map<string, string>();

    for (const asset of assets) {
      const url = await this.storageService.getFileUrl(asset.storagePath);
      urlMap.set(asset.id, url);
    }

    return urlMap;
  }

  /**
   * Soft delete asset
   */
  async delete(ctx: RequestContext, id: string): Promise<void> {
    const asset = await this.repository.findById(ctx, id);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Soft delete DB record
    await this.repository.softDelete(ctx, id);

    // Hard delete from storage (async, don't block)
    this.storageService.deleteFile(asset.storagePath).catch((err) => {
      console.error("Failed to delete from storage:", err);
    });
  }

  private validateFile(file: File): void {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (file.size > MAX_SIZE) {
      throw new Error("File exceeds 5MB limit");
    }

    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/quicktime",
    ];

    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type");
    }
  }
}
```

### 5. API Routes

```typescript
// api/assets.ts
import { Elysia, t } from "elysia";
import { servicesPlugin } from "../plugins/services";
import { authPlugin } from "../middleware/auth";
import { NotFoundException } from "../utils/http-exceptions";

export const assetRoutes = new Elysia({ prefix: "/assets" })
  .use(servicesPlugin)
  .use(authPlugin)

  /**
   * POST /assets/upload
   * Returns asset ID (frontend stores ID, not URL)
   */
  .post(
    "/upload",
    async ({ body, assetService, ctx }) => {
      const asset = await assetService.upload(ctx, body.file);

      return {
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        createdAt: asset.createdAt,
      };
    },
    {
      auth: true,
      body: t.Object({
        file: t.File({
          maxSize: 5 * 1024 * 1024,
          type: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
            "video/quicktime",
          ],
        }),
      }),
    }
  )

  /**
   * GET /assets
   * Returns all assets with URLs (for gallery)
   */
  .get(
    "/",
    async ({ assetService, ctx }) => {
      const assets = await assetService.getAll(ctx);

      // Attach URLs
      const assetsWithUrls = await Promise.all(
        assets.map(async (asset) => {
          const { url } = await assetService.getWithUrl(ctx, asset.id);
          return {
            id: asset.id,
            filename: asset.filename,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
            createdAt: asset.createdAt,
            url,
          };
        })
      );

      return assetsWithUrls;
    },
    { auth: true }
  )

  /**
   * GET /assets/:id
   * Returns single asset with URL
   */
  .get(
    "/:id",
    async ({ params, assetService, ctx }) => {
      const { asset, url } = await assetService.getWithUrl(ctx, params.id);

      if (!asset) {
        throw new NotFoundException("Asset not found");
      }

      return {
        id: asset.id,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        createdAt: asset.createdAt,
        url,
      };
    },
    {
      auth: true,
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    }
  )

  /**
   * DELETE /assets/:id
   * Soft delete DB, hard delete S3
   */
  .delete(
    "/:id",
    async ({ params, assetService, ctx }) => {
      await assetService.delete(ctx, params.id);
    },
    {
      auth: true,
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
    }
  );
```

## Usage Examples

### Using Assets (Shared Gallery)

```typescript
// 1. Entity stores asset ID
// schema/products.ts
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  imageId: uuid("image_id").references(() => assets.id), // Can be shared
});

// 2. Create product with asset
async function createProduct(ctx, data) {
  return db.insert(products).values({
    name: data.name,
    imageId: data.imageId, // ID from asset upload
  });
}

// 3. Fetch product with image URL
async function getProductWithImage(ctx, productId) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (product?.imageId) {
    const { url } = await assetService.getWithUrl(ctx, product.imageId);
    return { ...product, imageUrl: url };
  }

  return product;
}
```

### Using Files (Private Attachments)

```typescript
// 1. Entity stores file ID
// schema/organizations.ts
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  logoId: uuid("logo_id"), // Private logo
});

// 2. Upload logo during onboarding (no org yet)
async function uploadLogoDuringOnboarding(ctx, file) {
  // Pass 'onboarding' as orgId
  return fileService.upload({ ...ctx, orgId: "onboarding" }, file);
}

// 3. Update org with logo after creation
async function updateOrgLogo(ctx, orgId, logoId) {
  await db.update(organizations)
    .set({ logoId })
    .where(eq(organizations.id, orgId));
}

// 4. Fetch organization with logo
async function getOrgWithLogo(ctx, orgId) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (org?.logoId) {
    const { url } = await fileService.getWithUrl(ctx, org.logoId);
    return { ...org, logoUrl: url };
  }

  return org;
}
```

## Decision Matrix

| If you need... | Use |
|----------------|-----|
| Gallery picker UI | **Assets** |
| Same image in multiple places | **Assets** |
| Product/category/menu images | **Assets** |
| Videos in gallery | **Assets** |
| Logo for single entity | **Files** |
| User profile photo | **Files** |
| Payment receipt/voucher | **Files** |
| Document attachment | **Files** |
| Upload before entity exists | **Files** (onboarding) |

## Key Principles

1. **Always store IDs, not URLs** - Backend generates URLs on-demand
2. **Soft delete DB, hard delete storage** - References stay intact
3. **Validate on upload** - File type, size limits
4. **Batch URL generation** - Prevents N+1 when loading many images
5. **Multi-tenancy** - Always filter by orgId
6. **Onboarding support** - Files support null orgId temporarily
