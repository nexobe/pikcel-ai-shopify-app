# Shopify Image Upload System

Complete, production-ready system for uploading processed images to Shopify products.

## Quick Links

- **Quick Start**: [QUICK_START_UPLOAD.md](./QUICK_START_UPLOAD.md) - Get started in 5 minutes
- **Complete Guide**: [SHOPIFY_UPLOAD_GUIDE.md](./SHOPIFY_UPLOAD_GUIDE.md) - Full documentation
- **Examples**: [UPLOAD_INTEGRATION_EXAMPLES.md](./UPLOAD_INTEGRATION_EXAMPLES.md) - Integration patterns
- **Summary**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Technical overview

## What's Included

### Code Files (6 files, ~50KB)

1. **Server Action**: `app/routes/api.upload-to-shopify.tsx`
   - Handles 3-step upload process
   - Automatic retry logic
   - Image validation
   - Error handling

2. **Type Definitions**: `app/types/shopify-upload.ts`
   - TypeScript interfaces
   - Type safety

3. **Client Utilities**: `app/utils/shopify-upload.client.ts`
   - Upload functions
   - Validation helpers
   - Progress tracking

4. **React Hooks**: `app/hooks/useShopifyUpload.ts`
   - State management
   - Easy integration

5. **Example Components**: `app/components/ShopifyUploadExample.tsx`
   - Usage examples
   - Learning resource

6. **Production Widget**: `app/components/ShopifyUploadWidget.tsx`
   - Complete UI
   - Ready to use

### Documentation (4 files, ~44KB)

1. **Quick Start Guide** - 5-minute setup
2. **Complete Guide** - Full API reference
3. **Integration Examples** - Real-world patterns
4. **Implementation Summary** - Technical details

## Quick Start

### 1. Simple Upload (No UI)

```typescript
import { uploadImageToShopify } from '../utils/shopify-upload.client';

const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/123456',
  imageUrl: 'https://example.com/edited-image.jpg',
  altText: 'Edited product image',
  setPrimary: true
});

console.log(result.success ? `Success! ${result.mediaId}` : `Error: ${result.error}`);
```

### 2. With React Hook

```typescript
import { useShopifyUpload } from '../hooks/useShopifyUpload';

function MyComponent() {
  const { upload, uploading, progress, result } = useShopifyUpload();

  const handleUpload = () => upload({
    productId: 'gid://shopify/Product/123456',
    imageUrl: 'https://example.com/image.jpg'
  });

  return (
    <button onClick={handleUpload} disabled={uploading}>
      {uploading ? `${progress?.progress}%` : 'Upload'}
    </button>
  );
}
```

### 3. Complete Widget

```typescript
import { ShopifyUploadWidget } from '../components/ShopifyUploadWidget';

<ShopifyUploadWidget
  productId="gid://shopify/Product/123456"
  mode="single"
  onSuccess={(mediaId) => console.log('Success!', mediaId)}
/>
```

## Features

- ✅ 3-Step Upload Process (staged → blob → attach)
- ✅ Automatic Retry (3 attempts with exponential backoff)
- ✅ Image Validation (format, size, URL)
- ✅ Progress Tracking (real-time callbacks)
- ✅ Single & Batch Uploads
- ✅ Replace Existing Images
- ✅ Set Primary Image
- ✅ Error Handling & Recovery
- ✅ Transaction Safety
- ✅ TypeScript Support
- ✅ React Hooks
- ✅ Production UI
- ✅ Complete Documentation

## Common Use Cases

### Replace Product Image

```typescript
import { replaceProductImage } from '../utils/shopify-upload.client';

await replaceProductImage(
  'gid://shopify/Product/123456',      // Product ID
  'gid://shopify/ProductImage/789',    // Old image ID
  'https://example.com/new.jpg',       // New image URL
  'Updated image'                      // Alt text
);
```

### Batch Upload

```typescript
import { batchUploadToShopify } from '../utils/shopify-upload.client';

const uploads = [
  { productId: '...', imageUrl: 'image1.jpg', altText: 'Front' },
  { productId: '...', imageUrl: 'image2.jpg', altText: 'Back' }
];

const result = await batchUploadToShopify(uploads);
```

### AI Processing Workflow

```typescript
// 1. Process with AI
const processedUrl = await processImageWithAI(originalUrl);

// 2. Upload to Shopify
const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/123456',
  imageUrl: processedUrl,
  setPrimary: true
});

// 3. Done!
console.log('Complete!', result.mediaId);
```

## API Reference

### `uploadImageToShopify(request, options?)`

Upload a single image to Shopify.

