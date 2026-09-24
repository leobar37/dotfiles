# Template: Formulario en Feature

⚠️ **OBLIGATORIO**: Todo formulario debe seguir esta plantilla. NO crear formularios sueltos en `components/`.

---

## 🎯 Objetivo

Crear formularios con:
- ✅ React Hook Form + Zod
- ✅ Wrappers de shadcn/ui (FormInput, FormSelect, etc.)
- ✅ TanStack Query (NO fetch nativo)
- ✅ Eden Treaty para API calls
- ✅ Estructura en `features/[name]/components/`
- ✅ Componentes pequeños (máx 100 líneas) - NO prop drilling

---

## 📁 Estructura Forzada

```
features/[feature-name]/
├── components/
│   ├── [Feature]Form.tsx              ← Componente principal (wrapper)
│   ├── [Feature]FormProvider.tsx      ← Context + lógica (opcional)
│   ├── [Field]Input.tsx               ← Sub-componentes pequeños
│   └── [Field]Select.tsx
├── hooks/
│   ├── use-create-[feature].ts        ← Mutation POST
│   ├── use-update-[feature].ts        ← Mutation PATCH
│   └── use-[feature].ts               ← Query GET
├── schemas/
│   └── [feature].schema.ts            ← Zod schema
└── types/
    └── [feature].types.ts             ← TypeScript types
```

**❌ PROHIBIDO poner forms en:**
- `components/ProductForm.tsx` ← Sueltos
- `routes/dashboard.tsx` ← Mezclados con rutas
- `modals/CreateModal.tsx` ← Sin feature folder

---

## ✅ Checklist Obligatorio

Antes de decir "terminé", verifica:

### 1. Wrappers OBLIGATORIOS
- [ ] Usa `FormInput` (NO `<Input {...register()} />`)
- [ ] Usa `FormSelect` (NO `<Select>` nativo)
- [ ] Usa `FormNumberInput` para números
- [ ] Usa `FormTextarea` para textos largos
- [ ] Usa `FormCheckbox` para booleanos
- [ ] Usa `FormDatePicker` para fechas

### 2. Data Fetching
- [ ] Usa `useMutation` de TanStack Query
- [ ] Usa `eden.api.v1...` (NO `fetch()`)
- [ ] Usa hook personalizado (ej: `useCreateProduct`)
- [ ] Maneja estados de loading y error

### 3. Estructura
- [ ] Está en `features/[name]/components/`
- [ ] Tiene schema Zod separado
- [ ] Tipos TypeScript definidos
- [ ] Hook de API separado del componente

### 4. Tamaño de Componentes
- [ ] Componente principal < 100 líneas
- [ ] Sub-componentes < 50 líneas cada uno
- [ ] Máximo 5 props por componente
- [ ] Si excedes → Usar Provider/Context o Jotai

---

## ❌ ANTI-PATRONES PROHIBIDOS

### 1. NO uses Input nativo
```typescript
// ❌ PROHIBIDO
import { Input } from "~/components/ui/input";
<Input {...register('name')} />

// ✅ OBLIGATORIO
import { FormInput } from "~/components/forms";
<FormInput name="name" label="Nombre" required />
```

### 2. NO uses fetch
```typescript
// ❌ PROHIBIDO
const handleSubmit = async (data) => {
  const res = await fetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

// ✅ OBLIGATORIO
const create = useCreateProduct(); // TanStack Query + Eden Treaty
const handleSubmit = (data) => {
  create.mutate(data);
};
```

### 3. NO pongas forms en components/ sueltos
```typescript
// ❌ PROHIBIDO
// components/ProductForm.tsx

// ✅ OBLIGATORIO
// features/products/components/ProductForm.tsx
```

### 4. NO uses useState para formularios
```typescript
// ❌ PROHIBIDO
const [name, setName] = useState('');
const [price, setPrice] = useState(0);
const [errors, setErrors] = useState({});

// ✅ OBLIGATORIO
const form = useForm({
  resolver: zodResolver(productSchema)
});
```

