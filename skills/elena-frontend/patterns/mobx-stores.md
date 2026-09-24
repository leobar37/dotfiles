# MobX Store Patterns

Patrones para estado complejo con MobX y React.

## Cuándo Usar MobX

| Caso | Solución |
|------|----------|
| Server state (API data) | TanStack Query |
| Form state | React Hook Form |
| Modal open/close | Jotai atoms |
| UI state simple | useState |
| **Estado complejo derivado** | **MobX** |
| **Carrito/POS** | **MobX** |
| **Wizard multi-paso** | **MobX** |

## Estructura Básica

```typescript
// features/cart/store/cart-store.ts
import { makeAutoObservable } from 'mobx';

interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export class CartStore {
  // Observable state (propiedades públicas)
  items: CartItem[] = [];
  discount: { type: 'percentage' | 'fixed'; value: number } | null = null;
  selectedCustomer: Customer | null = null;

  constructor() {
    // Convierte automáticamente:
    // - Propiedades → observables
    // - Getters → computed
    // - Métodos → actions
    makeAutoObservable(this);
  }

  // COMPUTED: Valores derivados (automáticamente reactivos)
  get subtotal(): number {
    return this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  get discountAmount(): number {
    if (!this.discount) return 0;
    return this.discount.type === 'percentage'
      ? this.subtotal * (this.discount.value / 100)
      : this.discount.value;
  }

  get total(): number {
    return this.subtotal - this.discountAmount;
  }

  get itemCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  // ACTIONS: Mutaciones de estado
  addItem(product: Product, quantity: number = 1) {
    const existingIndex = this.items.findIndex(
      item => item.product.id === product.id
    );

    if (existingIndex >= 0) {
      this.items[existingIndex].quantity += quantity;
    } else {
      this.items.push({
        id: crypto.randomUUID(),
        product,
        quantity,
        unitPrice: product.price,
      });
    }
  }

  updateQuantity(itemId: string, quantity: number) {
    const item = this.items.find(i => i.id === itemId);
    if (item && quantity > 0) {
      item.quantity = quantity;
    }
  }

  removeItem(itemId: string) {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index >= 0) {
      this.items.splice(index, 1);
    }
  }

  setDiscount(discount: typeof this.discount) {
    this.discount = discount;
  }

  setCustomer(customer: Customer | null) {
    this.selectedCustomer = customer;
  }

  clear() {
    this.items = [];
    this.discount = null;
    this.selectedCustomer = null;
  }
}
```

## Provider + Hook Pattern

```typescript
// features/cart/context/cart-context.tsx
import { createContext, useContext, useMemo, ReactNode } from 'react';
import { CartStore } from '../store/cart-store';

const CartContext = createContext<CartStore | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // useMemo para singleton - una instancia por provider
  const store = useMemo(() => new CartStore(), []);

  return (
    <CartContext.Provider value={store}>
      {children}
    </CartContext.Provider>
  );
}

export function useCartStore(): CartStore {
  const store = useContext(CartContext);
  if (!store) {
    throw new Error('useCartStore must be used within CartProvider');
  }
  return store;
}
```

## Componentes con Observer

```typescript
// features/cart/components/cart-summary.tsx
import { observer } from 'mobx-react-lite';
import { useCartStore } from '../context/cart-context';
import { formatCurrency } from '~/lib/utils';

// IMPORTANTE: Envolver con observer para reactividad
export const CartSummary = observer(function CartSummary() {
  const store = useCartStore();

  return (
    <div className="space-y-2 p-4 border-t">
      <div className="flex justify-between text-sm">
        <span>Subtotal ({store.itemCount} items)</span>
        <span>{formatCurrency(store.subtotal)}</span>
      </div>

      {store.discount && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Descuento</span>
          <span>-{formatCurrency(store.discountAmount)}</span>
        </div>
      )}

      <div className="flex justify-between font-semibold text-lg pt-2 border-t">
        <span>Total</span>
        <span>{formatCurrency(store.total)}</span>
      </div>
    </div>
  );
});
```

## Wizard / Multi-Step Store

