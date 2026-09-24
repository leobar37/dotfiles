# React Router v7 Setup

File-based routing with Vite.

## Installation

```bash
cd packages/app
bun add @react-router/dev react-router
```

## Vite Config

```typescript
// vite.config.ts
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouter(),
    tsconfigPaths(),
  ],
});
```

## Router Config

```typescript
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  // Disable SSR for SPA mode
  ssr: false,
  
  // Or enable SSR
  // ssr: true,
  
  // Deployment preset
  // preset: "vercel",
} satisfies Config;
```

## Root Route

```tsx
// app/root.tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
```

## Development

```bash
# Start dev server
bun run dev

# Or with React Router CLI
npx react-router dev
```