### 5. NO hagas prop drilling
```typescript
// ❌ PROHIBIDO: Componente con 10+ props
<ProductForm 
  product={product}
  categories={categories}
  tags={tags}
  onSubmit={onSubmit}
  isLoading={isLoading}
  errors={errors}
  // ... más props
/>

// ✅ OBLIGATORIO: Provider + componentes pequeños
<ProductFormProvider>
  <ProductNameInput />
  <ProductPriceInput />
  <ProductCategorySelect />
  <SubmitButton />
</ProductFormProvider>
```

### 6. NO crees componentes de 300 líneas
```typescript
// ❌ PROHIBIDO: Monolito de 300 líneas
export function ProductForm() {
  // 300 líneas de código...
}

// ✅ OBLIGATORIO: Dividir en componentes pequeños
// ProductForm.tsx - 80 líneas (solo layout)
// ProductNameInput.tsx - 20 líneas
// ProductPriceInput.tsx - 20 líneas
// ProductActions.tsx - 30 líneas
// useProductForm.ts - 50 líneas (lógica)
```

---

## 🏗️ Arquitectura: Evitar Prop Drilling

### Opción A: React Context (recomendado para forms complejos)

```typescript
// features/product/components/ProductFormProvider.tsx
import { createContext, useContext } from "react";
import { useForm, FormProvider as RHFProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateProduct } from "../hooks/use-products";
import { productSchema } from "../schemas/product.schema";

const ProductFormContext = createContext(null);

export function ProductFormProvider({ children, product }) {
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: product || { name: "", price: 0 },
  });
  
  const create = useCreateProduct();
  const update = useUpdateProduct();
  
  const onSubmit = form.handleSubmit((data) => {
    if (product) {
      update.mutate({ id: product.id, data });
    } else {
      create.mutate(data);
    }
  });
  
  const value = {
    form,
    onSubmit,
    isPending: create.isPending || update.isPending,
  };
  
  return (
    <ProductFormContext.Provider value={value}>
      <RHFProvider {...form}>
        <form onSubmit={onSubmit}>{children}</form>
      </RHFProvider>
    </ProductFormContext.Provider>
  );
}

export const useProductForm = () => {
  const ctx = useContext(ProductFormContext);
  if (!ctx) throw new Error("useProductForm debe usarse dentro de ProductFormProvider");
  return ctx;
};

// features/product/components/ProductNameInput.tsx
// Solo 20 líneas, sin props!
export function ProductNameInput() {
  const { form } = useProductForm();
  return <FormInput name="name" label="Nombre" required />;
}

// features/product/components/ProductPriceInput.tsx
export function ProductPriceInput() {
  return <FormNumberInput name="price" label="Precio" min={0} />;
}

// features/product/components/ProductSubmitButton.tsx
export function ProductSubmitButton() {
  const { isPending } = useProductForm();
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? "Guardando..." : "Guardar"}
    </Button>
  );
}

// Uso final - Limpio y simple!
// features/product/components/ProductForm.tsx
export function ProductForm({ product }) {
  return (
    <ProductFormProvider product={product}>
      <div className="space-y-4">
        <ProductNameInput />
        <ProductPriceInput />
        <ProductSubmitButton />
      </div>
    </ProductFormProvider>
  );
}
```

### Opción B: Jotai (recomendado para estado global simple)

```typescript
// features/product/store/product-form.atom.ts
import { atom } from "jotai";

export const productFormAtom = atom({
  name: "",
  price: 0,
  categoryId: null,
});

export const productFormErrorsAtom = atom({});

// features/product/components/ProductNameInput.tsx
import { useAtom } from "jotai";
import { productFormAtom } from "../store/product-form.atom";

export function ProductNameInput() {
  const [form, setForm] = useAtom(productFormAtom);
  
  return (
    <FormInput
      name="name"
      label="Nombre"
      value={form.name}
      onChange={(e) => setForm({ ...form, name: e.target.value })}
      required
    />
  );
}
```

---

## 📋 Plantilla Completa: Paso a Paso

### Paso 1: Schema Zod

