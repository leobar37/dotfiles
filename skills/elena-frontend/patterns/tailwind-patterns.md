# TailwindCSS v4 Patterns

Patrones avanzados y configuraciones para TailwindCSS v4.

## Configuración v4

### tailwind.config.ts (v4)

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  // v4: CSS-in-JS configuration
  css: `
    @theme {
      /* Custom colors */
      --color-success-50: #f0fdf4;
      --color-success-500: #22c55e;
      --color-success-600: #16a34a;

      --color-warning-50: #fffbeb;
      --color-warning-500: #f59e0b;
      --color-warning-600: #d97706;

      /* Custom spacing */
      --spacing-18: 4.5rem;
      --spacing-88: 22rem;

      /* Custom breakpoints */
      --breakpoint-3xl: 1600px;

      /* Custom animations */
      --animate-float: float 3s ease-in-out infinite;
      --animate-slide-in: slide-in 0.3s ease-out;
      --animate-fade-in: fade-in 0.3s ease-out;

      /* Custom font families */
      --font-mono: 'JetBrains Mono', ui-monospace, monospace;

      /* Custom radius */
      --radius-xl: 0.75rem;
      --radius-2xl: 1rem;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    @keyframes slide-in {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(0); }
    }

    @keyframes fade-in {
      0% { opacity: 0; transform: translateY(10px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    /* Container configuration */
    @container {
      center: true;
      padding: 2rem;
      screens: 3xl;
    }
  `,
  plugins: [
    require('@tailwindcss/vite'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
}

export default config
```

### CSS v4 Syntax

```css
@import 'tailwindcss';

@theme {
  /* Define custom properties directly */
  --color-brand: #3b82f6;
  --color-brand-foreground: #ffffff;

  /* Custom component classes */
  --component-button-bg: var(--color-brand);
  --component-button-text: var(--color-brand-foreground);
  --component-button-padding: 0.5rem 1rem;
}

/* Component utilities with @utility */
@utility glass {
  backdrop-filter: blur(8px);
  background-color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@utility glass-dark {
  backdrop-filter: blur(8px);
  background-color: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Custom variant utilities */
@utility card-hover {
  transition: all 0.2s;
}

@utility card-hover:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1);
}

/* Grid utilities */
@utility grid-stats-4 {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (width >= 640px) {
  @utility grid-stats-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width >= 1024px) {
  @utility grid-stats-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@utility grid-content-2 {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (width >= 768px) {
  @utility grid-content-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Size utilities */
@utility size-xs {
  width: 0.75rem;
  height: 0.75rem;
}

@utility size-sm {
  width: 1rem;
  height: 1rem;
}

@utility size-md {
  width: 1.25rem;
  height: 1.25rem;
}

@utility size-lg {
  width: 1.5rem;
  height: 1.5rem;
}

@utility size-xl {
  width: 2rem;
  height: 2rem;
}

/* Safe area utilities */
@utility safe-top {
  padding-top: env(safe-area-inset-top);
}

@utility safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Component Patterns v4

### 1. Component Classes with @apply

```css
@component Button {
  @apply inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all;
  padding: var(--component-button-padding);
  background-color: var(--component-button-bg);
  color: var(--component-button-text);

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }

  &--variant-outline {
    background-color: transparent;
    border: 1px solid currentColor;
  }

  &--variant-ghost {
    background-color: transparent;

    &:hover {
      background-color: var(--color-accent);
    }
  }

  &--size-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
  }

  &--size-lg {
    padding: 0.75rem 1.5rem;
    font-size: 1.125rem;
  }
}

@component Card {
  @apply rounded-xl border bg-card text-card-foreground;

  &--interactive {
    @apply cursor-pointer transition-all;

    &:hover {
      @apply shadow-lg scale-[1.02];
    }
  }
}
```

### 2. Using Components in React

```typescript
// tailwind.config.ts - Define components
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  css: `
    @theme {
      --component-card-padding: 1.5rem;
    }

    @component Card {
      @apply rounded-xl border bg-card text-card-foreground;
      padding: var(--component-card-padding);
    }

    @component CardHeader {
      @apply space-y-1.5;
    }

    @component CardTitle {
      @apply text-2xl font-semibold leading-none tracking-tight;
    }

    @component CardDescription {
      @apply text-sm text-muted-foreground;
    }

    @component CardContent {
      @apply pt-6;
    }
  `,
}

// React component
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return <div className={cn('Card', className)}>{children}</div>
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('CardHeader', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('CardTitle', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('CardDescription', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('CardContent', className)} {...props} />
}
```

## Advanced Patterns v4

### 1. Container Queries

```typescript
// Using v4's built-in container queries
function ProductGrid({ products }) {
  return (
    <div className="@container">
      <div className="@lg:grid-cols-3 @md:grid-cols-2 @sm:grid-cols-1 grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="@container/card">
            {/* Smaller container for card-specific queries */}
            <div className="@sm/card:flex @sm/card:items-center @sm/card:gap-4 space-y-4">
              <img
                src={product.image}
                alt={product.name}
                className="@sm/card:w-24 @sm/card:h-24 w-full h-48 object-cover rounded-lg"
              />
              <div className="space-y-2">
                <h3 className="@lg/card:text-lg @lg/card:font-semibold">
                  {product.name}
                </h3>
                <p className="@sm/card:line-clamp-2 text-sm text-muted-foreground">
                  {product.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Variant Groups

```css
/* CSS with variant groups */
@utility btn {
  @apply inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all;
  padding: 0.5rem 1rem;

  &-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90;
  }

  &-secondary {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
  }

  &-outline {
    @apply border border-input bg-background hover:bg-accent hover:text-accent-foreground;
  }

  &-ghost {
    @apply hover:bg-accent hover:text-accent-foreground;
  }

  &-sm {
    @apply h-9 rounded-md px-3 text-xs;
  }

  &-lg {
    @apply h-11 rounded-md px-8;
  }

  &-icon {
    @apply h-10 w-10;
  }
}
```

### 3. Dynamic Values with CSS Variables

```typescript
function DynamicCard({ padding = 'p-6', rounded = 'rounded-xl' }) {
  return (
    <div
      className={cn(
        'border bg-card text-card-foreground transition-all',
        padding,
        rounded
      )}
      style={{
        // v4: Direct style binding with CSS variables
        '--card-shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        '--card-shadow-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      } as React.CSSProperties}
    >
      {/* Content */}
    </div>
  );
}
```

### 4. Animation Presets v4

```css
/* Define animation utilities */
@utility fade-in {
  animation: var(--animate-fade-in);
}

@utility slide-in {
  animation: var(--animate-slide-in);
}

@utility float {
  animation: var(--animate-float);
}

/* Stagger animations */
@utility stagger {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0;
}

@utility stagger-delay-1 {
  animation-delay: 0.1s;
}

@utility stagger-delay-2 {
  animation-delay: 0.2s;
}

@utility stagger-delay-3 {
  animation-delay: 0.3s;
}

@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 5. Dark Mode v4

```css
/* v4 simplified dark mode */
@theme {
  /* Light mode (default) */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;

  /* Dark mode will override these */
}

@media (prefers-color-scheme: dark) {
  @theme {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

/* Or with class-based dark mode */
.dark {
  @theme {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

/* Custom dark mode components */
@component ThemeToggle {
  @apply relative inline-flex h-6 w-11 items-center rounded-full transition-colors;
  background-color: var(--color-muted);

  &:hover {
    background-color: var(--color-muted-foreground);
  }

  .dark & {
    background-color: var(--color-primary);
  }

  &-thumb {
    @apply inline-block h-4 w-4 transform rounded-full bg-white transition-transform;
    translate: 0.25rem;
  }

  .dark & &-thumb {
    translate: 1.25rem;
  }
}
```

## Performance Optimizations v4

### 1. Lazy Loading Components

```typescript
import { lazy } from 'react';

// v4: Dynamic imports with CSS
const LazyComponent = lazy(() => import('./HeavyComponent'));

// In your component
function App() {
  return (
    <div>
      <LazyComponent className="animate-fade-in" />
    </div>
  );
}
```

### 2. CSS Tree Shaking

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite';

export default {
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          // v4: Optimize for production
          optimize: true,
          // Only scan used files
          content: [
            './src/**/*.{js,ts,jsx,tsx}',
          ],
        }),
      ],
    },
  },
};
```

### 3. Component Isolation

```css
/* Scoped component styles */
@component ProductCard {
  @apply relative overflow-hidden rounded-xl border bg-card;

  /* Only applies to this component */
  &__image {
    @apply aspect-square object-cover;
    transition: transform 0.3s;
  }

  &:hover &__image {
    transform: scale(1.05);
  }

  &__content {
    @apply p-4;
  }

  &__title {
    @apply font-semibold text-lg;
  }

  &__price {
    @apply text-2xl font-bold text-primary;
  }
}
```

## Migration from v3 to v4

### Key Changes

1. **Configuration**: Now in CSS with `@theme`
2. **Components**: Use `@component` instead of custom CSS
3. **Utilities**: Use `@utility` for custom utilities
4. **Variants**: Built-in variant support
5. **Container Queries**: Native support

### Migration Script

```typescript
// migration-helper.ts
const v3ToV4Mapping = {
  // v3 → v4 syntax changes
  'extend.colors': '--color-',
  'extend.spacing': '--spacing-',
  'extend.animation': '--animate-',
  'theme.extend.screens': '@media queries',
};

// Example migration
const migrateColors = (v3Colors: Record<string, any>) => {
  const v4Theme: string[] = [];

  for (const [key, value] of Object.entries(v3Colors)) {
    if (typeof value === 'string') {
      v4Theme.push(`--color-${key}: ${value};`);
    } else if (typeof value === 'object') {
      for (const [shade, color] of Object.entries(value)) {
        v4Theme.push(`--color-${key}-${shade}: ${color};`);
      }
    }
  }

  return v4Theme.join('\n  ');
};
```

## Checklist v4

- [ ] Using `@theme` for configuration
- [ ] Components defined with `@component`
- [ ] Custom utilities with `@utility`
- [ ] Container queries enabled
- [ ] CSS variables for dynamic values
- [ ] Optimized build with Vite plugin
- [ ] Dark mode configured properly
- [ ] Performance monitoring for bundle size
- [ ] Migration from v3 completed
- [ ] Team trained on v4 syntax