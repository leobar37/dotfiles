# UI Conventions for LeoBit

Chakra UI v2.8.2, Mantine v7.5.1, and component patterns for the LeoBit frontend.

## Theme Configuration

**Location:** `apps/frapp/src/ui/theme/`

```typescript
import { theme } from "./theme";

// Custom theme with semantic tokens
const config: ThemeConfig = {
  useSystemColorMode: false,
  initialColorMode: "light",
  cssVarPrefix: "leobit",
};
```

## Reusable Components

**Location:** `apps/frapp/src/ui/components/`

### Layout Components

| Component | File | Usage |
|-----------|------|-------|
| `Screen` | `Screen.tsx` | Main screen wrapper with header/footer |
| `MenuDrawer` | `MenuDrawer.tsx` | Side navigation drawer |
| `CustomDrawer` | `CustomDrawer.tsx` | Right-side drawer |
| `CustomPageScreen` | `CustomDrawer.tsx` | Full-screen overlay from top |
| `CustomBottomPageScreen` | `CustomDrawer.tsx` | Bottom sheet modal |
| `CustomModal` | `CustomDrawer.tsx` | Standard modal |

### Display Components

| Component | File | Usage |
|-----------|------|-------|
| `CardButton` | `CardButton.tsx` | Touch-friendly card button |
| `Stat` | `Stat.tsx` | Display statistics |
| `AccordionData` | `AccordionData.tsx` | Collapsible content |
| `Logo` | `Logo.tsx` | App logo component |

### Feedback Components

| Component | File | Usage |
|-----------|------|-------|
| `LoadingScreen` | `LoadingScreen.tsx` | Full-screen loader |
| `SimpleModal` | `SimpleModal.tsx` | Global modal with Jotai atom |
| `SimpleModal` hooks | `SimpleModal.tsx` | `useSimpleModal()`, `useSimpleModalDisclousure()` |

### Action Components

| Component | File | Usage |
|-----------|------|-------|
| `PlusButton` | `PlusButton.tsx` | Floating add button |
| `FloatActions` | `FloatActions.tsx` | Floating action buttons |
| `LogoutButton` | `LogoutButton.tsx` | Logout action |
| `MenuItems` | `MenuItems.tsx` | Menu item list |

### Utility Components

| Component | File | Usage |
|-----------|------|-------|
| `Scrollbar` | `Scrollbar.tsx` | Custom scrollbar |
| `TextSender` | `TextSender.tsx` | Text input with send button |
| `confirm-dialog` | `confirm-dialog/` | Confirmation dialogs |
| `tabs` | `tabs/` | Tab components |
| `toolbar` | `toolbar/` | Toolbar components |
| `list` | `list/` | List components (DataList, VirtualList, etc.) |
| `alert` | `alert/` | Alert components |
| `portal-feedback` | `portal-feedback/` | Portal feedback |
| `image-upload` | `image-upload/` | Image upload |

## Standard Modal & Drawer Pattern

### 1. SimpleModal (Global Modal)

Use for confirmations, alerts, or simple modals anywhere in the app.

```typescript
import { useSimpleModal } from "../ui/components/SimpleModal";

const modal = useSimpleModal();

modal.open({
  title: "Confirmar acción",
  content: "¿Estás seguro de continuar?",
  actions: (
    <>
      <Button onClick={modal.close}>Cancelar</Button>
      <Button color="red" onClick={handleConfirm}>
        Confirmar
      </Button>
    </>
  ),
});

// Close when done
modal.close();
```

### 2. CustomDrawer (Right Side Drawer)

Standard side drawer for forms and details.

```typescript
import { CustomDrawer } from "../ui/components/CustomDrawer";

<CustomDrawer
  isOpen={isOpen}
  onClose={onClose}
  title="Editar cliente"
  footer={<SaveButton onSave={handleSave} />}
>
  <FormContent />
</CustomDrawer>;
```

### 3. CustomPageScreen (Full Screen from Top)

For full-page overlays.

```typescript
import { CustomPageScreen } from "../ui/components/CustomDrawer";

<CustomPageScreen
  isOpen={isOpen}
  onClose={onClose}
  title="Vista completa"
>
  <FullPageContent />
</CustomPageScreen>;
```

### 4. CustomBottomPageScreen (Bottom Sheet)

For mobile-friendly bottom sheets.

```typescript
import { CustomBottomPageScreen } from "../ui/components/CustomDrawer";

<CustomBottomPageScreen
  isOpen={isOpen}
  onClose={onClose}
  title="Seleccionar opción"
>
  <BottomSheetContent />
</CustomBottomPageScreen>;
```

### 5. CustomModal (Standard Modal)

Chakra-native modal for simple use cases.