```typescript
// features/products/schemas/product.schema.ts
import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "Máximo 100 caracteres"),
  
  price: z
    .number()
    .positive("El precio debe ser mayor a 0")
    .max(999999, "Precio máximo excedido"),
  
  description: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional(),
  
  categoryId: z
    .string()
    .nullable()
    .optional(),
  
  type: z.enum(["menu", "inventario"], {
    required_error: "Selecciona un tipo",
  }),
  
  available: z.boolean().default(true),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

### Paso 2: Hook de API (TanStack Query + Eden Treaty)

```typescript
// features/products/hooks/use-products.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "~/lib/api-client";
import { parseEdenError } from "~/lib/api-error-parser";

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { data: result, error } = await eden.api.v1.products.post(data);
      
      if (error) {
        throw new Error(parseEdenError(error, "Error al crear producto"));
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidar cache para recargar lista
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const { data: result, error } = await eden.api.v1.products({ id }).patch(data);
      
      if (error) {
        throw new Error(parseEdenError(error, "Error al actualizar producto"));
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });
}
```

### Paso 3: Provider (si el form es complejo)

```typescript
// features/products/components/ProductFormProvider.tsx
import { createContext, useContext } from "react";
import { useForm, FormProvider as RHFProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductFormData } from "../schemas/product.schema";
import { useCreateProduct, useUpdateProduct } from "../hooks/use-products";

interface ProductFormContextValue {
  form: ReturnType<typeof useForm<ProductFormData>>;
  onSubmit: () => void;
  isPending: boolean;
  isEditing: boolean;
}

const ProductFormContext = createContext<ProductFormContextValue | null>(null);

export function ProductFormProvider({
  children,
  product,
}: {
  children: React.ReactNode;
  product?: Product;
}) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: "onChange",
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      description: product?.description || "",
      categoryId: product?.categoryId || null,
      type: product?.type || "menu",
      available: product?.available ?? true,
    },
  });
  
  const create = useCreateProduct();
  const update = useUpdateProduct();
  
  const onSubmit = form.handleSubmit((data) => {
    if (product) {
      update.mutate({ id: product.id, data });
    } else {
      create.mutate(data);
    }
  });
  
  return (
    <ProductFormContext.Provider
      value={{
        form,
        onSubmit,
        isPending: create.isPending || update.isPending,
        isEditing: !!product,
      }}
    >
      <RHFProvider {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
        </form>
      </RHFProvider>
    </ProductFormContext.Provider>
  );
}

export const useProductForm = () => {
  const ctx = useContext(ProductFormContext);
  if (!ctx) {
    throw new Error("useProductForm debe usarse dentro de ProductFormProvider");
  }
  return ctx;
};
```

### Paso 4: Sub-componentes pequeños

```typescript
// features/products/components/ProductNameInput.tsx
// Solo 15 líneas!
import { FormInput } from "~/components/forms";

export function ProductNameInput() {
  return (
    <FormInput
      name="name"
      label="Nombre"
      placeholder="Ej: Hamburguesa Clásica"
      required
    />
  );
}

// features/products/components/ProductPriceInput.tsx
import { FormNumberInput } from "~/components/forms";

export function ProductPriceInput() {
  return (
    <FormNumberInput
      name="price"
      label="Precio"
      min={0}
      allowDecimals
      required
    />
  );
}

// features/products/components/ProductTypeSelect.tsx
import { FormSelect } from "~/components/forms";

const typeOptions = [
  { value: "menu", label: "Menú" },
  { value: "inventario", label: "Inventario" },
];

export function ProductTypeSelect() {
  return (
    <FormSelect
      name="type"
      label="Tipo"
      options={typeOptions}
      required
    />
  );
}

// features/products/components/ProductSubmitButton.tsx
import { Button } from "~/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useProductForm } from "./ProductFormProvider";

export function ProductSubmitButton() {
  const { isPending, isEditing } = useProductForm();
  
  return (
    <Button
      type="submit"
      disabled={isPending}
      className="w-full"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Guardando...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Actualizar" : "Crear"} Producto
        </>
      )}
    </Button>
  );
}
```

### Paso 5: Componente Principal (Limpio!)

```typescript
// features/products/components/ProductForm.tsx
// Solo 30 líneas - todo está separado!
import { ProductFormProvider } from "./ProductFormProvider";
import { ProductNameInput } from "./ProductNameInput";
import { ProductPriceInput } from "./ProductPriceInput";
import { ProductTypeSelect } from "./ProductTypeSelect";
import { ProductCategorySelect } from "./ProductCategorySelect";
import { ProductDescriptionInput } from "./ProductDescriptionInput";
import { ProductAvailableCheckbox } from "./ProductAvailableCheckbox";
import { ProductSubmitButton } from "./ProductSubmitButton";

