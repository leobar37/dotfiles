# Form Components

⚠️ **OBLIGATORIO**: Todo formulario debe usar estos wrappers. NO uses componentes nativos.

📋 **Template completo**: Ver [`form-feature-template.md`](../patterns/form-feature-template.md) para la estructura completa paso a paso.

## Anti-Patterns (PROHIBIDOS)

❌ **NUNCA hagas esto:**

```typescript
// ❌ MAL: Input sin wrapper
<Input {...register('name')} />

// ❌ MAL: Botón sin estados
<Button type="submit">Guardar</Button>

// ❌ MAL: Sin schema de validación
const form = useForm({ defaultValues: { name: '' } });

// ❌ MAL: Schema sin mensajes
z.string().min(1) // Sin mensaje de error

// ❌ PROHIBIDO: Usar fetch nativo
const handleSubmit = async (data) => {
  const res = await fetch('/api/products', { method: 'POST', body: JSON.stringify(data) });
};
// ✅ Usa: TanStack Query + Eden Treaty

// ❌ PROHIBIDO: Form en components/ sueltos
// components/ProductForm.tsx
// ✅ Usa: features/products/components/ProductForm.tsx

// ❌ PROHIBIDO: useState para formularios
const [name, setName] = useState('');
const [errors, setErrors] = useState({});
// ✅ Usa: useForm de React Hook Form

// ❌ PROHIBIDO: Prop drilling con 10+ props
<ProductForm product={product} categories={categories} tags={tags} onSubmit={onSubmit} isLoading={isLoading} errors={errors} />
// ✅ Usa: Provider + Context o Jotai
```

## Patrón Correcto Completo

```typescript
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';

// 1. SCHEMA con mensajes en español
const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  price: z.number().positive('El precio debe ser mayor a 0'),
  type: z.enum(['menu', 'inventario']),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  categoryId: z.string().nullable().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// 2. FORM con zodResolver y mode
const form = useForm<ProductFormData>({
  resolver: zodResolver(productSchema),
  mode: 'onChange', // Validación en tiempo real
  defaultValues: {
    name: product?.name || '',
    price: product?.price || 0,
    type: product?.type || 'menu',
    description: product?.description || '',
    categoryId: product?.categoryId || null,
  },
});

// 3. SUBMIT con mutation
const createProduct = useCreateProduct();
const updateProduct = useUpdateProduct();

const onSubmit = async (data: ProductFormData) => {
  if (isEditing) {
    await updateProduct.mutateAsync({ id: product.id, data });
  } else {
    await createProduct.mutateAsync(data);
  }
  onSuccess();
};

// 4. ESTADOS del botón
const isPending = createProduct.isPending || updateProduct.isPending;
const isFormValid = form.formState.isValid;
const isDirty = form.formState.isDirty;

// 5. JSX
<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormInput name="name" label="Nombre" required />
    <FormNumberInput name="price" label="Precio" min={0} allowDecimals />
    <FormSelect name="type" label="Tipo" options={typeOptions} />
    <FormTextarea name="description" label="Descripción" rows={3} />

    <Button
      type="submit"
      disabled={isPending || !isFormValid}
      className="bg-amber-500 hover:bg-amber-600"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Guardando...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Actualizar' : 'Crear'}
        </>
      )}
    </Button>
  </form>
</FormProvider>
```

## Form Wrappers Disponibles

| Wrapper | Uso | Props Especiales |
|---------|-----|------------------|
| `FormInput` | Texto, email, tel | `type`, `placeholder` |
| `FormNumberInput` | Números | `min`, `max`, `allowDecimals` |
| `FormTextarea` | Texto largo | `rows` |
| `FormSelect` | Dropdown | `options: {label, value}[]` |
| `FormCheckbox` | Boolean | `checkboxLabel`, `description` |
| `FormPassword` | Contraseña | Toggle show/hide integrado |
| `FormPhoneInput` | Teléfono intl | `defaultCountry` |
| `FormFileUpload` | Archivos | `mode`, `accept`, `maxSizeMB` |

## Uso de Form Wrappers

```typescript
// FormInput - Texto simple
<FormInput
  name="name"
  label="Nombre del Producto"
  placeholder="Ingresa el nombre"
  required
/>

// FormNumberInput - Números con conversión automática
<FormNumberInput
  name="price"
  label="Precio (S/.)"
  placeholder="0.00"
  min={0}
  max={9999}
  step={0.01}
  allowDecimals
/>

// FormSelect - Dropdown
<FormSelect
  name="type"
  label="Tipo"
  options={[
    { label: 'Menú', value: 'menu' },
    { label: 'Inventario', value: 'inventario' },
  ]}
  placeholder="Seleccionar tipo"
/>

// FormTextarea - Texto largo
<FormTextarea
  name="description"
  label="Descripción"
  placeholder="Describe el producto..."
  description="Máximo 500 caracteres"
  rows={3}
/>

// FormCheckbox - Boolean con descripción
<FormCheckbox
  name="available"
  label="Disponible"
  description="Mostrar en el catálogo"
/>

// FormPassword - Con toggle show/hide
<FormPassword
  name="password"
  label="Contraseña"
  placeholder="••••••••"
/>

// FormFileUpload - Archivos con drag & drop
<FormFileUpload
  name="imageId"
  label="Imagen del Producto"
  mode="single"
  accept="image/*"
  maxSizeMB={5}
/>
```

