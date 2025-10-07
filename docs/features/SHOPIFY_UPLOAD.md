# Shopify Image Upload Guide

Complete guide for uploading processed images back to Shopify products.

## Overview

The Shopify upload system provides a robust, enterprise-grade solution for uploading images to Shopify products with the following features:

- **3-Step Upload Process**: Staged upload → Blob upload → Media attachment
- **Automatic Retry Logic**: Exponential backoff for failed operations
- **Image Validation**: Format and size validation before upload
- **Progress Tracking**: Real-time upload progress callbacks
- **Batch Uploads**: Upload multiple images in one operation
- **Image Replacement**: Replace existing product images
- **Primary Image Setting**: Automatically set uploaded image as primary
- **Error Handling**: Comprehensive error messages and rollback support

## Architecture

### Server Action
**Location**: `/app/routes/api.upload-to-shopify.tsx`

This is a Remix action that handles all upload operations. It uses Shopify Admin GraphQL API with proper authentication.

### Client Utilities
**Location**: `/app/utils/shopify-upload.client.ts`

Helper functions for calling the upload API from React components.

### Type Definitions
**Location**: `/app/types/shopify-upload.ts`

TypeScript types for type-safe upload operations.

## Usage Examples

### 1. Single Image Upload

```typescript
import { uploadImageToShopify } from '../utils/shopify-upload.client';

const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/123456',
  imageUrl: 'https://example.com/edited-image.jpg',
  altText: 'Edited product image',
  setPrimary: true
}, {
  onProgress: (progress) => {
    console.log(`${progress.progress}% - ${progress.message}`);
  },
  onSuccess: (result) => {
    console.log('Upload successful:', result.mediaId);
  },
  onError: (error) => {
    console.error('Upload failed:', error);
  }
});
```

### 2. Replace Existing Image

```typescript
import { replaceProductImage } from '../utils/shopify-upload.client';

const result = await replaceProductImage(
  'gid://shopify/Product/123456',
  'gid://shopify/ProductImage/789', // Old image ID to replace
  'https://example.com/new-image.jpg',
  'Updated product image'
);
```

### 3. Batch Upload Multiple Images

```typescript
import { batchUploadToShopify } from '../utils/shopify-upload.client';

const uploads = [
  {
    productId: 'gid://shopify/Product/123456',
    imageUrl: 'https://example.com/image1.jpg',
    altText: 'Front view',
    position: 0
  },
  {
    productId: 'gid://shopify/Product/123456',
    imageUrl: 'https://example.com/image2.jpg',
    altText: 'Back view',
    position: 1
  }
];

const result = await batchUploadToShopify(uploads, {
  onProgress: (index, progress) => {
    console.log(`Image ${index + 1}: ${progress.progress}%`);
  }
});
```

### 4. Add Image as Primary

```typescript
import { addPrimaryProductImage } from '../utils/shopify-upload.client';

const result = await addPrimaryProductImage(
  'gid://shopify/Product/123456',
  'https://example.com/hero-image.jpg',
  'Main product image'
);
```

## API Reference

### UploadRequest Interface

```typescript
interface UploadRequest {
  productId: string;        // Shopify product GID
  imageUrl: string;         // URL of image to upload
  altText?: string;         // Alt text for accessibility
  replaceImageId?: string;  // ID of image to replace (optional)
  setPrimary?: boolean;     // Set as primary product image
  position?: number;        // Position in product gallery
}
```

### UploadProgress Interface

```typescript
interface UploadProgress {
  step: 'validating' | 'staging' | 'uploading' | 'attaching' | 'complete';
  progress: number;  // 0-100
  message: string;   // Human-readable status
}
```

### UploadResult Interface

```typescript
interface UploadResult {
  success: boolean;
  mediaId?: string;    // Shopify media ID (on success)
  imageUrl?: string;   // Final Shopify CDN URL (on success)
  error?: string;      // Error message (on failure)
  details?: any;       // Additional error details
}
```

## Upload Process Flow

### Step 1: Validation
- Validates image URL is accessible
- Checks MIME type (JPG, PNG, WebP only)
- Validates file size (max 20MB)
- Optionally compresses if over 5MB

### Step 2: Staged Upload
Creates a staged upload target in Shopify using GraphQL:

```graphql
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters {
        name
        value
      }
    }
  }
}
```

### Step 3: Blob Upload
Uploads the image blob to the staged URL using multipart/form-data.

### Step 4: Attach to Product
Attaches the uploaded image to the product:

```graphql
mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media {
      ... on MediaImage {
        id
        image {
          url
        }
      }
    }
  }
}
```

### Step 5: Set as Primary (Optional)
If `setPrimary: true`, reorders media to set as first image:

```graphql
mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    job {
      id
    }
  }
}
```

## Error Handling

### Automatic Retry
All network operations automatically retry up to 3 times with exponential backoff:
- 1st retry: 1 second delay
- 2nd retry: 2 seconds delay
- 3rd retry: 4 seconds delay

### Validation Errors

```typescript
{
  success: false,
  error: "Invalid image format. Allowed formats: JPG, PNG, WebP"
}
```

### Upload Errors

```typescript
{
  success: false,
  error: "Failed to upload to staged URL: 500 Internal Server Error",
  details: { /* additional error info */ }
}
```

### Shopify API Errors

```typescript
{
  success: false,
  error: "Failed to attach image",
  details: {
    userErrors: [
      { field: "media", message: "Invalid image format" }
    ]
  }
}
```

## Image Specifications

