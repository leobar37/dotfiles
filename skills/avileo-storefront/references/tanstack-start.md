# TanStack Start storefront

Use the current official scaffold:

```sh
npx @tanstack/cli@latest create
```

Choose TanStack Start, the project's package manager, React Query, TypeScript,
and Tailwind only when the product needs it. Then choose the Avileo SDK source:

```sh
npm install @tarileo/avileo-sdk@0.3.0 @tanstack/react-query
```

For a confirmed Elena Tech source checkout, use the local package instead:

- inside the same Bun workspace, declare `"@tarileo/avileo-sdk": "workspace:*"`;
- from an external application, declare
  `"@tarileo/avileo-sdk": "file:<verified-path-to-apps/avileo/sdk>"`;
- build the source package first with
  `bun run --cwd "$AVILEO_MONOREPO_ROOT" --filter @tarileo/avileo-sdk build`.

Never guess the file path. If no checkout was supplied or verified, keep the
pinned published dependency. Confirm the installed package resolves to the
selected workspace or file path before implementing the storefront.

## Environment

```env
VITE_AVILEO_API_URL=https://api.avileo.com
VITE_AVILEO_CLIENT_KEY=avileo_pk_...
```

The Client Key is public but must still come from environment configuration so
it can be rotated without editing source. Package source and API target are
independent: a local SDK still defaults to production unless
`VITE_AVILEO_API_URL` is set. For local development, require the confirmed
local/Tailscale backend URL and never silently fall back to production.

## Shared SDK client

```ts
import { createAvileo } from '@tarileo/avileo-sdk';

const baseUrl = import.meta.env.VITE_AVILEO_API_URL?.replace(/\/+$/, '');
if (!baseUrl) {
  throw new Error('VITE_AVILEO_API_URL is required');
}
const clientKey = import.meta.env.VITE_AVILEO_CLIENT_KEY || '';

export const avileo = createAvileo({ baseUrl, clientKey });
export const avileoProviderConfig = { baseUrl, clientKey } as const;
```

Use `avileo.currentBusiness.catalog.list(...)` in route loaders or helpers.
Resolve relative Avileo asset paths against the configured API origin, not the
storefront origin.

## React root

```tsx
import { AvileoProvider } from '@tarileo/avileo-sdk/react';

export function RootProviders({ children, queryClient }) {
  return (
    <AvileoProvider {...avileoProviderConfig} queryClient={queryClient}>
      {children}
    </AvileoProvider>
  );
}
```

Inside the provider, prefer `useBusiness`, `useCatalog`, `useCart`, and
`useCheckout`. Keep one QueryClient and one AvileoProvider for the app.

## Optional storefront assistant

Only enable it when requested:

```tsx
<AvileoProvider
  {...avileoProviderConfig}
  queryClient={queryClient}
  presence
  features={{ assistant: true }}
>
  {children}
  <StorefrontAssistantHost />
</AvileoProvider>
```

Use the SDK's `StorefrontAssistantHost`; do not compose a second AI provider or
use the private Agent SDK in the browser. Add a purchase adapter when assistant
actions must update the app's cart/checkout.

## Reference architecture

`apps/stuff/elite-coffee` demonstrates TanStack Start SSR, React Query,
`createAvileo`, `AvileoProvider`, catalog, guest cart, checkout, assistant, and
Cloudflare Workers deployment. Copy only the generic architecture.