## Estados del Botón Submit

```typescript
// Estados disponibles
const isPending = mutation.isPending;           // Enviando
const isFormValid = form.formState.isValid;     // Validación OK
const isDirty = form.formState.isDirty;         // Tiene cambios

// Combinaciones comunes
disabled={isPending || !isFormValid}            // Crear (siempre validar)
disabled={isPending || !isDirty}                // Editar (solo si hay cambios)
disabled={isPending || !isFormValid || !isDirty} // Ambos
```

### Patrón de Botón Completo

```typescript
<Button
  type="submit"
  disabled={isPending || !isFormValid}
  className="bg-amber-500 hover:bg-amber-600 text-white"
>
  {isPending ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Guardando...
    </>
  ) : (
    <>
      <Save className="h-4 w-4 mr-2" />
      {isEditing ? 'Actualizar' : 'Crear'}
    </>
  )}
</Button>
```

## Zod Schemas

### Patrones Comunes

```typescript
// Requerido con mensaje
z.string().min(1, 'El nombre es requerido')

// Máximo caracteres
z.string().max(100, 'Máximo 100 caracteres')

// Número positivo
z.number().positive('Debe ser mayor a 0')

// Número con rango
z.number().min(1, 'Mínimo 1').max(20, 'Máximo 20')

// Enum
z.enum(['menu', 'inventario'])

// Opcional nullable
z.string().nullable().optional()

// Email
z.string().email('Email inválido')

// Array con mínimo
z.array(z.string()).min(1, 'Selecciona al menos uno')

// Or empty string (para inputs opcionales)
z.string().email('Email inválido').or(z.literal(''))
```

### Schema con Transformación

```typescript
const schema = z.object({
  // Remover @ al inicio
  instagram: z
    .string()
    .transform(v => v.startsWith('@') ? v.slice(1) : v)
    .refine(v => !v || /^[a-zA-Z0-9._]+$/.test(v), {
      message: 'Solo letras, números, punto y guión bajo',
    })
    .optional(),
});
```

### Schema Completo de Ejemplo

```typescript
const productSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),

  price: z.number()
    .positive('El precio debe ser mayor a 0'),

  type: z.enum(['menu', 'inventario']),

  categoryId: z.string().nullable().optional(),

  description: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),

  imageId: z.string().nullable().optional(),

  available: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;
```

## Modos de Validación

```typescript
// onChange - Validación en tiempo real (recomendado para UX)
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onChange',
});

// onBlur - Validación al salir del campo
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur',
});

// onSubmit - Solo al enviar (mejor performance)
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onSubmit',
});
```

## Reset del Form en Modales

```typescript
// Resetear cuando el modal se abre/cierra
useEffect(() => {
  if (open && data) {
    form.reset({
      name: data.name,
      price: data.price,
      // ...
    });
  } else if (open && !data) {
    form.reset({
      name: '',
      price: 0,
      // defaults para crear
    });
  }
}, [open, data, form]);
```

## Form en Modal Responsive

```typescript
// Footer diferente para mobile/desktop
{isMobile ? (
  <DrawerFooter>
    <Button type="submit" disabled={isPending || !isFormValid}>
      {isPending ? 'Guardando...' : 'Guardar'}
    </Button>
    <DrawerClose asChild>
      <Button variant="outline">Cancelar</Button>
    </DrawerClose>
  </DrawerFooter>
) : (
  <DialogFooter>
    <Button variant="outline" onClick={onClose}>Cancelar</Button>
    <Button type="submit" disabled={isPending || !isFormValid}>
      {isPending ? 'Guardando...' : 'Guardar'}
    </Button>
  </DialogFooter>
)}
```

## Checklist

### Schema
- [ ] Schema Zod definido con tipos
- [ ] Todos los mensajes de error en español
- [ ] Usar `z.infer<typeof schema>` para el tipo
- [ ] Campos opcionales con `.nullable().optional()`

### Form Setup
- [ ] `useForm` con `zodResolver(schema)`
- [ ] `mode: 'onChange'` para validación en tiempo real
- [ ] `defaultValues` completos (incluyendo null/empty)
- [ ] `FormProvider` envuelve el formulario

### Form Fields
- [ ] Usar wrappers: FormInput, FormSelect, etc.
- [ ] NO usar `<Input {...register()}>` directamente
- [ ] Props `required` para indicador visual (*)
- [ ] Props `description` para ayuda contextual

### Submit Button
- [ ] `disabled={isPending || !isFormValid}`
- [ ] Icono `<Loader2 className="animate-spin" />` cuando isPending
- [ ] Texto diferente para crear/editar
- [ ] Considerar `isDirty` para formularios de edición

### Modales
- [ ] Reset form cuando modal se abre
- [ ] Footer diferente para mobile (DrawerFooter) y desktop (DialogFooter)
- [ ] Deshabilitar Cancel button cuando isPending