### Supported Formats
- JPEG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)

### Size Limits
- Maximum file size: 20MB
- Compression threshold: 5MB (images over this may be compressed)

### Recommended Specs
- Resolution: 2048x2048px or higher for best quality
- Aspect ratio: 1:1 for product images
- Color space: sRGB
- Format: JPEG for photos, PNG for graphics with transparency

## Progress Tracking

Track upload progress in real-time:

```typescript
await uploadImageToShopify(request, {
  onProgress: (progress) => {
    switch(progress.step) {
      case 'validating':
        console.log('Validating image...', progress.progress);
        break;
      case 'staging':
        console.log('Creating staged upload...', progress.progress);
        break;
      case 'uploading':
        console.log('Uploading image...', progress.progress);
        break;
      case 'attaching':
        console.log('Attaching to product...', progress.progress);
        break;
      case 'complete':
        console.log('Upload complete!', progress.progress);
        break;
    }
  }
});
```

## Transaction Safety

### Single Upload Rollback
If an upload fails during the attach phase, the system will:
1. Log the error
2. Return detailed error information
3. Leave the product unchanged (no partial updates)

### Batch Upload Rollback
For batch uploads:
- Each upload is independent
- One failure doesn't stop other uploads
- Results array shows success/failure for each image
- HTTP 207 Multi-Status returned for partial success

To implement full rollback:
```typescript
const result = await batchUploadToShopify(uploads);

if (!result.success) {
  // Some uploads failed - manually rollback successful ones
  const successfulMediaIds = result.results
    .filter(r => r.success && r.mediaId)
    .map(r => r.mediaId);

  // Delete successful uploads to rollback
  // (implement using productDeleteImages mutation)
}
```

## Performance Tips

1. **Pre-validate images** before batch upload to fail fast
2. **Use compression** for images over 5MB
3. **Batch uploads** instead of multiple single uploads for better performance
4. **Set primary image** in the same request to avoid extra API calls
5. **Cache results** to avoid re-uploading the same image

## Security Considerations

1. **Authentication**: All uploads require valid Shopify admin session
2. **URL Validation**: Image URLs are validated before upload
3. **File Type Validation**: Only allowed MIME types accepted
4. **Size Limits**: Enforced to prevent abuse
5. **Error Sanitization**: Sensitive error details not exposed to client

## Testing

### Manual Testing
1. Use the example components in `/app/components/ShopifyUploadExample.tsx`
2. Test with various image formats (JPG, PNG, WebP)
3. Test with different file sizes (small, medium, large)
4. Test error scenarios (invalid URLs, wrong formats, etc.)

### Automated Testing
```typescript
import { validateImageUrl } from '../utils/shopify-upload.client';

// Test image validation
const validation = await validateImageUrl('https://example.com/test.jpg');
expect(validation.valid).toBe(true);

// Test upload
const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/test',
  imageUrl: 'https://example.com/test.jpg'
});
expect(result.success).toBe(true);
expect(result.mediaId).toBeDefined();
```

## Troubleshooting

### Upload Fails Immediately
- Check image URL is accessible
- Verify image format is supported
- Ensure file size is under 20MB
- Check Shopify admin session is valid

### Upload Times Out
- Check network connection
- Verify Shopify API is accessible
- Try smaller image or enable compression

### Image Not Appearing in Shopify
- Check the returned `mediaId` in Shopify admin
- Verify product ID is correct (must be full GID)
- Check Shopify API rate limits

### Progress Not Updating
- Ensure `onProgress` callback is provided
- Check browser console for errors
- Verify React state updates are working

## API Rate Limits

Shopify has rate limits for GraphQL API:
- Standard: 50 points per second
- Plus: 100 points per second

Each upload operation uses approximately:
- Staged upload: 10 points
- Create media: 10 points
- Reorder media: 10 points
- **Total per upload**: ~30 points

For batch uploads, implement rate limiting:
```typescript
// Upload max 1 image per second to avoid rate limits
const uploads = [...];
for (const upload of uploads) {
  await uploadImageToShopify(upload);
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

## Integration with AI Processing

Complete workflow example:

```typescript
async function processAndUploadToShopify(
  productId: string,
  originalImageUrl: string,
  aiProcessingParams: any
) {
  // 1. Process image with AI
  const processedImageUrl = await processImageWithAI(
    originalImageUrl,
    aiProcessingParams
  );

  // 2. Upload to Shopify
  const result = await uploadImageToShopify({
    productId,
    imageUrl: processedImageUrl,
    altText: 'AI-enhanced product image',
    setPrimary: true
  }, {
    onProgress: (progress) => {
      console.log(`Upload: ${progress.progress}%`);
    }
  });

  // 3. Handle result
  if (result.success) {
    console.log('Successfully uploaded to Shopify:', result.mediaId);
    return result.mediaId;
  } else {
    throw new Error(`Upload failed: ${result.error}`);
  }
}
```

## Future Enhancements

Potential improvements:

1. **Image Compression**: Implement automatic client-side compression for large images
2. **Resume Failed Uploads**: Save upload state to resume after failures
3. **Parallel Uploads**: Upload multiple images in parallel with concurrency control
4. **Smart Retry**: Adjust retry strategy based on error type
5. **Upload Queue**: Queue system for handling many uploads
6. **Webhook Integration**: Notify when uploads complete
7. **CDN Optimization**: Optimize image URLs for faster delivery

## Support

For issues or questions:
1. Check this documentation
2. Review example components
3. Check Shopify Admin GraphQL API docs
4. Contact development team
