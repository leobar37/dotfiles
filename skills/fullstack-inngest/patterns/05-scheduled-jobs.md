# Scheduled Jobs

Cron-based recurring jobs with Inngest.

## Cron Syntax

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

## Basic Cron Job

```typescript
// inngest/functions/daily-cleanup.ts
import { inngest } from "../client";

export const dailyCleanup = inngest.createFunction(
  { id: "daily-cleanup" },
  { cron: "0 2 * * *" }, // Every day at 2 AM
  async ({ step }) => {
    await step.run("cleanup", async () => {
      const deleted = await cleanupService.runDailyCleanup();
      return { deleted };
    });
  }
);
```

## Common Cron Patterns

```typescript
// Every minute
{ cron: "* * * * *" }

// Every hour
{ cron: "0 * * * *" }

// Every day at midnight
{ cron: "0 0 * * *" }

// Every day at 9 AM
{ cron: "0 9 * * *" }

// Every Monday at 8 AM
{ cron: "0 8 * * 1" }

// First day of month
{ cron: "0 0 1 * *" }

// Every 15 minutes
{ cron: "*/15 * * * *" }
```

## Scheduled with Function

```typescript
// inngest/functions/health-check.ts
export const healthCheck = inngest.createFunction(
  {
    id: "health-check",
    name: "System Health Check",
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step, logger }) => {
    const results = await step.run("check-services", async () => {
      const db = await checkDatabase();
      const cache = await checkCache();
      const external = await checkExternalAPIs();
      
      return { db, cache, external };
    });
    
    // Alert if anything fails
    if (!results.db.healthy || !results.cache.healthy) {
      await step.run("send-alert", async () => {
        await alertService.sendCriticalAlert(results);
      });
    }
    
    logger.info("Health check completed", results);
    return results;
  }
);
```

## Daily Report Generation

```typescript
export const dailyReport = inngest.createFunction(
  { id: "daily-report" },
  { cron: "0 7 * * *" }, // Every day at 7 AM
  async ({ step }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Generate metrics
    const metrics = await step.run("collect-metrics", async () => {
      return await analyticsService.getDailyMetrics(yesterday);
    });
    
    // Generate report
    const report = await step.run("generate-report", async () => {
      return await reportService.generatePDF(metrics);
    });
    
    // Email to team
    await step.run("send-report", async () => {
      await emailService.sendToTeam({
        subject: `Daily Report - ${yesterday.toDateString()}`,
        attachment: report,
      });
    });
  }
);
```

## Weekly Digest

```typescript
export const weeklyDigest = inngest.createFunction(
  { id: "weekly-digest" },
  { cron: "0 9 * * 1" }, // Every Monday at 9 AM
  async ({ step }) => {
    const users = await step.run("get-users", async () => {
      return await userService.getActiveUsers();
    });
    
    for (const user of users) {
      await step.run(`send-digest-${user.id}`, async () => {
        const digest = await digestService.generateForUser(user.id);
        await emailService.sendDigest(user.email, digest);
      });
    }
  }
);
```

## Cleanup Jobs

```typescript
export const cleanupJobs = inngest.createFunction(
  { id: "cleanup-jobs" },
  { cron: "0 3 * * *" }, // Every day at 3 AM
  async ({ step }) => {
    // Clean old logs
    await step.run("clean-logs", async () => {
      await db.delete(logs).where(lt(logs.createdAt, thirtyDaysAgo()));
    });
    
    // Clean expired sessions
    await step.run("clean-sessions", async () => {
      await sessionService.cleanExpired();
    });
    
    // Clean temp files
    await step.run("clean-files", async () => {
      await storageService.cleanTempFiles();
    });
  }
);
```

## Timezone Handling

```typescript
// Jobs run in UTC by default
// For specific timezone, calculate accordingly

// 9 AM EST (14:00 UTC)
{ cron: "0 14 * * *" }

// 9 AM PST (17:00 UTC)
{ cron: "0 17 * * *" }
```
