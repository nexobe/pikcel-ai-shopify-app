# Integration Guide: Adding PikcelAI to Your Shopify App

This guide walks you through integrating the PikcelAI service layer into your existing Shopify app.

## Step 1: Environment Configuration

### 1.1 Add Environment Variables

Add to your `.env` file (or DigitalOcean environment variables):

```env
# Required
PIKCEL_API_URL=https://api.pikcel.ai
PIKCEL_API_KEY=your_api_key_here

# Optional (for webhooks)
PIKCEL_WEBHOOK_SECRET=your_webhook_secret
```

### 1.2 Generate Webhook Secret (Optional)

```bash
openssl rand -hex 32
```

Add the output as `PIKCEL_WEBHOOK_SECRET`.

## Step 2: Basic Integration

### 2.1 Import the Service

In any route file:

```typescript
import { getPikcelAIClient } from '~/services';
```

### 2.2 Test Connection

Create a test route: `app/routes/test.pikcel.tsx`

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getPikcelAIClient } from '~/services';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const client = getPikcelAIClient();
    const models = await client.getAIModels();

    return json({
      success: true,
      modelCount: models.count,
      models: models.data,
    });
  } catch (error) {
    return json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export default function TestPikcel() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>PikcelAI Connection Test</h1>
      {data.success ? (
        <div>
          <p>Connected successfully!</p>
          <p>Found {data.modelCount} models</p>
          <ul>
            {data.models.map(model => (
              <key={model.id}>
                {model.name} ({model.credits_required} credits)
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Error: {data.error}</p>
      )}
    </div>
  );
}
```

Visit `/test-pikcel` to verify connection.

## Step 3: Image Upload Route

Create: `app/routes/api.upload-image.tsx`

```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from '@remix-run/node';
import { getPikcelAIClient, validateImageFile, formatAPIError } from '~/services';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  try {
    // Parse multipart form data
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 10_000_000, // 10MB
    });

    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler
    );

    const file = formData.get('image') as File;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return json({ error: validation.error }, { status: 400 });
    }

    // Upload to PikcelAI
    const upload = await client.uploadImageToPikcel({
      file,
      folder: 'shopify-uploads',
    });

    return json({
      success: true,
      imageUrl: upload.data.url,
      size: upload.data.size,
    });
  } catch (error) {
    return json({
      success: false,
      error: formatAPIError(error),
    }, { status: 500 });
  }
}
```

## Step 4: Image Processing Route

Create: `app/routes/api.process-image.tsx`

```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import {
  getPikcelAIClient,
  hasEnoughCredits,
  formatAPIError,
} from '~/services';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  try {
    const formData = await request.formData();
    const imageUrl = formData.get('imageUrl') as string;
    const toolId = formData.get('toolId') as string;

    if (!imageUrl || !toolId) {
      return json(
        { error: 'Missing imageUrl or toolId' },
        { status: 400 }
      );
    }

    // Check user credits
    const [profile, models] = await Promise.all([
      client.getUserProfile(),
      client.getAIModels(),
    ]);

    const model = models.data.find(m => m.id === toolId);
    if (!model) {
      return json({ error: 'Tool not found' }, { status: 404 });
    }

    if (!hasEnoughCredits(profile.data.credits_balance, model.credits_required)) {
      return json({
        error: 'Insufficient credits',
        required: model.credits_required,
        balance: profile.data.credits_balance,
      }, { status: 402 });
    }

    // Dispatch job
    const job = await client.dispatchJob({
      tool_id: toolId,
      input_image_url: imageUrl,
      webhook_url: `${new URL(request.url).origin}/webhooks/pikcel`,
    });

    return json({
      success: true,
      jobId: job.data.id,
      status: job.data.status,
    });
  } catch (error) {
    return json({
      success: false,
      error: formatAPIError(error),
    }, { status: 500 });
  }
}
```

## Step 5: Job Status Route

Create: `app/routes/api.job.$jobId.tsx`

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getPikcelAIClient, formatAPIError } from '~/services';

export async function loader({ params }: LoaderFunctionArgs) {
  const client = getPikcelAIClient();
  const { jobId } = params;

  if (!jobId) {
    return json({ error: 'Job ID required' }, { status: 400 });
  }

  try {
    const response = await client.getJobStatus(jobId);

    return json({
      success: true,
      job: response.data,
    });
  } catch (error) {
    return json({
      success: false,
      error: formatAPIError(error),
    }, { status: 404 });
  }
}
```

## Step 6: Webhook Handler

Create: `app/routes/webhooks.pikcel.tsx`

