# File Upload Patterns (FILES vs ASSETS)

Patrones para manejo de archivos con Supabase S3.

## Diferencia: FILES vs ASSETS

| Aspecto | FILES | ASSETS |
|---------|-------|--------|
| **Propósito** | Archivos específicos (logos, perfiles) | Galería compartida (imágenes de productos) |
| **tenantId** | Nullable (onboarding) | Requerido |
| **Tipos** | Solo imágenes | Imágenes + videos |
| **S3 Path** | `/{tenantId}/files/` | `/{tenantId}/assets/` |
| **Reusabilidad** | Un solo uso | Reutilizable entre entidades |

## Schema

```typescript
// src/db/schema/files.ts
import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

// FILES - Attachments específicos
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  tenantId: uuid("tenant_id"),  // Nullable para onboarding
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

// ASSETS - Galería compartida
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  tenantId: uuid("tenant_id").notNull(),  // Requerido!
  category: varchar("category", { length: 50 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
```

## Storage Service (Supabase)

```typescript
// src/services/storage/storage.service.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface UploadResult {
  storagePath: string;
  size: number;
  mimeType: string;
}

export class StorageService {
  private supabase: SupabaseClient;
  private BUCKET = "app-assets";

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  async uploadFile(
    tenantId: string | null,
    file: File,
    type: "file" | "asset" = "file",
  ): Promise<UploadResult> {
    // Validar archivo
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error("Archivo demasiado grande (máx 10MB)");
    }

    // Extraer extensión de forma segura
    const nameParts = file.name.split(".");
    const ext = nameParts.length > 1 ? nameParts.pop() : "bin";

    // Generar path
    const folder = type === "asset" ? "assets" : "files";
    const uuid = crypto.randomUUID();
    const path = tenantId
      ? `${tenantId}/${folder}/${uuid}.${ext}`
      : `temp/${folder}/${uuid}.${ext}`;

    // Subir a Supabase
    const { error } = await this.supabase.storage
      .from(this.BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw new Error("Error al subir archivo");
    }

    return {
      storagePath: path,
      size: file.size,
      mimeType: file.type,
    };
  }

  async getPublicUrl(storagePath: string): Promise<string> {
    const { data } = this.supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  }

  async deleteFile(storagePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error("Delete error:", error);
      throw new Error("Error al eliminar archivo");
    }
  }

  async moveFromTemp(tempPath: string, tenantId: string): Promise<string> {
    // Mover archivo de temp/ a tenant/
    const newPath = tempPath.replace("temp/", `${tenantId}/`);

    const { error } = await this.supabase.storage
      .from(this.BUCKET)
      .move(tempPath, newPath);

    if (error) throw error;
    return newPath;
  }
}
```

## File Upload Route

```typescript
// src/api/routes/files.ts
import { Elysia, t } from "elysia";
import { servicesPlugin } from "../../plugins/services";
import { contextPlugin } from "../../plugins/context";

export const fileRoutes = new Elysia({ prefix: "/files" })
  .use(servicesPlugin)
  .use(contextPlugin)

  // Upload file (puede ser sin auth para onboarding)
  .post("/upload", async ({ body, storageService, fileRepository, ctx, set }) => {
    const { storagePath, size, mimeType } = await storageService.uploadFile(
      ctx?.tenantId ?? null,
      body.file,
      "file",
    );

    const file = await fileRepository.create({
      storagePath,
      filename: body.file.name,
      mimeType,
      size,
      tenantId: ctx?.tenantId ?? null,
      uploadedBy: ctx?.userId ?? null,
    });

    set.status = 201;
    return {
      id: file.id,
      filename: file.filename,
      url: await storageService.getPublicUrl(storagePath),
    };
  }, {
    body: t.Object({
      file: t.File({
        maxSize: "10m",
        types: ["image/jpeg", "image/png", "image/webp"],
      }),
    }),
  })

  // Get file URL by ID
  .get("/:id/url", async ({ params, fileRepository, storageService, ctx }) => {
    const file = await fileRepository.findOne(ctx?.tenantId, params.id);
    if (!file) throw new NotFoundException("Archivo no encontrado");

    return {
      url: await storageService.getPublicUrl(file.storagePath),
    };
  });
```

## Asset Upload Route

```typescript
// src/api/routes/assets.ts
import { Elysia, t } from "elysia";
import { servicesPlugin } from "../../plugins/services";
import { contextPlugin } from "../../plugins/context";
import { authGuard } from "../../middleware/auth";

export const assetRoutes = new Elysia({ prefix: "/assets" })
  .use(servicesPlugin)
  .use(contextPlugin)
  .use(authGuard)  // Assets requieren auth

  // Upload asset
  .post("/upload", async ({ body, storageService, assetRepository, ctx, set }) => {
    const { storagePath, size, mimeType } = await storageService.uploadFile(
      ctx!.tenantId,
      body.file,
      "asset",
    );

    const asset = await assetRepository.create(ctx!, {
      storagePath,
      filename: body.file.name,
      mimeType,
      size,
      category: body.category,
      uploadedBy: ctx!.userId,
    });

    set.status = 201;
    return {
      id: asset.id,
      filename: asset.filename,
      url: await storageService.getPublicUrl(storagePath),
    };
  }, {
    body: t.Object({
      file: t.File({
        maxSize: "10m",
        types: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
      }),
      category: t.Optional(t.String()),
    }),
  })

  // List assets (gallery)
  .get("/", async ({ assetRepository, storageService, ctx, query }) => {
    const assets = await assetRepository.findMany(ctx!, {
      category: query.category,
    });

    // Resolver URLs
    return Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        url: await storageService.getPublicUrl(asset.storagePath),
      }))
    );
  }, {
    query: t.Object({
      category: t.Optional(t.String()),
    }),
  });
```

## Usando en Entidades (Almacenar ID, NO URL)

```typescript
// Schema - Almacenar solo el ID
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  imageId: uuid("image_id").references(() => assets.id),  // ID, no URL!
  tenantId: uuid("tenant_id").notNull(),
});

// Service - Resolver URL al consultar
class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private assetRepository: AssetRepository,
    private storageService: StorageService,
  ) {}

  async getProduct(ctx: RequestContext, id: string) {
    const product = await this.productRepository.findOne(ctx, id);
    if (!product) throw new NotFoundException("Producto no encontrado");

    // Resolver imagen si existe
    let imageUrl: string | null = null;
    if (product.imageId) {
      const asset = await this.assetRepository.findById(product.imageId);
      if (asset) {
        imageUrl = await this.storageService.getPublicUrl(asset.storagePath);
      }
    }

    return {
      ...product,
      imageUrl,
    };
  }

  async updateProductImage(ctx: RequestContext, id: string, assetId: string) {
    // Verificar que el asset existe y pertenece al tenant
    const asset = await this.assetRepository.findOne(ctx, assetId);
    if (!asset) {
      throw new NotFoundException("Asset no encontrado");
    }

    return this.productRepository.update(ctx, id, { imageId: assetId });
  }
}
```

## Checklist

- [ ] FILES: `tenantId` nullable (onboarding)
- [ ] ASSETS: `tenantId` required
- [ ] Almacenar `storagePath`, no URL
- [ ] Resolver URL on-demand con `getPublicUrl`
- [ ] Validar tipo y tamaño de archivo
- [ ] Manejar extensión faltante
- [ ] En entidades: almacenar `assetId`, no URL
