# Turborepo

Build pipeline configuration.

## Basic Config

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

## Pipeline Explanation

```json
{
  "tasks": {
    "build": {
      // Run dependencies' build first
      "dependsOn": ["^build"],
      
      // Cache these outputs
      "outputs": ["dist/**", "build/**", ".react-router/**"]
    },
    
    "dev": {
      // Don't cache dev mode
      "cache": false,
      
      // Keep running
      "persistent": true
    }
  }
}
```

## With Dependency Graph

```json
{
  "tasks": {
    "@myapp/shared#build": {
      "outputs": ["dist/**"]
    },
    
    "@myapp/backend#build": {
      "dependsOn": ["@myapp/shared#build"],
      "outputs": ["dist/**"]
    },
    
    "@myapp/app#build": {
      "dependsOn": ["@myapp/shared#build"],
      "outputs": ["build/**"]
    }
  }
}
```

## Commands

```bash
# Run build (all packages)
npx turbo run build

# Run build (affected only)
npx turbo run build --filter=[HEAD^1]

# Run dev
npx turbo run dev

# Run with cache
turbo run build --cache-dir=.turbo
```
