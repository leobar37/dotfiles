# Item Component

Compound component para renderizar items de lista con estructura consistente.

## Ubicación

`components/ui/item.tsx`

## Estructura

```
┌─────────────────────────────────────────────────────┐
│ ┌──────┐                                    ┌─────┐ │
│ │Media │  Title                             │ Act │ │
│ │(icon)│  Description                       │ions │ │
│ └──────┘                                    └─────┘ │
└─────────────────────────────────────────────────────┘
```

## Componentes

| Componente | Propósito |
|------------|-----------|
| `Item` | Contenedor principal |
| `ItemMedia` | Icono o imagen (izquierda) |
| `ItemContent` | Contenedor de texto |
| `ItemTitle` | Título principal |
| `ItemDescription` | Descripción secundaria |
| `ItemActions` | Botones/acciones (derecha) |
| `ItemHeader` | Header con justify-between |
| `ItemFooter` | Footer con justify-between |

## Props de Item

```typescript
interface ItemProps {
  variant?: 'default' | 'outline' | 'muted';
  size?: 'default' | 'sm';
  className?: string;
}
```

| Variant | Estilo |
|---------|--------|
| `default` | Sin borde, fondo transparente |
| `outline` | Con borde `border rounded-lg` |
| `muted` | Fondo muted `bg-muted/50` |

| Size | Padding |
|------|---------|
| `default` | `p-3` |
| `sm` | `p-2` |

## Uso Básico

```tsx
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '~/components/ui/item';

<Item variant="outline">
  <ItemMedia>
    <User className="h-5 w-5" />
  </ItemMedia>

  <ItemContent>
    <ItemTitle>Juan Pérez</ItemTitle>
    <ItemDescription>cliente@email.com</ItemDescription>
  </ItemContent>

  <ItemActions>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </ItemActions>
</Item>
```

## Ejemplos

### Item de Producto

```tsx
<Item variant="outline">
  <ItemMedia>
    <img src={product.image} className="h-10 w-10 rounded object-cover" />
  </ItemMedia>

  <ItemContent>
    <ItemTitle>{product.name}</ItemTitle>
    <ItemDescription>{product.category}</ItemDescription>
  </ItemContent>

  <ItemActions>
    <span className="font-bold">{formatCurrency(product.price)}</span>
  </ItemActions>
</Item>
```

### Item de Cliente

```tsx
<Item variant="outline" size="sm">
  <ItemMedia>
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
      <span className="text-sm font-medium">{getInitials(customer.name)}</span>
    </div>
  </ItemMedia>

  <ItemContent>
    <ItemTitle>{customer.name}</ItemTitle>
    <ItemDescription>
      {customer.phone} · {customer.ordersCount} órdenes
    </ItemDescription>
  </ItemContent>
</Item>
```

### Item de Orden

```tsx
<Item variant="outline">
  <ItemContent>
    <ItemHeader>
      <ItemTitle>Orden #{order.id}</ItemTitle>
      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
        {order.status}
      </Badge>
    </ItemHeader>

    <ItemDescription>
      {order.customer} · {order.itemCount} items
    </ItemDescription>

    <ItemFooter>
      <span className="text-xs text-muted-foreground">
        {formatTime(order.createdAt)}
      </span>
      <span className="font-bold">{formatCurrency(order.total)}</span>
    </ItemFooter>
  </ItemContent>
</Item>
```

### Item con Acciones Múltiples

```tsx
<Item variant="outline">
  <ItemMedia>
    <Package className="h-5 w-5 text-muted-foreground" />
  </ItemMedia>

  <ItemContent>
    <ItemTitle>{item.name}</ItemTitle>
    <ItemDescription>Stock: {item.stock} unidades</ItemDescription>
  </ItemContent>

  <ItemActions>
    <Button variant="ghost" size="icon">
      <Pencil className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  </ItemActions>
</Item>
```

### Lista de Items

```tsx
<div className="space-y-2">
  {items.map((item) => (
    <Item key={item.id} variant="outline">
      <ItemContent>
        <ItemTitle>{item.name}</ItemTitle>
        <ItemDescription>{item.description}</ItemDescription>
      </ItemContent>
    </Item>
  ))}
</div>
```

## Estilos Internos

```tsx
// ItemMedia
className="flex shrink-0 items-center justify-center size-10"
// o size-8 para size="sm"

// ItemContent
className="flex min-w-0 flex-1 flex-col gap-1"

// ItemTitle
className="flex w-fit items-center gap-2 text-sm leading-snug font-medium"

// ItemDescription
className="text-muted-foreground line-clamp-2 text-sm leading-normal font-normal"

// ItemActions
className="flex shrink-0 items-center gap-1"

// ItemHeader/Footer
className="flex items-center justify-between gap-2"
```

## Cuándo Usar

- Listas de productos, clientes, órdenes
- Items en sidebars o menús
- Cards de selección
- Resultados de búsqueda
- Cualquier lista estructurada

## Checklist

- [ ] Usar `variant="outline"` para items en listas
- [ ] Incluir `ItemMedia` para iconos/imágenes
- [ ] Usar `ItemTitle` + `ItemDescription` para jerarquía
- [ ] Usar `ItemHeader`/`ItemFooter` para layouts complejos
- [ ] Agregar `ItemActions` para botones de acción
- [ ] Usar `size="sm"` para listas compactas
