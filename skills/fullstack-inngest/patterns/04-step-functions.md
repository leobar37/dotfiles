# Step Functions

Durable step execution with automatic retries.

## Why Steps?

Steps provide:
- **Durability**: Resume from last completed step
- **Retries**: Automatic on failure
- **Idempotency**: Safe to retry
- **Observability**: Track each step

## Basic Step

```typescript
async ({ event, step }) => {
  const result = await step.run("process-data", async () => {
    // This code is retried on failure
    return await processData(event.data);
  });
  
  return result;
}
```

## step.run()

```typescript
await step.run("step-name", async () => {
  // Your logic here
  return result; // Optional return value
});
```

## Multiple Steps

```typescript
async ({ event, step }) => {
  // Step 1: Validate
  const isValid = await step.run("validate", async () => {
    return await validateOrder(event.data);
  });
  
  if (!isValid) {
    throw new Error("Validation failed");
  }
  
  // Step 2: Process payment
  const payment = await step.run("charge", async () => {
    return await chargeCustomer(event.data);
  });
  
  // Step 3: Create order
  const order = await step.run("create-order", async () => {
    return await createOrder(event.data, payment.id);
  });
  
  // Step 4: Send confirmation
  await step.run("notify", async () => {
    await sendConfirmation(order.id);
  });
  
  return order;
}
```

## step.sleep()

```typescript
async ({ event, step }) => {
  // Send welcome email
  await step.run("send-welcome", async () => {
    await sendWelcomeEmail(event.data.userId);
  });
  
  // Wait 3 days
  await step.sleep("wait-3-days", "3d");
  
  // Send follow-up
  await step.run("send-followup", async () => {
    await sendFollowUpEmail(event.data.userId);
  });
}
```

## Time Formats

```typescript
await step.sleep("wait", "1h");    // 1 hour
await step.sleep("wait", "30m");   // 30 minutes
await step.sleep("wait", "1d");    // 1 day
await step.sleep("wait", "1w");    // 1 week
await step.sleep("wait", "2024-01-01T00:00:00Z"); // Until date
```

## step.waitForEvent()

```typescript
async ({ event, step }) => {
  // Send approval request
  await step.run("request-approval", async () => {
    await sendApprovalRequest(event.data.orderId);
  });
  
  // Wait for approval (timeout after 24h)
  const approval = await step.waitForEvent("order/approved", {
    timeout: "24h",
    match: "data.orderId",
  });
  
  if (!approval) {
    // Timeout - no approval received
    await step.run("handle-timeout", async () => {
      await cancelOrder(event.data.orderId);
    });
    return { status: "cancelled" };
  }
  
  // Process approved order
  await step.run("process", async () => {
    await processOrder(event.data.orderId);
  });
}
```

## Step Configuration

```typescript
await step.run(
  {
    id: "process",
    name: "Process Order",
    retries: { attempts: 5 },
  },
  async () => {
    return await processOrder();
  }
);
```

## Error Handling

```typescript
async ({ event, step }) => {
  try {
    await step.run("risky-operation", async () => {
      return await riskyCall();
    });
  } catch (error) {
    // Log error but don't fail
    await step.run("log-error", async () => {
      await logError(error);
    });
    
    // Return fallback
    return { success: false, fallback: true };
  }
}
```

## Complete Workflow Example

```typescript
export const onboardingWorkflow = inngest.createFunction(
  { id: "user-onboarding" },
  { event: "user/created" },
  async ({ event, step }) => {
    const { userId, email } = event.data;
    
    // Step 1: Send welcome email
    await step.run("send-welcome", async () => {
      await emailService.sendWelcome(email);
    });
    
    // Step 2: Create user profile
    await step.run("create-profile", async () => {
      await userService.createProfile(userId);
    });
    
    // Step 3: Wait 1 day
    await step.sleep("wait-day-1", "1d");
    
    // Step 4: Send tips email
    await step.run("send-tips", async () => {
      await emailService.sendTips(email);
    });
    
    // Step 5: Wait 3 more days
    await step.sleep("wait-day-4", "3d");
    
    // Step 6: Check if user activated
    const isActive = await step.run("check-activation", async () => {
      return await userService.hasActivated(userId);
    });
    
    if (!isActive) {
      // Step 7: Re-engagement email
      await step.run("send-reengagement", async () => {
        await emailService.sendReengagement(email);
      });
    }
    
    return { completed: true };
  }
);
```
