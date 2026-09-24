# Tablas Responsive (DataTable)

Sistema de tablas que cambia automáticamente entre vista de tabla (desktop) y cards (mobile) a 768px.

## Arquitectura

```
Desktop (≥768px):          Mobile (<768px):
┌─────────────────────┐    ┌─────────────────────┐
│ Header  Header  ... │    │ ┌─────────────────┐ │
├─────────────────────┤    │ │ Card 1      [👁] │ │
│ Row 1               │    │ └─────────────────┘ │
│ Row 2               │    │ ┌─────────────────┐ │
│ ...                 │    │ │ Card 2      [👁] │ │
├─────────────────────┤    │ └─────────────────┘ │
│ Pagination          │    │ Pagination          │
└─────────────────────┘    └─────────────────────┘
                           [👁] abre Drawer con todos los campos
```

## Componentes

| Componente | Ubicación | Propósito |
|------------|-----------|-----------|
| `DataTable` | `components/data-table/data-table.tsx` | Router: detecta viewport y renderiza desktop/mobile |
| `DataTableDesktop` | `components/data-table/data-table-desktop.tsx` | Tabla HTML tradicional con TanStack Table |
| `DataTableMobile` | `components/data-table/data-table-mobile.tsx` | Lista de cards con drawer de detalles |
| `useDataTable` | `components/data-table/use-data-table.tsx` | Hook de configuración de TanStack Table |
| `TableLayout` | `components/layout/table-layout.tsx` | Layout wrapper para páginas con tablas |

## Uso Básico

```typescript
// 1. Configurar el hook
const { table } = useDataTable({
  columns,
  data: products,
  enableRowSelection: true,
  pageSize: 10,
});

// 2. Definir renderMobileCard
const renderMobileCard = useCallback((row: Row<Product>) => (
  <div className="space-y-2">
    <div className="font-medium">{row.original.name}</div>
    <div className="flex justify-between">
      <Badge>{row.original.category}</Badge>
      <span className="font-bold">{formatCurrency(row.original.price)}</span>
    </div>
    <div className="flex gap-2 pt-2 border-t">
      <Button variant="outline" size="sm">Editar</Button>
      <Button variant="ghost" size="sm"><Trash2 /></Button>
    </div>
  </div>
), []);

// 3. Renderizar
<DataTable
  table={table}
  mobileColumns={['name', 'price', 'category']}
  renderMobileCard={renderMobileCard}
/>
```

## renderMobileCard Pattern

Estructura recomendada para las cards móviles:

```typescript
const renderMobileCard = useCallback((row: Row<TData>) => (
  <div className="space-y-2">
    {/* 1. Título principal */}
    <div className="font-medium text-stone-900 dark:text-stone-100">
      {row.original.name}
    </div>

    {/* 2. Badges de estado */}
    <div className="flex items-center gap-2">
      <Badge variant="default">{row.original.type}</Badge>
      <Badge variant={row.original.active ? 'default' : 'destructive'}>
        {row.original.active ? 'Activo' : 'Inactivo'}
      </Badge>
    </div>

    {/* 3. Info secundaria + valor principal */}
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-500">{row.original.category}</span>
      <span className="font-medium">{formatCurrency(row.original.price)}</span>
    </div>

    {/* 4. Acciones (opcional) */}
    <div className="flex gap-2 pt-2 border-t border-stone-200 dark:border-stone-700">
      <Button variant="outline" size="sm" className="flex-1">
        <Pencil className="h-3 w-3 mr-1" /> Editar
      </Button>
      <Button variant="ghost" size="sm">
        <Trash2 className="h-4 w-4 text-red-600" />
      </Button>
    </div>
  </div>
), [dependencies]);
```

## DataTableMobile Features

1. **Checkbox de selección** (si `enableRowSelection: true`)
2. **Card personalizada** via `renderMobileCard`
3. **Botón de detalles** (👁) que abre Drawer con todos los campos
4. **Drawer lazy** - solo se renderiza cuando se abre
5. **Paginación** - misma que desktop

## TableLayout Wrapper

```typescript
import { TableLayout } from '~/components/layout/table-layout';

export default function ProductsPage() {
  return (
    <TableLayout>
      <TableLayout.Header>
        <h1 className="text-2xl font-bold">Productos</h1>
        <DataTableSearch table={table} placeholder="Buscar..." />
      </TableLayout.Header>

      <TableLayout.Actions>
        <FilterButton />
        {/* En mobile: botón se convierte en FAB */}
        <Button onClick={() => navigate('/products/new')}>
          <Plus /> Nuevo
        </Button>
      </TableLayout.Actions>

      <TableLayout.Content>
        <DataTable
          table={table}
          renderMobileCard={renderMobileCard}
        />
      </TableLayout.Content>
    </TableLayout>
  );
}
```

## useDataTable Config

```typescript
interface DataTableConfig<TData> {
  columns: ColumnDef<TData>[];      // Columnas TanStack Table
  data: TData[];                     // Datos
  mobileColumns?: string[];          // IDs de columnas para mobile (informativo)
  enableRowSelection?: boolean;      // Habilitar checkboxes
  onRowSelectionChange?: (rows: TData[]) => void;
  pageSize?: number;                 // Default: 10
  enableGlobalFilter?: boolean;      // Búsqueda global
  globalFilterFn?: FilterFn<TData>;  // Función de búsqueda custom
  getRowId?: (row: TData) => string; // Generador de ID
}

// Retorna
interface DataTableInstance<TData> {
  table: Table<TData>;               // Instancia TanStack Table
  selectedRows: TData[];             // Filas seleccionadas
  clearSelection: () => void;        // Limpiar selección
}
```

## Estructura de Card Mobile

```
┌─────────────────────────────────────────┐
│ ☑️  │ [Contenido Card]           │ 👁  │
│     │                            │     │
│     │ Título principal           │     │
│     │ [Badge] [Badge]            │     │
│     │ Info ─────────── $Valor    │     │
│     │ ─────────────────────────  │     │
│     │ [Editar] [Eliminar]        │     │
└─────────────────────────────────────────┘
```

- **☑️**: Checkbox (solo si `enableRowSelection`)
- **Contenido Card**: `renderMobileCard(row)`
- **👁**: Abre Drawer con todos los campos

## Drawer de Detalles (Automático)

El drawer muestra automáticamente todos los campos de la fila:

```
┌─────────────────────────────────┐
│      ═══════                    │ ← Drag handle
│ Detalles Completos              │
├─────────────────────────────────┤
│ Nombre                          │
│ Producto ABC                    │
│ ─────────────────────────────── │
│ Categoría                       │
│ Electrónicos                    │
│ ─────────────────────────────── │
│ Precio                          │
│ $150.00                         │
│ ...                             │
└─────────────────────────────────┘
```

## Checklist

- [ ] Usar `useDataTable` hook para configurar la tabla
- [ ] Implementar `renderMobileCard` con `useCallback`
- [ ] Seguir jerarquía: Título → Badges → Info/Valor → Acciones
- [ ] Soportar dark mode con `dark:` classes
- [ ] Usar `TableLayout` wrapper para consistencia
- [ ] Memoizar `renderMobileCard` con dependencias correctas