interface ProductFormProps {
  product?: Product; // Si existe = modo edición
}

export function ProductForm({ product }: ProductFormProps) {
  return (
    <ProductFormProvider product={product}>
      <div className="grid gap-4">
        <ProductNameInput />
        
        <div className="grid grid-cols-2 gap-4">
          <ProductPriceInput />
          <ProductTypeSelect />
        </div>
        
        <ProductCategorySelect />
        <ProductDescriptionInput />
        <ProductAvailableCheckbox />
        
        <ProductSubmitButton />
      </div>
    </ProductFormProvider>
  );
}
```

### Paso 6: Uso en Modal o Ruta

```typescript
// features/products/modals/CreateProductModal.tsx
import { createModal } from "~/components/modals";
import { ProductForm } from "../components/ProductForm";

export const [CreateProductModal, useCreateProductModal] = createModal(
  () => (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Nuevo Producto</h2>
      <ProductForm />
    </div>
  ),
  { title: "Crear Producto" }
);

// O en una ruta:
// routes/_protected.products.new.tsx
export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Crear Producto</h1>
      <ProductForm />
    </div>
  );
}
```

---

## 📏 Reglas de Tamaño

### Límites estrictos:

| Tipo | Máximo | Qué hacer si excedes |
|------|--------|---------------------|
| Componente principal | 100 líneas | Separar en sub-componentes |
| Sub-componente | 50 líneas | Crear otro sub-componente |
| Props | 5 | Usar Context o Provider |
| Lógica en componente | 30 líneas | Mover a custom hook |

### Ejemplo de refactorización:

```typescript
// ❌ ANTES: 150 líneas
function ProductForm({ product, categories, onSuccess, onError }) {
  // 150 líneas de código...
}

// ✅ DESPUÉS: Separado
// ProductForm.tsx - 30 líneas (solo layout)
// ProductFormProvider.tsx - 60 líneas (lógica + context)
// ProductNameInput.tsx - 15 líneas
// ProductPriceInput.tsx - 15 líneas
// useProductSubmit.ts - 40 líneas (hook de submit)
```

---

## 🎓 Checklist Final

Antes de hacer commit, verifica:

```markdown
- [ ] NO uso `fetch()` → uso TanStack Query
- [ ] NO uso `<Input>` nativo → uso FormInput
- [ ] NO uso `useState` para form → uso `useForm` de RHF
- [ ] NO hago prop drilling → uso Context o Jotai
- [ ] NO creo componentes > 100 líneas → los separo
- [ ] Está en `features/[name]/components/`
- [ ] Tengo schema Zod separado
- [ ] Tengo hooks de API separados
- [ ] Uso Eden Treaty para llamadas al backend
- [ ] Manejo loading y error states
```

---

## 🆘 ¿Qué pasa si mi form es muy simple?

Si el form tiene **menos de 3 campos**, puedes simplificar:

```typescript
// Form simple (sin provider)
// features/categories/components/CategoryForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormInput } from "~/components/forms";
import { useCreateCategory } from "../hooks/use-categories";

const schema = z.object({
  name: z.string().min(1, "Requerido"),
});

export function CategoryForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  
  const create = useCreateCategory();
  
  return (
    <form 
      onSubmit={form.handleSubmit((data) => create.mutate(data))}
      className="space-y-4"
    >
      <FormInput name="name" label="Nombre" required />
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? "Creando..." : "Crear"}
      </Button>
    </form>
  );
}
```

**Pero igual sigue las reglas:**
- ✅ En `features/categories/components/`
- ✅ Usa FormInput (no Input nativo)
- ✅ Usa useCreateCategory (no fetch)
- ✅ Hook separado

---

## 🔗 Recursos Relacionados

- [Forms Components](../components/forms.md) - Wrappers disponibles
- [Feature Based Structure](./feature-based-structure.md) - Estructura de carpetas
- [Eden Treaty](./eden-treaty.md) - Cómo llamar al API
- [MobX Stores](./mobx-stores.md) - Estado complejo con MobX
