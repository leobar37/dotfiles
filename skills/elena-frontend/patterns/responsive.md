# Responsive Patterns (Mobile-First)

Patrones para diseño responsive con React y TailwindCSS.

## Hooks de Responsive

### useMediaQuery (Base)

```typescript
// hooks/use-media-query.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

### useIsMobile

```typescript
// hooks/use-mobile.ts
import { useMediaQuery } from './use-media-query';

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}
```

### useResponsive (Completo)

```typescript
// hooks/use-responsive.ts
import { useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';
type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useResponsive() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    let timeoutId: number;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setWidth(window.innerWidth), 50);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;

  const current: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const breakpoint: Breakpoint =
    width < BREAKPOINTS.sm ? 'sm' :
    width < BREAKPOINTS.md ? 'md' :
    width < BREAKPOINTS.lg ? 'lg' :
    width < BREAKPOINTS.xl ? 'xl' : '2xl';

  return { isMobile, isTablet, isDesktop, current, breakpoint, width };
}
```

## Renderizado Condicional (NO hidden/block)

### Patrón Correcto

```typescript
// Correcto - Solo renderiza el componente necesario
function ProductPage() {
  const isMobile = useIsMobile();

  return isMobile ? <MobileProductView /> : <DesktopProductView />;
}
```

### Patrón Incorrecto

```typescript
// Incorrecto - Ambos componentes se renderizan, solo se ocultan
function ProductPage() {
  return (
    <>
      <div className="hidden md:block"><DesktopProductView /></div>
      <div className="block md:hidden"><MobileProductView /></div>
    </>
  );
}
```

## Layout POS: Two-Panel Desktop

```
DESKTOP (>= 768px):
┌─────────────────────────┬─────────────────┐
│ PRODUCTOS (60%)         │ CARRITO (40%)   │
│ ┌─────────────────────┐ │ ┌─────────────┐ │
│ │ Search + Filters    │ │ │ Items List  │ │
│ ├─────────────────────┤ │ │             │ │
│ │ Product Grid        │ │ │             │ │
│ │ (2-3 columns)       │ │ ├─────────────┤ │
│ │                     │ │ │ Totals      │ │
│ │                     │ │ │ Actions     │ │
│ └─────────────────────┘ │ └─────────────┘ │
└─────────────────────────┴─────────────────┘
```

```typescript
// features/pos/components/desktop-layout.tsx
export function DesktopPOSLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Panel Izquierdo: 60% - Productos */}
      <div className="w-3/5 border-r flex flex-col">
        <div className="p-4 border-b shrink-0">
          <SearchBar />
          <CategoryTabs />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid columns={3} />
        </div>
      </div>

      {/* Panel Derecho: 40% - Carrito */}
      <div className="w-2/5 flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <CartItemsList />
        </div>
        <div className="border-t p-4 shrink-0">
          <CartTotals />
          <CheckoutButton />
        </div>
      </div>
    </div>
  );
}
```

## Layout POS: Mobile Multi-Step

```
MOBILE (< 768px):
┌─────────────────────────┐
│ Header + Progress (1/4) │ ← Sticky
├─────────────────────────┤
│                         │
│    Content (scroll)     │
│                         │
│                         │
│               ┌───────┐ │
│               │  FAB  │ │ ← Fixed bottom-right
│               └───────┘ │
└─────────────────────────┘

