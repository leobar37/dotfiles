# Events

Type-safe event definitions for Inngest.

## Event Type Definition

```typescript
// inngest/events.ts
export interface SendEmailEventData {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface ProcessPaymentEventData {
  orderId: string;
  amount: number;
  currency: string;
  method: "card" | "bank_transfer" | "crypto";
}

export interface GenerateReportEventData {
  reportType: "sales" | "users" | "inventory";
  startDate: string;
  endDate: string;
  orgId: string;
}

// Event registry
export type Events = {
  "email/send": {
    data: SendEmailEventData;
  };
  "payment/process": {
    data: ProcessPaymentEventData;
  };
  "report/generate": {
    data: GenerateReportEventData;
  };
  "user/created": {
    data: { userId: string; email: string };
  };
};
```

## Naming Convention

```typescript
// Domain/Action pattern
"domain/action"

// Examples
"email/send"
"email/opened"
"user/created"
"user/updated"
"user/deleted"
"order/placed"
"order/cancelled"
"payment/succeeded"
"payment/failed"
```

## Using with Client

```typescript
// inngest/client.ts
import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./events";

export const inngest = new Inngest({
  id: "my-app",
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

## Event Metadata

```typescript
// Full event object
{
  name: "email/send",
  data: { to, subject, body },
  id: "unique-event-id",           // Auto-generated
  ts: 1234567890,                  // Timestamp
}
```

## Type Safety

```typescript
// Function receives typed event
inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event }) => {
    // TypeScript knows event.data has SendEmailEventData
    const { to, subject, body } = event.data;
    //                            ^? SendEmailEventData
  }
);
```

## Common Event Patterns

### Job Events

```typescript
export type JobEvents = {
  "job/process-file": {
    data: { fileId: string; fileUrl: string };
  };
  "job/export-data": {
    data: { format: "csv" | "json"; filters: Record<string, any> };
  };
  "job/cleanup": {
    data: { retentionDays: number };
  };
};
```

### Notification Events

```typescript
export type NotificationEvents = {
  "notification/email": {
    data: { template: string; to: string; vars: Record<string, string> };
  };
  "notification/sms": {
    data: { phone: string; message: string };
  };
  "notification/push": {
    data: { userId: string; title: string; body: string };
  };
};
```

### System Events

```typescript
export type SystemEvents = {
  "system/health-check": {
    data: Record<never, never>; // Empty
  };
  "system/backup": {
    data: { type: "full" | "incremental" };
  };
};
