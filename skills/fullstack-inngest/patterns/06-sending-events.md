# Sending Events

Emitting events from application code.

## Basic Send

```typescript
import { inngest } from "./client";

await inngest.send({
  name: "email/send",
  data: {
    to: "user@example.com",
    subject: "Welcome",
    body: "Hello!",
  },
});
```

## Type-Safe Send

```typescript
// With event types defined
await inngest.send({
  name: "email/send",
  data: {
    to: "user@example.com",
    subject: "Welcome",
    body: "Hello!",
    // TypeScript validates this matches SendEmailEventData
  },
});
```

## Helper Functions

```typescript
// inngest/helpers/email.ts
import { inngest } from "../client";

export async function sendEmailEvent(data: {
  to: string;
  subject: string;
  body: string;
}) {
  return inngest.send({
    name: "email/send",
    data,
  });
}

export async function sendWelcomeEmail(userId: string, email: string) {
  return inngest.send({
    name: "email/send",
    data: {
      to: email,
      subject: "Welcome to Our Platform",
      body: welcomeTemplate(userId),
    },
  });
}
```

## From Services

```typescript
// services/business/order.service.ts
import { sendEmailEvent } from "../../inngest/helpers/email";

export class OrderService {
  async createOrder(ctx: RequestContext, data: CreateOrderInput) {
    // Create order in database
    const order = await this.orderRepo.create(ctx, data);
    
    // Send async email notification
    await sendEmailEvent({
      to: data.customerEmail,
      subject: `Order #${order.id} Confirmed`,
      body: orderConfirmationTemplate(order),
    });
    
    return order;
  }
}
```

## Bulk Send

```typescript
// Send multiple events at once
await inngest.send([
  {
    name: "email/send",
    data: { to: "user1@example.com", subject: "Hello", body: "..." },
  },
  {
    name: "email/send",
    data: { to: "user2@example.com", subject: "Hello", body: "..." },
  },
  {
    name: "email/send",
    data: { to: "user3@example.com", subject: "Hello", body: "..." },
  },
]);
```

## Event with Delay

```typescript
// Send event that will be processed after delay
await inngest.send({
  name: "email/followup",
  data: { userId, email },
}, {
  delay: "1h", // Process after 1 hour
});

// Or specific date
await inngest.send({
  name: "email/reminder",
  data: { userId },
}, {
  delay: "2024-12-25T00:00:00Z",
});
```

## Event from API Route

```typescript
// api/orders.ts
import { Elysia } from "elysia";

export const orderRoutes = new Elysia({ prefix: "/orders" })
  .post("/", async ({ body, ctx, orderService }) => {
    const order = await orderService.createOrder(ctx, body);
    
    // Fire event without waiting
    await inngest.send({
      name: "order/created",
      data: {
        orderId: order.id,
        orgId: ctx.orgId,
        amount: order.total,
      },
    });
    
    // Return data directly (HTTP 200/201 implies success)
    return order;
  });
```

## Event from Background Job

```typescript
// One job triggers another
export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/created" },
  async ({ event, step }) => {
    const { orderId } = event.data;
    
    // Process payment
    await step.run("charge", async () => {
      await paymentService.charge(orderId);
    });
    
    // Trigger fulfillment job
    await step.run("trigger-fulfillment", async () => {
      await inngest.send({
        name: "order/ready-for-fulfillment",
        data: { orderId },
      });
    });
  }
);
```

## Error Handling

```typescript
try {
  await inngest.send({
    name: "email/send",
    data: { to, subject, body },
  });
} catch (error) {
  // Log but don't fail the request
  console.error("Failed to queue email:", error);
  
  // Optionally: fallback to sync send
  await emailService.sendSync({ to, subject, body });
}
```

## Common Patterns

### Fire and Forget

```typescript
// Don't await - fire and forget
inngest.send({ name: "analytics/track", data: event });

// Continue immediately
return response;
```

### Event with IDempotency Key

```typescript
await inngest.send({
  name: "payment/charge",
  data: { orderId, amount },
  idempotencyKey: orderId, // Prevent duplicate charges
});
```