```typescript
import { CustomModal } from "../ui/components/CustomDrawer";

<CustomModal
  isOpen={isOpen}
  onClose={onClose}
  title="Título"
  footer={<ActionButtons />}
>
  <ModalBody>Content</ModalBody>
</CustomModal>;
```

## Form Components

**Location:** `apps/frapp/src/ui/forms/`

| Component | File | Usage |
|-----------|------|-------|
| `FormInput` | `FormInput.tsx` | Text input with error handling |
| `FormInputSelect` | `FormInputSelect.tsx` | Select dropdown |
| `FormDatePicker` | `FormDatePicker.tsx` | Date picker |
| `NumberInput` | `NumberInput.tsx` | Number input |
| `FormRadioGroup` | `FormRadioGroup.tsx` | Radio group |
| `SwitchInput` | `SwitchInput.tsx` | Switch/toggle |
| `TextArea` | `TextArea.tsx` | Text area |
| `SaveButtonForm` | `SaveButtonForm.tsx` | Save button for forms |

### Form Hook

```typescript
import { useWrapperForm } from "../ui/forms/use-wrapper-form";

const { control, handleSubmit, formState } = useWrapperForm({
  defaultValues: { name: "", email: "" },
  resolver: zodResolver(schema),
});
```

## Hooks

**Location:** `apps/frapp/src/ui/hooks/`

Common hooks for UI components.

## Icons

**Location:** `apps/frapp/src/ui/icons/`

Custom icon components.

## Module Structure

**Location:** `apps/frapp/src/modules/`

```
modules/
├── auth/              # Authentication screens
├── business/          # Business settings
├── channels/          # Channel management
├── clients/           # Client management
├── dashboard/         # Dashboard
├── my-business/       # My business settings
├── products/          # Product management
├── sales/             # Sales flow
├── suppliers/         # Supplier management
└── users/             # User management
```

## Styling with Chakra UI

```typescript
import { Box, Text, VStack } from "@chakra-ui/react";

// Use semantic tokens from theme
<Box bg="bg.primary" color="text.primary">
  <Text fontSize="lg">Content</Text>
</Box>
```

## Libraries Used

| Library | Version | Purpose |
|---------|---------|---------|
| Chakra UI | ^2.8.2 | Main UI component library |
| Mantine | ^7.5.1 | Additional components (dates, etc.) |
| Framework7 | ^8.3.2 | Mobile framework |
| React Hook Form | ^7.48.2 | Form handling |
| Zod | ^3.22.4 | Validation |
| @hookform/resolvers | ^3.3.2 | Zod resolver |
| Jotai | ^2.6.0 | State management |
| React Query | ^4.0.0 | Server state |

## DO: Follow These Patterns

### 1. Use Chakra UI Components

```typescript
// ✅ GOOD
import { Button, Input, VStack } from "@chakra-ui/react";

<VStack spacing={4}>
  <Input {...register("name")} />
  <Button type="submit">Guardar</Button>
</VStack>
```

### 2. Use Standard Modals

```typescript
// ✅ GOOD - Use CustomDrawer pattern
<CustomDrawer
  isOpen={isOpen}
  onClose={onClose}
  title="Título"
  footer={<Footer />}
>
  <Content />
</CustomDrawer>
```

### 3. Use Form Components

```typescript
// ✅ GOOD
import { FormInput, FormInputSelect } from "../ui/forms";

<FormInput name="name" label="Nombre" control={control} />
<FormInputSelect name="category" label="Categoría" options={options} control={control} />
```

### 4. Use Screen Component

```typescript
// ✅ GOOD
import { Screen } from "../ui/Screen";

<Screen title="Clientes" rightAction={<Button />}>
  <Content />
</Screen>
```

## DON'T: Anti-Patterns

### 1. Custom Modal Implementation

```typescript
// ❌ BAD - Don't create custom modal logic
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalContent>...</ModalContent>
</Modal>
```

**Fix:** Use `CustomDrawer` or `SimpleModal`.

### 2. Direct State Management for Modals

```typescript
// ❌ BAD - Local state for global modal
const [isModalOpen, setIsModalOpen] = useState(false);
```

**Fix:** Use `useSimpleModal()` with Jotai atom.

### 3. Missing Form Validation

```typescript
// ❌ BAD - No validation
<Input />
```

**Fix:** Use `FormInput` with `control` from `useWrapperForm`.

### 4. Hardcoded Styles

```typescript
// ❌ BAD - Hardcoded colors
<Box bg="#FFFFFF" color="#000000">
```

**Fix:** Use theme tokens: `bg="bg.primary" color="text.primary"`.

## Adding New Components

1. Place component in `apps/frapp/src/ui/components/`
2. Export from `apps/frapp/src/ui/components/index.ts`
3. Use Chakra UI as base
4. Follow existing component patterns
