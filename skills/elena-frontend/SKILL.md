---
name: elena-frontend
description: |
  Expert in modern React frontend architecture with feature-based organization
  and type-safe API integration. Use when building React UI, forms, modals,
  responsive layouts, data tables, typography, or API clients with Eden Treaty.
  MUST use form wrappers (FormInput, FormSelect) - NEVER use native inputs.
  MUST use TanStack Query + Eden Treaty - NEVER use fetch.
  MUST organize by features - NEVER put forms loose in components/.
  Triggers: react, form, modal, drawer, table, responsive, mobile, DataTable,
  useQuery, MobX, shadcn, TailwindCSS, POS, cart, typography, layout, grid, Item,
  api client, fetch, eden treaty, type-safe api, axios alternative, feature based,
  form input, FormInput, form wrapper, tanstack query.
---

# React Frontend Architecture Expert (Elena)

Expert in modern React frontend architecture with file-based routing.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| React Router v7 | File-based routing |
| TanStack Query | Server state |
| React Hook Form + Zod | Forms & validation |
| TailwindCSS + shadcn/ui | Styling |
| Jotai | Modal state |
| MobX | Complex state |
| TypeScript | Type safety |

## Architecture Overview

This skill assumes a **monorepo setup**. For initial project structure and monorepo configuration, see `fullstack-infrastructure` skill.

This skill focuses on **internal frontend organization** and component patterns.

### Key Principles

1. **Feature-Based Organization**: All code organized by feature, not by type
2. **Component Patterns**: Reusable UI components with consistent patterns
3. **Form Standards**: Strict form implementation standards
4. **State Management**: Clear patterns for local and global state

### Project Structure

For complete monorepo structure (packages/, workspaces), see: `fullstack-infrastructure/patterns/01-project-structure.md`

For feature organization within `app/`, see: `patterns/feature-based-structure.md`

## Pattern Documentation

For detailed implementation patterns, see:

| Pattern | File | Use Case |
|---------|------|----------|
| **Modals** | `patterns/create-modal.md` | Dialog, Sheet, Drawer, Responsive |
| **MobX Stores** | `patterns/mobx-stores.md` | Cart, Wizard, Complex state |
| **Responsive** | `patterns/responsive.md` | Mobile-first, POS layouts, hooks |
| **Responsive Tables** | `patterns/responsive-tables.md` | DataTable desktop/mobile, cards, drawer |
| **Typography** | `patterns/typography.md` | Clases de texto, tamaños, pesos, colores |
| **Layouts** | `patterns/layouts.md` | Container, Section, Stack, grids CSS |
| **Data Fetching** | `patterns/data-fetching.md` | Queries, mutations, cache |
| **Feature Structure** | `patterns/feature-based-structure.md` | Organization by features |
| **Form Template** | `patterns/form-feature-template.md` | Complete form template (OBLIGATORY) |
| **Eden Treaty** | `patterns/eden-treaty.md` | Type-safe API client for Elysia |
| **shadcn/ui Components** | `patterns/shadcn-components.md` | Component library patterns, forms, dialogs |
| **TailwindCSS** | `patterns/tailwind-patterns.md` | Advanced configurations, custom utilities, animations |
| **File/Asset Hooks** | `patterns/file-asset-hooks.md` | useAssets, useFiles, upload/delete hooks |

## Component Documentation

| Component | File | Description |
|-----------|------|-------------|
| **Forms** | `components/forms.md` | FormInput, FormSelect, validation |
| **Layouts** | `components/layouts.md` | Two-panel, multi-step, FAB |
| **Item** | `components/item.md` | Compound component para listas |

## Checklists

| Checklist | File |
|-----------|------|
| New Feature | `checklists/new-feature.md` |

## Quick Reference

### Modal Usage
```typescript
// 1. Create modal
const [Modal, useModal] = createModal(Content, { type: 'responsive' });

// 2. Render at root
<Modal />

// 3. Use hook
const modal = useModal();
modal.open({ data });
```

### Query Pattern
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['items', filters],
  queryFn: () => api.items.get({ query: filters }),
});
```

### Form Pattern
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
});

<FormProvider {...form}>
  <FormInput name="field" label="Label" />
</FormProvider>
```

### Responsive Check
```typescript
const isMobile = useIsMobile();
return isMobile ? <MobileView /> : <DesktopView />;
```

### Responsive Table
```typescript
const { table } = useDataTable({ columns, data });

<DataTable
  table={table}
  renderMobileCard={(row) => (
    <div className="space-y-2">
      <div className="font-medium">{row.original.name}</div>
      <Badge>{row.original.status}</Badge>
    </div>
  )}
/>
```

### Typography Classes
```tsx
<h1 className="text-page-title">Título de Página</h1>
<h2 className="text-section-title">Sección</h2>
<p className="text-muted">Texto secundario</p>
```

### Layout Grids
```tsx
{/* Stats responsive: 1→2→4 cols */}
<div className="grid-stats-4 gap-4">
  <StatCard />
</div>

{/* Content responsive: 1→2 cols */}
<div className="grid-content-2 gap-4">
  <FormInput />
</div>
```

### Item Component
```tsx
<Item variant="outline">
  <ItemMedia><Icon /></ItemMedia>
  <ItemContent>
    <ItemTitle>Nombre</ItemTitle>
    <ItemDescription>Descripción</ItemDescription>
  </ItemContent>
  <ItemActions><Button /></ItemActions>
</Item>
```

## When to Use

- Creating new pages/features
- Building modals or drawers
- Implementing forms
- Fetching data from API
- Building responsive layouts
- Building responsive tables (DataTable)
- Styling text (typography classes)
- Creating list items (Item component)
- Managing complex state with MobX

## Common Mistakes

See `checklists/new-feature.md` for anti-patterns to avoid.