O con fixed footer:
┌─────────────────────────┐
│ Header + Progress       │
├─────────────────────────┤
│    Content (scroll)     │
│    pb-[200px]           │ ← Padding para footer
├─────────────────────────┤
│ Fixed Footer            │ ← Fixed, shadow negativo
│ [Totals + Actions]      │
└─────────────────────────┘
```

### Mobile Header con Progress

```typescript
// features/pos/components/mobile/mobile-header.tsx
import { ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface MobileHeaderProps {
  title: string;
  step?: number;
  totalSteps?: number;
  showBack?: boolean;
  onBack?: () => void;
}

export function MobileHeader({
  title,
  step,
  totalSteps = 4,
  showBack,
  onBack
}: MobileHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      <div className="flex items-center justify-between px-4 py-3">
        {showBack ? (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="w-10" />
      </div>

      {step !== undefined && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < step ? 'bg-primary' :
                  i === step ? 'bg-primary/50' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            Paso {step + 1} de {totalSteps}
          </p>
        </div>
      )}
    </div>
  );
}
```

### Floating Action Button (FAB)

```typescript
// features/pos/components/mobile/floating-cart-button.tsx
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useCartStore } from '../../context/cart-context';
import { formatCurrency } from '~/lib/utils';

export const FloatingCartButton = observer(function FloatingCartButton() {
  const store = useCartStore();
  const navigate = useNavigate();

  if (store.isEmpty) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className="h-14 px-6 shadow-lg rounded-full gap-3"
        onClick={() => navigate('/pos/mobile/cart')}
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
            {store.itemCount}
          </span>
        </div>
        <span className="font-bold">{formatCurrency(store.total)}</span>
      </Button>
    </div>
  );
});
```

### Fixed Footer con Shadow

```typescript
// features/pos/components/mobile/mobile-cart-footer.tsx
import { observer } from 'mobx-react-lite';
import { Button } from '~/components/ui/button';
import { useCartStore } from '../../context/cart-context';
import { formatCurrency } from '~/lib/utils';

export const MobileCartFooter = observer(function MobileCartFooter() {
  const store = useCartStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm">
          Descuento
        </Button>
        <Button variant="outline" size="sm">
          Dividir
        </Button>
      </div>

      {/* Totals */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-xl font-bold">{formatCurrency(store.total)}</span>
      </div>

      {/* Main action */}
      <Button className="w-full h-12" disabled={store.isEmpty}>
        Continuar al Pago
      </Button>
    </div>
  );
});

// En el contenido, agregar padding inferior
function MobileCartContent() {
  return (
    <div className="p-4 pb-[220px]"> {/* Espacio para el footer fijo */}
      <CartItemsList />
    </div>
  );
}
```

## Routing Responsive

```typescript
// routes/_protected.pos.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useIsMobile } from '~/hooks/use-mobile';
import { CartProvider } from '~/features/pos/context/cart-context';
import { DesktopPOSLayout } from '~/features/pos/components/desktop-layout';

export default function POSPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect basado en dispositivo
  useEffect(() => {
    const isMobilePath = location.pathname.includes('/pos/mobile');

    if (isMobile && !isMobilePath) {
      navigate('/pos/mobile/products', { replace: true });
    } else if (!isMobile && isMobilePath) {
      navigate('/pos', { replace: true });
    }
  }, [isMobile, location.pathname, navigate]);

  return (
    <CartProvider>
      {location.pathname.includes('/pos/mobile') ? (
        <Outlet /> {/* Rutas móviles anidadas */}
      ) : (
        <DesktopPOSLayout />
      )}
    </CartProvider>
  );
}
```

## Breakpoints Reference

| Breakpoint | Min Width | Tailwind Prefix |
|------------|-----------|-----------------|
| sm | 640px | `sm:` |
| md | 768px | `md:` |
| lg | 1024px | `lg:` |
| xl | 1280px | `xl:` |
| 2xl | 1536px | `2xl:` |

## Checklist

- [ ] Usa `useIsMobile()` o `useResponsive()` para detección
- [ ] Renderizado condicional (NO hidden/block para layouts complejos)
- [ ] Mobile: Header sticky con progress bar
- [ ] Mobile: FAB o Fixed footer (no ambos)
- [ ] Mobile: Padding inferior suficiente para footer fijo
- [ ] Desktop: Panels con flex y overflow correcto
- [ ] Rutas separadas para mobile si flujo es muy diferente
