# Response Patterns

Bun/Elysia route-response examples that extend the canonical API response guidance in `fullstack-backend/patterns/api-responses.md`. Shared response semantics ownership belongs to `fullstack-backend`.

## GET - Obtener Recurso

```typescript
// Retorna data directamente, lanza excepción si no existe
.get("/:id", async ({ itemService, ctx, params }) => {
  return itemService.getItem(ctx!, params.id);
  // Service lanza NotFoundException si no existe
})
```

## GET - Lista

```typescript
// Retorna array (puede ser vacío)
.get("/", async ({ itemService, ctx, query }) => {
  return itemService.getItems(ctx!, {
    search: query.search,
    page: query.page,
  });
})
```

## POST - Crear

```typescript
// Status 201, retorna recurso creado
.post("/", async ({ itemService, ctx, body, set }) => {
  const item = await itemService.createItem(ctx!, body);
  set.status = 201;  // Created
  return item;
}, {
  body: t.Object({
    name: t.String({ minLength: 1 }),
    price: t.Number({ minimum: 0 }),
  }),
})
```

## PATCH - Actualizar Parcial

```typescript
// Retorna recurso actualizado
.patch("/:id", async ({ itemService, ctx, params, body }) => {
  return itemService.updateItem(ctx!, params.id, body);
}, {
  body: t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
    price: t.Optional(t.Number({ minimum: 0 })),
    isActive: t.Optional(t.Boolean()),
  }),
})
```

## PUT - Reemplazar

```typescript
// Retorna recurso reemplazado
.put("/:id", async ({ itemService, ctx, params, body }) => {
  return itemService.replaceItem(ctx!, params.id, body);
}, {
  body: t.Object({
    name: t.String({ minLength: 1 }),
    price: t.Number({ minimum: 0 }),
    description: t.String(),
  }),
})
```

## DELETE - Eliminar

```typescript
// Status 204, sin contenido
.delete("/:id", async ({ itemService, ctx, params, set }) => {
  await itemService.deleteItem(ctx!, params.id);
  set.status = 204;  // No Content
  // No retornar nada
})
```

## POST - Async Job

```typescript
// Status 202, retorna job ID para polling
.post("/analyze", async ({ body, set }) => {
  const job = await aiQueue.add("analyze", {
    type: "ANALYZE",
    data: body,
  });

  set.status = 202;  // Accepted
  return {
    jobId: job.id,
    status: "processing",
    checkUrl: `/api/v1/jobs/${job.id}`,
  };
})
```

## Validación con Elysia t

```typescript
import { Elysia, t } from "elysia";

.post("/items", handler, {
  body: t.Object({
    // Requeridos
    name: t.String({ minLength: 1, maxLength: 255 }),
    price: t.Number({ minimum: 0 }),

    // Opcionales
    description: t.Optional(t.String()),
    categoryId: t.Optional(t.String({ format: "uuid" })),
    isActive: t.Optional(t.Boolean()),

    // Arrays
    tags: t.Optional(t.Array(t.String())),

    // Enum
    status: t.Optional(t.Enum({
      draft: "draft",
      published: "published",
    })),
  }),
  query: t.Object({
    page: t.Optional(t.Numeric({ minimum: 1 })),
    pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  }),
  params: t.Object({
    id: t.String({ format: "uuid" }),
  }),
})
```

## Response Types (Para OpenAPI)

```typescript
.get("/:id", async ({ itemService, ctx, params }) => {
  return itemService.getItem(ctx!, params.id);
}, {
  response: {
    200: t.Object({
      id: t.String(),
      name: t.String(),
      price: t.Number(),
      isActive: t.Boolean(),
      createdAt: t.String(),
    }),
    404: t.Object({
      error: t.String(),
      code: t.String(),
    }),
  },
})
```

## Resumen de Status Codes

| Método | Éxito | Uso |
|--------|-------|-----|
| GET (uno) | 200 | Retorna recurso |
| GET (lista) | 200 | Retorna array |
| POST (crear) | 201 | Retorna recurso creado |
| POST (acción) | 200 | Retorna resultado |
| POST (async) | 202 | Retorna job info |
| PATCH | 200 | Retorna recurso actualizado |
| PUT | 200 | Retorna recurso reemplazado |
| DELETE | 204 | Sin contenido |

## Errores Comunes

| Status | Excepción | Caso |
|--------|-----------|------|
| 400 | `BadRequestException` | Datos inválidos |
| 401 | `UnauthorizedException` | No autenticado |
| 403 | `ForbiddenException` | Sin permisos |
| 404 | `NotFoundException` | No existe |
| 409 | `ConflictException` | Duplicado |
| 422 | `UnprocessableEntityException` | Regla de negocio |
| 500 | (automático) | Error interno |

## Checklist

- [ ] GET retorna data directamente
- [ ] POST retorna 201 + recurso creado
- [ ] DELETE retorna 204 sin body
- [ ] Async jobs retornan 202 + jobId
- [ ] Validación con `t.Object`
- [ ] Errores via excepciones
- [ ] NO usar `{ success, data }` wrappers
