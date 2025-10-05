# PikcelAI API Service Layer

Complete API client for integrating with PikcelAI backend services in your Shopify app.

## Features

- Complete TypeScript type definitions
- Automatic retries with exponential backoff
- Request deduplication (prevents duplicate in-flight requests)
- Response caching with TTL
- Rate limiting handling
- Comprehensive error handling
- Webhook signature verification
- Job polling utilities
- Image validation helpers

## Installation

No additional dependencies required - uses native `fetch` API.

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Required
PIKCEL_API_URL=https://your-pikcel-domain.com
PIKCEL_API_KEY=your_api_key_here

# Optional (for webhooks)
PIKCEL_WEBHOOK_SECRET=your_webhook_secret
```

### Basic Setup

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';

// Get singleton instance (uses environment variables)
const client = getPikcelAIClient();
```

### Custom Configuration

```typescript
import { createPikcelAIClient } from '~/services/pikcelai.server';

const client = createPikcelAIClient({
  apiUrl: 'https://api.pikcel.ai',
  apiKey: 'your-api-key',
  webhookSecret: 'your-webhook-secret',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
});
```

## Usage Examples

### 1. Get Available AI Models

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';

export async function loader() {
  const client = getPikcelAIClient();

  try {
    const response = await client.getAIModels();

    return json({
      models: response.data,
      count: response.count,
    });
  } catch (error) {
    console.error('Failed to fetch models:', error);
    throw new Response('Failed to load AI models', { status: 500 });
  }
}
```

### 2. Upload and Process Image

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';
import { validateImageFile } from '~/services/pikcelai.utils';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();
  const formData = await request.formData();
  const file = formData.get('image') as File;

  // Validate image
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return json({ error: validation.error }, { status: 400 });
  }

  try {
    // Upload image
    const upload = await client.uploadImageToPikcel({ file });

    // Dispatch processing job
    const job = await client.dispatchJob({
      tool_id: 'background-removal',
      input_image_url: upload.data.url,
      parameters: {
        quality: 'high',
        format: 'png',
      },
    });

    return json({
      jobId: job.data.id,
      status: job.data.status,
    });
  } catch (error) {
    return json({ error: formatAPIError(error) }, { status: 500 });
  }
}
```

### 3. Check Job Status

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';

export async function loader({ params }: LoaderFunctionArgs) {
  const client = getPikcelAIClient();
  const { jobId } = params;

  try {
    const response = await client.getJobStatus(jobId);

    return json({
      job: response.data,
    });
  } catch (error) {
    throw new Response('Job not found', { status: 404 });
  }
}
```

### 4. Poll Job Until Complete

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';

export async function processAndWait(imageUrl: string, toolId: string) {
  const client = getPikcelAIClient();

  // Start job
  const jobResponse = await client.dispatchJob({
    tool_id: toolId,
    input_image_url: imageUrl,
  });

  // Poll until complete
  const result = await client.pollJobUntilComplete(
    jobResponse.data.id,
    (job) => {
      console.log(`Job status: ${job.status}`);
    },
    2000, // Poll every 2 seconds
    5 * 60 * 1000 // 5 minute timeout
  );

  if (result.data.status === 'completed') {
    return result.data.output_image_url;
  } else {
    throw new Error(result.data.error_message || 'Job failed');
  }
}
```

### 5. Bulk Processing

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';

export async function processBulkImages(imageUrls: string[]) {
  const client = getPikcelAIClient();

  const bulkJob = await client.dispatchBulkJob({
    tool_id: 'background-removal',
    input_images: imageUrls.map((url) => ({ url })),
    parameters: { quality: 'high' },
    priority: 'normal',
  });

  return bulkJob.data;
}
```

### 6. Get User Credits

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';
import { hasEnoughCredits, calculateJobCredits } from '~/services/pikcelai.utils';

export async function loader() {
  const client = getPikcelAIClient();

  const profile = await client.getUserProfile();
  const models = await client.getAIModels();

  // Check if user can afford a specific model
  const backgroundRemoval = models.data.find(m => m.id === 'background-removal');
  const canAfford = hasEnoughCredits(
    profile.data.credits_balance,
    backgroundRemoval?.credits_required || 0
  );

  return json({
    credits: profile.data.credits_balance,
    subscription: profile.data.subscription,
    canAfford,
  });
}
```

