# AI Integration

How to set up AI chatbot with ToolLoopAgent, tools, and system prompts.

## API Route (`src/app/api/chat/route.ts`)

```typescript
import { ToolLoopAgent, type UIMessage, convertToModelMessages } from "ai";
import { medicalInfoSystemPrompt } from "@/lib/ai/prompts";
import { medicalTools } from "@/lib/ai/tools";
import { rateLimit, getClientIp, CHAT_RATE_LIMIT } from "@/lib/rate-limit";

const agent = new ToolLoopAgent({
  model: "deepseek/deepseek-v3.2",
  instructions: medicalInfoSystemPrompt,
  tools: medicalTools,
});

export async function POST(req: Request) {
  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = rateLimit(`chat:${clientIp}`);

  if (!rateLimitResult.success) {
    return new Response(JSON.stringify({
      error: "Has excedido el limite de mensajes.",
      retryAfter: rateLimitResult.retryAfter,
    }), { status: 429 });
  }

  const { messages } = await req.json();
  const result = await agent.stream({
    messages: await convertToModelMessages(messages)
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
  });
}
```

## Tool Definition Pattern (`src/lib/ai/tools.ts`)

```typescript
import { tool } from "ai";
import { z } from "zod";
import { getProducts, createOrder } from "@/lib/payload/queries";

export const getProductsTool = tool({
  description: "Get medical products catalog. Use when user asks about prices, availability, or product details.",
  inputSchema: z.object({
    category: z.string().optional(),
    limit: z.number().optional().default(20),
  }),
  execute: async ({ category, limit = 20 }) => {
    try {
      const result = await getProducts({ category, limit });
      return {
        success: true,
        products: result.docs.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          // ... public fields
        })),
      };
    } catch (error) {
      return { success: false, error: "No se pudieron obtener los productos." };
    }
  },
});

export const scheduleConsultationTool = tool({
  description: "Schedule a medical consultation. Creates order and generates WhatsApp link.",
  inputSchema: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    surgeryInterest: z.string().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ name, phone, email, surgeryInterest, message }) => {
    try {
      const order = await createOrder({
        items: [{ product: "consultation-request", quantity: 1, price: 0 }],
        total: 0,
        customerInfo: { name, phone, email: email ?? "" },
      });

      const whatsappMessage = `¡Hola! Me gustaría agendar una consulta...`;
      const whatsappLink = `https://wa.me/${PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

      return { success: true, orderId: order.id, whatsappLink };
    } catch (error) {
      return { success: false, error: "No se pudo procesar." };
    }
  },
});

export const medicalTools = {
  getProducts: getProductsTool,
  getProductDetails: getProductDetailsTool,
  scheduleConsultation: scheduleConsultationTool,
};
```

## System Prompt Structure (`src/lib/ai/prompts.ts`)

```typescript
export const medicalInfoSystemPrompt = `Eres el Dr. Asistente del consultorio...

## Tu rol
Brindar información general sobre servicios. Usar herramientas para datos actualizados.

## Información del consultorio
- Doctor: Dr. Rolando Yurivilca
- WhatsApp: ${siteConfig.contact.whatsapp.primary}
- Teléfono: ${siteConfig.contact.phone}

## Herramientas disponibles
- getProducts: Consultar productos médicos
- getProductDetails: Detalle de producto específico
- scheduleConsultation: Agendar consulta

## Cirugías disponibles
Lista de procedimientos con descripciones...

## Qué PUEDES hacer
1. Responder sobre procedimientos quirúrgicos
2. Brindar información general
3. Consultar productos con herramientas
4. Guiar sobre agendar consultas

## Qué NO puedes hacer
- Diagnosticar condiciones médicas
- Recomendar tratamientos específicos
- Interpretar síntomas
- Prescribir medicamentos

## Respuesta estándar fuera de contexto
"Solo puedo ayudarle con información sobre el consultorio del Dr. Yurivilca. ¿Tiene alguna consulta sobre nuestros servicios?"

## Estilo
- Máximo 2-3 oraciones
- Español peruano formal pero cálido
- Usar emojis con moderación
- Derivar a WhatsApp para personalizados
`;
```

## Model Selection

Current: `deepseek/deepseek-v3.2`

To use different models:
```typescript
// Vercel AI Gateway
const agent = new ToolLoopAgent({
  model: "openai/gpt-4o",
});

// Or direct provider
const agent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4-6",
});
```

## Tool Results in UI

When a tool is called, the result appears as a message in the chat. The `InferAgentUIMessage` type ensures type safety:

```typescript
import type { InferAgentUIMessage } from "ai";
import type { agent } from "./agent";

type ToolResult = InferAgentUIMessage<typeof agent>;
```

## Error Handling

Tools return `{ success: false, error: "..." }` for graceful degradation:

```typescript
execute: async (...) => {
  try {
    const result = await someOperation();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "User-friendly message" };
  }
}
```

This ensures the chat continues even if backend fails.
