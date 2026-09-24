---
name: avileo-storefront
description: >
  Build and integrate a customer-facing Avileo catalog or ecommerce app with
  the public SDK, Client Keys, TanStack Start, React Query, cart, checkout, and
  the optional storefront assistant. Use for storefront, tienda web, catálogo
  web, ecommerce app, TanStack Start, AvileoProvider, or public SDK requests.
license: MIT
metadata:
  version: '0.1.0'
---

# Avileo storefront

Use this skill to build a public customer application for exactly one Avileo
business. The preferred stack is TanStack Start + React Query with
the local workspace SDK when a source checkout is explicitly available; otherwise
use the pinned `@tarileo/avileo-sdk@0.3.0` release.

This is not a catalog-administration skill. Private product, variant, category,
asset, import, and inventory changes belong to `avileo-catalog`.

## Credential and tenant boundary

A storefront uses one publishable `avileo_pk_` Client Key. The backend resolves
the business from that key; the application never supplies or switches a
`businessId`.

Never put an `avileo_sk_` Agent Key or `sak_` System Admin key in application
code, Vite variables, browser bundles, prompts, JSON, or logs. Never use
`@tarileo/avileo-sdk/agent` in a storefront.

If no Client Key exists, hand off to `avileo-catalog`. Its tenant-scoped Agent
Key can propose `catalog-key create`; a human approves the exact operation and
`operation apply` returns the new Client Key once. A different business requires
human provisioning and a separately authorized credential.

Read [SDK and credential boundaries](references/sdk-boundaries.md) before
choosing a package or key.

## Mandatory workflow

1. Confirm whether the request is a public storefront or private catalog
   administration. Route private administration to `avileo-catalog`.
2. Confirm the target business matches the connected catalog credential. Never
   offer business creation, selection, or switching as an executable option.
3. Obtain an approved `avileo_pk_` through the catalog skill when needed.
4. Select the SDK source explicitly: local `workspace:*`/`file:` for confirmed
   development checkouts, or the pinned published release otherwise. Configure
   the API URL separately.
5. Scaffold TanStack Start, add the selected SDK source, and configure the API
   URL and Client Key through public environment variables.
6. Create one shared `createAvileo` client for loaders/helpers and mount one
   `AvileoProvider` at the React root.
7. Build the smallest vertical slice first: business profile + catalog. Add
   cart, checkout, presence, or assistant only when requested.
8. Validate tests, typecheck, and production build before deployment. Deployment
   remains owned by the target application/provider.

The install command below is the published fallback. For a local SDK or backend,
follow [TanStack Start storefront](references/tanstack-start.md) before adding
the dependency; never assume a local package automatically targets a local API.

## Quick start

```sh
npx @tanstack/cli@latest create
npm install @tarileo/avileo-sdk@0.3.0 @tanstack/react-query
```

```env
VITE_AVILEO_API_URL=https://api.avileo.com
VITE_AVILEO_CLIENT_KEY=avileo_pk_...
```

```ts
import { createAvileo } from '@tarileo/avileo-sdk';

export const avileo = createAvileo({
  baseUrl: import.meta.env.VITE_AVILEO_API_URL,
  clientKey: import.meta.env.VITE_AVILEO_CLIENT_KEY,
});
```

```tsx
import { AvileoProvider } from '@tarileo/avileo-sdk/react';

<AvileoProvider
  baseUrl={import.meta.env.VITE_AVILEO_API_URL}
  clientKey={import.meta.env.VITE_AVILEO_CLIENT_KEY}
  queryClient={queryClient}
>
  {children}
</AvileoProvider>;
```

For the full TanStack Start composition, SSR guidance, and optional assistant,
read [TanStack Start storefront](references/tanstack-start.md).

## Public SDK surface

Prefer the React hooks inside the provider:

- `useBusiness()` for the connected public business profile;
- `useCatalog(params?)` for categories and products;
- `useCart()` for the key-scoped guest cart;
- `useCheckout(cart, clearCart?)` for order confirmation.

Outside React, use `avileo.currentBusiness`: `getInfo()`, `catalog`, `assets`,
`sessions`, `carts()`, `orders`, and `payments`. The same Client Key always
resolves the same business.

Enable presence or the storefront assistant only when the product asks for
those features. Follow the SDK's `AvileoProvider` + `StorefrontAssistantHost`
contract rather than building a second chat runtime.

## Canonical implementation

The code-grounded TanStack Start reference is `apps/stuff/elite-coffee` in the
Elena Tech monorepo. Reuse its architecture—not its branding, business data,
copy, payment configuration, or secrets.

Read [Validation and delivery](references/validation.md) before reporting the
app as ready.