### 7. Job History

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const client = getPikcelAIClient();
  const url = new URL(request.url);

  const history = await client.getJobHistory({
    limit: parseInt(url.searchParams.get('limit') || '10'),
    offset: parseInt(url.searchParams.get('offset') || '0'),
    status: url.searchParams.get('status') as any,
  });

  return json({
    jobs: history.data,
    total: history.total,
    hasMore: history.has_more,
  });
}
```

### 8. Using Templates

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';
import { mergeTemplateParameters } from '~/services/pikcelai.utils';

export async function processWithTemplate(imageUrl: string, templateId: string) {
  const client = getPikcelAIClient();

  // Get template
  const templates = await client.getTemplates();
  const template = templates.data.find(t => t.id === templateId);

  if (!template) {
    throw new Error('Template not found');
  }

  // Merge template parameters with custom overrides
  const parameters = mergeTemplateParameters(template.parameters, {
    quality: 'ultra', // Override template default
  });

  // Dispatch job
  const job = await client.dispatchJob({
    tool_id: template.tool_id,
    input_image_url: imageUrl,
    parameters,
  });

  return job.data;
}
```

### 9. Webhook Handler

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';
import type { WebhookPayload } from '~/services/pikcelai.types';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  // Get signature from headers
  const signature = request.headers.get('X-Pikcel-Signature');
  if (!signature) {
    return new Response('Missing signature', { status: 401 });
  }

  // Get raw body
  const body = await request.text();

  // Verify signature
  const isValid = await client.verifyWebhookSignature(body, signature);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse payload
  const payload: WebhookPayload = JSON.parse(body);

  // Handle event
  switch (payload.event) {
    case 'job.completed':
      // Update your database, notify user, etc.
      console.log('Job completed:', payload.job.id);
      break;

    case 'job.failed':
      // Handle failure
      console.error('Job failed:', payload.job.error_message);
      break;
  }

  return new Response('OK', { status: 200 });
}
```

### 10. Error Handling

```typescript
import { getPikcelAIClient } from '~/services/pikcelai.server';
import {
  PikcelAPIErrorClass,
  PikcelNetworkError,
  PikcelRateLimitError
} from '~/services/pikcelai.server';
import { formatAPIError } from '~/services/pikcelai.utils';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  try {
    const job = await client.dispatchJob({
      tool_id: 'background-removal',
      input_image_url: 'https://example.com/image.jpg',
    });

    return json({ success: true, job: job.data });
  } catch (error) {
    if (error instanceof PikcelAPIErrorClass) {
      // API error (4xx, 5xx)
      console.error('API Error:', error.code, error.message);
      return json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    } else if (error instanceof PikcelNetworkError) {
      // Network/timeout error
      console.error('Network Error:', error.message);
      return json(
        { error: 'Network error. Please try again.' },
        { status: 503 }
      );
    } else if (error instanceof PikcelRateLimitError) {
      // Rate limit error
      console.error('Rate limit:', error.retryAfter);
      return json(
        { error: error.message, retryAfter: error.retryAfter },
        { status: 429 }
      );
    } else {
      // Unknown error
      console.error('Unknown error:', error);
      return json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  }
}
```

## Utility Functions

### Image Validation

```typescript
import { validateImageFile, getImageDimensions } from '~/services/pikcelai.utils';

const file = formData.get('image') as File;

// Validate
const validation = validateImageFile(file);
if (!validation.valid) {
  throw new Error(validation.error);
}

// Get dimensions
const dimensions = await getImageDimensions(file);
console.log(`Image size: ${dimensions.width}x${dimensions.height}`);
```

### Credit Calculations

```typescript
import { calculateJobCredits, hasEnoughCredits } from '~/services/pikcelai.utils';

const required = calculateJobCredits(10, 5, 'high'); // base: 10, qty: 5, priority: high
const canAfford = hasEnoughCredits(userBalance, required);
```

### Progress Tracking

```typescript
import {
  calculateJobProgress,
  estimateTimeRemaining,
  isJobFinal,
} from '~/services/pikcelai.utils';

const progress = calculateJobProgress(job); // 0-100
const remaining = estimateTimeRemaining(job); // milliseconds
const isDone = isJobFinal(job.status);
```

### Formatting

```typescript
import {
  formatBytes,
  formatDuration,
  formatRelativeTime
} from '~/services/pikcelai.utils';

