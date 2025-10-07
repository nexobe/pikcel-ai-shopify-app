# PikcelAI Service Layer - Quick Start Guide

Get up and running with PikcelAI API in 5 minutes.

## Step 1: Environment Setup

Add to your `.env` file:

```env
PIKCEL_API_URL=https://api.pikcel.ai
PIKCEL_API_KEY=your_api_key_here
PIKCEL_WEBHOOK_SECRET=your_webhook_secret
```

## Step 2: Import the Client

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';
```

## Step 3: Use in Your Routes

### Example: Image Processing Route

```typescript
// app/routes/api.process-image.tsx

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getPikcelAIClient, validateImageFile } from '~/services';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();
  const formData = await request.formData();
  const file = formData.get('image') as File;
  const toolId = formData.get('toolId') as string;

  // Validate image
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return json({ error: validation.error }, { status: 400 });
  }

  try {
    // Upload image
    const upload = await client.uploadImageToPikcel({ file });

    // Start processing
    const job = await client.dispatchJob({
      tool_id: toolId,
      input_image_url: upload.data.url,
    });

    return json({
      success: true,
      jobId: job.data.id,
    });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
```

### Example: Check Job Status

```typescript
// app/routes/api.job.$jobId.tsx

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getPikcelAIClient } from '~/services';

export async function loader({ params }: LoaderFunctionArgs) {
  const client = getPikcelAIClient();
  const { jobId } = params;

  try {
    const response = await client.getJobStatus(jobId!);
    return json({ job: response.data });
  } catch (error) {
    return json({ error: 'Job not found' }, { status: 404 });
  }
}
```

### Example: Frontend Component

```typescript
// app/components/ImageProcessor.tsx

import { useState } from 'react';
import { useFetcher } from '@remix-run/react';

export function ImageProcessor() {
  const fetcher = useFetcher();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('toolId', 'background-removal');

    fetcher.submit(formData, {
      method: 'POST',
      action: '/api/process-image',
      encType: 'multipart/form-data',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
      />
      <button type="submit" disabled={!selectedFile || fetcher.state !== 'idle'}>
        {fetcher.state === 'submitting' ? 'Processing...' : 'Process Image'}
      </button>

      {fetcher.data?.jobId && (
        <div>Job started: {fetcher.data.jobId}</div>
      )}
    </form>
  );
}
```

## Step 4: Common Patterns

### Pattern 1: Process and Wait

```typescript
import { getPikcelAIClient } from '~/services';

export async function processImageSync(imageUrl: string) {
  const client = getPikcelAIClient();

  // Start job
  const job = await client.dispatchJob({
    tool_id: 'background-removal',
    input_image_url: imageUrl,
  });

  // Poll until complete
  const result = await client.pollJobUntilComplete(job.data.id);

  if (result.data.status === 'completed') {
    return result.data.output_image_url;
  } else {
    throw new Error(result.data.error_message || 'Processing failed');
  }
}
```

### Pattern 2: Check Credits Before Processing

```typescript
import { getPikcelAIClient, hasEnoughCredits } from '~/services';

export async function loader() {
  const client = getPikcelAIClient();

  const [profile, models] = await Promise.all([
    client.getUserProfile(),
    client.getAIModels(),
  ]);

  const backgroundRemoval = models.data.find(
    (m) => m.id === 'background-removal'
  );

  const canAfford = hasEnoughCredits(
    profile.data.credits_balance,
    backgroundRemoval?.credits_required || 0
  );

  return json({
    credits: profile.data.credits_balance,
    canAfford,
    model: backgroundRemoval,
  });
}
```

### Pattern 3: Batch Processing

```typescript
import { getPikcelAIClient } from '~/services';

export async function processBatch(imageUrls: string[]) {
  const client = getPikcelAIClient();

  const bulkJob = await client.dispatchBulkJob({
    tool_id: 'background-removal',
    input_images: imageUrls.map((url) => ({ url })),
    webhook_url: 'https://yourapp.com/webhook',
  });

  return bulkJob.data.id;
}
```

## Step 5: Error Handling

```typescript
import {
  getPikcelAIClient,
  PikcelAPIErrorClass,
  PikcelNetworkError,
  PikcelRateLimitError,
  formatAPIError,
} from '~/services';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  try {
    const job = await client.dispatchJob({
      tool_id: 'background-removal',
      input_image_url: 'https://example.com/image.jpg',
    });

    return json({ success: true, job: job.data });
  } catch (error) {
    // Use formatAPIError for consistent error messages
    const message = formatAPIError(error);

    // Or handle specific error types
    if (error instanceof PikcelRateLimitError) {
      return json(
        { error: message, retryAfter: error.retryAfter },
        { status: 429 }
      );
    }

    return json({ error: message }, { status: 500 });
  }
}
```

## Step 6: Webhooks (Optional but Recommended)

```typescript
// app/routes/webhooks.pikcel.tsx

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getPikcelAIClient } from '~/services';
import type { WebhookPayload } from '~/services/pikcelai.types';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  // Verify signature
  const signature = request.headers.get('X-Pikcel-Signature');
  const body = await request.text();

  if (!signature || !(await client.verifyWebhookSignature(body, signature))) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Handle webhook
  const payload: WebhookPayload = JSON.parse(body);

  switch (payload.event) {
    case 'job.completed':
      // Save to database, notify user, etc.
      console.log('Job completed:', payload.job.id);
      break;

    case 'job.failed':
      // Handle failure
      console.error('Job failed:', payload.job.error_message);
      break;
  }

  return json({ received: true });
}
```

## Complete Example: Full Flow

```typescript
// app/routes/editor.tsx

