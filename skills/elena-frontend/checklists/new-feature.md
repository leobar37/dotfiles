# Checklist: Nueva Feature Frontend

Lista de verificación para implementar una nueva feature.

## Pre-Implementación

- [ ] Revisar diseño/mockup si existe
- [ ] Identificar endpoints necesarios (ya existen?)
- [ ] Listar componentes a crear
- [ ] Definir schema Zod para validaciones
- [ ] Decidir manejo de estado (Query/Form/MobX)

## Estructura de Archivos

```
features/[feature-name]/
├── components/           # Componentes específicos
│   ├── feature-card.tsx
│   └── feature-list.tsx
├── hooks/                # Queries y mutations
│   ├── use-features.ts
│   ├── use-feature.ts
│   └── keys.ts           # Query keys
├── modals/               # Modales
│   └── create-feature-modal.tsx
├── store/                # MobX (si aplica)
│   └── feature-store.ts
└── context/              # Context + Provider (si aplica)
    └── feature-context.tsx
```

## Data Fetching

- [ ] Query keys definidos en `keys.ts`
- [ ] `useQuery` para listas con filtros
- [ ] `useQuery` para detalle con `enabled: !!id`
- [ ] `useMutation` para crear
- [ ] `useMutation` para actualizar
- [ ] `useMutation` para eliminar
- [ ] `onSuccess` invalida queries relacionadas
- [ ] `onError` muestra toast con mensaje
- [ ] Loading states manejados
- [ ] Error states manejados

## Formularios

- [ ] Schema Zod con mensajes en español
- [ ] `useForm` con `zodResolver`
- [ ] `FormProvider` envuelve el form
- [ ] Componentes `FormInput`, `FormSelect`, etc.
- [ ] Errores mostrados bajo cada campo
- [ ] Botón submit deshabilitado durante loading
- [ ] Form se resetea o cierra modal en success

## Modales

- [ ] Creado con `createModal` (NO useState manual)
- [ ] Usa `ModalHeader`, `ModalBody`, `ModalFooter`
- [ ] Tipo correcto (`dialog`/`sheet`/`drawer`/`responsive`)
- [ ] Props incluye `close: () => void`
- [ ] Registrado en `routes/__root.tsx`
- [ ] Mutation cierra modal en `onSuccess`

## Componentes

- [ ] TypeScript strict (interfaces para props)
- [ ] Props destructuradas
- [ ] `cn()` para clases condicionales
- [ ] Loading skeletons donde aplica
- [ ] Empty states para listas vacías
- [ ] Accesibilidad básica (labels, aria)

## Responsive

- [ ] `useIsMobile()` o `useResponsive()` para detección
- [ ] Renderizado condicional (NO hidden/block)
- [ ] Mobile: headers sticky, FAB o fixed footer
- [ ] Desktop: layouts apropiados (grid, two-panel)
- [ ] Testeado en viewport móvil (375px)

## MobX (si aplica)

- [ ] Store usa `makeAutoObservable`
- [ ] Valores derivados son `get` (computed)
- [ ] Mutaciones son métodos (actions)
- [ ] Provider con `useMemo`
- [ ] Hook valida contexto existe
- [ ] Componentes envueltos con `observer`

## Rutas

- [ ] Archivo de ruta en `routes/`
- [ ] Naming convention: `_protected.feature.tsx`
- [ ] Exporta componente default
- [ ] Meta tags si aplica

## Testing Manual

- [ ] Happy path funciona
- [ ] Validaciones muestran errores
- [ ] Loading states visibles
- [ ] Error states manejados
- [ ] Responsive funciona
- [ ] Modales abren/cierran correctamente
- [ ] Navegación funciona

---

## Anti-Patterns a Evitar

### Estado de Modales

```typescript
// MAL
const [isOpen, setIsOpen] = useState(false);

// BIEN
const [Modal, useModal] = createModal(Content, { type: 'dialog' });
const modal = useModal();
```

### Fetch Directo

```typescript
// MAL
const [data, setData] = useState([]);
useEffect(() => {
  fetch('/api/items').then(r => r.json()).then(setData);
}, []);

// BIEN
const { data, isLoading } = useItems();
```

### Hidden/Block para Responsive

```typescript
// MAL - Ambos se renderizan
<div className="hidden md:block"><Desktop /></div>
<div className="block md:hidden"><Mobile /></div>

// BIEN - Solo uno se renderiza
const isMobile = useIsMobile();
return isMobile ? <Mobile /> : <Desktop />;
```

### MobX sin Observer

```typescript
// MAL - No reactivo
function Cart() {
  const store = useCartStore();
  return <div>{store.total}</div>;
}

// BIEN - Reactivo
const Cart = observer(function Cart() {
  const store = useCartStore();
  return <div>{store.total}</div>;
});
```

### Form sin FormProvider

```typescript
// MAL - FormInput no funciona
<form>
  <FormInput name="email" label="Email" />
</form>

// BIEN
<FormProvider {...form}>
  <form>
    <FormInput name="email" label="Email" />
  </form>
</FormProvider>
```

### Query sin Error Handling

```typescript
// MAL
const response = await api.items.get();
return response.data;

// BIEN
const response = await api.items.get();
if (response.error) {
  throw new Error(String(response.error.value));
}
return response.data;
```