**Parameters**:
- `request.productId` - Shopify product GID (required)
- `request.imageUrl` - URL of image to upload (required)
- `request.altText` - Alt text for accessibility (optional)
- `request.replaceImageId` - ID of image to replace (optional)
- `request.setPrimary` - Set as primary image (optional)
- `options.onProgress` - Progress callback (optional)
- `options.onSuccess` - Success callback (optional)
- `options.onError` - Error callback (optional)

**Returns**: `Promise<UploadResult>`

### `batchUploadToShopify(uploads, options?)`

Upload multiple images to Shopify.

**Parameters**:
- `uploads` - Array of upload requests
- `options.onProgress` - Progress callback per image
- `options.onSuccess` - Success callback
- `options.onError` - Error callback per image

**Returns**: `Promise<BatchUploadResult>`

### `useShopifyUpload()`

React hook for single image upload.

**Returns**:
- `upload(request)` - Upload function
- `uploading` - Upload in progress
- `progress` - Current progress
- `result` - Upload result
- `error` - Error object
- `reset()` - Reset state

### `useBatchShopifyUpload()`

React hook for batch upload.

**Returns**:
- `upload(uploads)` - Upload function
- `uploading` - Upload in progress
- `progressMap` - Progress per image
- `result` - Upload result
- `error` - Error object
- `reset()` - Reset state

## Image Requirements

| Property | Value |
|----------|-------|
| **Formats** | JPG, PNG, WebP |
| **Max Size** | 20MB |
| **Recommended Size** | 2048x2048px |
| **Aspect Ratio** | 1:1 (for products) |
| **Color Space** | sRGB |

## Error Handling

All upload operations return a result object:

```typescript
interface UploadResult {
  success: boolean;
  mediaId?: string;    // On success
  imageUrl?: string;   // On success
  error?: string;      // On failure
  details?: any;       // Additional error info
}
```

**Common Errors**:
- "Invalid image format" - Wrong file type
- "Image too large" - Over 20MB
- "Failed to fetch image" - URL not accessible
- "Failed to attach image" - Shopify API error

## Progress Tracking

Track upload progress in real-time:

```typescript
await uploadImageToShopify(request, {
  onProgress: (progress) => {
    console.log(`Step: ${progress.step}`);
    console.log(`Progress: ${progress.progress}%`);
    console.log(`Message: ${progress.message}`);
  }
});
```

**Progress Steps**:
1. `validating` - Validating image (10%)
2. `staging` - Creating staged upload (30%)
3. `uploading` - Uploading image (50%)
4. `attaching` - Attaching to product (70%)
5. `complete` - Upload complete (100%)

## Rate Limits

**Shopify API Limits**:
- Standard: 50 points/second
- Plus: 100 points/second

**Per Upload Cost**: ~30 points

**Recommendation**: Max 1-2 uploads/second

## Testing

```typescript
// Test single upload
const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/test',
  imageUrl: 'https://example.com/test.jpg'
});

// Test validation
const validation = await validateImageUrl('https://example.com/test.jpg');

// Test batch upload
const uploads = [
  { productId: 'gid://...', imageUrl: 'image1.jpg' },
  { productId: 'gid://...', imageUrl: 'image2.jpg' }
];
const result = await batchUploadToShopify(uploads);
```

## Troubleshooting

**Upload fails immediately**:
- Check image URL is accessible
- Verify format (JPG, PNG, WebP)
- Ensure size under 20MB
- Confirm Shopify session is valid

**Upload times out**:
- Check network connection
- Try smaller image
- Verify Shopify API is accessible

**Image doesn't appear**:
- Check returned mediaId in Shopify admin
- Verify product ID is correct
- Wait a few seconds for CDN propagation

## Documentation

- **[QUICK_START_UPLOAD.md](./QUICK_START_UPLOAD.md)** - 5-minute quick start
- **[SHOPIFY_UPLOAD_GUIDE.md](./SHOPIFY_UPLOAD_GUIDE.md)** - Complete guide
- **[UPLOAD_INTEGRATION_EXAMPLES.md](./UPLOAD_INTEGRATION_EXAMPLES.md)** - Integration examples
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical summary

## Next Steps

1. **Get Started**: Read [QUICK_START_UPLOAD.md](./QUICK_START_UPLOAD.md)
2. **Learn More**: Check [SHOPIFY_UPLOAD_GUIDE.md](./SHOPIFY_UPLOAD_GUIDE.md)
3. **See Examples**: Review [UPLOAD_INTEGRATION_EXAMPLES.md](./UPLOAD_INTEGRATION_EXAMPLES.md)
4. **Test**: Use example components in `app/components/ShopifyUploadExample.tsx`
5. **Integrate**: Add to your AI processing workflow

## Support

For questions or issues:
1. Check the documentation files
2. Review example components
3. Consult Shopify Admin GraphQL API docs

---

**Status**: ✅ Complete & Ready for Use

**Version**: 1.0.0

**Last Updated**: October 2025