formatBytes(1024000); // "1000 KB"
formatDuration(5000); // "5.0s"
formatRelativeTime('2024-01-01T00:00:00Z'); // "2h ago"
```

## Advanced Features

### Custom Timeout Per Request

```typescript
const job = await client.dispatchJob(
  { tool_id: 'tool-1', input_image_url: url },
  { timeout: 60000 } // 60 second timeout
);
```

### Disable Retries

```typescript
const job = await client.dispatchJob(
  { tool_id: 'tool-1', input_image_url: url },
  { retries: 0 } // No retries
);
```

### Custom Retry Delay

```typescript
const job = await client.dispatchJob(
  { tool_id: 'tool-1', input_image_url: url },
  { retries: 5, retryDelay: 2000 } // 5 retries with 2s delay
);
```

### Manual Caching Control

```typescript
// Clear all caches
client.clearCache();

// Invalidate specific cache
client.invalidateCache('ai-models');

// Force fresh data
client.invalidateCache('user-profile');
const profile = await client.getUserProfile();
```

### Abort Requests

```typescript
const controller = new AbortController();

// Start request
const promise = client.dispatchJob(
  { tool_id: 'tool-1', input_image_url: url },
  { signal: controller.signal }
);

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request cancelled');
  }
}
```

## Best Practices

1. **Use Singleton Instance**: Use `getPikcelAIClient()` for app-wide requests
2. **Handle Errors Gracefully**: Always wrap API calls in try-catch
3. **Show Loading States**: Use job polling for long-running operations
4. **Validate Before Upload**: Check file size and type before uploading
5. **Monitor Credits**: Check user balance before expensive operations
6. **Use Webhooks**: Prefer webhooks over polling for production
7. **Cache Responses**: The client auto-caches, but you can control TTL
8. **Rate Limit Handling**: The client auto-retries, but inform users

## Type Definitions

All types are exported from `pikcelai.types.ts`:

```typescript
import type {
  AIModel,
  Job,
  Template,
  UserProfile,
  DispatchJobParams,
  GetJobHistoryParams,
  WebhookPayload,
} from '~/services/pikcelai.types';
```

## API Reference

### Client Methods

- `getAIModels()` - Get available AI models
- `getTemplates()` - Get editing templates
- `dispatchJob(params)` - Create processing job
- `getJobStatus(jobId)` - Get job details
- `getJobHistory(params?)` - Get user's job history
- `getUserProfile()` - Get user credits/subscription
- `uploadImageToPikcel(params)` - Upload image
- `dispatchBulkJob(params)` - Bulk processing
- `pollJobUntilComplete(jobId, onProgress?, pollInterval?, timeout?)` - Poll job
- `verifyWebhookSignature(payload, signature)` - Verify webhook
- `clearCache()` - Clear all caches
- `invalidateCache(key)` - Invalidate specific cache

### Error Classes

- `PikcelAPIErrorClass` - API errors (4xx, 5xx)
- `PikcelNetworkError` - Network/timeout errors
- `PikcelRateLimitError` - Rate limiting errors

## Testing

Example test setup:

```typescript
import { createPikcelAIClient } from '~/services/pikcelai.server';

const testClient = createPikcelAIClient({
  apiUrl: 'http://localhost:3000',
  apiKey: 'test-key',
});

// Test API calls
const models = await testClient.getAIModels();
expect(models.success).toBe(true);
```

## Troubleshooting

### Environment Variables Not Found

Make sure `.env` is loaded:

```typescript
// In your app entry point
import 'dotenv/config';
```

### CORS Errors

PikcelAI API should include proper CORS headers. Contact support if issues persist.

### Timeout Errors

Increase timeout for slow connections:

```typescript
const client = createPikcelAIClient({
  apiUrl: process.env.PIKCEL_API_URL!,
  apiKey: process.env.PIKCEL_API_KEY!,
  timeout: 60000, // 60 seconds
});
```

### Rate Limiting

The client auto-retries rate limit errors. If persistent, upgrade your plan or reduce request frequency.

## Support

For API issues or questions:
- Email: support@pikcel.ai
- Docs: https://docs.pikcel.ai
- Status: https://status.pikcel.ai