import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useFetcher, useParams } from '@remix-run/react';
import { getPikcelAIClient, validateImageFile, hasEnoughCredits } from '~/services';

// Load available models and user credits
export async function loader() {
  const client = getPikcelAIClient();

  const [models, profile] = await Promise.all([
    client.getAIModels(),
    client.getUserProfile(),
  ]);

  return json({
    models: models.data.filter((m) => m.is_active),
    credits: profile.data.credits_balance,
  });
}

// Handle image upload and processing
export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();
  const formData = await request.formData();
  const intent = formData.get('intent');

  // Upload image
  if (intent === 'upload') {
    const file = formData.get('image') as File;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return json({ error: validation.error }, { status: 400 });
    }

    const upload = await client.uploadImageToPikcel({ file });
    return json({ imageUrl: upload.data.url });
  }

  // Process image
  if (intent === 'process') {
    const imageUrl = formData.get('imageUrl') as string;
    const toolId = formData.get('toolId') as string;

    // Check credits
    const [profile, models] = await Promise.all([
      client.getUserProfile(),
      client.getAIModels(),
    ]);

    const model = models.data.find((m) => m.id === toolId);
    if (!model) {
      return json({ error: 'Model not found' }, { status: 404 });
    }

    if (!hasEnoughCredits(profile.data.credits_balance, model.credits_required)) {
      return json({ error: 'Insufficient credits' }, { status: 402 });
    }

    // Start job
    const job = await client.dispatchJob({
      tool_id: toolId,
      input_image_url: imageUrl,
    });

    return json({ jobId: job.data.id });
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

// Frontend component
export default function Editor() {
  const { models, credits } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div>
      <h1>AI Image Editor</h1>
      <p>Credits: {credits}</p>

      <fetcher.Form method="post" encType="multipart/form-data">
        <input type="hidden" name="intent" value="upload" />
        <input type="file" name="image" accept="image/*" />
        <button type="submit">Upload</button>
      </fetcher.Form>

      {fetcher.data?.imageUrl && (
        <div>
          <img src={fetcher.data.imageUrl} alt="Uploaded" />

          <select name="toolId">
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.credits_required} credits)
              </option>
            ))}
          </select>

          <button onClick={() => {
            fetcher.submit(
              {
                intent: 'process',
                imageUrl: fetcher.data.imageUrl,
                toolId: document.querySelector('select[name="toolId"]').value,
              },
              { method: 'post' }
            );
          }}>
            Process
          </button>
        </div>
      )}

      {fetcher.data?.jobId && (
        <p>Processing... Job ID: {fetcher.data.jobId}</p>
      )}
    </div>
  );
}
```

## Next Steps

1. Read the [complete documentation](README.md)
2. Explore [utility functions](pikcelai.utils.ts)
3. Review [type definitions](pikcelai.types.ts)
4. Set up webhooks for production
5. Implement job status polling UI
6. Add credit balance checks
7. Create custom templates

## Common Issues

### Issue: "API URL not found"
**Solution**: Make sure `.env` file is loaded and contains `PIKCEL_API_URL`

### Issue: "Unauthorized"
**Solution**: Check that `PIKCEL_API_KEY` is correct

### Issue: "File too large"
**Solution**: Images must be under 10MB. Use `validateImageFile()` before upload

### Issue: "Insufficient credits"
**Solution**: Check user balance with `getUserProfile()` before dispatching jobs

## Support

For help:
- Documentation: `/app/services/README.md`
- PikcelAI Support: support@pikcel.ai
- Issues: https://github.com/pikcel/shopify-app/issues
