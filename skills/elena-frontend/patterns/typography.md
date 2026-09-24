# Typography Conventions

Convenciones de tipografía para el proyecto.

## Fuente

- **Primary**: Inter
- **Fallback**: ui-sans-serif, system-ui, sans-serif

## Clases CSS Personalizadas

Definidas en `app.css` para uso responsive consistente:

| Clase | Mobile | Desktop | Uso |
|-------|--------|---------|-----|
| `.text-page-title` | 20px, weight 600 | 30px (lg+) | Títulos de página |
| `.text-section-title` | 18px, weight 600 | 20px (sm+) | Títulos de sección |
| `.text-muted` | 12px | 14px (sm+) | Texto secundario |

### Uso

```tsx
// Título de página
<h1 className="text-page-title">Productos</h1>

// Título de sección
<h2 className="text-section-title">Categorías</h2>

// Texto secundario
<p className="text-muted">Última actualización: hace 5 min</p>
```

## Escala de Tamaños (Tailwind)

| Clase | Tamaño | Uso típico |
|-------|--------|------------|
| `text-xs` | 12px | Metadata, badges, timestamps |
| `text-sm` | 14px | Labels, descripciones, items de lista |
| `text-base` | 16px | Texto de cuerpo |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 20px | Títulos pequeños |
| `text-2xl` | 24px | Títulos de página (alternativa) |
| `text-3xl` | 30px | Títulos grandes |

## Pesos de Fuente

| Clase | Peso | Uso |
|-------|------|-----|
| `font-normal` | 400 | Texto de cuerpo, descripciones |
| `font-medium` | 500 | Énfasis, labels |
| `font-semibold` | 600 | Títulos, nombres importantes |
| `font-bold` | 700 | Títulos principales, precios |

## Patrones Comunes

### Título con Descripción

```tsx
<div>
  <h1 className="text-2xl font-semibold">Crear Producto</h1>
  <p className="text-sm text-stone-500">Ingresa la información del producto</p>
</div>
```

### Item de Lista

```tsx
<div>
  <p className="text-sm font-medium text-stone-900 dark:text-stone-50 truncate">
    {item.name}
  </p>
  <p className="text-xs text-stone-500 dark:text-stone-400">
    {item.description}
  </p>
</div>
```

### Precio/Valor

```tsx
<span className="text-lg font-bold">{formatCurrency(price)}</span>
// o para valores secundarios
<span className="text-sm font-medium">{formatCurrency(subtotal)}</span>
```

### Metadata

```tsx
<div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
  <span>{date}</span>
  <span>{category}</span>
</div>
```

## Colores de Texto

| Clase | Uso |
|-------|-----|
| `text-stone-900 dark:text-stone-50` | Texto principal |
| `text-stone-500 dark:text-stone-400` | Texto secundario |
| `text-muted-foreground` | Texto muted (usa CSS variable) |
| `text-primary` | Texto de acción/enlace |
| `text-destructive` | Texto de error/peligro |

## Utilidades de Texto

```tsx
// Truncar texto largo
<p className="truncate">Texto muy largo...</p>

// Limitar líneas
<p className="line-clamp-2">Descripción que puede ser larga...</p>

// Balance para títulos
<h1 className="text-balance">Título que se balancea bien</h1>

// Interlineado ajustado
<p className="leading-snug">Texto compacto</p>
<p className="leading-normal">Texto normal</p>
```

## Checklist

- [ ] Usar `.text-page-title` para títulos de página
- [ ] Usar `.text-section-title` para secciones
- [ ] Usar `text-sm` como base para items/labels
- [ ] Combinar tamaño + peso apropiado
- [ ] Incluir clases `dark:` para dark mode
- [ ] Usar `truncate` o `line-clamp-*` para texto largo