```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getPikcelAIClient } from '~/services';
import type { WebhookPayload } from '~/services/pikcelai.types';

export async function action({ request }: ActionFunctionArgs) {
  const client = getPikcelAIClient();

  try {
    // Get signature
    const signature = request.headers.get('X-Pikcel-Signature');
    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    // Get body
    const body = await request.text();

    // Verify signature
    const isValid = await client.verifyWebhookSignature(body, signature);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(body);

    // Handle events
    switch (payload.event) {
      case 'job.completed':
        await handleJobCompleted(payload.job);
        break;

      case 'job.failed':
        await handleJobFailed(payload.job);
        break;

      case 'job.started':
        await handleJobStarted(payload.job);
        break;
    }

    return json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleJobCompleted(job: any) {
  // TODO: Update your database
  // TODO: Notify user
  console.log('Job completed:', job.id, job.output_image_url);
}

async function handleJobFailed(job: any) {
  // TODO: Log error
  // TODO: Notify user
  console.error('Job failed:', job.id, job.error_message);
}

async function handleJobStarted(job: any) {
  // TODO: Update status
  console.log('Job started:', job.id);
}
```

## Step 7: Frontend Component

Create: `app/components/ImageEditor.tsx`

```typescript
import { useState } from 'react';
import { useFetcher, useLoaderData } from '@remix-run/react';

interface ImageEditorProps {
  models: Array<{
    id: string;
    name: string;
    credits_required: number;
  }>;
  userCredits: number;
}

export function ImageEditor({ models, userCredits }: ImageEditorProps) {
  const uploadFetcher = useFetcher();
  const processFetcher = useFetcher();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [uploadedUrl, setUploadedUrl] = useState<string>('');

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Upload image
  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);

    uploadFetcher.submit(formData, {
      method: 'POST',
      action: '/api/upload-image',
      encType: 'multipart/form-data',
    });
  };

  // Process image
  const handleProcess = () => {
    if (!uploadedUrl || !selectedTool) return;

    const formData = new FormData();
    formData.append('imageUrl', uploadedUrl);
    formData.append('toolId', selectedTool);

    processFetcher.submit(formData, {
      method: 'POST',
      action: '/api/process-image',
    });
  };

  // Update uploaded URL when upload completes
  if (uploadFetcher.data?.success && !uploadedUrl) {
    setUploadedUrl(uploadFetcher.data.imageUrl);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">AI Image Editor</h2>

      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm">Your Credits: {userCredits}</p>
      </div>

      {/* Step 1: Upload */}
      <div className="border p-6 rounded">
        <h3 className="text-lg font-semibold mb-4">Step 1: Upload Image</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploadFetcher.state !== 'idle'}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          {uploadFetcher.state === 'submitting' ? 'Uploading...' : 'Upload'}
        </button>

        {uploadFetcher.data?.error && (
          <p className="text-red-500 mt-2">{uploadFetcher.data.error}</p>
        )}
      </div>

      {/* Step 2: Select Tool */}
      {uploadedUrl && (
        <div className="border p-6 rounded">
          <h3 className="text-lg font-semibold mb-4">Step 2: Select Tool</h3>
          <img
            src={uploadedUrl}
            alt="Uploaded"
            className="max-w-sm mb-4 rounded"
          />

          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">Select a tool...</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.credits_required} credits)
              </option>
            ))}
          </select>

          <button
            onClick={handleProcess}
            disabled={!selectedTool || processFetcher.state !== 'idle'}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            {processFetcher.state === 'submitting' ? 'Processing...' : 'Process'}
          </button>

          {processFetcher.data?.error && (
            <p className="text-red-500 mt-2">{processFetcher.data.error}</p>
          )}
        </div>
      )}

      {/* Step 3: Job Status */}
      {processFetcher.data?.jobId && (
        <div className="border p-6 rounded bg-green-50">
          <h3 className="text-lg font-semibold mb-2">Processing Started!</h3>
          <p>Job ID: {processFetcher.data.jobId}</p>
          <p>Status: {processFetcher.data.status}</p>
        </div>
      )}
    </div>
  );
}
```

## Step 8: Main Editor Page

Create: `app/routes/editor.tsx`

```typescript
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getPikcelAIClient } from '~/services';
import { ImageEditor } from '~/components/ImageEditor';

export async function loader({ request }: LoaderFunctionArgs) {
  const client = getPikcelAIClient();

  const [models, profile] = await Promise.all([
    client.getAIModels(),
    client.getUserProfile(),
  ]);

  return json({
    models: models.data.filter(m => m.is_active),
    credits: profile.data.credits_balance,
  });
}

export default function EditorPage() {
  const { models, credits } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto p-6">
      <ImageEditor models={models} userCredits={credits} />
    </div>
  );
}
```

