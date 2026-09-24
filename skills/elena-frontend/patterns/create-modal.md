# createModal Pattern

Sistema de modales usando Jotai para estado y React portals para layout.

## Concepto

El patrón `createModal` proporciona una API content-first donde:
1. Defines tu contenido como componente
2. `createModal` retorna `[ModalComponent, useModalHook]`
3. Renderizas `<ModalComponent />` en el root
4. Usas el hook para controlar apertura/cierre

## Implementación Core

```typescript
// lib/modal/create-modal.tsx
import { useAtom, atom } from 'jotai';
import { Dialog, DialogContent } from '~/components/ui/dialog';
import { Drawer, DrawerContent } from '~/components/ui/drawer';
import { Sheet, SheetContent } from '~/components/ui/sheet';
import { useIsMobile } from '~/hooks/use-mobile';

interface ModalConfig {
  type?: 'dialog' | 'sheet' | 'drawer' | 'responsive';
  side?: 'top' | 'right' | 'bottom' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

interface ModalState<T> {
  isOpen: boolean;
  data?: T;
}

function createModalAtom<T>() {
  return atom<ModalState<T>>({ isOpen: false, data: undefined });
}

export function createModal<TProps extends object>(
  ContentComponent: React.ComponentType<TProps & { close: () => void }>,
  config: ModalConfig = {},
) {
  const modalAtom = createModalAtom<TProps>();

  function useModalHook() {
    const [state, setState] = useAtom(modalAtom);

    return {
      isOpen: state.isOpen,
      data: state.data,
      open: (data?: TProps) => setState({ isOpen: true, data: data || ({} as TProps) }),
      close: () => setState({ isOpen: false, data: undefined }),
      toggle: (data?: TProps) =>
        setState((prev) => ({ isOpen: !prev.isOpen, data: data ?? prev.data })),
    };
  }

  function ModalComponent() {
    const { isOpen, data, close } = useModalHook();
    const isMobile = useIsMobile();

    if (!isOpen) return null;

    const content = (
      <ModalLayoutProvider>
        <ContentComponent {...((data || {}) as TProps)} close={close} />
      </ModalLayoutProvider>
    );

    // Responsive: Drawer on mobile, Sheet/Dialog on desktop
    if (config.type === 'responsive') {
      if (isMobile) {
        return (
          <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
            <DrawerContent className="flex flex-col max-h-[85vh]">
              {content}
            </DrawerContent>
          </Drawer>
        );
      }
      return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
          <SheetContent side={config.side || 'right'} className="flex flex-col">
            {content}
          </SheetContent>
        </Sheet>
      );
    }

    if (config.type === 'drawer') {
      return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && close()}>
          <DrawerContent className="flex flex-col max-h-[85vh]">
            {content}
          </DrawerContent>
        </Drawer>
      );
    }

    if (config.type === 'sheet') {
      return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
          <SheetContent side={config.side || 'right'} className="flex flex-col">
            {content}
          </SheetContent>
        </Sheet>
      );
    }

    // Default: Dialog
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
        <DialogContent className="flex flex-col max-h-[90vh] p-0 px-6">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return [ModalComponent, useModalHook] as const;
}
```

## Portal Components

```typescript
// lib/modal/components.tsx
import { createPortal } from 'react-dom';
import { createContext, useContext, useRef, useLayoutEffect, useState } from 'react';
import { cn } from '~/lib/utils';

interface ModalLayoutContextValue {
  headerPortal: HTMLDivElement | null;
  footerPortal: HTMLDivElement | null;
}

const ModalLayoutContext = createContext<ModalLayoutContextValue | null>(null);

export function ModalLayoutProvider({ children }: { children: React.ReactNode }) {
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ModalLayoutContext.Provider
      value={{
        headerPortal: mounted ? headerRef.current : null,
        footerPortal: mounted ? footerRef.current : null,
      }}
    >
      <div className="flex flex-col h-full">
        <div ref={headerRef} className="shrink-0" />
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        <div ref={footerRef} className="shrink-0" />
      </div>
    </ModalLayoutContext.Provider>
  );
}

export function ModalHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  const context = useContext(ModalLayoutContext);
  const content = (
    <div className={cn('border-b border-border py-4 pt-6', className)}>{children}</div>
  );
  if (!context?.headerPortal) return content;
  return createPortal(content, context.headerPortal);
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('py-6', className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  const context = useContext(ModalLayoutContext);
  const content = (
    <div className={cn('border-t border-border py-4 flex items-center gap-2 justify-end', className)}>
      {children}
    </div>
  );
  if (!context?.footerPortal) return content;
  return createPortal(content, context.footerPortal);
}
```

