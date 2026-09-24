# WhatsApp Integration with Evolution API (Inngest)

Variant-specific guide for implementing WhatsApp messaging using Evolution API with **Inngest**. This file should remain extension-scoped rather than redefining the shared backend core.

**IMPORTANT**: This implementation uses **Inngest** (not BullMQ) for background jobs.

## Table of Contents

1. [Library Setup](#library-setup)
2. [QR Connection Flow](#qr-connection-flow)
3. [Inngest Integration](#ingnest-integration)
4. [Frontend Components](#frontend-components)

---

## Library Setup

### Installation

```bash
bun add @gymspace/evolution inngest
```

### Environment Variables

```bash
EVOLUTION_API_URL=https://api.evolution.com
EVOLUTION_API_KEY=your-evolution-api-key
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
```

### Client Initialization

```typescript
import { EvolutionClient } from "@gymspace/evolution";

export const evolutionClient = new EvolutionClient({
  serverUrl: process.env.EVOLUTION_API_URL!,
  token: process.env.EVOLUTION_API_KEY!,
});
```

---

## QR Connection Flow

The QR connection flow works as follows:

1. Frontend requests config from backend
2. Backend creates/gets Evolution instance
3. Backend returns QR code
4. Frontend displays QR and polls every 5 seconds
5. Once scanned, connection status changes to "connected"

---

## Inngest Integration

### Event Definition

```typescript
// inngest/events.ts
export interface SendWhatsAppTextJobData {
  instanceName: string;
  number: string;
  text: string;
  restaurantId: string;
  metadata?: {
    customerId?: string;
    customerName?: string;
    orderId?: string;
    messageType?: string;
  };
}
```

### Inngest Function

```typescript
// inngest/functions/whatsapp.ts
import { inngest } from "../client";

export const sendWhatsAppText = inngest.createFunction(
  {
    id: "send-whatsapp-text",
    retries: 3,
    concurrency: {
      limit: 5,
      key: "event.data.restaurantId",
    },
  },
  { event: "whatsapp/text.send" },
  async ({ event, step, logger }) => {
    const { instanceName, number, text, restaurantId, metadata } = event.data;

    logger.info("Processing WhatsApp message", { number, restaurantId });

    const result = await step.run("send-message", async () => {
      return whatsappService.sendTextMessage({
        instanceName,
        number,
        text,
        restaurantId,
        metadata,
      });
    });

    return {
      success: true,
      messageId: result.messageId,
    };
  },
);
```

### Helper to Send Events

```typescript
// inngest/helpers/whatsapp.ts
import { inngest } from "../client";

export async function sendWhatsAppTextEvent(
  data: SendWhatsAppTextJobData,
  options?: { delay?: number }
) {
  return inngest.send({
    name: "whatsapp/text.send",
    data,
    ...(options?.delay && { ts: Date.now() + options.delay }),
  });
}
```

### Usage in Services

```typescript
// In your business service
import { sendWhatsAppTextEvent } from "../inngest/helpers/whatsapp";

async sendOrderConfirmation(ctx, data) {
  const config = await this.configRepo.getConfig(ctx);
  
  if (!config || config.connectionStatus !== "connected") {
    return { success: false };
  }

  // Queue via Inngest (not BullMQ!)
  const job = await sendWhatsAppTextEvent({
    instanceName: config.evolutionInstance,
    number: data.customerPhone,
    text: message,
    restaurantId: ctx.getRestaurantId(),
    metadata: {
      customerId: data.customerId,
      orderId: data.orderId,
      messageType: "order_confirmation",
    },
  });

  return {
    success: true,
    jobId: job.ids[0], // Inngest returns array of IDs
  };
}
```

---

## Frontend Components

### QR Display Component

```tsx
import { useEffect, useState } from "react";
import { useWhatsAppStatus } from "~/hooks/use-whatsapp";
import QRCode from "qrcode";

export function WhatsAppQRContent({
  instanceName,
  onConnected,
}: {
  instanceName: string;
  onConnected: () => void;
}) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  
  // Poll every 5 seconds
  const { data: status } = useWhatsAppStatus(instanceName, true);

  useEffect(() => {
    if (status?.state === "open") {
      onConnected();
    }
  }, [status?.state]);

  // Generate QR image from string
  useEffect(() => {
    if (status?.qrCode) {
      QRCode.toDataURL(status.qrCode).then(setQrImageUrl);
    }
  }, [status?.qrCode]);

  if (status?.state === "open") {
    return <div>Connected!</div>;
  }

  return (
    <div>
      {qrImageUrl && (
        <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
      )}
      <p>Scan with WhatsApp Business</p>
    </div>
  );
}
```

### Hook for Polling

```typescript
export function useWhatsAppStatus(
  instanceName: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["whatsapp-status", instanceName],
    queryFn: async () => {
      const response = await eden.api.v1.whatsapp
        .status({ instanceName })
        .get();
      return response.data;
    },
    refetchInterval: enabled ? 5000 : false, // Every 5s
    enabled: enabled && !!instanceName,
  });
}
```

---

## Key Points

- Uses **Inngest** for background jobs (not BullMQ)
- QR codes are generated from string using `qrcode` library
- Poll every 5 seconds for connection status
- Always filter by `restaurantId` (tenant)
- Store message status: pending → sent/failed

**Note**: Spanish identifiers in code examples have been corrected to English.