## Step 9: Job Status Polling Component

Create: `app/components/JobStatus.tsx`

```typescript
import { useState, useEffect } from 'react';
import { getPikcelAIClient } from '~/services';
import type { Job } from '~/services/pikcelai.types';

interface JobStatusProps {
  jobId: string;
  onComplete?: (outputUrl: string) => void;
  onError?: (error: string) => void;
}

export function JobStatus({ jobId, onComplete, onError }: JobStatusProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const pollJob = async () => {
      try {
        const response = await fetch(`/api/job/${jobId}`);
        const data = await response.json();

        if (data.success) {
          setJob(data.job);

          // Check if final
          if (data.job.status === 'completed') {
            setLoading(false);
            clearInterval(interval);
            onComplete?.(data.job.output_image_url);
          } else if (data.job.status === 'failed') {
            setLoading(false);
            clearInterval(interval);
            onError?.(data.job.error_message || 'Job failed');
          }
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error);
      }
    };

    pollJob(); // Initial poll
    interval = setInterval(pollJob, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, onComplete, onError]);

  if (!job) return <p>Loading...</p>;

  return (
    <div className="border p-4 rounded">
      <h3 className="font-semibold mb-2">Job Status</h3>
      <p>Status: {job.status}</p>

      {job.status === 'processing' && (
        <div className="mt-4">
          <div className="animate-pulse bg-blue-500 h-2 rounded"></div>
          <p className="text-sm mt-2">Processing your image...</p>
        </div>
      )}

      {job.status === 'completed' && job.output_image_url && (
        <div className="mt-4">
          <img
            src={job.output_image_url}
            alt="Processed"
            className="max-w-full rounded"
          />
          <a
            href={job.output_image_url}
            download
            className="mt-2 inline-block bg-green-500 text-white px-4 py-2 rounded"
          >
            Download
          </a>
        </div>
      )}

      {job.status === 'failed' && (
        <p className="text-red-500 mt-2">Error: {job.error_message}</p>
      )}
    </div>
  );
}
```

## Step 10: Testing

### 10.1 Test Environment

```bash
# Check env vars are set
echo $PIKCEL_API_URL
echo $PIKCEL_API_KEY
```

### 10.2 Test Connection

Visit: `http://localhost:3000/test-pikcel`

Should show list of available models.

### 10.3 Test Full Flow

1. Visit: `http://localhost:3000/editor`
2. Upload an image
3. Select a tool
4. Click "Process"
5. Monitor job status

## Step 11: Production Deployment

### 11.1 DigitalOcean Environment Variables

```bash
doctl apps update YOUR_APP_ID \
  --env-vars "PIKCEL_API_URL=https://api.pikcel.ai,PIKCEL_API_KEY=your_key,PIKCEL_WEBHOOK_SECRET=your_secret"
```

### 11.2 Configure Webhooks in PikcelAI

1. Log into PikcelAI Dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-app.com/webhooks/pikcel`
4. Set secret to match `PIKCEL_WEBHOOK_SECRET`
5. Enable events: `job.completed`, `job.failed`, `job.started`

### 11.3 Monitor Logs

```bash
doctl apps logs YOUR_APP_ID --follow
```

## Troubleshooting

### Issue: "API URL not found"

```typescript
// Check env vars are loaded
console.log('PIKCEL_API_URL:', process.env.PIKCEL_API_URL);
```

### Issue: "Unauthorized"

- Verify `PIKCEL_API_KEY` is correct
- Check key hasn't expired
- Ensure key has proper permissions

### Issue: "File too large"

```typescript
import { MAX_IMAGE_SIZE_BYTES } from '~/services';

// Check before upload
if (file.size > MAX_IMAGE_SIZE_BYTES) {
  alert('File too large. Max 10MB');
}
```

### Issue: "Insufficient credits"

```typescript
import { hasEnoughCredits } from '~/services';

// Check before processing
const profile = await client.getUserProfile();
const canAfford = hasEnoughCredits(profile.data.credits_balance, requiredCredits);

if (!canAfford) {
  // Show upgrade prompt
}
```

## Next Steps

1. Customize UI to match your app's design
2. Add job history page
3. Implement credit purchase flow
4. Add batch processing UI
5. Create template selector
6. Add progress notifications
7. Implement image gallery

## Additional Resources

- Quick Start: `/app/services/QUICKSTART.md`
- Full Documentation: `/app/services/README.md`
- Type Reference: `/app/services/pikcelai.types.ts`
- Utility Functions: `/app/services/pikcelai.utils.ts`

## Support

For integration help:
- Check documentation files in `/app/services/`
- Review example test file: `pikcelai.test.example.ts`
- Contact: support@pikcel.ai
