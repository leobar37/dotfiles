# Layout Components

Componentes de layout para diferentes casos de uso.

## PageLayout

Layout base para páginas con header y contenido.

```typescript
// components/layouts/page-layout.tsx
import { cn } from '~/lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {children}
    </div>
  );
}
```

## PageHeader

Header de página con título, descripción y acciones.

```typescript
// components/layouts/page-header.tsx
import { cn } from '~/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
      'pb-4 border-b mb-6',
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

// Uso:
<PageHeader
  title="Productos"
  description="Gestiona tu catálogo de productos"
  actions={
    <>
      <Button variant="outline">Exportar</Button>
      <Button onClick={() => modal.open()}>Nuevo Producto</Button>
    </>
  }
/>
```

## TwoPanelLayout

Layout de dos paneles para desktop (master-detail, POS, etc.).

```typescript
// components/layouts/two-panel-layout.tsx
import { cn } from '~/lib/utils';

interface TwoPanelLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: 'w-1/2' | 'w-2/5' | 'w-3/5' | 'w-1/3' | 'w-2/3';
  className?: string;
}

export function TwoPanelLayout({
  left,
  right,
  leftWidth = 'w-3/5',
  className,
}: TwoPanelLayoutProps) {
  const rightWidth = {
    'w-1/2': 'w-1/2',
    'w-2/5': 'w-3/5',
    'w-3/5': 'w-2/5',
    'w-1/3': 'w-2/3',
    'w-2/3': 'w-1/3',
  }[leftWidth];

  return (
    <div className={cn('flex h-screen overflow-hidden', className)}>
      <div className={cn(leftWidth, 'border-r flex flex-col overflow-hidden')}>
        {left}
      </div>
      <div className={cn(rightWidth, 'flex flex-col overflow-hidden')}>
        {right}
      </div>
    </div>
  );
}

// Uso:
<TwoPanelLayout
  leftWidth="w-3/5"
  left={<ProductsPanel />}
  right={<CartPanel />}
/>
```

## ScrollableContent

Contenedor con scroll que respeta headers/footers fijos.

```typescript
// components/layouts/scrollable-content.tsx
import { cn } from '~/lib/utils';

interface ScrollableContentProps {
  children: React.ReactNode;
  className?: string;
  paddingBottom?: string; // Para fixed footers
}

export function ScrollableContent({
  children,
  className,
  paddingBottom,
}: ScrollableContentProps) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto', className)}
      style={{ paddingBottom }}
    >
      {children}
    </div>
  );
}

// Uso con fixed footer:
<div className="flex flex-col h-screen">
  <Header />
  <ScrollableContent paddingBottom="180px">
    <Content />
  </ScrollableContent>
  <FixedFooter /> {/* height: ~180px */}
</div>
```

## FixedFooter

Footer fijo en la parte inferior.

```typescript
// components/layouts/fixed-footer.tsx
import { cn } from '~/lib/utils';

interface FixedFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function FixedFooter({ children, className }: FixedFooterProps) {
  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0',
      'bg-background border-t p-4',
      'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]',
      'z-10',
      className
    )}>
      {children}
    </div>
  );
}

// Uso:
<FixedFooter>
  <div className="flex justify-between items-center">
    <span className="text-lg font-semibold">Total: $100</span>
    <Button>Confirmar</Button>
  </div>
</FixedFooter>
```

## StickyHeader

Header que se queda fijo al hacer scroll.

```typescript
// components/layouts/sticky-header.tsx
import { cn } from '~/lib/utils';

interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyHeader({ children, className }: StickyHeaderProps) {
  return (
    <div className={cn(
      'sticky top-0 z-10',
      'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      'border-b',
      className
    )}>
      {children}
    </div>
  );
}
```

## EmptyState

Estado vacío para listas sin datos.

```typescript
// components/layouts/empty-state.tsx
import { cn } from '~/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Uso:
<EmptyState
  icon={Package}
  title="No hay productos"
  description="Agrega tu primer producto para empezar"
  action={{
    label: 'Agregar Producto',
    onClick: () => modal.open(),
  }}
/>
```

## CardGrid

Grid responsivo de cards.

```typescript
// components/layouts/card-grid.tsx
import { cn } from '~/lib/utils';

interface CardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: CardGridProps) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  }[columns];

  const gapClass = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  return (
    <div className={cn('grid', colsClass, gapClass, className)}>
      {children}
    </div>
  );
}

// Uso:
<CardGrid columns={3} gap="md">
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</CardGrid>
```

## Tabs Layout

Layout con tabs para navegación interna.

```typescript
// components/layouts/tabs-layout.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { cn } from '~/lib/utils';

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabsLayoutProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

export function TabsLayout({ tabs, defaultValue, className }: TabsLayoutProps) {
  return (
    <Tabs defaultValue={defaultValue || tabs[0]?.value} className={className}>
      <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
        {tabs.map(tab => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'rounded-none border-b-2 border-transparent',
              'data-[state=active]:border-primary data-[state=active]:bg-transparent',
              'px-4 py-2'
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(tab => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Uso:
<TabsLayout
  tabs={[
    { value: 'general', label: 'General', content: <GeneralSettings /> },
    { value: 'security', label: 'Seguridad', content: <SecuritySettings /> },
    { value: 'billing', label: 'Facturación', content: <BillingSettings /> },
  ]}
/>
```

## Ejemplo Completo: Página de Lista

```typescript
// routes/_protected.products.tsx
import { PageLayout } from '~/components/layouts/page-layout';
import { PageHeader } from '~/components/layouts/page-header';
import { CardGrid } from '~/components/layouts/card-grid';
import { EmptyState } from '~/components/layouts/empty-state';
import { StickyHeader } from '~/components/layouts/sticky-header';
import { Button } from '~/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { useProducts } from '~/features/products/hooks/use-products';
import { ProductCard } from '~/features/products/components/product-card';
import { useCreateProductModal } from '~/features/products/modals/create-product-modal';

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts();
  const createModal = useCreateProductModal();

  return (
    <PageLayout>
      <div className="container py-6">
        <PageHeader
          title="Productos"
          description="Gestiona tu catálogo de productos"
          actions={
            <Button onClick={() => createModal.open()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          }
        />

        {isLoading ? (
          <ProductGridSkeleton />
        ) : products?.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No hay productos"
            description="Agrega tu primer producto para empezar a vender"
            action={{
              label: 'Agregar Producto',
              onClick: () => createModal.open(),
            }}
          />
        ) : (
          <CardGrid columns={3}>
            {products?.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </CardGrid>
        )}
      </div>
    </PageLayout>
  );
}
```
