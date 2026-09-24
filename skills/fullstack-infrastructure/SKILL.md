---
name: fullstack-infrastructure
description: |
  Project initialization with React Router v7, Bun monorepo, Turborepo, and SSE.
  Covers project setup, file-based routing, workspace configuration, and real-time features.
  Use when starting new projects from scratch or configuring development infrastructure.
  Keywords: react router v7, bun monorepo, turborepo, project setup, file-based routing,
  workspaces, build pipeline, sse, server-sent events, initialization.
---

# Full-Stack Infrastructure

Project setup and infrastructure configuration.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Bun | Runtime + Package manager |
| React Router v7 | File-based routing |
| Turborepo | Build system |
| Elysia | Backend framework |
| Vite | Build tool |

## Quick Start

```bash
# 1. Create monorepo structure
mkdir my-app && cd my-app
mkdir packages

# 2. Initialize Bun
bun init

# 3. Setup workspaces (package.json)
{
  "workspaces": ["packages/*"]
}

# 4. Create packages
mkdir packages/app packages/backend

# 5. Setup Turborepo
echo '{"pipeline":{"build":{"dependsOn":["^build"]}}}' > turbo.json
```

## Pattern Documentation

| Pattern | File | Description |
|---------|------|-------------|
| **Project Structure** | `patterns/01-project-structure.md` | Monorepo layout |
| **Bun Workspaces** | `patterns/02-bun-workspaces.md` | Workspace config |
| **Turborepo** | `patterns/03-turborepo.md` | Build pipeline |
| **React Router v7** | `patterns/04-react-router-v7.md` | Router setup |
| **File-Based Routing** | `patterns/05-file-based-routing.md` | flatRoutes |
| **SSE Backend** | `patterns/06-sse-backend.md` | Server-Sent Events |
| **SSE Frontend** | `patterns/07-sse-frontend.md` | EventSource |

## Folder Structure

```
my-app/
├── package.json           # Root + workspaces
├── turbo.json             # Build config
├── packages/
│   ├── app/               # React Router frontend
│   │   ├── app/
│   │   │   ├── routes/    # File-based routes
│   │   │   └── root.tsx
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── backend/           # Elysia backend
│       ├── src/
│       └── package.json
```

## When to Use

**Use when:** Bootstrapping a new Elena-style repo, setting up monorepo/workspace structure, React Router v7 routing, Turborepo/Bun wiring, or shared SSE scaffolding before domain/backend implementation starts.

**Do not use when:** You are defining backend service architecture, auth flows, background jobs, or AI runtime behavior. Delegate those to `fullstack-backend`, `fullstack-auth-better`, `fullstack-inngest`, or `ai-sdk`.

**Pair with:** `fullstack-backend` after the repo skeleton exists.

**Notes:** This is the bootstrap entrypoint, not the canonical backend architecture owner.
