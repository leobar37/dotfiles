# Feature-Based Structure

Organización del código frontend por **features** (funcionalidades) en lugar de por tipo de archivo.

---

## ¿Qué es un Feature?

Un **feature** es una funcionalidad autocontenida del sistema:

| ✅ ES un Feature | ❌ NO es un Feature (es shared) |
|-----------------|--------------------------------|
| `products` - Gestión de productos | `Button` - Componente UI genérico |
| `orders` - Procesamiento de órdenes | `Input` - Input nativo |
| `pos` - Punto de venta | `useLocalStorage` - Hook genérico |
| `auth` - Autenticación | `formatDate` - Utilidad genérica |
| `catalog` - Catálogo de items | `DashboardLayout` - Layout compartido |

### Regla de oro:
> **Si la funcionalidad tiene componentes, hooks, y lógica propia → es un feature.**
> **Si es un componente/hook/utilidad que se usa en múltiples features → va en shared.**

---

## Estructura de un Feature

```
features/[feature-name]/
├── components/           # Componentes React del feature
│   ├── FeatureList.tsx
│   ├── FeatureCard.tsx
│   └── FeatureForm.tsx   ← Ver sección "Formularios"
├── hooks/               # Hooks específicos del feature
│   ├── use-feature.ts
│   └── use-feature-query.ts
├── modals/              # Modales del feature
│   ├── CreateModal.tsx
│   └── EditModal.tsx
├── context/             # Contexto React (si aplica)
│   └── FeatureContext.tsx
├── providers/           # Providers (si aplica)
│   └── FeatureProvider.tsx
├── store/               # MobX/Zustand store (si aplica)
│   └── feature-store.ts
├── types/               # Tipos TypeScript específicos
│   └── feature.types.ts
├── schemas/             # Zod schemas (si aplica)
│   └── feature-schema.ts
├── utils/               # Utilidades del feature
│   └── feature-utils.ts
└── index.ts             # Barrel exports (opcional)
```

---

## 📋 Dónde van los Formularios

⚠️ **OBLIGATORIO**: Todo formulario debe estar dentro de un feature.

### ✅ CORRECTO:

```
features/products/
├── components/
│   ├── ProductForm.tsx           ← Formulario principal
│   ├── ProductFormProvider.tsx   ← Context + lógica
│   ├── ProductNameInput.tsx      ← Sub-componentes
│   ├── ProductPriceInput.tsx
│   └── ProductSubmitButton.tsx
├── hooks/
│   ├── use-create-product.ts     ← Mutation POST
│   └── use-update-product.ts     ← Mutation PATCH
└── schemas/
    └── product.schema.ts         ← Zod schema
```

### ❌ PROHIBIDO:

```
components/
├── ProductForm.tsx               ← NO - Form suelto
└── forms/
    └── ProductForm.tsx           ← NO - No en feature

routes/
└── _protected.products.new.tsx   ← NO - Form mezclado con ruta
    └── (form inline de 200 líneas)
```

### Estructura Forzada para Forms:

Ver el template completo: [`form-feature-template.md`](./form-feature-template.md)

**Resumen obligatorio:**
- [ ] Usa `FormInput`, `FormSelect`, etc. (NO Input nativo)
- [ ] Usa TanStack Query (NO `fetch()`)
- [ ] Usa Eden Treaty para llamadas al API
- [ ] Hook de API separado del componente
- [ ] Schema Zod separado
- [ ] Componente principal < 100 líneas
- [ ] Sub-componentes < 50 líneas cada uno

---

## Cuándo Crear un Feature

### ✅ Crear Feature cuando:

1. **Funcionalidad autocontenida**
   - Ejemplos: "POS", "Orders", "Catalog", "Products"
   - Tiene su propia lógica de negocio

2. **Tiene múltiples componentes relacionados**
   - List, Card, Form, Detail, etc.
   - No es solo un componente suelto

3. **Se reutiliza en múltiples rutas**
   - Ej: ProductCard se usa en /products, /catalog, /search

4. **Tiene estado complejo**
   - MobX store
   - Context con múltiples valores
   - Jotai atoms relacionados

5. **Tiene hooks específicos**
   - useProducts, useCreateProduct, etc.
   - NO hooks genéricos (useDebounce, useLocalStorage)

### ❌ NO crear Feature (usar shared):

