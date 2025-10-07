# Job Tracking System - Quick Start Guide

Get started with the PikcelAI Job Tracking System in 5 minutes.

## Quick Setup

### 1. Run Database Migration

```bash
cd /Users/asghar/Documents/Software/Development/pikcel-ai-shopify-app

# Generate Prisma client and run migrations
npx prisma generate && npx prisma migrate deploy
```

### 2. Verify Installation

```bash
# Start the app
npm run dev

# Navigate to: http://localhost:3000/app/jobs
```

That's it! The Jobs page is now accessible in your app navigation.

---

## Creating Your First Job

### From Your Code

```typescript
import { jobService } from '~/services/job.server';
import { getPikcelAIClient } from '~/services/pikcelai.server';

// 1. Dispatch to PikcelAI
const client = getPikcelAIClient();
const response = await client.dispatchJob({
  tool_id: 'background-removal',
  input_image_url: 'https://example.com/image.jpg',
  parameters: { quality: 'high' },
});

// 2. Track locally
const job = await jobService.createJob({
  shop: session.shop,
  pikcelJobId: response.data.id,
  toolId: 'background-removal',
  toolName: 'Background Removal',
  inputImageUrl: 'https://example.com/image.jpg',
  productId: 'gid://shopify/Product/123456',
});
```

---

## Viewing Jobs

### Navigate to Jobs Page

1. Open your Shopify app
2. Click **"Jobs"** in the navigation
3. View all jobs with real-time updates

### Filter Jobs

- **By Status**: Select from dropdown (Pending, Processing, Completed, Failed)
- **By Date**: Use date range filter
- **By Product**: Filter by product ID

---

## Job Actions

### Retry Failed Job

Click the **"Retry"** button on any failed job card.

### Download Result

Click the **"Download"** button on completed jobs to get the processed image.

### Push to Shopify

Click **"Push to Shopify"** to upload the processed image to the product.

### Bulk Actions

- **Retry All Failed**: Click "Retry All Failed (X)" button at the top
- **Auto-Refresh**: Toggle auto-refresh on/off for real-time updates

---

## Real-time Updates

Jobs automatically update every 3-5 seconds while processing. You'll see:

- **Progress bar** showing 0-100% completion
- **Status badge** changing colors (blue → green/red)
- **Processing time** updating in real-time

---

## API Endpoints

### Sync Job Status

```bash
POST /api/jobs/sync
Body: { jobId: "uuid" }
```

### Retry Failed Job

```bash
POST /api/jobs/retry
Body: { jobId: "uuid" }
```

### Push to Shopify

```bash
POST /api/jobs/push-to-shopify
Body: { jobId: "uuid" }
```

---

## Using the Component

### In Your Page

```tsx
import { JobStatusTracker } from '~/components/JobStatusTracker';

export default function MyPage() {
  const { jobs } = useLoaderData<typeof loader>();

  return (
    <s-page heading="My Jobs">
      {jobs.map((job) => (
        <JobStatusTracker key={job.id} job={job} />
      ))}
    </s-page>
  );
}
```

### Custom Polling

```tsx
<JobStatusTracker
  job={job}
  pollInterval={5000}  // 5 seconds
  autoPoll={true}
  onStatusChange={(updatedJob) => {
    console.log('Status changed:', updatedJob.status);
  }}
/>
```

---

## Statistics Dashboard

The Jobs page shows:

- **Total Jobs**: All-time job count
- **Pending**: Jobs waiting to start
- **Processing**: Jobs currently running
- **Completed**: Successfully finished jobs
- **Failed**: Jobs that encountered errors

---

## Troubleshooting

### Jobs Not Appearing?

1. Check database connection: `npx prisma studio`
2. Verify PikcelAI API key: `echo $PIKCEL_API_KEY`
3. Check browser console for errors

### Jobs Stuck in Pending?

1. Verify PikcelAI job was created
2. Check job ID matches in database
3. Try manual sync by clicking "Refresh" button

### Can't Push to Shopify?

1. Verify product ID is valid
2. Check Shopify API permissions
3. Ensure image URL is publicly accessible

---

## Next Steps

- Read full documentation: [JOB_TRACKING_SETUP.md](./JOB_TRACKING_SETUP.md)
- Explore helper utilities: `app/services/job.utils.ts`
- Review type definitions: `app/services/job.types.ts`
- Check API routes: `app/routes/api.jobs.*.tsx`

---

## Support

Need help? Check the main documentation or contact support@pikcel.ai