## Ejemplo Completo: Modal de Formulario

```typescript
// features/items/modals/create-item-modal.tsx
import { createModal } from '~/lib/modal/create-modal';
import { ModalHeader, ModalFooter, ModalBody } from '~/lib/modal/components';
import { Button } from '~/components/ui/button';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormInput } from '~/components/forms/form-input';
import { useCreateItem } from '../hooks/use-items';

const itemSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  price: z.number().positive('Precio debe ser positivo'),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface CreateItemModalProps {
  close: () => void;
  categoryId?: string; // Datos opcionales pasados al abrir
}

function CreateItemContent({ close, categoryId }: CreateItemModalProps) {
  const createItem = useCreateItem();
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', price: 0 },
  });

  const onSubmit = async (data: ItemFormData) => {
    await createItem.mutateAsync({ ...data, categoryId });
    close();
  };

  return (
    <>
      <ModalHeader>
        <h2 className="text-lg font-semibold">Crear Item</h2>
        <p className="text-sm text-muted-foreground">
          Agrega un nuevo item al inventario
        </p>
      </ModalHeader>

      <ModalBody>
        <FormProvider {...form}>
          <form id="create-item-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <FormInput name="name" label="Nombre" required />
              <FormInput name="price" label="Precio" type="number" required />
            </div>
          </form>
        </FormProvider>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={close}>
          Cancelar
        </Button>
        <Button
          type="submit"
          form="create-item-form"
          disabled={createItem.isPending}
        >
          {createItem.isPending ? 'Creando...' : 'Crear'}
        </Button>
      </ModalFooter>
    </>
  );
}

export const [CreateItemModal, useCreateItemModal] = createModal(
  CreateItemContent,
  { type: 'dialog', size: 'md' }
);
```

## Ejemplo: Modal con Datos Dinámicos

```typescript
// features/items/modals/edit-item-modal.tsx
interface EditItemModalProps {
  close: () => void;
  itemId: string;
}

function EditItemContent({ close, itemId }: EditItemModalProps) {
  const { data: item, isLoading } = useItem(itemId);
  const updateItem = useUpdateItem();

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    values: item ? { name: item.name, price: item.price } : undefined,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // ... rest of form
}

export const [EditItemModal, useEditItemModal] = createModal(
  EditItemContent,
  { type: 'sheet', side: 'right' }
);

// Uso:
const editModal = useEditItemModal();
editModal.open({ itemId: 'abc-123' });
```

## Tipos de Modal

| Tipo | Mobile | Desktop | Uso |
|------|--------|---------|-----|
| `dialog` | Dialog centrado | Dialog centrado | Confirmaciones, formularios pequeños |
| `sheet` | Sheet | Sheet | Formularios grandes, detalles |
| `drawer` | Drawer (bottom) | Drawer (bottom) | Acciones rápidas, filtros |
| `responsive` | Drawer | Sheet | Adaptativo según dispositivo |

## Registro en Root

```typescript
// routes/__root.tsx
import { CreateItemModal } from '~/features/items/modals/create-item-modal';
import { EditItemModal } from '~/features/items/modals/edit-item-modal';

export default function RootLayout() {
  return (
    <>
      <Outlet />

      {/* Modals globales */}
      <CreateItemModal />
      <EditItemModal />
    </>
  );
}
```

## Checklist

- [ ] Modal creado con `createModal`
- [ ] Usa `ModalHeader`, `ModalBody`, `ModalFooter`
- [ ] Props incluyen `close: () => void`
- [ ] Tipo correcto (dialog/sheet/drawer/responsive)
- [ ] Registrado en `__root.tsx`
- [ ] Form usa `FormProvider`
- [ ] Mutation cierra modal en `onSuccess`
