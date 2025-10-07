# Shopify Upload Integration Examples

Complete examples showing how to integrate the upload system into your application.

## Table of Contents
1. [Basic Integration](#basic-integration)
2. [AI Processing Workflow](#ai-processing-workflow)
3. [Advanced Features](#advanced-features)
4. [Error Handling](#error-handling)
5. [Production Patterns](#production-patterns)

---

## Basic Integration

### 1. Single Image Upload Page

Create a route file: `app/routes/app.upload-test.tsx`

```typescript
import { useState } from 'react';
import { useShopifyUpload } from '../hooks/useShopifyUpload';
import { getProgressMessage } from '../utils/shopify-upload.client';

export default function UploadTestPage() {
  const { upload, uploading, progress, result, error } = useShopifyUpload();
  const [productId, setProductId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleUpload = async () => {
    const uploadResult = await upload({
      productId,
      imageUrl,
      altText: 'Test upload',
      setPrimary: true
    });

    if (uploadResult.success) {
      console.log('Upload successful:', uploadResult.mediaId);
    }
  };

  return (
    <s-page heading="Upload Test">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Product ID"
            value={productId}
            onChange={setProductId}
            placeholder="gid://shopify/Product/123456"
          />

          <s-text-field
            label="Image URL"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="https://example.com/image.jpg"
          />

          <s-button
            onClick={handleUpload}
            loading={uploading}
            disabled={!productId || !imageUrl}
          >
            Upload to Shopify
          </s-button>

          {progress && (
            <s-banner>
              {getProgressMessage(progress)} - {progress.progress}%
            </s-banner>
          )}

          {result && (
            <s-banner status={result.success ? 'success' : 'error'}>
              {result.success
                ? `Upload successful! Media ID: ${result.mediaId}`
                : `Upload failed: ${result.error}`}
            </s-banner>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
```

---

## AI Processing Workflow

### 2. Complete AI Processing + Upload Flow

```typescript
import { useState } from 'react';
import { useShopifyUpload } from '../hooks/useShopifyUpload';

interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedImageUrl?: string;
}

export default function AIProcessAndUpload() {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const { upload, uploading, progress, result } = useShopifyUpload();

  // Step 1: Process image with AI
  const processImage = async (originalImageUrl: string, aiParams: any) => {
    const response = await fetch('/api/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: originalImageUrl,
        parameters: aiParams
      })
    });

    const data = await response.json();
    return data.jobId;
  };

  // Step 2: Poll for job completion
  const pollJobStatus = async (jobId: string): Promise<ProcessingJob> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        const response = await fetch(`/api/job-status/${jobId}`);
        const jobData: ProcessingJob = await response.json();

        setJob(jobData);

        if (jobData.status === 'completed') {
          clearInterval(interval);
          resolve(jobData);
        } else if (jobData.status === 'failed') {
          clearInterval(interval);
          reject(new Error('Processing failed'));
        }
      }, 2000); // Poll every 2 seconds
    });
  };

  // Step 3: Upload to Shopify
  const uploadToShopify = async (imageUrl: string, productId: string) => {
    return await upload({
      productId,
      imageUrl,
      altText: 'AI-enhanced product image',
      setPrimary: true
    });
  };

  // Complete workflow
  const handleCompleteWorkflow = async (
    originalImageUrl: string,
    aiParams: any,
    productId: string
  ) => {
    try {
      // Step 1: Start AI processing
      console.log('Starting AI processing...');
      const jobId = await processImage(originalImageUrl, aiParams);

      // Step 2: Wait for processing to complete
      console.log('Waiting for processing to complete...');
      const completedJob = await pollJobStatus(jobId);

      if (!completedJob.processedImageUrl) {
        throw new Error('No processed image URL returned');
      }

      // Step 3: Upload to Shopify
      console.log('Uploading to Shopify...');
      const uploadResult = await uploadToShopify(
        completedJob.processedImageUrl,
        productId
      );

      if (uploadResult.success) {
        console.log('Complete workflow successful!', uploadResult.mediaId);
        return uploadResult.mediaId;
      } else {
        throw new Error(uploadResult.error);
      }

    } catch (error) {
      console.error('Workflow failed:', error);
      throw error;
    }
  };

  return (
    <s-page heading="AI Process & Upload">
      <s-section>
        {/* Your UI here */}
        {job && (
          <s-banner>
            Processing Status: {job.status}
          </s-banner>
        )}

        {progress && (
          <s-banner>
            Upload Progress: {progress.progress}%
          </s-banner>
        )}

        {result && (
          <s-banner status={result.success ? 'success' : 'error'}>
            {result.success
              ? `Successfully uploaded! Media ID: ${result.mediaId}`
              : `Upload failed: ${result.error}`}
          </s-banner>
        )}
      </s-section>
    </s-page>
  );
}
```

---

## Advanced Features

### 3. Batch Upload with Product Selection

```typescript
import { useState } from 'react';
import { useBatchShopifyUpload } from '../hooks/useShopifyUpload';
import type { UploadRequest } from '../types/shopify-upload';

interface ImageToUpload {
  url: string;
  altText: string;
  targetProductId: string;
}

export default function BatchUploadPage() {
  const [images, setImages] = useState<ImageToUpload[]>([]);
  const { upload, uploading, progressMap, result } = useBatchShopifyUpload();

  const addImage = () => {
    setImages([...images, { url: '', altText: '', targetProductId: '' }]);
  };

  const handleBatchUpload = async () => {
    const uploads: UploadRequest[] = images.map((img, index) => ({
      productId: img.targetProductId,
      imageUrl: img.url,
      altText: img.altText || 'Product image',
      position: index
    }));

    const uploadResult = await upload(uploads);

    if (uploadResult.success) {
      console.log('All uploads successful!');
    } else {
      const failedCount = uploadResult.results.filter(r => !r.success).length;
      console.log(`${failedCount} uploads failed`);
    }
  };

  return (
    <s-page heading="Batch Upload">
      <s-section>
        <s-stack direction="block" gap="base">
          {images.map((img, index) => (
            <s-box key={index} padding="base" borderWidth="base">
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="Product ID"
                  value={img.targetProductId}
                  onChange={(value) => {
                    const newImages = [...images];
                    newImages[index].targetProductId = value;
                    setImages(newImages);
                  }}
                />

                <s-text-field
                  label="Image URL"
                  value={img.url}
                  onChange={(value) => {
                    const newImages = [...images];
                    newImages[index].url = value;
                    setImages(newImages);
                  }}
                />

                <s-text-field
                  label="Alt Text"
                  value={img.altText}
                  onChange={(value) => {
                    const newImages = [...images];
                    newImages[index].altText = value;
                    setImages(newImages);
                  }}
                />

                {progressMap[index] && (
                  <s-banner>
                    Progress: {progressMap[index].progress}%
                  </s-banner>
                )}
              </s-stack>
            </s-box>
          ))}

          <s-stack direction="inline" gap="base">
            <s-button onClick={addImage}>Add Image</s-button>
            <s-button
              onClick={handleBatchUpload}
              loading={uploading}
              disabled={images.length === 0}
              variant="primary"
            >
              Upload All
            </s-button>
          </s-stack>

          {result && (
            <s-banner status={result.success ? 'success' : 'warning'}>
              {result.results.filter(r => r.success).length} of {result.results.length} uploads successful
            </s-banner>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
```

### 4. Replace Product Image Feature

```typescript
import { useState, useEffect } from 'react';
import { useReplaceProductImage } from '../hooks/useShopifyUpload';

interface ProductImage {
  id: string;
  url: string;
  altText: string;
}

export default function ReplaceImagePage() {
  const [productId, setProductId] = useState('');
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const { replace, uploading, progress, result } = useReplaceProductImage();

  // Fetch product images
  const fetchProductImages = async (productId: string) => {
    const response = await fetch(`/api/product-images/${productId}`);
    const data = await response.json();
    setImages(data.images);
  };

  const handleReplace = async () => {
    const replaceResult = await replace(
      productId,
      selectedImageId,
      newImageUrl,
      'Replaced image'
    );

    if (replaceResult.success) {
      console.log('Image replaced successfully');
      // Refresh product images
      fetchProductImages(productId);
    }
  };

  return (
    <s-page heading="Replace Product Image">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Product ID"
            value={productId}
            onChange={setProductId}
          />

          <s-button onClick={() => fetchProductImages(productId)}>
            Load Images
          </s-button>

          {images.length > 0 && (
            <>
              <s-select
                label="Select Image to Replace"
                value={selectedImageId}
                onChange={setSelectedImageId}
              >
                {images.map(img => (
                  <option key={img.id} value={img.id}>
                    {img.altText || 'Untitled'}
                  </option>
                ))}
              </s-select>

              <s-text-field
                label="New Image URL"
                value={newImageUrl}
                onChange={setNewImageUrl}
              />

              <s-button
                onClick={handleReplace}
                loading={uploading}
                disabled={!selectedImageId || !newImageUrl}
              >
                Replace Image
              </s-button>
            </>
          )}

          {progress && (
            <s-banner>
              {progress.message} - {progress.progress}%
            </s-banner>
          )}

          {result && (
            <s-banner status={result.success ? 'success' : 'error'}>
              {result.success
                ? `Image replaced! New ID: ${result.mediaId}`
                : `Failed: ${result.error}`}
            </s-banner>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
```

---

## Error Handling

### 5. Comprehensive Error Handling

```typescript
import { useState } from 'react';
import { uploadImageToShopify, validateImageUrl } from '../utils/shopify-upload.client';
import type { UploadResult } from '../types/shopify-upload';

export default function ErrorHandlingExample() {
  const [errors, setErrors] = useState<string[]>([]);

  const uploadWithErrorHandling = async (
    productId: string,
    imageUrl: string
  ): Promise<UploadResult> => {
    const errorLog: string[] = [];

    try {
      // Pre-validation
      const validation = await validateImageUrl(imageUrl);
      if (!validation.valid) {
        errorLog.push(`Validation failed: ${validation.error}`);
        setErrors(errorLog);
        return {
          success: false,
          error: validation.error
        };
      }

      // Attempt upload with retries
      const result = await uploadImageToShopify({
        productId,
        imageUrl,
        altText: 'Product image'
      }, {
        onProgress: (progress) => {
          console.log(`Step: ${progress.step}, Progress: ${progress.progress}%`);
        },
        onError: (error) => {
          errorLog.push(`Upload error: ${error.message}`);
          setErrors([...errorLog]);
        },
        onSuccess: (result) => {
          console.log('Upload successful:', result.mediaId);
        }
      });

      if (!result.success) {
        // Log detailed error
        errorLog.push(`Upload failed: ${result.error}`);
        if (result.details) {
          errorLog.push(`Details: ${JSON.stringify(result.details)}`);
        }
        setErrors(errorLog);

        // Implement fallback strategy
        return await fallbackUploadStrategy(productId, imageUrl);
      }

      return result;

    } catch (error) {
      // Catch unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog.push(`Unexpected error: ${errorMessage}`);
      setErrors(errorLog);

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const fallbackUploadStrategy = async (
    productId: string,
    imageUrl: string
  ): Promise<UploadResult> => {
    // Implement fallback (e.g., compress image, use different endpoint, etc.)
    console.log('Attempting fallback upload strategy...');

    // For now, just return failure
    return {
      success: false,
      error: 'Fallback strategy not implemented'
    };
  };

  return (
    <s-page heading="Error Handling">
      <s-section>
        {errors.length > 0 && (
          <s-banner status="error">
            <s-stack direction="block" gap="small">
              {errors.map((error, index) => (
                <s-text key={index}>{error}</s-text>
              ))}
            </s-stack>
          </s-banner>
        )}
      </s-section>
    </s-page>
  );
}
```

---

## Production Patterns

### 6. Queue-Based Upload System

```typescript
import { useState, useCallback } from 'react';
import { uploadImageToShopify } from '../utils/shopify-upload.client';
import type { UploadRequest } from '../types/shopify-upload';

interface QueueItem extends UploadRequest {
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  retries: number;
}

export function useUploadQueue(maxConcurrent = 3, maxRetries = 3) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = useCallback((uploads: UploadRequest[]) => {
    const queueItems: QueueItem[] = uploads.map(upload => ({
      ...upload,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      retries: 0
    }));

    setQueue(prev => [...prev, ...queueItems]);
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    while (queue.some(item => item.status === 'pending')) {
      // Get pending items
      const pending = queue.filter(item => item.status === 'pending');
      const batch = pending.slice(0, maxConcurrent);

      // Process batch in parallel
      await Promise.all(batch.map(async (item) => {
        // Update status to uploading
        setQueue(prev => prev.map(q =>
          q.id === item.id ? { ...q, status: 'uploading' } : q
        ));

        try {
          const result = await uploadImageToShopify({
            productId: item.productId,
            imageUrl: item.imageUrl,
            altText: item.altText,
            replaceImageId: item.replaceImageId,
            setPrimary: item.setPrimary,
            position: item.position
          }, {
            onProgress: (progress) => {
              setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, progress: progress.progress } : q
              ));
            }
          });

          if (result.success) {
            // Mark as success
            setQueue(prev => prev.map(q =>
              q.id === item.id ? { ...q, status: 'success', result } : q
            ));
          } else {
            // Retry or fail
            if (item.retries < maxRetries) {
              setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, status: 'pending', retries: q.retries + 1 } : q
              ));
            } else {
              setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, status: 'failed', error: result.error } : q
              ));
            }
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (item.retries < maxRetries) {
            setQueue(prev => prev.map(q =>
              q.id === item.id ? { ...q, status: 'pending', retries: q.retries + 1 } : q
            ));
          } else {
            setQueue(prev => prev.map(q =>
              q.id === item.id ? { ...q, status: 'failed', error: errorMessage } : q
            ));
          }
        }
      }));

      // Wait a bit before next batch
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsProcessing(false);
  }, [queue, isProcessing, maxConcurrent, maxRetries]);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    addToQueue,
    processQueue,
    clearQueue,
    isProcessing
  };
}
```

### 7. Using the Upload Queue

```typescript
export default function BulkUploadPage() {
  const { queue, addToQueue, processQueue, isProcessing } = useUploadQueue(3, 3);

  const handleBulkUpload = () => {
    // Add 10 images to queue
    const uploads: UploadRequest[] = Array.from({ length: 10 }, (_, i) => ({
      productId: 'gid://shopify/Product/123456',
      imageUrl: `https://example.com/image-${i}.jpg`,
      altText: `Image ${i + 1}`
    }));

    addToQueue(uploads);
    processQueue();
  };

  const successCount = queue.filter(q => q.status === 'success').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;
  const pendingCount = queue.filter(q => q.status === 'pending').length;

  return (
    <s-page heading="Bulk Upload">
      <s-section>
        <s-button onClick={handleBulkUpload} disabled={isProcessing}>
          Upload 10 Images
        </s-button>

        <s-banner>
          Success: {successCount} | Failed: {failedCount} | Pending: {pendingCount}
        </s-banner>

        {queue.map(item => (
          <s-box key={item.id} padding="base">
            <s-text>
              {item.imageUrl} - {item.status} ({item.progress || 0}%)
            </s-text>
          </s-box>
        ))}
      </s-section>
    </s-page>
  );
}
```

---

## Testing

```typescript
// Test single upload
const testSingleUpload = async () => {
  const result = await uploadImageToShopify({
    productId: 'gid://shopify/Product/123',
    imageUrl: 'https://example.com/test.jpg',
    altText: 'Test image'
  });

  console.assert(result.success, 'Upload should succeed');
  console.assert(result.mediaId, 'Media ID should be returned');
};

// Test validation
const testValidation = async () => {
  const validation = await validateImageUrl('invalid-url');
  console.assert(!validation.valid, 'Invalid URL should fail validation');
};

// Test batch upload
const testBatchUpload = async () => {
  const uploads = Array.from({ length: 3 }, (_, i) => ({
    productId: 'gid://shopify/Product/123',
    imageUrl: `https://example.com/image-${i}.jpg`,
    altText: `Image ${i}`
  }));

  const result = await batchUploadToShopify(uploads);
  console.assert(result.success, 'Batch upload should succeed');
  console.assert(result.results.length === 3, 'Should have 3 results');
};
```