```typescript
// features/campaigns/store/campaign-wizard-store.ts
import { makeAutoObservable } from 'mobx';

type Step = 'info' | 'audience' | 'schedule' | 'review';
const STEPS: Step[] = ['info', 'audience', 'schedule', 'review'];

export class CampaignWizardStore {
  currentStep: Step = 'info';

  // Step 1: Info
  name = '';
  description = '';

  // Step 2: Audience
  selectedTags: string[] = [];

  // Step 3: Schedule
  scheduleType: 'immediate' | 'scheduled' = 'immediate';
  scheduledAt?: Date;

  constructor() {
    makeAutoObservable(this);
  }

  // Navigation computed
  get currentStepIndex(): number {
    return STEPS.indexOf(this.currentStep);
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === STEPS.length - 1;
  }

  get progress(): number {
    return ((this.currentStepIndex + 1) / STEPS.length) * 100;
  }

  // Validation computed
  get isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 'info':
        return this.name.length >= 3;
      case 'audience':
        return this.selectedTags.length > 0;
      case 'schedule':
        return this.scheduleType === 'immediate' || !!this.scheduledAt;
      case 'review':
        return true;
      default:
        return false;
    }
  }

  get canProceed(): boolean {
    return this.isCurrentStepValid && !this.isLastStep;
  }

  // Actions
  nextStep() {
    if (this.canProceed) {
      const nextIndex = this.currentStepIndex + 1;
      this.currentStep = STEPS[nextIndex];
    }
  }

  previousStep() {
    if (!this.isFirstStep) {
      const prevIndex = this.currentStepIndex - 1;
      this.currentStep = STEPS[prevIndex];
    }
  }

  goToStep(step: Step) {
    // Solo permitir ir a pasos anteriores o al actual
    const targetIndex = STEPS.indexOf(step);
    if (targetIndex <= this.currentStepIndex) {
      this.currentStep = step;
    }
  }

  // Setters
  setName(name: string) { this.name = name; }
  setDescription(desc: string) { this.description = desc; }
  setTags(tags: string[]) { this.selectedTags = tags; }
  setScheduleType(type: typeof this.scheduleType) { this.scheduleType = type; }
  setScheduledAt(date?: Date) { this.scheduledAt = date; }

  // Export para API
  getPayload() {
    return {
      name: this.name,
      description: this.description,
      tags: this.selectedTags,
      scheduleType: this.scheduleType,
      scheduledAt: this.scheduleType === 'scheduled' ? this.scheduledAt : undefined,
    };
  }

  reset() {
    this.currentStep = 'info';
    this.name = '';
    this.description = '';
    this.selectedTags = [];
    this.scheduleType = 'immediate';
    this.scheduledAt = undefined;
  }
}
```

## Persistencia con LocalStorage

```typescript
// features/cart/store/cart-store.ts
import { makeAutoObservable, reaction } from 'mobx';

const STORAGE_KEY = 'cart-state';

export class CartStore {
  items: CartItem[] = [];
  // ... other properties

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
    this.setupPersistence();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.items = state.items || [];
      }
    } catch (e) {
      console.warn('Failed to load cart from storage');
    }
  }

  private setupPersistence() {
    // Reacciona a cambios y guarda automáticamente
    reaction(
      () => this.toJSON(),
      (state) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      },
      { delay: 500 } // Debounce 500ms
    );
  }

  private toJSON() {
    return {
      items: this.items,
    };
  }
}
```

## Integración con TanStack Query

```typescript
// features/cart/store/cart-store.ts
export class CartStore {
  // ... properties

  // Acción async que usa mutation
  async confirmSale(
    createSaleMutation: UseMutationResult<Sale, Error, SaleInput>
  ): Promise<Sale> {
    if (this.isEmpty) {
      throw new Error('Cart is empty');
    }

    const saleData: SaleInput = {
      customerId: this.selectedCustomer?.id,
      items: this.items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      discountType: this.discount?.type,
      discountValue: this.discount?.value,
    };

    const sale = await createSaleMutation.mutateAsync(saleData);
    this.clear(); // Limpiar después de éxito
    return sale;
  }
}

// En el componente:
const CheckoutButton = observer(function CheckoutButton() {
  const store = useCartStore();
  const createSale = useCreateSale();

  const handleCheckout = async () => {
    try {
      await store.confirmSale(createSale);
      toast.success('Venta confirmada');
    } catch (error) {
      toast.error('Error al confirmar venta');
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={store.isEmpty || createSale.isPending}>
      {createSale.isPending ? 'Procesando...' : 'Confirmar Venta'}
    </Button>
  );
});
```

## Checklist

- [ ] Store usa `makeAutoObservable(this)` en constructor
- [ ] Valores derivados son getters (computed)
- [ ] Mutaciones son métodos (actions)
- [ ] Provider creado con `useMemo`
- [ ] Hook valida contexto existe
- [ ] Componentes envueltos con `observer`
- [ ] Nombrar `observer(function ComponentName() {...})`
