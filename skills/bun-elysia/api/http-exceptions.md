# HTTP Exceptions

Bun/Elysia-specific error examples that extend the canonical backend guidance in `fullstack-backend/patterns/08-error-handling.md`. Shared error taxonomy ownership belongs to `fullstack-backend`.

## Clase Base

```typescript
// src/utils/http-exceptions.ts
export class HttpException extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

## Excepciones Comunes

```typescript
// 400 Bad Request - Datos inválidos
export class BadRequestException extends HttpException {
  constructor(message = "Bad Request") {
    super(message, 400, "BAD_REQUEST");
  }
}

// 401 Unauthorized - No autenticado
export class UnauthorizedException extends HttpException {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// 403 Forbidden - Sin permisos
export class ForbiddenException extends HttpException {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

// 404 Not Found - Recurso no existe
export class NotFoundException extends HttpException {
  constructor(message = "Not Found") {
    super(message, 404, "NOT_FOUND");
  }
}

// 409 Conflict - Conflicto (duplicado, etc)
export class ConflictException extends HttpException {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

// 422 Unprocessable Entity - Validación de negocio
export class UnprocessableEntityException extends HttpException {
  constructor(message = "Unprocessable Entity") {
    super(message, 422, "UNPROCESSABLE_ENTITY");
  }
}

// 500 Internal Server Error - Error inesperado
export class InternalServerException extends HttpException {
  constructor(message = "Internal Server Error") {
    super(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
```

## Error Handler Middleware

```typescript
// src/middleware/error.ts
import { Elysia } from "elysia";
import { HttpException } from "../utils/http-exceptions";

export const errorPlugin = new Elysia({ name: "error" })
  .onError(({ code, error, set }) => {
    // HttpException personalizada
    if (error instanceof HttpException) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
      };
    }

    // Errores de validación de Elysia
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Error de validación",
        code: "VALIDATION_ERROR",
        details: error.message,
      };
    }

    // Error de ruta no encontrada
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Ruta no encontrada",
        code: "ROUTE_NOT_FOUND",
      };
    }

    // Errores inesperados
    console.error("Unexpected error:", error);
    set.status = 500;
    return {
      error: "Error interno del servidor",
      code: "INTERNAL_ERROR",
    };
  });
```

## Uso en Services

```typescript
// En service
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

  // Verificar duplicados
  const existing = await this.repository.findByName(ctx, data.name);
  if (existing) {
    throw new ConflictException("Ya existe un item con ese nombre");
  }

  return this.repository.create(ctx, data);
}
```

## Cuándo Usar Cada Excepción

| Excepción | Status | Caso de Uso |
|-----------|--------|-------------|
| `BadRequestException` | 400 | Datos de entrada inválidos |
| `UnauthorizedException` | 401 | Usuario no autenticado |
| `ForbiddenException` | 403 | Usuario sin permisos |
| `NotFoundException` | 404 | Recurso no existe |
| `ConflictException` | 409 | Duplicado, estado conflictivo |
| `UnprocessableEntityException` | 422 | Regla de negocio violada |
| `InternalServerException` | 500 | Error inesperado |

## Anti-Pattern: Response Wrappers

```typescript
// MAL - No usar wrappers
return {
  success: true,
  data: item,
};

return {
  success: false,
  error: "Not found",
};

// BIEN - Retornar data directamente o lanzar excepción
return item;  // Success

throw new NotFoundException("Item no encontrado");  // Error
```

## Checklist

- [ ] Usar excepciones, no wrappers
- [ ] Mensajes en español para usuarios
- [ ] Códigos para identificación programática
- [ ] Error handler registrado en app
- [ ] Log de errores inesperados
- [ ] No exponer detalles internos en producción
