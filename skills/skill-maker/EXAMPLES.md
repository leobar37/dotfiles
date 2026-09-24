# Skill Examples - Web Development

This file contains detailed examples for creating web development skills. See specific examples below.

## React Component Generator

**Use for**: Creating React/Next.js components with TypeScript

```yaml
---
name: react-component-generator
description: Generate React components with TypeScript, proper typing, and best practices. Use when creating React components, Next.js pages, or UI elements.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# React Component Generator

## Instructions

1. Determine component type (client/server for Next.js)
2. Create TypeScript interface for props
3. Generate component with proper structure
4. Add JSDoc comments
5. Follow project conventions (check existing components)

## Component Template

```typescript
import { FC } from 'react';

interface ComponentNameProps {
  /** Description of prop */
  propName: string;
  children?: React.ReactNode;
}

/**
 * ComponentName - Brief description
 *
 * @example
 * ```tsx
 * <ComponentName propName="value" />
 * ```
 */
export const ComponentName: FC<ComponentNameProps> = ({
  propName,
  children
}) => {
  return (
    <div className="component-name">
      {children}
    </div>
  );
};
```

## Best Practices

- Use TypeScript interfaces for props
- Add JSDoc comments for documentation
- Use semantic HTML elements
- Follow project's naming conventions
- Add 'use client' for client components (Next.js 13+)
- Export as named export (not default)
```

## Next.js API Route Generator

**Use for**: Creating API routes with validation and error handling

```yaml
---
name: nextjs-api-route-generator
description: Generate Next.js API routes with TypeScript, Zod validation, error handling, and proper HTTP methods. Use when creating API endpoints, REST routes, or server actions.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Next.js API Route Generator

## Instructions

1. Determine API route type (REST, GraphQL, tRPC)
2. Create request/response TypeScript types
3. Add Zod schema for validation
4. Implement error handling
5. Add proper HTTP status codes
6. Test with curl or Postman

## API Route Template (App Router)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request validation schema
const requestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

type RequestBody = z.infer<typeof requestSchema>;

/**
 * POST /api/users
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = requestSchema.parse(body);

    // Business logic here
    const result = await createUser(validatedData);

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', issues: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Best Practices

- Always validate input with Zod
- Use proper HTTP status codes (200, 201, 400, 404, 500)
- Add try-catch blocks for error handling
- Type request and response properly
- Add JSDoc comments for API documentation
- Use NextResponse for App Router (not res.json)
```

## TypeScript Testing Skill

**Use for**: Writing tests with Jest, Vitest, or React Testing Library

```yaml
---
name: typescript-test-generator
description: Generate TypeScript tests using Jest, Vitest, or React Testing Library. Use when writing unit tests, integration tests, or component tests for React/Next.js applications.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# TypeScript Test Generator

## Instructions

1. Read the component/function to test
2. Identify test cases (happy path, edge cases, errors)
3. Generate test file with proper imports
4. Use appropriate testing library (Jest/Vitest/RTL)
5. Run tests to verify they pass

## Component Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```
```

## Prisma Schema Manager

**Use for**: Database schema management with Prisma ORM

See [patterns/skill-structure.md](patterns/skill-structure.md) for detailed Prisma examples.

## Form Validation with React Hook Form & Zod

```yaml
---
name: form-validation-generator
description: Create forms with React Hook Form and Zod validation for Next.js/React applications. Use when creating forms, adding validation, or handling form submissions.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Form Validation Generator

## Complete Form Example

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter'),
});

export function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    await fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```
```

## tRPC API Router Generator

```yaml
---
name: trpc-router-generator
description: Create type-safe tRPC routers and procedures for Next.js applications. Use when building APIs with tRPC, creating mutations/queries, or adding API endpoints.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# tRPC Router Generator

## Router Example

```typescript
import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';

export const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
      });
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.user.create({ data: input });
    }),
});
```
```

## Next.js Server Actions

```yaml
---
name: nextjs-server-actions
description: Create Next.js Server Actions with TypeScript, Zod validation, and revalidation. Use when creating server actions, handling form submissions, or mutating data in Next.js 13+.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Next.js Server Actions Generator

## Server Action Example

```typescript
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

export async function createPost(prevState: any, formData: FormData) {
  const result = createPostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const post = await db.post.create({ data: result.data });
  revalidatePath('/posts');
  redirect(`/posts/${post.id}`);
}
```
```
