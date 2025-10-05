# Job Tracking System - Setup & Usage Guide

Complete documentation for the PikcelAI Job Tracking and Status Monitoring System in the Shopify App.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Components](#components)
8. [Usage Examples](#usage-examples)
9. [Real-time Updates](#real-time-updates)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Job Tracking System provides comprehensive monitoring and management for AI image processing jobs submitted to PikcelAI. It includes:

- Real-time status updates via polling
- Job history with advanced filtering
- Automatic retry for failed jobs
- Push completed images to Shopify products
- Bulk operations support
- Job statistics dashboard
- Product context tracking

---

## Features

### Core Features

- **Real-time Job Status**: Automatic polling every 3-5 seconds for active jobs
- **Job History**: Paginated list of all jobs with filters
- **Status Tracking**: Pending, Processing, Completed, Failed, Cancelled
- **Priority Levels**: Low, Normal, High, Urgent
- **Progress Monitoring**: 0-100% progress bar for processing jobs

### Filters

- Status (pending, processing, completed, failed, cancelled)
- Tool/Model ID
- Product ID
- Date range
- Custom metadata

### Actions

- **Retry**: Re-dispatch failed jobs to PikcelAI
- **Download**: Download completed images
- **Push to Shopify**: Upload processed images to products
- **Bulk Retry**: Retry all failed jobs at once
- **Bulk Sync**: Sync all active jobs from PikcelAI

### Statistics

- Total jobs count
- Jobs by status (pending, processing, completed, failed)
- Total credits used
- Average processing time
- Success rate percentage

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Shopify App UI                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Jobs Page (app.jobs.tsx)                 │  │
│  │  - Filters, Pagination, Statistics, Bulk Actions     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      JobStatusTracker Component (with polling)        │  │
│  │  - Real-time updates, Action buttons, Image previews │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│  - api.jobs.sync.tsx (sync job status)                      │
│  - api.jobs.retry.tsx (retry failed jobs)                   │
│  - api.jobs.push-to-shopify.tsx (upload to product)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Job Service Layer                           │
│  - job.server.ts (CRUD operations)                          │
│  - job.utils.ts (helper functions)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
            ┌───────────┐   ┌──────────────┐
            │  Prisma   │   │  PikcelAI    │
            │  Database │   │  API Client  │
            └───────────┘   └──────────────┘
```

---

## Installation

### Step 1: Run Database Migration

```bash
cd /Users/asghar/Documents/Software/Development/pikcel-ai-shopify-app

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or for development
npx prisma migrate dev
```

### Step 2: Verify Schema

```bash
# Check that tables are created
npx prisma studio

# Or use psql
psql $DATABASE_URL -c "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';"
```

### Step 3: Configure Environment Variables

Ensure these are set in your `.env` file:

```bash
# PikcelAI API Configuration
PIKCEL_API_URL=https://app.pikcel.ai
PIKCEL_API_KEY=your_api_key_here
PIKCEL_WEBHOOK_SECRET=your_webhook_secret_here

# Shopify API Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Step 4: Start the App

```bash
npm run dev
```

---

## Database Schema

### Job Table

```prisma
model Job {
  id                   String    @id @default(uuid())
  shop                 String    // Shopify shop domain
  pikcelJobId          String    @unique // PikcelAI job ID
  toolId               String    // AI tool/model ID
  toolName             String?   // AI tool name (cached)
  status               String    @default("pending")
  priority             String    @default("normal")

  // Image URLs
  inputImageUrl        String
  outputImageUrl       String?
  thumbnailUrl         String?

  // Processing details
  parameters           String?   @db.Text
  errorMessage         String?   @db.Text
  creditsUsed          Int       @default(0)
  processingTimeMs     Int?
  progress             Int       @default(0) // 0-100

  // Shopify product context
  productId            String?
  productTitle         String?
  variantId            String?
  imageId              String?

  // Metadata
  metadata             String?   @db.Text
  pushedToShopify      Boolean   @default(false)
  pushedAt             DateTime?

  // Timestamps
  startedAt            DateTime?
  completedAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([shop, status])
  @@index([shop, createdAt])
  @@index([pikcelJobId])
  @@index([productId])
}
```

### JobBatch Table

```prisma
model JobBatch {
  id                   String    @id @default(uuid())
  shop                 String
  name                 String?
  toolId               String
  toolName             String?

  // Batch statistics
  totalJobs            Int       @default(0)
  completedJobs        Int       @default(0)
  failedJobs           Int       @default(0)
  status               String    @default("pending")

  // Processing details
  parameters           String?   @db.Text
  totalCreditsUsed     Int       @default(0)

  // Timestamps
  startedAt            DateTime?
  completedAt          DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@index([shop, status])
  @@index([shop, createdAt])
}
```

---

## API Routes

### 1. `/api/jobs/sync` (POST)

Sync job status from PikcelAI.

**Request:**
```typescript
{
  jobId: string;  // Local job ID
}
```

**Response:**
```typescript
{
  success: boolean;
  job: Job;
}
```

### 2. `/api/jobs/retry` (POST)

Retry a failed job.

**Request:**
```typescript
{
  jobId: string;  // Local job ID
}
```

**Response:**
```typescript
{
  success: boolean;
  job: Job;
}
```

### 3. `/api/jobs/push-to-shopify` (POST)

Upload processed image to Shopify product.

**Request:**
```typescript
{
  jobId: string;  // Local job ID
}
```

**Response:**
```typescript
{
  success: boolean;
  job: Job;
}
```

---

## Components

### JobStatusTracker Component

Real-time job status tracking component with automatic polling.

**Location:** `/app/components/JobStatusTracker.tsx`

**Props:**
```typescript
interface JobStatusTrackerProps {
  job: JobData;
  onStatusChange?: (job: JobData) => void;
  pollInterval?: number;  // Default: 3000ms
  autoPoll?: boolean;     // Default: true
}
```

**Features:**
- Auto-polling for pending/processing jobs
- Status badges (success, info, critical, warning)
- Priority badges
- Progress bar for processing jobs
- Image previews (input/output)
- Action buttons (Retry, Download, Push to Shopify)
- Error message display

**Usage:**
```tsx
import { JobStatusTracker } from '~/components/JobStatusTracker';

<JobStatusTracker
  job={job}
  pollInterval={3000}
  autoPoll={true}
  onStatusChange={(updatedJob) => {
    console.log('Job status changed:', updatedJob);
  }}
/>
```

---

## Usage Examples

### Creating a Job

```typescript
import { jobService } from '~/services/job.server';
import { getPikcelAIClient } from '~/services/pikcelai.server';

// 1. Dispatch job to PikcelAI
const client = getPikcelAIClient();
const dispatchResponse = await client.dispatchJob({
  tool_id: 'background-removal',
  input_image_url: 'https://example.com/image.jpg',
  parameters: { quality: 'high' },
  priority: 'normal',
  metadata: {
    source: 'shopify-app',
    productId: 'gid://shopify/Product/123456',
  },
});

// 2. Create local job record
const job = await jobService.createJob({
  shop: 'myshop.myshopify.com',
  pikcelJobId: dispatchResponse.data.id,
  toolId: 'background-removal',
  toolName: 'Background Removal',
  inputImageUrl: 'https://example.com/image.jpg',
  parameters: { quality: 'high' },
  priority: 'normal',
  productId: 'gid://shopify/Product/123456',
  productTitle: 'Cool T-Shirt',
});
```

### Syncing Job Status

```typescript
import { jobService } from '~/services/job.server';

const updatedJob = await jobService.syncJobStatus(
  jobId,
  'myshop.myshopify.com'
);

console.log('Job status:', updatedJob.status);
console.log('Progress:', updatedJob.progress);
```

### Querying Jobs with Filters

```typescript
import { jobService } from '~/services/job.server';

const { jobs, total } = await jobService.getJobs({
  shop: 'myshop.myshopify.com',
  status: 'completed',
  limit: 20,
  offset: 0,
  fromDate: new Date('2025-10-01'),
  toDate: new Date('2025-10-31'),
});

console.log(`Found ${total} jobs`);
```

### Getting Job Statistics

```typescript
import { jobService } from '~/services/job.server';

const stats = await jobService.getJobStats('myshop.myshopify.com');

console.log('Total jobs:', stats.total);
console.log('Completed:', stats.completed);
console.log('Failed:', stats.failed);
```

### Bulk Operations

```typescript
import { jobService } from '~/services/job.server';

// Sync multiple jobs in parallel
const jobIds = ['job1', 'job2', 'job3'];
const syncedJobs = await jobService.syncMultipleJobs(
  jobIds,
  'myshop.myshopify.com'
);

console.log(`Synced ${syncedJobs.length} jobs`);
```

---

## Real-time Updates

### Automatic Polling

The `JobStatusTracker` component automatically polls for updates:

1. **Active Jobs** (pending/processing): Poll every 3 seconds
2. **Completed/Failed Jobs**: Stop polling
3. **Manual Refresh**: User can manually trigger sync

### Polling Configuration

```tsx
// Default polling (3 seconds)
<JobStatusTracker job={job} />

// Custom polling interval (5 seconds)
<JobStatusTracker job={job} pollInterval={5000} />

// Disable auto-polling
<JobStatusTracker job={job} autoPoll={false} />
```

### Page-Level Auto-Refresh

The Jobs page includes auto-refresh for all active jobs:

```typescript
// In app.jobs.tsx
useEffect(() => {
  if (!autoRefresh) return;

  const timer = setInterval(() => {
    const hasActiveJobs = jobs.some(
      (job) => job.status === 'pending' || job.status === 'processing'
    );

    if (hasActiveJobs) {
      // Sync all active jobs
      fetcher.submit({ action: 'bulkSync' }, { method: 'post' });
    }
  }, refreshInterval);

  return () => clearInterval(timer);
}, [autoRefresh, refreshInterval, jobs]);
```

---

## Troubleshooting

### Jobs Not Syncing

**Problem:** Jobs remain in "pending" status.

**Solutions:**
1. Check PikcelAI API credentials:
   ```bash
   echo $PIKCEL_API_KEY
   echo $PIKCEL_API_URL
   ```

2. Verify PikcelAI job ID exists:
   ```typescript
   const client = getPikcelAIClient();
   const response = await client.getJobStatus(pikcelJobId);
   console.log(response.data);
   ```

3. Check network connectivity to PikcelAI API

### Database Errors

**Problem:** Prisma errors when creating jobs.

**Solutions:**
1. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

2. Check database connection:
   ```bash
   npx prisma db push --preview-feature
   ```

3. Verify migrations are applied:
   ```bash
   npx prisma migrate status
   ```

### Push to Shopify Fails

**Problem:** Cannot upload images to products.

**Solutions:**
1. Verify Shopify API credentials
2. Check product ID format (must be `gid://shopify/Product/123456`)
3. Ensure shop has permission to upload media
4. Check image URL is publicly accessible

### Performance Issues

**Problem:** Page loads slowly with many jobs.

**Solutions:**
1. Reduce page size (default: 20):
   ```typescript
   const limit = 10; // Reduce to 10 items per page
   ```

2. Increase polling interval:
   ```tsx
   <JobStatusTracker pollInterval={5000} /> // 5 seconds
   ```

3. Add database indexes (already included in migration)

4. Consider archiving old jobs:
   ```sql
   DELETE FROM "Job" WHERE "createdAt" < NOW() - INTERVAL '90 days';
   ```

---

## Next Steps

### Planned Enhancements

1. **Webhooks**: Replace polling with webhook notifications
2. **Job Cancellation**: Add ability to cancel pending jobs
3. **Job Templates**: Save job configurations as templates
4. **Export Jobs**: Export job history to CSV/Excel
5. **Job Analytics**: Advanced analytics and charts
6. **Notifications**: Email/SMS notifications for job completion
7. **Job Scheduling**: Schedule jobs for future execution

### Integration with Other Features

1. **Bulk Editor**: Batch process multiple products
2. **AI Tools Page**: Quick access to job history per tool
3. **Product Page**: Show job history for specific product
4. **Dashboard**: Job statistics on main dashboard

---

## Support

For issues or questions:

- Check logs: `npx prisma studio` or `psql $DATABASE_URL`
- Review API errors in browser console
- Check PikcelAI API status
- Contact support: support@pikcel.ai

---

## License

Copyright 2025 PikcelAI. All rights reserved.
