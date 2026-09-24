# BullMQ Jobs Pattern

BullMQ/Redis-specific background-job guidance for Bun/Elysia stacks. This file is intentionally variant-specific and should coexist with `fullstack-inngest` rather than compete with the canonical backend core.

## Setup de Redis

```typescript
// src/utils/redis.ts
import { Redis } from "ioredis";

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,  // Requerido por BullMQ
    });
  }
  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
```

## Queue Definition

```typescript
// src/jobs/queues/email.queue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "../../utils/redis";

export const emailQueue = new Queue("email", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 100,   // Mantener últimos 100 completados
    removeOnFail: 50,        // Mantener últimos 50 fallidos
    attempts: 3,             // Reintentar 3 veces
    backoff: {
      type: "exponential",
      delay: 1000,           // 1s, 2s, 4s
    },
  },
});

// Tipos de jobs
export type EmailJobData =
  | { type: "WELCOME"; userId: string; email: string }
  | { type: "PASSWORD_RESET"; email: string; token: string; expiresAt: string }
  | { type: "ORDER_CONFIRMATION"; orderId: string; customerEmail: string }
  | { type: "INVOICE"; orderId: string; customerEmail: string };

// Nombres de jobs
export const EMAIL_JOBS = {
  WELCOME: "welcome-email",
  PASSWORD_RESET: "password-reset",
  ORDER_CONFIRMATION: "order-confirmation",
  INVOICE: "invoice",
} as const;
```

## Worker

```typescript
// src/jobs/workers/email.worker.ts
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../../utils/redis";
import { EmailJobData } from "../queues/email.queue";
import { sendEmail } from "../../services/email/email.service";

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job: Job<EmailJobData>) => {
    console.log(`Processing email job ${job.id}: ${job.data.type}`);

    switch (job.data.type) {
      case "WELCOME": {
        await sendEmail({
          to: job.data.email,
          subject: "Bienvenido a nuestra plataforma",
          template: "welcome",
          data: { userId: job.data.userId },
        });
        break;
      }

      case "PASSWORD_RESET": {
        await sendEmail({
          to: job.data.email,
          subject: "Recuperar contraseña",
          template: "password-reset",
          data: { token: job.data.token, expiresAt: job.data.expiresAt },
        });
        break;
      }

      case "ORDER_CONFIRMATION": {
        // Obtener datos de la orden
        // const order = await orderRepository.findById(job.data.orderId);
        await sendEmail({
          to: job.data.customerEmail,
          subject: "Confirmación de pedido",
          template: "order-confirmation",
          data: { orderId: job.data.orderId },
        });
        break;
      }

      case "INVOICE": {
        // Generar PDF y enviar
        break;
      }

      default:
        throw new Error(`Unknown email type`);
    }

    return { sent: true, timestamp: new Date().toISOString() };
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
  },
);

// Event handlers
emailWorker.on("completed", (job, result) => {
  console.log(`Email job ${job.id} completed:`, result);
});

emailWorker.on("failed", (job, error) => {
  console.error(`Email job ${job?.id} failed:`, error.message);
});

emailWorker.on("stalled", (jobId) => {
  console.warn(`Email job ${jobId} stalled`);
});
```

## Scheduled Jobs (Cron)

```typescript
// src/jobs/queues/scheduled.queue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "../../utils/redis";

export const scheduledQueue = new Queue("scheduled", {
  connection: getRedisConnection(),
});

// Agregar jobs recurrentes al iniciar
export async function setupScheduledJobs() {
  // Limpiar jobs anteriores
  await scheduledQueue.obliterate({ force: true });

  // Reporte diario - 8am
  await scheduledQueue.add(
    "daily-report",
    { type: "DAILY_REPORT" },
    {
      repeat: {
        pattern: "0 8 * * *",  // Cron: 8:00 AM cada día
        tz: "America/Lima",
      },
    },
  );

  // Cleanup semanal - Domingos 3am
  await scheduledQueue.add(
    "weekly-cleanup",
    { type: "WEEKLY_CLEANUP" },
    {
      repeat: {
        pattern: "0 3 * * 0",  // Domingos 3:00 AM
        tz: "America/Lima",
      },
    },
  );

  console.log("Scheduled jobs configured");
}
```

## Enqueuing Jobs desde Service

```typescript
// src/services/business/order.service.ts
import { emailQueue, EMAIL_JOBS } from "../../jobs/queues/email.queue";

export class OrderService {
  async createOrder(ctx: RequestContext, data: CreateOrderDto) {
    // Crear orden en DB
    const order = await this.orderRepository.create(ctx, data);

    // Encolar email de confirmación (no bloquea)
    await emailQueue.add(
      EMAIL_JOBS.ORDER_CONFIRMATION,
      {
        type: "ORDER_CONFIRMATION",
        orderId: order.id,
        customerEmail: data.customerEmail,
      },
      {
        delay: 1000,  // Esperar 1s para asegurar que la orden esté commiteada
      },
    );

    return order;
  }
}
```

## Job con Progreso

```typescript
// src/jobs/workers/import.worker.ts
import { Worker, Job } from "bullmq";

export const importWorker = new Worker(
  "import",
  async (job: Job) => {
    const items = job.data.items as any[];
    const total = items.length;
    let processed = 0;

    for (const item of items) {
      // Procesar item
      await processItem(item);

      processed++;
      // Reportar progreso
      await job.updateProgress(Math.round((processed / total) * 100));
    }

    return { processed, total };
  },
  {
    connection: getRedisConnection(),
    concurrency: 1,
  },
);
```

## Inicializar Workers

```typescript
// src/jobs/workers/init.ts
import { emailWorker } from "./email.worker";
import { aiWorker } from "./ai.worker";
import { importWorker } from "./import.worker";
import { setupScheduledJobs } from "../queues/scheduled.queue";

export async function initializeWorkers() {
  // Los workers se inician automáticamente al importarlos
  console.log("Workers initialized:");
  console.log("- Email worker:", emailWorker.name);
  console.log("- AI worker:", aiWorker.name);
  console.log("- Import worker:", importWorker.name);

  // Configurar jobs programados
  await setupScheduledJobs();
}

export async function closeWorkers() {
  await emailWorker.close();
  await aiWorker.close();
  await importWorker.close();
}

// En index.ts
import { initializeWorkers, closeWorkers } from "./jobs/workers/init";

await initializeWorkers();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await closeWorkers();
  process.exit(0);
});
```

## Monitoreo de Queues

```typescript
// src/api/routes/admin/queues.ts
import { Elysia } from "elysia";
import { emailQueue } from "../../../jobs/queues/email.queue";
import { aiQueue } from "../../../jobs/queues/ai.queue";

export const queueRoutes = new Elysia({ prefix: "/admin/queues" })
  .get("/stats", async () => {
    const [emailStats, aiStats] = await Promise.all([
      getQueueStats(emailQueue),
      getQueueStats(aiQueue),
    ]);

    return {
      email: emailStats,
      ai: aiStats,
    };
  });

async function getQueueStats(queue: Queue) {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}
```

## Checklist

- [ ] Redis connection con `maxRetriesPerRequest: null`
- [ ] Queue con `defaultJobOptions` configuradas
- [ ] Worker con `concurrency` apropiada
- [ ] Event handlers para logging
- [ ] Graceful shutdown de workers
- [ ] Jobs pesados usan BullMQ (no bloquean request)
- [ ] Delay para asegurar datos commiteados
- [ ] Progress tracking para jobs largos
