# Defining Functions

Creating Inngest functions with createFunction.

## Basic Function

```typescript
// inngest/functions/send-email.ts
import { inngest } from "../client";

export const sendEmail = inngest.createFunction(
  { id: "send-email" },
  { event: "email/send" },
  async ({ event, step }) => {
    // event.data contains payload
    const { to, subject, body } = event.data;
    
    await emailService.send({ to, subject, body });
    
    return { success: true };
  }
);
```

## Function Configuration

```typescript
{
  id: "unique-function-id",     // Required: unique identifier
  name: "Send Email",           // Optional: display name
  concurrency: 10,              // Optional: max parallel runs
  retries: 3,                   // Optional: retry attempts
}
```

## Handler Parameters

```typescript
async ({ 
  event,     // Event data
  step,      // Step utilities
  runId,     // Unique run ID
  logger,    // Logger instance
}) => {
  // Implementation
}
```

## Event Trigger

```typescript
// Single event
{ event: "email/send" }

// Multiple events (any of them)
{ event: ["email/send", "email/resend"] }

// Cron trigger
{ cron: "0 9 * * *" }

// Event with data filter
{ 
  event: "order/created",
  if: "event.data.amount > 100"
}
```

## Complete Example

```typescript
// inngest/functions/process-payment.ts
import { inngest } from "../client";

export const processPayment = inngest.createFunction(
  {
    id: "process-payment",
    name: "Process Payment",
    concurrency: 5,
    retries: 3,
  },
  { event: "payment/process" },
  async ({ event, step, logger }) => {
    const { orderId, amount, method } = event.data;
    
    logger.info("Processing payment", { orderId, amount });
    
    // Validate payment
    const isValid = await step.run("validate", async () => {
      return await paymentService.validate(method, amount);
    });
    
    if (!isValid) {
      throw new Error("Payment validation failed");
    }
    
    // Process payment
    const result = await step.run("charge", async () => {
      return await paymentService.charge(orderId, amount, method);
    });
    
    // Send confirmation
    await step.run("notify", async () => {
      await notificationService.sendConfirmation(orderId);
    });
    
    return { success: true, transactionId: result.id };
  }
);
```

## Error Handling

```typescript
async ({ event, step }) => {
  try {
    await step.run("process", async () => {
      // Might throw
      await riskyOperation();
    });
  } catch (error) {
    // Handle error
    await step.run("handle-error", async () => {
      await logError(error);
    });
    
    // Re-throw to trigger retry
    throw error;
  }
}
```

## Export Pattern

```typescript
// inngest/functions/index.ts
import { sendEmail } from "./send-email";
import { processPayment } from "./process-payment";
import { generateReport } from "./generate-report";

export const functions = [
  sendEmail,
  processPayment,
  generateReport,
];
```
