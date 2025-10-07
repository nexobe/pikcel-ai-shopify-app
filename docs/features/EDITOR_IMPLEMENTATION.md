# AI Image Editor - Implementation Guide

## Overview

The AI Image Editor is a comprehensive multi-step workflow that allows Shopify merchants to edit their product images using AI-powered tools.

## Architecture

### Route Structure

**File**: `/app/routes/app.editor.tsx`

This is a Remix/React Router route that handles:
- Loading product images from Shopify
- Fetching available AI models
- Processing jobs
- Uploading results back to Shopify

### Components Included

The editor is built as a single-page multi-step wizard with 5 distinct steps:

1. **Step 1: Image Selection**
   - Displays all product images from Shopify store
   - Grid layout with image previews
   - Click to select an image for processing

2. **Step 2: Tool Selection**
   - Shows available AI models/tools
   - Each tool displays name, description, and credit cost
   - Categories include: Background Removal, Enhancement, Color Correction, etc.

3. **Step 3: Parameter Configuration**
   - Dynamic parameter inputs based on selected tool
   - OpenAI models: Skip this step (use defaults)
   - Replicate/Google models: Show customizable parameters
   - Includes sliders, text inputs, and switches

4. **Step 4: Processing**
   - Shows loading spinner with job status
   - Real-time status updates via polling
   - Displays progress messages

5. **Step 5: Review & Push**
   - Side-by-side before/after image comparison
   - Download processed image
   - Push to Shopify product
   - Start another job option

### Progress Bar

Visual step indicator showing:
- Current step highlighted in green
- Completed steps with checkmarks
- Connecting lines between steps
- Responsive design for mobile

## API Integration

### Loader Function

```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch products with images
  const productsResponse = await admin.graphql(`...`);

  // Fetch AI models (replace with actual API call)
  const aiModels = await fetchAIModels();

  return { products, aiModels };
};
```

### Action Function

Handles two action types:

1. **submitJob**: Creates a processing job
   - Receives: model ID, image URL, parameters
   - Returns: job ID and initial status

2. **pushToShopify**: Uploads result to Shopify
   - Uses Shopify Admin API `productAppendImages` mutation
   - Receives: product ID, result image URL
   - Returns: new image details or error

## State Management

The editor uses React hooks for state:

```typescript
const [currentStep, setCurrentStep] = useState(0);
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
const [selectedImage, setSelectedImage] = useState<string | null>(null);
const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
const [parameters, setParameters] = useState<Record<string, any>>({});
const [jobId, setJobId] = useState<string | null>(null);
const [jobStatus, setJobStatus] = useState<string | null>(null);
const [resultUrl, setResultUrl] = useState<string | null>(null);
```

## Job Status Polling

Uses `useEffect` to poll job status every 2 seconds:

```typescript
useEffect(() => {
  if (jobId && jobStatus === "processing") {
    const interval = setInterval(async () => {
      const updatedJob = await getJobStatus(jobId);
      setJobStatus(updatedJob.status);
      if (updatedJob.status === "completed") {
        setResultUrl(updatedJob.result_url);
        setCurrentStep(4); // Move to review step
      }
    }, 2000);

    return () => clearInterval(interval);
  }
}, [jobId, jobStatus]);
```

## Integration with Backend

### Required API Endpoints

You need to implement these endpoints in your backend:

1. **GET /api/ai-models**
   - Returns list of available AI models
   - Response: `{ models: AIModel[] }`

2. **POST /api/jobs**
   - Creates a new processing job
   - Body: `{ model_id, image_url, parameters }`
   - Response: `{ job: Job }`

3. **GET /api/jobs/:id**
   - Returns job status and result
   - Response: `{ job: Job }`

### AI Service

The `aiService.ts` provides helper functions:

```typescript
import { fetchAIModels, createProcessingJob, getJobStatus } from '../services/aiService';

// In your loader
const aiModels = await fetchAIModels();

// In your component
const job = await createProcessingJob({
  model_id: selectedModel.id,
  image_url: selectedImage,
  parameters: parameters
});

const status = await getJobStatus(job.id);
```

## Shopify GraphQL Queries

### Fetch Products with Images

```graphql
query getProducts {
  products(first: 50) {
    edges {
      node {
        id
        title
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
      }
    }
  }
}
```

### Upload Image to Product

```graphql
mutation productAppendImages($productId: ID!, $images: [ImageInput!]!) {
  productAppendImages(productId: $productId, images: $images) {
    newImages {
      id
      url
    }
    userErrors {
      field
      message
    }
  }
}
```

## Parameter Configuration

The parameter step dynamically renders inputs based on the model:

### Number Parameters (Sliders)
```typescript
if (typeof value === "number") {
  return (
    <input
      type="range"
      min="0"
      max="1"
      step="0.1"
      value={value}
      onChange={(e) => setParameters({
        ...parameters,
        [key]: parseFloat(e.target.value)
      })}
    />
  );
}
```

### Boolean Parameters (Switches)
```typescript
if (typeof value === "boolean") {
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => setParameters({
        ...parameters,
        [key]: e.target.checked
      })}
    />
  );
}
```

## Error Handling

The editor includes comprehensive error handling:

1. **API Errors**: Caught and displayed to user
2. **Job Failures**: Shown in processing step
3. **Upload Errors**: Displayed when pushing to Shopify
4. **Form Validation**: Ensures all required fields are filled

## Mobile Responsive Design

- Grid layouts adjust for smaller screens
- Progress bar adapts to mobile view
- Images stack vertically on mobile
- Touch-friendly UI elements

## Next Steps

To complete the integration:

1. **Backend Setup**:
   - Implement the three required API endpoints
   - Connect to your AI processing service (Replicate, OpenAI, etc.)
   - Set up job queue and status tracking

2. **Environment Variables**:
   ```env
   PIKCEL_AI_API_URL=https://your-backend-url.com/api
   ```

3. **Database**:
   - Store job records
   - Track user credits
   - Log processing history

4. **Enhanced Features**:
   - Batch processing multiple images
   - Save presets for parameters
   - Job history and results gallery
   - Credit usage tracking

## Reference Files

The implementation references the PikcelAI codebase:

- **Processing Panel**: `/Users/asghar/Documents/Software/Development/PikcelAI/client/src/components/ai-studio/AIProcessingPanel.tsx`
- **Job Creator**: `/Users/asghar/Documents/Software/Development/PikcelAI/client/src/components/processing/ProcessingJobCreator.tsx`
- **Parameter Config**: `/Users/asghar/Documents/Software/Development/PikcelAI/client/src/components/processing/steps/ParameterConfigurationStep.tsx`

## Testing

To test the editor:

1. Start your Shopify app: `npm run dev`
2. Navigate to `/app/editor`
3. Select a product image
4. Choose an AI tool
5. Configure parameters (if applicable)
6. Submit for processing
7. Review results and push to Shopify

## Troubleshooting

**Images not loading**: Check Shopify API permissions and scopes
**Jobs stuck in processing**: Verify backend polling endpoint
**Upload fails**: Ensure Shopify write permissions are granted
**Parameters not showing**: Check AI model's `default_parameters` field
