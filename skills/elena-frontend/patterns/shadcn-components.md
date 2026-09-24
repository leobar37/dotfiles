# shadcn/ui Component Patterns

Guía de patrones y buenas prácticas para componentes shadcn/ui.

## Instalación y Configuración

### CLI Installation
```bash
# Install component
npx shadcn-ui@latest add button

# Install multiple components
npx shadcn-ui@latest add button input label form

# List all available components
npx shadcn-ui@latest add --help
```

### Estructura de Componentes
```
src/components/ui/
├── button.tsx          # Base Button component
├── input.tsx           # Input variants
├── label.tsx           # Form labels
├── form.tsx            # Form wrapper with validation
└── index.ts            # Barrel exports
```

## Patrones Comunes

### 1. Botones con Variantes

```typescript
// Button con estado de carga
function SubmitButton({ form, children, ...props }) {
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Button
      type="submit"
      disabled={isSubmitting}
      {...props}
    >
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

// Uso con iconos
<Button variant="outline" size="sm">
  <Plus className="mr-2 h-4 w-4" />
  Nuevo Item
</Button>

// Botón de danger
<Button variant="destructive" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>
```

### 2. Formularios con Validación

```typescript
// Formulario completo con React Hook Form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'user'], { required_error: 'Selecciona un rol' }),
});

type FormData = z.infer<typeof schema>;

function UserForm({ defaultValues, onSubmit }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Guardar
        </Button>
      </form>
    </Form>
  );
}
```

### 3. Diálogos y Sheets

```typescript
// Dialog con formulario
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';

function CreateUserDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Usuario</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario en el sistema.
          </DialogDescription>
        </DialogHeader>
        <UserForm
          onSubmit={async (data) => {
            await createUser(data);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Sheet para mobile (drawer)
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet';

function MobileFilters() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="md:hidden">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Aplica filtros para refinar los resultados.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <FiltersContent />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 4. Tabs para Navegación

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';

function ProductTabs({ product }) {
  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="details">Detalles</TabsTrigger>
        <TabsTrigger value="reviews">Reseñas</TabsTrigger>
        <TabsTrigger value="specs">Especificaciones</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <ProductDetails details={product.details} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reviews" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <ProductReviews reviews={product.reviews} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="specs" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <ProductSpecs specs={product.specifications} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
```

### 5. Tables con shadcn

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';

function UsersTable({ users }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.active ? 'default' : 'destructive'}>
                  {user.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### 6. Combobox para Autocompletar

```typescript
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '~/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';

const frameworks = [
  { value: 'next.js', label: 'Next.js' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
];

function FrameworkSelector() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : 'Select framework...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search framework..." />
          <CommandEmpty>No framework found.</CommandEmpty>
          <CommandGroup>
            {frameworks.map((framework) => (
              <CommandItem
                key={framework.value}
                onSelect={(currentValue) => {
                  setValue(currentValue === value ? '' : currentValue);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === framework.value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {framework.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### 7. Custom Component Variants

```typescript
// Crear variantes personalizadas usando class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Custom variant
        success: 'bg-green-500 text-white hover:bg-green-600',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        // Custom size
        xs: 'h-8 rounded px-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

## Theming y CSS Variables

### Configuración de Temas

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

### Componentes con Theme Variables

```typescript
// Card con theme-aware styles
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';

function ThemedCard({ title, description, children, footer }) {
  return (
    <Card className="border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))]">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--card-foreground))]">{title}</CardTitle>
        {description && (
          <CardDescription className="text-[hsl(var(--muted-foreground))]">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter>{footer}</CardFooter>
      )}
    </Card>
  );
}
```

## Best Practices

### 1. Importaciones

```typescript
// ✅ Bueno: Importaciones específicas
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

// ❌ Malo: Importaciones de barrel (más código en bundle)
import * as UI from '~/components/ui';

// ✅ Bueno: Re-export para componentes personalizados
// components/ui/index.ts
export { Button } from './button';
export { Input } from './input';
export { CustomButton } from './custom-button';
```

### 2. Composición de Componentes

```typescript
// ✅ Bueno: Composición sobre herencia
function FormField({ label, error, children, ...props }) {
  return (
    <div className="space-y-2" {...props}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Uso
<FormField label="Email" error={errors.email}>
  <Input type="email" {...register('email')} />
</FormField>
```

### 3. Accesibilidad

```typescript
// ✅ Buenos patrones de accesibilidad
<Dialog>
  <DialogTrigger asChild>
    <Button aria-label="Abrir diálogo de configuración">
      <Settings className="h-4 w-4" />
    </Button>
  </DialogTrigger>
  <DialogContent aria-describedby="settings-description">
    <DialogHeader>
      <DialogTitle>Configuración</DialogTitle>
      <DialogDescription id="settings-description">
        Ajusta las preferencias de tu cuenta
      </DialogDescription>
    </DialogHeader>
    {/* Contenido */}
  </DialogContent>
</Dialog>
```

## Checklist de Validación

- [ ] Componente instalado con `npx shadcn-ui@latest add`
- [ ] Importaciones específicas (no `*`)
- [ ] Formularios con React Hook Form + Zod
- [ ] Variantes de componentes usadas consistentemente
- [ ] Theme variables (hsl) en lugar de colores hardcodeados
- [ ] Accesibilidad: aria-labels y roles apropiados
- [ ] Diseño responsive: mobile-first approach
- [ ] Testing: componentes renderizan sin errores