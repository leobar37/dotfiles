# Bun Workspaces

Workspace configuration with Bun.

## Root package.json

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

## Package Scripts

```json
// packages/app/package.json
{
  "name": "@myapp/app",
  "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js"
  },
  "dependencies": {
    "@myapp/shared": "workspace:*"
  }
}
```

```json
// packages/backend/package.json
{
  "name": "@myapp/backend",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "build": "bun build src/index.ts --outdir dist",
    "start": "bun run dist/index.js"
  },
  "dependencies": {
    "@myapp/shared": "workspace:*"
  }
}
```

## Cross-Package Dependencies

```bash
# Add workspace dependency
bun add @myapp/shared --filter @myapp/app

# Or manually in package.json
"dependencies": {
  "@myapp/shared": "workspace:*"
}
```

## Running Commands

```bash
# Install all dependencies
bun install

# Run dev (all packages)
bun run dev

# Run dev (single package)
bun run --filter @myapp/app dev
```
