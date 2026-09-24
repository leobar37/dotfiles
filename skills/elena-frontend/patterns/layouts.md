# Layout Conventions

Convenciones de layouts y espaciado para el proyecto.

## Componentes de Layout

### Container

Contenedor centrado con ancho máximo responsive.

```typescript
// components/layout/container.tsx
interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}
```

| Size | Max Width |
|------|-----------|
| `sm` | `max-w-screen-sm` (640px) |
| `md` | `max-w-screen-md` (768px) |
| `lg` | `max-w-screen-lg` (1024px) |
| `xl` | `max-w-screen-xl` (1280px) |
| `full` | `max-w-full` |

```tsx
<Container size="lg">
  <PageContent />
</Container>
```

### Section

Sección con padding y título opcional.

```typescript
interface SectionProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: string;
  description?: string;
}
```

| Padding | Valor |
|---------|-------|
| `none` | `p-0` |
| `sm` | `p-4` |
| `md` | `p-6` |
| `lg` | `p-8` |

```tsx
<Section padding="md" title="Información" description="Datos del cliente">
  <FormFields />
</Section>
```

### Stack

Flexbox direccional con espaciado configurable.

```typescript
interface StackProps {
  direction?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}
```

| Spacing | Horizontal | Vertical |
|---------|------------|----------|
| `none` | `gap-x-0` | `gap-y-0` |
| `xs` | `gap-x-1` | `gap-y-1` |
| `sm` | `gap-x-2` | `gap-y-2` |
| `md` | `gap-x-4` | `gap-y-4` |
| `lg` | `gap-x-6` | `gap-y-6` |
| `xl` | `gap-x-8` | `gap-y-8` |

```tsx
<Stack direction="vertical" spacing="md" align="stretch">
  <Item>Elemento 1</Item>
  <Item>Elemento 2</Item>
</Stack>
```

## Clases CSS de Grids

Definidas en `app.css` para grids responsivos:

### Grids para Stats/Cards

```css
.grid-stats-2  /* 1 col → 2 cols (sm+) */
.grid-stats-3  /* 2 cols → 3 cols (md+) */
.grid-stats-4  /* 2 cols → 4 cols (lg+) */
.grid-stats-6  /* 2 cols → 6 cols (lg+) */
```

```tsx
// Dashboard con 4 stats cards
<div className="grid-stats-4 gap-4">
  <StatCard title="Ventas" value="$1,234" />
  <StatCard title="Órdenes" value="56" />
  <StatCard title="Clientes" value="23" />
  <StatCard title="Productos" value="89" />
</div>
```

### Grids para Contenido

```css
.grid-content-2  /* 1 col → 2 cols (md+) */
.grid-content-3  /* 1 col → 3 cols (lg+) */
```

```tsx
// Formulario en 2 columnas
<div className="grid-content-2 gap-4">
  <FormInput name="firstName" label="Nombre" />
  <FormInput name="lastName" label="Apellido" />
</div>
```

## Clases de Espaciado

```css
.space-component  /* gap: 12px → 16px (sm+) */
.space-section    /* gap: 16px → 24px (sm+) → 32px (lg+) */
```

```tsx
// Espaciado entre componentes
<div className="flex flex-col space-component">
  <ComponentA />
  <ComponentB />
</div>

// Espaciado entre secciones
<div className="flex flex-col space-section">
  <Section title="Sección 1">...</Section>
  <Section title="Sección 2">...</Section>
</div>
```

## Layout de Formularios (FormLayout)

```tsx
import { FormLayout } from '~/components/layout/form-layout';

<FormLayout maxWidth="2xl">
  <FormLayout.Header onBack={() => navigate(-1)}>
    <h1 className="text-2xl font-semibold">Crear Producto</h1>
    <p className="text-sm text-stone-500">Ingresa los datos</p>
  </FormLayout.Header>

  <FormLayout.Actions>
    <Button variant="outline">Cancelar</Button>
    <Button type="submit">Guardar</Button>
  </FormLayout.Actions>

  <FormLayout.Content>
    <div className="grid-content-2 gap-4">
      <FormInput name="name" label="Nombre" />
      <FormInput name="price" label="Precio" />
    </div>
  </FormLayout.Content>
</FormLayout>
```

**Max Widths disponibles**: `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`

## Patrones de Página

### Página de Lista (con TableLayout)

```tsx
<TableLayout>
  <TableLayout.Header>
    <h1 className="text-page-title">Productos</h1>
    <DataTableSearch table={table} />
  </TableLayout.Header>

  <TableLayout.Actions>
    <FilterButton />
    <Button><Plus /> Nuevo</Button>
  </TableLayout.Actions>

  <TableLayout.Content>
    <DataTable table={table} renderMobileCard={...} />
  </TableLayout.Content>
</TableLayout>
```

### Página de Dashboard

```tsx
<Container size="xl">
  <div className="space-section">
    {/* Header */}
    <div>
      <h1 className="text-page-title">Dashboard</h1>
      <p className="text-muted">Resumen de hoy</p>
    </div>

    {/* Stats */}
    <div className="grid-stats-4 gap-4">
      <StatCard ... />
    </div>

    {/* Contenido principal */}
    <div className="grid-content-2 gap-6">
      <Card>...</Card>
      <Card>...</Card>
    </div>
  </div>
</Container>
```

## Espaciado Interno de Cards

```tsx
<Card>
  <CardHeader className="px-6">
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent className="px-6">
    {/* Contenido con gap-6 entre secciones */}
  </CardContent>
</Card>
```

## Checklist

- [ ] Usar `Container` para centrar contenido
- [ ] Usar `Section` para agrupar con padding
- [ ] Usar `Stack` para listas direccionales
- [ ] Usar `.grid-stats-*` para grids de stats/cards
- [ ] Usar `.grid-content-*` para formularios en columnas
- [ ] Usar `.space-section` entre secciones principales
- [ ] Usar `FormLayout` para páginas de formulario
- [ ] Usar `TableLayout` para páginas de lista
