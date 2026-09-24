# Data Fetching Patterns

Patrones para TanStack Query con Eden Treaty.

## Setup del Cliente

```typescript
// lib/api.ts
import { treaty } from '@elysiajs/eden';
import type { App } from '@backend/index';

export const api = treaty<App>(import.meta.env.VITE_API_URL, {
  fetch: {
    credentials: 'include', // Para cookies de sesión
  },
});
```

## Query Keys Factory

```typescript
// features/items/hooks/keys.ts
export const itemKeys = {
  all: ['items'] as const,
  lists: () => [...itemKeys.all, 'list'] as const,
  list: (filters: ItemFilters) => [...itemKeys.lists(), filters] as const,
  details: () => [...itemKeys.all, 'detail'] as const,
  detail: (id: string) => [...itemKeys.details(), id] as const,
};

// Uso:
// itemKeys.all          → ['items']
// itemKeys.list({})     → ['items', 'list', {}]
// itemKeys.detail('1')  → ['items', 'detail', '1']
```

## Query: Lista con Filtros

```typescript
// features/items/hooks/use-items.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '~/lib/api';
import { itemKeys } from './keys';

interface ItemFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}

export function useItems(filters: ItemFilters = {}) {
  return useQuery({
    queryKey: itemKeys.list(filters),
    queryFn: async () => {
      const response = await api.api.v1.items.get({
        query: {
          search: filters.search,
          categoryId: filters.categoryId,
          isActive: filters.isActive,
        },
      });

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return response.data;
    },
  });
}
```

## Query: Detalle por ID

```typescript
// features/items/hooks/use-item.ts
export function useItem(id: string) {
  return useQuery({
    queryKey: itemKeys.detail(id),
    queryFn: async () => {
      const response = await api.api.v1.items({ id }).get();

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return response.data;
    },
    enabled: !!id, // Solo ejecutar si hay ID
  });
}
```

## Mutation: Crear

```typescript
// features/items/hooks/use-create-item.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '~/lib/api';
import { itemKeys } from './keys';

interface CreateItemInput {
  name: string;
  price: number;
  categoryId?: string;
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateItemInput) => {
      const response = await api.api.v1.items.post(data);

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidar todas las listas
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      toast.success('Item creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al crear item');
    },
  });
}
```

## Mutation: Actualizar

```typescript
// features/items/hooks/use-update-item.ts
interface UpdateItemInput {
  name?: string;
  price?: number;
  isActive?: boolean;
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItemInput }) => {
      const response = await api.api.v1.items({ id }).patch(data);

      if (response.error) {
        throw new Error(String(response.error.value));
      }

      return response.data;
    },
    onSuccess: (updatedItem) => {
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      // Actualizar cache del detalle directamente
      queryClient.setQueryData(itemKeys.detail(updatedItem.id), updatedItem);
      toast.success('Item actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

## Mutation: Eliminar

```typescript
// features/items/hooks/use-delete-item.ts
export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.api.v1.items({ id }).delete();

      if (response.error) {
        throw new Error(String(response.error.value));
      }
    },
    onSuccess: (_, deletedId) => {
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      // Remover del cache de detalle
      queryClient.removeQueries({ queryKey: itemKeys.detail(deletedId) });
      toast.success('Item eliminado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

## Optimistic Update

```typescript
// features/items/hooks/use-toggle-item-status.ts
export function useToggleItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await api.api.v1.items({ id }).patch({ isActive });
      if (response.error) throw new Error(String(response.error.value));
      return response.data;
    },
    // Optimistic update
    onMutate: async ({ id, isActive }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: itemKeys.detail(id) });

      // Snapshot del estado anterior
      const previousItem = queryClient.getQueryData(itemKeys.detail(id));

      // Actualizar optimisticamente
      queryClient.setQueryData(itemKeys.detail(id), (old: Item | undefined) =>
        old ? { ...old, isActive } : old
      );

      return { previousItem };
    },
    onError: (err, variables, context) => {
      // Rollback en caso de error
      if (context?.previousItem) {
        queryClient.setQueryData(
          itemKeys.detail(variables.id),
          context.previousItem
        );
      }
      toast.error('Error al actualizar estado');
    },
    onSettled: (_, __, { id }) => {
      // Siempre re-fetch para sincronizar
      queryClient.invalidateQueries({ queryKey: itemKeys.detail(id) });
    },
  });
}
```

## Infinite Query (Paginación)

```typescript
// features/items/hooks/use-infinite-items.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteItems(filters: Omit<ItemFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: [...itemKeys.lists(), 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.api.v1.items.get({
        query: { ...filters, page: pageParam, pageSize: 20 },
      });

      if (response.error) throw new Error(String(response.error.value));
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });
}

// Uso en componente:
function ItemList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteItems({ categoryId: 'abc' });

  const items = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <>
      {items.map(item => <ItemCard key={item.id} item={item} />)}

      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Cargando...' : 'Cargar más'}
        </Button>
      )}
    </>
  );
}
```

## Prefetching

```typescript
// features/items/hooks/use-prefetch-item.ts
export function usePrefetchItem() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: itemKeys.detail(id),
      queryFn: async () => {
        const response = await api.api.v1.items({ id }).get();
        if (response.error) throw new Error(String(response.error.value));
        return response.data;
      },
      staleTime: 1000 * 60 * 5, // 5 minutos
    });
  };
}

// Uso: prefetch on hover
function ItemCard({ item }: { item: Item }) {
  const prefetch = usePrefetchItem();

  return (
    <div onMouseEnter={() => prefetch(item.id)}>
      {/* ... */}
    </div>
  );
}
```

## Estados de Loading/Error

```typescript
// components/query-state.tsx
interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  loading?: React.ReactNode;
  error?: React.ReactNode | ((error: Error) => React.ReactNode);
  children: (data: T) => React.ReactNode;
}

export function QueryState<T>({
  query,
  loading,
  error,
  children
}: QueryStateProps<T>) {
  if (query.isLoading) {
    return loading ?? <LoadingSpinner />;
  }

  if (query.isError) {
    const errorContent = typeof error === 'function'
      ? error(query.error as Error)
      : error ?? <ErrorMessage error={query.error as Error} />;
    return errorContent;
  }

  if (!query.data) {
    return null;
  }

  return children(query.data);
}

// Uso:
function ItemPage({ id }: { id: string }) {
  const query = useItem(id);

  return (
    <QueryState query={query}>
      {(item) => <ItemDetails item={item} />}
    </QueryState>
  );
}
```

## Checklist

- [ ] Query keys usando factory pattern
- [ ] Manejo de `response.error` en todas las queries
- [ ] `enabled` para queries condicionales
- [ ] `onSuccess` invalida queries relacionadas
- [ ] `onError` muestra toast con mensaje
- [ ] Optimistic updates para UX instantánea
- [ ] Loading/error states manejados
- [ ] Prefetch para navegación anticipada
