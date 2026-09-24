---
name: web-catalog
description: |
  Build medical chatbot with AI, Payload CMS catalog, and WhatsApp checkout. Use when
  building: (1) AI chatbots with Vercel AI SDK (ToolLoopAgent, streaming), (2) E-commerce
  catalogs with Payload CMS (products, orders), (3) WhatsApp checkout flows replacing
  Stripe, (4) Floating chat widgets with localStorage persistence, (5) Medical info
  systems with content guards. Triggers on: "chatbot", "medical catalog", "Payload CMS",
  "WhatsApp checkout", "AI agent", "product catalog", "e-commerce with WhatsApp".
---

## Overview

Pattern for building a medical chatbot + e-commerce catalog system:
- **AI Layer**: Vercel AI SDK chatbot with ToolLoopAgent, streaming, and tools
- **UI Layer**: Floating chat widget (mobile drawer + desktop) with localStorage persistence
- **Backend Layer**: Payload CMS for products, orders, and media
- **Conversion Layer**: WhatsApp checkout replacing traditional payments

## Quick Start

### 1. Set up Payload CMS
```typescript
// payload.config.ts
import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";

export default buildConfig({
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URL } }),
  collections: [/* your collections */],
});
```

### 2. Create AI Tools
```typescript
// lib/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";
import { getProducts, createOrder } from "@/lib/payload/queries";

export const getProductsTool = tool({
  description: "Get medical products catalog",
  inputSchema: z.object({ category: z.string().optional() }),
  execute: async ({ category }) => {
    const result = await getProducts({ category });
    return { success: true, products: result.docs };
  },
});
```

### 3. Build Chat API Route
```typescript
// app/api/chat/route.ts
import { ToolLoopAgent } from "ai";
import { medicalTools } from "@/lib/ai/tools";

const agent = new ToolLoopAgent({
  model: "deepseek/deepseek-v3.2",
  instructions: medicalInfoSystemPrompt,
  tools: medicalTools,
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await agent.stream({ messages });
  return result.toUIMessageStreamResponse();
}
```

### 4. Create Chat Widget
```typescript
// components/ui/chat-widget.tsx
"use client"
import { ChatContainer } from "@/components/ui/chat-container";
import { ChatContent } from "@/components/ui/chat-content";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useDrChat } from "@/hooks/use-chat";

// Mobile: Drawer / Desktop: ChatContainer
```

## Architecture

See [references/chat-architecture.md](references/chat-architecture.md) for widget, hook, and streaming details.

See [references/ai-integration.md](references/ai-integration.md) for ToolLoopAgent, tools, and prompts.

See [references/payload-ecommerce.md](references/payload-ecommerce.md) for Payload collections, queries, and orders.

See [references/whatsapp-flow.md](references/whatsapp-flow.md) for checkout WhatsApp integration.

## Key Files

| Purpose | File Pattern |
|---------|-------------|
| Chat API | `src/app/api/chat/route.ts` |
| Chat Hook | `src/hooks/use-chat.ts` |
| AI Tools | `src/lib/ai/tools.ts` |
| System Prompt | `src/lib/ai/prompts.ts` |
| Rate Limiter | `src/lib/rate-limit.ts` |
| Payload Config | `src/payload.config.ts` |
| Payload Queries | `src/lib/payload/queries.ts` |
| WhatsApp Checkout | `src/lib/whatsapp.ts` |
| UI Components | `src/components/ui/chat-*.tsx` |

## Dependencies

```json
{
  "ai": "^6.0.0",
  "@ai-sdk/react": "^3.0.0",
  "payload": "^3.0.0",
  "@payloadcms/db-postgres": "^3.0.0",
  "@payloadcms/storage-vercel-blob": "^3.0.0"
}
```

## Content Language

All medical content in Spanish (Peru). System prompts and UI in Spanish. WhatsApp messages formatted with emojis for Peru market.

## Notes

- Use `siteConfig` for centralized contact info (WhatsApp numbers, phone)
- Rate limiting is bidirectional: server (IP-based) + client (localStorage)
- Chat persists in localStorage with version key for migrations
- ToolLoopAgent handles streaming automatically - no manual stream handling
