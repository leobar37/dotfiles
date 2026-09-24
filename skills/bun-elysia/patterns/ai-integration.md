# AI SDK Integration (Vercel AI SDK)

Bun/Elysia-specific AI integration examples. Canonical AI runtime ownership belongs to `ai-sdk`; this file should stay backend-translation-focused.

## Dependencias

```json
{
  "dependencies": {
    "ai": "^5.0.93",
    "@ai-sdk/openai": "^2.0.67",
    "@ai-sdk/replicate": "^1.0.18"
  }
}
```

## Providers Setup

```typescript
// src/ai/providers.ts
import { createOpenAI } from "@ai-sdk/openai";
import { createReplicate } from "@ai-sdk/replicate";

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const replicate = createReplicate({
  apiToken: process.env.REPLICATE_API_TOKEN!,
});

// Modelos disponibles
export const models = {
  vision: openai("gpt-4o"),
  text: openai("gpt-4o-mini"),
  imageFlux: "black-forest-labs/flux-schnell",
  imageSDXL: "stability-ai/sdxl",
};
```

## Vision Service (Structured Output)

```typescript
// src/services/ai/vision.service.ts
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { openai } from "../../ai/providers";

// Schema para extracción estructurada
const ExtractedItemsSchema = z.object({
  items: z.array(z.object({
    name: z.string().describe("Nombre del producto"),
    price: z.number().optional().describe("Precio si es visible"),
    description: z.string().optional().describe("Descripción corta"),
    confidence: z.number().min(0).max(1).describe("Confianza de la extracción"),
  })),
  metadata: z.object({
    language: z.string().describe("Idioma detectado"),
    quality: z.enum(["low", "medium", "high"]).describe("Calidad de imagen"),
    itemCount: z.number().describe("Cantidad de items detectados"),
  }),
});

export type ExtractedItems = z.infer<typeof ExtractedItemsSchema>;

export class VisionService {
  /**
   * Extrae datos estructurados de imágenes
   */
  async extractFromImages(imageUrls: string[]): Promise<ExtractedItems> {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: ExtractedItemsSchema,
      messages: [
        {
          role: "system",
          content: `Eres un experto en extracción de datos de imágenes de menús y catálogos.
            Extrae todos los productos visibles con sus precios si están disponibles.
            Sé preciso y proporciona un score de confianza para cada item.`,
        },
        {
          role: "user",
          content: imageUrls.map(url => ({
            type: "image" as const,
            image: url,
          })),
        },
      ],
      temperature: 0.1,  // Baja temperatura para consistencia
    });

    return object;
  }

  /**
   * Analiza imagen con prompt personalizado
   */
  async analyzeImage(imageUrl: string, prompt: string): Promise<string> {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });

    return text;
  }

  /**
   * Genera descripción de producto
   */
  async generateProductDescription(
    imageUrl: string,
    productName: string,
  ): Promise<string> {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: `Genera una descripción atractiva y concisa (máx 100 palabras)
            para un producto de restaurante. El tono debe ser apetitoso y profesional.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Producto: ${productName}` },
            { type: "image", image: imageUrl },
          ],
        },
      ],
    });

    return text;
  }
}
```

## Strategy Pattern para Modelos de Imagen

```typescript
// src/services/ai/strategies/model-strategy.ts
export interface ImageModelStrategy {
  readonly modelId: string;
  readonly name: string;
  getModelConfig(): { model: string; defaultOptions: Record<string, any> };
  optimizePrompt(prompt: string, context?: string): Promise<string>;
  supportsImageToImage(): boolean;
}

// src/services/ai/strategies/flux.strategy.ts
export class FluxStrategy implements ImageModelStrategy {
  readonly modelId = "flux-schnell";
  readonly name = "Flux Schnell";

  getModelConfig() {
    return {
      model: "black-forest-labs/flux-schnell",
      defaultOptions: {
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "webp",
        output_quality: 80,
      },
    };
  }

  async optimizePrompt(prompt: string, context?: string): Promise<string> {
    // Flux responde bien a prompts descriptivos
    return `Professional food photography: ${prompt},
      studio lighting, appetizing presentation,
      high resolution, clean background`;
  }

  supportsImageToImage(): boolean {
    return false;
  }
}

// src/services/ai/strategies/sdxl.strategy.ts
export class SDXLStrategy implements ImageModelStrategy {
  readonly modelId = "sdxl";
  readonly name = "Stable Diffusion XL";

  getModelConfig() {
    return {
      model: "stability-ai/sdxl",
      defaultOptions: {
        width: 1024,
        height: 1024,
        num_inference_steps: 25,
      },
    };
  }

  async optimizePrompt(prompt: string): Promise<string> {
    return `${prompt}, photorealistic, 8k, detailed`;
  }

  supportsImageToImage(): boolean {
    return true;
  }
}

// src/services/ai/strategy-manager.ts
import { BadRequestException } from "../../utils/http-exceptions";

export class StrategyManager {
  private strategies = new Map<string, ImageModelStrategy>();

  constructor() {
    this.strategies.set("flux-schnell", new FluxStrategy());
    this.strategies.set("sdxl", new SDXLStrategy());
  }

  getStrategy(modelId: string): ImageModelStrategy {
    const strategy = this.strategies.get(modelId);
    if (!strategy) {
      throw new BadRequestException(`Modelo ${modelId} no soportado`);
    }
    return strategy;
  }

  listStrategies(): Array<{ id: string; name: string }> {
    return Array.from(this.strategies.entries()).map(([id, s]) => ({
      id,
      name: s.name,
    }));
  }
}
```

