# Project Structure

Monorepo folder structure.

## Root Structure

```
my-app/
├── package.json              # Workspace config
├── turbo.json               # Build pipeline
├── README.md
└── packages/
    ├── app/                 # Frontend
    └── backend/             # Backend
```

## Frontend Structure (app)

```
packages/app/
├── app/
│   ├── routes/              # File-based routes
│   │   ├── _index.tsx      # Home page
│   │   ├── _protected.tsx  # Auth layout
│   │   └── _protected.dashboard.tsx
│   ├── components/          # UI components
│   ├── hooks/               # Custom hooks
│   └── root.tsx            # Root layout
├── public/                  # Static assets
├── vite.config.ts          # Vite config
├── react-router.config.ts  # Router config
└── package.json
```

## Backend Structure (backend)

```
packages/backend/
├── src/
│   ├── api/                 # Routes
│   ├── auth/                # Auth config
│   ├── context/             # RequestContext
│   ├── db/                  # Database
│   ├── middleware/          # Middleware
│   ├── plugins/             # DI
│   └── services/            # Business logic
├── drizzle/                 # Migrations
└── package.json
```

## Shared Package (optional)

```
packages/shared/
├── src/
│   ├── types/               # Shared types
│   └── utils/               # Shared utilities
└── package.json
```
