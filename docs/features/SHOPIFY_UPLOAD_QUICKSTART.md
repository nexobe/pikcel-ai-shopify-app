# Quick Start: Shopify Image Upload

Get started with uploading images to Shopify in 5 minutes.

## Installation

All files are already created. No installation needed.

## Files Created

```
app/
├── routes/
│   └── api.upload-to-shopify.tsx       # Server action
├── types/
│   └── shopify-upload.ts                # Type definitions
├── utils/
│   └── shopify-upload.client.ts         # Client utilities
├── hooks/
│   └── useShopifyUpload.ts              # React hooks
└── components/
    ├── ShopifyUploadExample.tsx         # Example components
    └── ShopifyUploadWidget.tsx          # Production widget

SHOPIFY_UPLOAD_GUIDE.md                  # Complete documentation
UPLOAD_INTEGRATION_EXAMPLES.md           # Integration examples
QUICK_START_UPLOAD.md                    # This file
```

## Quick Start: 3 Steps

### 1. Simple Upload (No React Component)

```typescript
import { uploadImageToShopify } from '../utils/shopify-upload.client';

// Upload an image
const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/123456',
  imageUrl: 'https://example.com/edited-image.jpg',
  altText: 'Edited product image',
  setPrimary: true
});

if (result.success) {
  console.log('Uploaded! Media ID:', result.mediaId);
} else {
  console.error('Failed:', result.error);
}
```

### 2. With React Hook (Recommended)

```typescript
import { useShopifyUpload } from '../hooks/useShopifyUpload';

function MyComponent() {
  const { upload, uploading, progress, result } = useShopifyUpload();

  const handleClick = async () => {
    await upload({
      productId: 'gid://shopify/Product/123456',
      imageUrl: 'https://example.com/image.jpg',
      altText: 'Product image'
    });
  };

  return (
    <button onClick={handleClick} disabled={uploading}>
      {uploading ? `Uploading ${progress?.progress}%` : 'Upload'}
    </button>
  );
}
```

### 3. Complete UI Widget

```typescript
import { ShopifyUploadWidget } from '../components/ShopifyUploadWidget';

function MyPage() {
  return (
    <ShopifyUploadWidget
      productId="gid://shopify/Product/123456"
      mode="single"
      onSuccess={(mediaId) => console.log('Success!', mediaId)}
      onError={(error) => console.error('Failed!', error)}
    />
  );
}
```

## Common Use Cases

### Replace an Existing Image

```typescript
import { replaceProductImage } from '../utils/shopify-upload.client';

const result = await replaceProductImage(
  'gid://shopify/Product/123456',           // Product ID
  'gid://shopify/ProductImage/789',         // Old image ID
  'https://example.com/new-image.jpg',      // New image URL
  'Updated product image'                   // Alt text
);
```

### Upload Multiple Images

```typescript
import { batchUploadToShopify } from '../utils/shopify-upload.client';

const uploads = [
  {
    productId: 'gid://shopify/Product/123456',
    imageUrl: 'https://example.com/image1.jpg',
    altText: 'Front view'
  },
  {
    productId: 'gid://shopify/Product/123456',
    imageUrl: 'https://example.com/image2.jpg',
    altText: 'Back view'
  }
];

const result = await batchUploadToShopify(uploads);
console.log(`${result.results.filter(r => r.success).length} uploaded successfully`);
```

### Add Image as Primary

```typescript
import { addPrimaryProductImage } from '../utils/shopify-upload.client';

const result = await addPrimaryProductImage(
  'gid://shopify/Product/123456',
  'https://example.com/hero-image.jpg',
  'Main product image'
);
```

## API Endpoint

The upload system uses this endpoint:

```
POST /api/upload-to-shopify
```

### Single Upload Request

```json
{
  "productId": "gid://shopify/Product/123456",
  "imageUrl": "https://example.com/image.jpg",
  "altText": "Product image",
  "setPrimary": true
}
```

### Batch Upload Request

```json
{
  "uploads": [
    {
      "productId": "gid://shopify/Product/123456",
      "imageUrl": "https://example.com/image1.jpg",
      "altText": "Image 1"
    },
    {
      "productId": "gid://shopify/Product/123456",
      "imageUrl": "https://example.com/image2.jpg",
      "altText": "Image 2"
    }
  ]
}
```

### Response Format

```json
{
  "success": true,
  "mediaId": "gid://shopify/MediaImage/456789",
  "imageUrl": "https://cdn.shopify.com/s/files/..."
}
```

## Error Handling

```typescript
const result = await uploadImageToShopify(request);

if (!result.success) {
  switch (result.error) {
    case 'Invalid image format':
      // Handle format error
      break;
    case 'Image too large':
      // Handle size error
      break;
    default:
      // Handle other errors
  }
}
```

## Progress Tracking

```typescript
await uploadImageToShopify(request, {
  onProgress: (progress) => {
    console.log(progress.step);      // 'validating' | 'staging' | 'uploading' | 'attaching' | 'complete'
    console.log(progress.progress);  // 0-100
    console.log(progress.message);   // Human-readable message
  }
});
```

## Image Requirements

- **Formats**: JPG, PNG, WebP
- **Max Size**: 20MB
- **Recommended**: 2048x2048px, sRGB, 1:1 aspect ratio

## Complete AI → Shopify Workflow

```typescript
// 1. Process image with AI
const processedUrl = await processWithAI(originalUrl, params);

// 2. Upload to Shopify
const result = await uploadImageToShopify({
  productId: 'gid://shopify/Product/123456',
  imageUrl: processedUrl,
  altText: 'AI-enhanced product image',
  setPrimary: true
});

// 3. Done!
console.log('Complete workflow successful!', result.mediaId);
```

## Troubleshooting

### "Failed to fetch image"
- Check image URL is accessible
- Verify CORS headers if needed

### "Invalid image format"
- Ensure image is JPG, PNG, or WebP
- Check MIME type is correct

### "Upload failed"
- Verify Shopify admin session is active
- Check product ID is correct (must start with `gid://shopify/Product/`)
- Ensure network connection is stable

## Rate Limits

Shopify limits: ~30 points per upload

To avoid rate limits:
```typescript
// Add delay between uploads
for (const upload of uploads) {
  await uploadImageToShopify(upload);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
}
```

## Next Steps

1. Read the [Complete Guide](./SHOPIFY_UPLOAD_GUIDE.md)
2. Check [Integration Examples](./UPLOAD_INTEGRATION_EXAMPLES.md)
3. Review [Example Components](./app/components/ShopifyUploadExample.tsx)
4. Use the [Production Widget](./app/components/ShopifyUploadWidget.tsx)

## Support

For detailed documentation:
- **Main Guide**: `SHOPIFY_UPLOAD_GUIDE.md`
- **Examples**: `UPLOAD_INTEGRATION_EXAMPLES.md`
- **Type Definitions**: `app/types/shopify-upload.ts`
- **Client Utils**: `app/utils/shopify-upload.client.ts`

---

**Ready to upload!** Start with the simple example above and build from there.