| ¿Qué? | ¿Dónde va? |
|-------|-----------|
| `Button`, `Input`, `Card` UI | `components/ui/` |
| `useDebounce`, `useLocalStorage` | `hooks/` |
| `formatDate`, `formatCurrency` | `lib/utils.ts` |
| `DashboardLayout`, `AuthLayout` | `components/layouts/` |
| `FormInput`, `FormSelect` wrappers | `components/forms/` |

---

## Ejemplo Completo: Feature "Products"

### Estructura:

```
features/products/
├── components/
│   ├── ProductList.tsx
│   ├── ProductCard.tsx
│   ├── ProductForm.tsx
│   ├── ProductFormProvider.tsx
│   ├── ProductNameInput.tsx
│   ├── ProductPriceInput.tsx
│   └── ProductActions.tsx
├── hooks/
│   ├── use-products.ts
│   ├── use-create-product.ts
│   ├── use-update-product.ts
│   └── use-delete-product.ts
├── modals/
│   ├── CreateProductModal.tsx
│   └── EditProductModal.tsx
├── schemas/
│   └── product.schema.ts
├── types/
│   └── product.types.ts
└── utils/
    └── product-utils.ts
```

### Uso desde rutas:

```typescript
// routes/_protected.products.tsx
import { ProductList } from "~/features/products/components/ProductList";
import { CreateProductModal } from "~/features/products/modals/CreateProductModal";

export default function ProductsPage() {
  return (
    <div>
      <h1>Productos</h1>
      <ProductList />
      <CreateProductModal />
    </div>
  );
}
```

---

## Reglas de Organización

### 1. Límites de Tamaño

| Tipo | Máximo | Ejcede? → Separar |
|------|--------|-------------------|
| Feature component | 100 líneas | En sub-componentes |
| Sub-componente | 50 líneas | Otro sub-componente |
| Props por componente | 5 | Usar Context/Provider |
| Hook | 80 líneas | Múltiples hooks |

### 2. NO Prop Drilling

❌ **Evitar** componentes con muchos props:

```typescript
// ❌ MAL: 8 props
<ProductCard 
  product={product}
  onEdit={onEdit}
  onDelete={onDelete}
  isLoading={isLoading}
  showActions={true}
  variant="compact"
  categories={categories}
  tags={tags}
/>
```

✅ **Usar** Provider + Context:

```typescript
// ✅ BIEN: Componentes pequeños inyectan del context
<ProductProvider product={product}>
  <ProductCard>
    <ProductHeader />
    <ProductDetails />
    <ProductActions />
  </ProductCard>
</ProductProvider>
```

### 3. Barrel Exports (Opcional)

```typescript
// features/products/index.ts
export { ProductList } from "./components/ProductList";
export { ProductCard } from "./components/ProductCard";
export { ProductForm } from "./components/ProductForm";
export { useProducts } from "./hooks/use-products";
export type { Product } from "./types/product.types";

// Uso
import { ProductList, ProductForm, useProducts } from "~/features/products";
```

---

## Feature Simple vs Completo

### Feature Simple (solo componentes):

```
features/simple-feature/
└── components/
    └── SimpleComponent.tsx
```

### Feature Completo (con estado y API):

```
features/complex-feature/
├── components/
├── hooks/
├── modals/
├── schemas/
├── types/
└── store/           # Si tiene estado complejo
```

---

## Checklist para Nuevo Feature

Antes de crear:

- [ ] ¿Es una funcionalidad autocontenida?
- [ ] ¿Tiene múltiples componentes relacionados?
- [ ] ¿NO es un componente UI genérico?
- [ ] ¿NO es un hook/utilidad genérica?
- [ ] ¿Se reutilizará en múltiples rutas?

Después de crear:

- [ ] Está en `features/[name]/`
- [ ] Componentes en `components/`
- [ ] Hooks en `hooks/`
- [ ] Tipos en `types/`
- [ ] Schemas en `schemas/` (si aplica)
- [ ] NO tiene más de 5 niveles de profundidad
- [ ] Cada archivo < 100 líneas

---

## Recursos Relacionados

- [Form Feature Template](./form-feature-template.md) - Template completo para formularios
- [Forms Components](../components/forms.md) - Wrappers de formularios
- [MobX Stores](./mobx-stores.md) - Estado complejo con MobX
- [Data Fetching](./data-fetching.md) - TanStack Query patterns
