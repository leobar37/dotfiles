# Testing Setup (Vitest + TestContainers)

Configuración de testing para backend con Bun.

## Dependencias

```json
{
  "devDependencies": {
    "vitest": "^4.0.10",
    "@vitest/coverage-v8": "^2.1.1",
    "supertest": "^7.1.4",
    "testcontainers": "^11.8.1"
  }
}
```

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.spec.ts"],
    exclude: ["**/node_modules/**"],
    testTimeout: 30000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/db/migrations/**",
      ],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
```

## TestContainers Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from "vitest";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../src/db/schema";

let postgresContainer: StartedTestContainer;
let redisContainer: StartedTestContainer;
let dbConnection: ReturnType<typeof postgres>;

// Variables para tests
export let testDb: ReturnType<typeof drizzle>;

beforeAll(async () => {
  console.log("Starting test containers...");

  // Start PostgreSQL
  postgresContainer = await new GenericContainer("postgres:16-alpine")
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "test_db",
    })
    .withWaitStrategy(Wait.forLogMessage(/ready to accept connections/))
    .start();

  // Start Redis
  redisContainer = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();

  // Set environment variables
  const dbUrl = `postgresql://test:test@${postgresContainer.getHost()}:${postgresContainer.getMappedPort(5432)}/test_db`;
  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

  // Create DB connection
  dbConnection = postgres(dbUrl);
  testDb = drizzle(dbConnection, { schema });

  // Run migrations
  console.log("Running migrations...");
  await migrate(testDb, { migrationsFolder: "./src/db/migrations" });

  console.log("Test environment ready");
}, 120000);

afterAll(async () => {
  console.log("Cleaning up test environment...");
  await dbConnection?.end();
  await postgresContainer?.stop();
  await redisContainer?.stop();
});
```

## Estructura de Tests

```
tests/
├── setup.ts              # Global setup (containers)
├── helpers/
│   ├── factories.ts      # Data factories
│   └── auth.ts           # Auth helpers
├── unit/
│   └── services/
│       ├── item.service.spec.ts
│       └── order.service.spec.ts
└── e2e/
    ├── items.spec.ts
    └── orders.spec.ts
```

## Test Helpers

```typescript
// tests/helpers/factories.ts
import { testDb } from "../setup";
import { items, users, type NewItem, type NewUser } from "../../src/db/schema";

export async function createTestUser(data: Partial<NewUser> = {}): Promise<User> {
  const [user] = await testDb.insert(users).values({
    email: `test-${Date.now()}@example.com`,
    name: "Test User",
    ...data,
  }).returning();
  return user;
}

export async function createTestItem(
  tenantId: string,
  data: Partial<NewItem> = {},
): Promise<Item> {
  const [item] = await testDb.insert(items).values({
    name: `Test Item ${Date.now()}`,
    price: 1000,
    tenantId,
    ...data,
  }).returning();
  return item;
}

// tests/helpers/auth.ts
import { testDb } from "../setup";
import { users, sessions } from "../../src/db/schema";

export async function createTestSession(tenantId: string): Promise<string> {
  const [user] = await testDb.insert(users).values({
    email: `test-${Date.now()}@example.com`,
    currentRestaurantId: tenantId,
  }).returning();

  const token = crypto.randomUUID();
  await testDb.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 3600000),
  });

  return token;
}
```

## Unit Test Example

```typescript
// tests/unit/services/item.service.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemService } from "../../../src/services/business/item.service";
import { ItemRepository } from "../../../src/services/repository/item.repository";
import { NotFoundException, BadRequestException } from "../../../src/utils/http-exceptions";

describe("ItemService", () => {
  let service: ItemService;
  let mockRepository: Partial<ItemRepository>;
  const mockCtx = {
    userId: "user-1",
    tenantId: "tenant-1",
    email: "test@example.com",
    role: "admin",
  };

  beforeEach(() => {
    mockRepository = {
      findOne: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new ItemService(mockRepository as ItemRepository);
  });

  describe("getItem", () => {
    it("should return item when found", async () => {
      const mockItem = { id: "item-1", name: "Test", tenantId: "tenant-1" };
      vi.mocked(mockRepository.findOne).mockResolvedValue(mockItem);

      const result = await service.getItem(mockCtx, "item-1");

      expect(result).toEqual(mockItem);
      expect(mockRepository.findOne).toHaveBeenCalledWith(mockCtx, "item-1");
    });

    it("should throw NotFoundException when not found", async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);

      await expect(service.getItem(mockCtx, "non-existent"))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe("createItem", () => {
    it("should create item with valid data", async () => {
      const input = { name: "New Item", price: 1000 };
      const created = { id: "new-id", ...input, tenantId: "tenant-1" };
      vi.mocked(mockRepository.findMany).mockResolvedValue([]);
      vi.mocked(mockRepository.create).mockResolvedValue(created);

      const result = await service.createItem(mockCtx, input);

      expect(result).toEqual(created);
    });

    it("should throw BadRequestException for negative price", async () => {
      const input = { name: "Item", price: -100 };

      await expect(service.createItem(mockCtx, input))
        .rejects
        .toThrow(BadRequestException);
    });
  });
});
```

## E2E Test Example

```typescript
// tests/e2e/items.spec.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Elysia } from "elysia";
import supertest from "supertest";
import { testDb } from "../setup";
import { items } from "../../src/db/schema";
import { itemRoutes } from "../../src/api/routes/items";
import { createTestSession, createTestItem } from "../helpers";

describe("Items API", () => {
  let request: ReturnType<typeof supertest>;
  let authToken: string;
  const testTenantId = "test-tenant-123";

  beforeEach(async () => {
    // Clean items table
    await testDb.delete(items);

    // Create test session
    authToken = await createTestSession(testTenantId);

    // Create app
    const app = new Elysia().use(itemRoutes);
    request = supertest(app.handle.bind(app));
  });

  describe("POST /items", () => {
    it("should create item with 201", async () => {
      const response = await request
        .post("/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Item",
          price: 1500,
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: "Test Item",
        price: 1500,
        tenantId: testTenantId,
      });
      expect(response.body.id).toBeDefined();
    });

    it("should return 400 for invalid data", async () => {
      const response = await request
        .post("/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "",  // Invalid
          price: -100,  // Invalid
        });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /items/:id", () => {
    it("should return item when exists", async () => {
      const item = await createTestItem(testTenantId, { name: "Existing" });

      const response = await request
        .get(`/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe("Existing");
    });

    it("should return 404 when not found", async () => {
      const response = await request
        .get("/items/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /items/:id", () => {
    it("should delete item with 204", async () => {
      const item = await createTestItem(testTenantId);

      const response = await request
        .delete(`/items/${item.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify deleted
      const check = await testDb.query.items.findFirst({
        where: (i, { eq }) => eq(i.id, item.id),
      });
      expect(check).toBeUndefined();
    });
  });
});
```

## NPM Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:unit": "vitest run tests/unit",
    "test:e2e": "vitest run tests/e2e",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Checklist

- [ ] TestContainers para PostgreSQL y Redis
- [ ] Migrations ejecutadas en setup
- [ ] Factories para crear datos de test
- [ ] Auth helpers para simular sesiones
- [ ] Unit tests con mocks de repositories
- [ ] E2E tests con supertest
- [ ] Limpieza de datos entre tests
- [ ] Coverage thresholds configurados