## AI Jobs con BullMQ

```typescript
// src/jobs/queues/ai.queue.ts
import { Queue } from "bullmq";
import { getRedisConnection } from "../../utils/redis";

export const aiQueue = new Queue("ai-tasks", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export type AIJobData =
  | {
      type: "EXTRACT_MENU";
      imageUrls: string[];
      tenantId: string;
      userId: string;
    }
  | {
      type: "GENERATE_DESCRIPTION";
      productId: string;
      imageUrl: string;
      productName: string;
    }
  | {
      type: "GENERATE_IMAGE";
      prompt: string;
      modelId: string;
      options?: Record<string, any>;
    };

// src/jobs/workers/ai.worker.ts
import { Worker, Job } from "bullmq";
import { getRedisConnection } from "../../utils/redis";
import { AIJobData } from "../queues/ai.queue";
import { VisionService } from "../../services/ai/vision.service";

const visionService = new VisionService();

export const aiWorker = new Worker<AIJobData>(
  "ai-tasks",
  async (job: Job<AIJobData>) => {
    console.log(`Processing AI job ${job.id}: ${job.data.type}`);

    switch (job.data.type) {
      case "EXTRACT_MENU": {
        const result = await visionService.extractFromImages(job.data.imageUrls);
        // Guardar resultado en DB
        // await menuImportService.saveExtractedItems(job.data.tenantId, result);
        return result;
      }

      case "GENERATE_DESCRIPTION": {
        const description = await visionService.generateProductDescription(
          job.data.imageUrl,
          job.data.productName,
        );
        // Actualizar producto
        // await productService.updateDescription(job.data.productId, description);
        return { description };
      }

      case "GENERATE_IMAGE": {
        // Implementar generación de imagen
        return { status: "completed" };
      }

      default:
        throw new Error(`Unknown job type`);
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 5,
    limiter: {
      max: 20,
      duration: 60000,  // 20 jobs por minuto
    },
  },
);

aiWorker.on("completed", (job) => {
  console.log(`AI job ${job.id} completed`);
});

aiWorker.on("failed", (job, error) => {
  console.error(`AI job ${job?.id} failed:`, error);
});
```

## AI Routes

```typescript
// src/api/routes/ai.ts
import { Elysia, t } from "elysia";
import { servicesPlugin } from "../../plugins/services";
import { contextPlugin } from "../../plugins/context";
import { authGuard } from "../../middleware/auth";
import { aiQueue } from "../../jobs/queues/ai.queue";

export const aiRoutes = new Elysia({ prefix: "/ai" })
  .use(servicesPlugin)
  .use(contextPlugin)
  .use(authGuard)

  // Extraer menú de imágenes (async job)
  .post("/extract-menu", async ({ body, ctx, set }) => {
    const job = await aiQueue.add("extract-menu", {
      type: "EXTRACT_MENU",
      imageUrls: body.imageUrls,
      tenantId: ctx!.tenantId,
      userId: ctx!.userId,
    });

    set.status = 202;
    return {
      jobId: job.id,
      status: "processing",
      message: "Extracción iniciada. Consulta el estado con GET /ai/jobs/:id",
    };
  }, {
    body: t.Object({
      imageUrls: t.Array(t.String({ format: "uri" }), { minItems: 1, maxItems: 10 }),
    }),
  })

  // Consultar estado de job
  .get("/jobs/:id", async ({ params }) => {
    const job = await aiQueue.getJob(params.id);
    if (!job) {
      throw new NotFoundException("Job no encontrado");
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      id: job.id,
      status: state,
      progress: typeof progress === "number" ? progress : 0,
      result: state === "completed" ? job.returnvalue : null,
      error: state === "failed" ? job.failedReason : null,
      createdAt: job.timestamp,
    };
  })

  // Generar descripción (sync - rápido)
  .post("/generate-description", async ({ body, visionService }) => {
    const description = await visionService.generateProductDescription(
      body.imageUrl,
      body.productName,
    );
    return { description };
  }, {
    body: t.Object({
      imageUrl: t.String({ format: "uri" }),
      productName: t.String({ minLength: 1 }),
    }),
  });
```

## Checklist

- [ ] Providers configurados con API keys
- [ ] Vision usa `generateObject` con schema Zod
- [ ] Operaciones pesadas en BullMQ jobs
- [ ] Strategy pattern para múltiples modelos
- [ ] Rate limiting en workers
- [ ] Endpoints async retornan 202 + jobId
- [ ] Endpoint para consultar estado de job
- [ ] Manejo de errores en workers
