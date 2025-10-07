# PikcelAI x Shopify Integration Plan

## Executive Summary

This document outlines the complete integration architecture between the **Shopify App** (embedded in Shopify Admin) and the **PikcelAI Platform** (standalone web app) for seamless product image editing workflows.

**Key Goal**: Enable Shopify merchants to edit product images using PikcelAI's AI-powered tools directly from their Shopify admin, then push edited images back to their products.

---

## Architecture Overview

### Two-App Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   Shopify Embedded App      │         │    PikcelAI Platform         │
│   (pikcel-ai-shopify-app)   │◄───────►│    (PikcelAI)                │
│                             │   API   │                              │
│   - React Router            │         │   - React + Vite             │
│   - Shopify Admin API       │         │   - Supabase Backend         │
│   - Prisma + PostgreSQL     │         │   - AI Processing Engine     │
│   - Embedded in Admin       │         │   - Image Storage            │
└─────────────────────────────┘         └──────────────────────────────┘
         │                                          │
         │                                          │
         ▼                                          ▼
┌─────────────────────────────┐         ┌──────────────────────────────┐
│   Shopify Store Products    │         │   Supabase Edge Functions    │
│   - Product Catalog         │         │   - process-job              │
│   - Product Images          │         │   - shopify-integration      │
│   - GraphQL Admin API       │         │   - external-storage         │
└─────────────────────────────┘         └──────────────────────────────┘
```

---

## Integration Flows

### 1. Product Fetching Flow

**Goal**: Fetch products from Shopify store and display them in the app

#### Option A: Direct Shopify App (Recommended for Embedded)
```typescript
// In Shopify App: app/routes/app.products.tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            vendor
            status
            media(first: 10) {
              edges {
                node {
                  ... on MediaImage {
                    id
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: { first: 50 }
  });

  const { data } = await response.json();
  return json({ products: data.products.edges });
}
```

**Flow**:
1. User visits Shopify Admin → Apps → PikcelAI Image Editor
2. App loads embedded in iframe
3. Loader fetches products using Shopify Admin API (GraphQL)
4. Products displayed in grid with images
5. No external API call needed (all within Shopify ecosystem)

#### Option B: PikcelAI Platform Integration (For Standalone Access)
```typescript
// In PikcelAI Platform: existing implementation
// Uses Supabase Edge Function + Database Cache

// 1. Initialize OAuth (if not connected)
shopifyService.initializeOAuth(shopDomain)
  → Generates OAuth URL
  → Redirects to Shopify
  → User authorizes
  → Callback to /shopify/callback
  → Access token stored in shopify_stores table

// 2. Fetch Products
shopifyService.fetchProducts(shopDomain, 50)
  → Calls Supabase Edge Function
  → Function uses stored access token
  → Queries Shopify GraphQL API
  → Caches products in shopify_products table
  → Returns products to frontend

// 3. Load Cached Products (Faster)
shopifyService.getCachedProducts(shopDomain, 50)
  → Queries shopify_products table directly
  → No Shopify API call
  → Returns cached data
```

**Recommendation**:
- Use **Option A** for the embedded Shopify app (simpler, no OAuth needed)
- Use **Option B** for PikcelAI platform when users want to access via standalone app

---

### 2. Image Extraction Flow

**From Shopify Product to Editable Format**

#### Shopify App Implementation
```typescript
// app/routes/app.products.tsx

interface ProductImage {
  id: string;           // gid://shopify/MediaImage/123456
  url: string;          // https://cdn.shopify.com/...
  altText: string;
  width?: number;
  height?: number;
}

// Extract images from product
function extractProductImages(product: ShopifyProduct): ProductImage[] {
  return product.media.edges
    .filter(edge => edge.node.__typename === 'MediaImage')
    .map(edge => ({
      id: edge.node.id,
      url: edge.node.image.url,
      altText: edge.node.image.altText || product.title,
      width: edge.node.image.width,
      height: edge.node.image.height
    }));
}

// Usage in component
export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <s-grid columns={3}>
      {products.map(({ node: product }) => {
        const images = extractProductImages(product);

        return (
          <ProductCard
            key={product.id}
            product={product}
            images={images}
            onEditImages={() => handleEditImages(product, images)}
          />
        );
      })}
    </s-grid>
  );
}
```

#### Image Format Conversion
```typescript
// Convert Shopify image to PikcelAI format
interface PikcelAIImage {
  source: 'shopify';
  shopDomain: string;
  productId: string;
  productTitle: string;
  shopifyImageId: string;
  url: string;
  altText: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
  };
}

function convertToPikcelAIFormat(
  product: ShopifyProduct,
  image: ProductImage,
  shop: string
): PikcelAIImage {
  return {
    source: 'shopify',
    shopDomain: shop,
    productId: product.id,
    productTitle: product.title,
    shopifyImageId: image.id,
    url: image.url,
    altText: image.altText,
    metadata: {
      width: image.width,
      height: image.height,
      format: image.url.split('.').pop()
    }
  };
}
```

---

### 3. Triggering PikcelAI Processing

**Three Integration Approaches:**

#### Option 1: Embedded Processing (Recommended)
```typescript
// Shopify App → PikcelAI API Integration

// app/routes/app.process-image.tsx
export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const imageUrl = formData.get('imageUrl') as string;
  const productId = formData.get('productId') as string;
  const toolId = formData.get('toolId') as string; // AI model to use

  // Call PikcelAI API
  const pikcelResponse = await fetch(`${process.env.PIKCEL_API_URL}/api/jobs/dispatch`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PIKCEL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'ai_processing',
      operationId: toolId,
      imageIds: [], // PikcelAI will download from URL
      inputUrl: imageUrl,
      parameters: {
        shopify_product_id: productId,
        shopify_shop: session.shop,
        callback_url: `${process.env.SHOPIFY_APP_URL}/api/shopify/callback`
      }
    })
  });

  const { jobId } = await pikcelResponse.json();

  return json({
    jobId,
    status: 'processing',
    message: 'Image sent to PikcelAI for processing'
  });
}
```

#### Option 2: Redirect to PikcelAI Platform
```typescript
// Shopify App redirects to PikcelAI with context

function handleEditInPikcelAI(product: ShopifyProduct, images: ProductImage[]) {
  const imageData = {
    source: 'shopify',
    shopDomain: session.shop,
    productId: product.id,
    productTitle: product.title,
    images: images.map(img => convertToPikcelAIFormat(product, img, session.shop))
  };

  // Store context in sessionStorage for PikcelAI to access
  const encodedData = btoa(JSON.stringify(imageData));

  // Redirect to PikcelAI AI Studio with Shopify context
  const pikcelUrl = `https://app.pikcel.ai/ai-studio?source=shopify&data=${encodedData}`;
  window.open(pikcelUrl, '_blank');
}

// In PikcelAI AI Studio: client/src/pages/AiStudioPage.tsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const source = params.get('source');
  const data = params.get('data');

  if (source === 'shopify' && data) {
    const shopifyContext = JSON.parse(atob(data));
    setShopifyContext(shopifyContext);
    // Pre-load images from Shopify URLs
    loadShopifyImages(shopifyContext.images);
  }
}, []);
```

#### Option 3: App Extension (Advanced)
```typescript
// Create Shopify App Extension for inline editing
// extensions/product-editor/src/ProductEditor.tsx

import { reactExtension, useApi } from '@shopify/ui-extensions-react/admin';

function ProductImageEditor() {
  const { data } = useApi();
  const product = data.product;

  const handleEditImage = async (imageUrl: string) => {
    // Call PikcelAI API or redirect to platform
    const response = await fetch(`${PIKCEL_API_URL}/process`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl, productId: product.id })
    });

    const { jobId } = await response.json();
    // Poll for results or use webhook
  };

  return (
    <ProductImageGrid
      images={product.media}
      onEdit={handleEditImage}
    />
  );
}

export default reactExtension(
  'admin.product-details.block.render',
  () => <ProductImageEditor />
);
```

**Recommendation**: Start with **Option 1** (embedded processing) for seamless UX, add **Option 2** (redirect) for advanced editing features.

---

### 4. Image Push-back Flow

**Pushing Edited Images Back to Shopify**

#### Implementation in Shopify App
```typescript
// app/routes/app.upload-image.tsx

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const { productId, imageUrl, altText, position } = await request.json();

  // Step 1: Create staged upload target
  const stagedUploadResponse = await admin.graphql(`
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters { name value }
        }
        userErrors { field message }
      }
    }
  `, {
    variables: {
      input: [{
        resource: 'PRODUCT_IMAGE',
        filename: `edited-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        httpMethod: 'POST'
      }]
    }
  });

  const stagedTarget = stagedUploadResponse.data.stagedUploadsCreate.stagedTargets[0];

  // Step 2: Upload image to staged URL
  const imageBlob = await fetch(imageUrl).then(r => r.blob());
  const formData = new FormData();

  stagedTarget.parameters.forEach(param => {
    formData.append(param.name, param.value);
  });
  formData.append('file', imageBlob);

  await fetch(stagedTarget.url, {
    method: 'POST',
    body: formData
  });

  // Step 3: Attach image to product
  const attachResponse = await admin.graphql(`
    mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          id
          ... on MediaImage {
            id
            image { url altText }
          }
        }
        mediaUserErrors { field message }
      }
    }
  `, {
    variables: {
      productId,
      media: [{
        originalSource: stagedTarget.resourceUrl,
        alt: altText || 'Edited with PikcelAI',
        mediaContentType: 'IMAGE'
      }]
    }
  });

  return json({
    success: true,
    mediaId: attachResponse.data.productCreateMedia.media[0].id
  });
}
```

#### Callback Webhook from PikcelAI
```typescript
// app/routes/api.pikcel.callback.tsx

export async function action({ request }: ActionFunctionArgs) {
  const { jobId, status, outputUrl, metadata } = await request.json();

  if (status === 'completed') {
    const { shopify_product_id, shopify_shop } = metadata;

    // Get session for this shop
    const session = await prisma.session.findFirst({
      where: { shop: shopify_shop }
    });

    if (!session) {
      return json({ error: 'Shop session not found' }, { status: 404 });
    }

    // Initialize admin client with stored session
    const admin = new shopify.clients.Graphql({
      session: {
        shop: session.shop,
        accessToken: session.accessToken
      }
    });

    // Upload edited image to product
    // ... (same upload logic as above)

    return json({ success: true });
  }

  return json({ status: 'acknowledged' });
}
```

---

### 5. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SHOPIFY ADMIN                               │
│                                                                 │
│  1. User opens PikcelAI app                                    │
│     ↓                                                           │
│  2. App loads products via Shopify Admin API (GraphQL)         │
│     ↓                                                           │
│  3. Display products with images                               │
│                                                                 │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ 4. User clicks "Edit Image"
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  PIKCEL AI PROCESSING                           │
│                                                                 │
│  5. Extract image URL from product                             │
│     ↓                                                           │
│  6. POST /api/jobs/dispatch                                    │
│     {                                                           │
│       inputUrl: "https://cdn.shopify.com/...",                │
│       operationId: "background-removal",                       │
│       parameters: {                                            │
│         shopify_product_id: "gid://shopify/Product/123",      │
│         shopify_shop: "mystore.myshopify.com",                │
│         callback_url: "https://myapp.com/api/callback"        │
│       }                                                         │
│     }                                                           │
│     ↓                                                           │
│  7. PikcelAI processes image with AI model                     │
│     ↓                                                           │
│  8. Stores output in Supabase Storage                          │
│     ↓                                                           │
│  9. Calls callback webhook with result                         │
│                                                                 │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     │ 10. Webhook: POST /api/pikcel/callback
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                  UPLOAD TO SHOPIFY                              │
│                                                                 │
│  11. Receive callback with outputUrl                           │
│      ↓                                                          │
│  12. Create staged upload in Shopify                           │
│      ↓                                                          │
│  13. Upload image blob to staged URL                           │
│      ↓                                                          │
│  14. Attach media to product via GraphQL                       │
│      ↓                                                          │
│  15. Show success notification in Shopify Admin                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Authorization

### 1. Shopify App Authentication

**Session Management** (Already Implemented):
```typescript
// app/shopify.server.ts
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: ApiVersion.October25,
  scopes: ['read_products', 'write_products', 'read_files', 'write_files'],
  sessionStorage: new PrismaSessionStorage(prisma)
});

// Usage in routes
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  // session.shop = "mystore.myshopify.com"
  // session.accessToken = "shpat_xxxxx"
  // admin = authenticated GraphQL client
}
```

**Session Storage**:
- Sessions stored in PostgreSQL via Prisma
- Access tokens encrypted at rest
- Automatic token refresh handled by Shopify App Bridge

### 2. PikcelAI API Authentication

**API Key Approach** (For Server-to-Server):
```typescript
// Environment variables
PIKCEL_API_KEY=sk_live_xxxxxxxxxxxxx
PIKCEL_API_URL=https://app.pikcel.ai

// API Request
const response = await fetch(`${PIKCEL_API_URL}/api/jobs/dispatch`, {
  headers: {
    'Authorization': `Bearer ${PIKCEL_API_KEY}`,
    'X-Shopify-Shop': session.shop, // For tracking
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(jobData)
});
```

**User Session Approach** (For Browser):
```typescript
// When redirecting to PikcelAI platform
const authToken = await generateShopifyAppToken(session);

window.location.href =
  `https://app.pikcel.ai/ai-studio?token=${authToken}&source=shopify`;

// PikcelAI validates token and creates session
// Token payload: { shop, user_id, exp: 3600 }
```

### 3. Webhook Security

**Shopify → Shopify App** (Built-in):
- HMAC validation automatic via `@shopify/shopify-app-react-router`
- Headers: `X-Shopify-Hmac-Sha256`, `X-Shopify-Shop-Domain`

**PikcelAI → Shopify App** (Custom):
```typescript
// app/routes/api.pikcel.callback.tsx
import crypto from 'crypto';

export async function action({ request }: ActionFunctionArgs) {
  const signature = request.headers.get('X-PikcelAI-Signature');
  const body = await request.text();

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.PIKCEL_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);
  // Process webhook...
}
```

---

## Database Schema Integration

### Shopify App Database (Prisma)

```prisma
// prisma/schema.prisma

model Session {
  id            String    @id
  shop          String    // mystore.myshopify.com
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String    // Shopify access token
  userId        BigInt?
  // ... other fields
}

model PikcelAIJob {
  id              String    @id @default(uuid())
  shopifySession  String    // References Session.id
  productId       String    // gid://shopify/Product/123
  imageUrl        String    // Original Shopify image URL
  pikcelJobId     String    // PikcelAI job ID
  status          String    // pending, processing, completed, failed
  outputUrl       String?   // Edited image URL from PikcelAI
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([shopifySession])
  @@index([pikcelJobId])
}
```

### PikcelAI Platform Database (Supabase)

```sql
-- Additional columns in jobs table for Shopify integration
ALTER TABLE jobs ADD COLUMN shopify_product_id TEXT;
ALTER TABLE jobs ADD COLUMN shopify_shop TEXT;
ALTER TABLE jobs ADD COLUMN shopify_image_id TEXT;
ALTER TABLE jobs ADD COLUMN callback_url TEXT;
ALTER TABLE jobs ADD COLUMN metadata JSONB;

-- Create index for Shopify lookups
CREATE INDEX idx_jobs_shopify_product ON jobs(shopify_product_id);
CREATE INDEX idx_jobs_shopify_shop ON jobs(shopify_shop);
```

---

## API Endpoints Reference

### Shopify App Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/app` | GET | Main app page | Shopify Session |
| `/app/products` | GET | List products | Shopify Session |
| `/app/process-image` | POST | Start AI processing | Shopify Session |
| `/app/upload-image` | POST | Upload edited image | Shopify Session |
| `/api/pikcel/callback` | POST | Receive PikcelAI results | HMAC Signature |
| `/webhooks/app/uninstalled` | POST | App uninstall | Shopify HMAC |

### PikcelAI Platform Endpoints

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/jobs/dispatch` | POST | Create processing job | API Key |
| `/api/jobs/:id` | GET | Get job status | API Key |
| `/api/ai-models` | GET | List available AI tools | Public |
| `/api/external-storage/shopify` | POST | Upload to Shopify | API Key |

---

## Error Handling & Edge Cases

### 1. Session Expiration
```typescript
// Middleware to handle expired sessions
async function ensureValidSession(request: Request) {
  try {
    const { session } = await authenticate.admin(request);
    return session;
  } catch (error) {
    if (error.message.includes('Session not found')) {
      // Redirect to reinstall
      throw redirect('/auth/login');
    }
    throw error;
  }
}
```

### 2. Image Upload Failures
```typescript
async function uploadWithRetry(imageUrl: string, productId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadImageToShopify(imageUrl, productId);
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### 3. Webhook Delivery Failures
```typescript
// Store webhooks for retry
model WebhookLog {
  id          String   @id @default(uuid())
  payload     Json
  attempts    Int      @default(0)
  lastAttempt DateTime?
  status      String   // pending, delivered, failed
  error       String?
}

// Retry failed webhooks with cron job
async function retryFailedWebhooks() {
  const failedWebhooks = await prisma.webhookLog.findMany({
    where: {
      status: 'failed',
      attempts: { lt: 5 }
    }
  });

  for (const webhook of failedWebhooks) {
    try {
      await deliverWebhook(webhook.payload);
      await prisma.webhookLog.update({
        where: { id: webhook.id },
        data: { status: 'delivered' }
      });
    } catch (error) {
      await prisma.webhookLog.update({
        where: { id: webhook.id },
        data: {
          attempts: webhook.attempts + 1,
          lastAttempt: new Date(),
          error: error.message
        }
      });
    }
  }
}
```

### 4. Rate Limiting (Shopify)
```typescript
// Respect Shopify rate limits
class RateLimiter {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;
  private readonly MAX_REQUESTS_PER_SECOND = 2;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      await fn();
      await new Promise(resolve =>
        setTimeout(resolve, 1000 / this.MAX_REQUESTS_PER_SECOND)
      );
    }

    this.processing = false;
  }
}

const rateLimiter = new RateLimiter();

// Usage
const products = await rateLimiter.enqueue(() =>
  admin.graphql(GET_PRODUCTS_QUERY)
);
```

---

## Implementation Roadmap

### Phase 1: Core Integration (Week 1-2)
- [x] Setup Shopify app boilerplate
- [ ] Implement product fetching from Shopify
- [ ] Create product gallery UI with images
- [ ] Setup PikcelAI API key authentication
- [ ] Implement "Edit Image" button → PikcelAI API call

### Phase 2: Processing & Upload (Week 3-4)
- [ ] Create job tracking in Shopify app database
- [ ] Implement webhook receiver for PikcelAI callbacks
- [ ] Build image upload to Shopify (staged upload → attach media)
- [ ] Add progress indicators and status updates
- [ ] Error handling and retry logic

### Phase 3: UX Enhancement (Week 5-6)
- [ ] Batch image editing (select multiple products)
- [ ] Editing history (show processed images)
- [ ] Quick preview of before/after
- [ ] Saved presets/templates for common edits
- [ ] Onboarding flow for new users

### Phase 4: Advanced Features (Week 7-8)
- [ ] App extension for inline editing in product page
- [ ] Automatic image optimization on product creation
- [ ] Analytics dashboard (images edited, time saved)
- [ ] Multi-store support (one merchant, multiple stores)
- [ ] White-label branding options

---

## Testing Strategy

### 1. Development Store Setup
```bash
# Create development store
# In Shopify Partners: Stores → Add store → Development store

# Add test products
# Shopify Admin → Products → Add product
# Upload various image types (PNG, JPEG, WebP)
# Different sizes (small, medium, large)
```

### 2. Integration Testing
```typescript
// Test suite for Shopify integration
describe('Shopify Integration', () => {
  it('fetches products with images', async () => {
    const { products } = await loader({ request });
    expect(products).toHaveLength(10);
    expect(products[0].media.edges).toBeDefined();
  });

  it('sends image to PikcelAI for processing', async () => {
    const response = await action({
      request: new Request('/', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: 'https://cdn.shopify.com/test.jpg',
          toolId: 'background-removal'
        })
      })
    });

    const { jobId } = await response.json();
    expect(jobId).toBeDefined();
  });

  it('receives webhook and uploads image', async () => {
    const webhook = {
      jobId: '123',
      status: 'completed',
      outputUrl: 'https://storage.pikcel.ai/output.jpg',
      metadata: {
        shopify_product_id: 'gid://shopify/Product/456'
      }
    };

    const response = await webhookAction({
      request: new Request('/', {
        method: 'POST',
        headers: { 'X-PikcelAI-Signature': generateSignature(webhook) },
        body: JSON.stringify(webhook)
      })
    });

    expect(response.status).toBe(200);
  });
});
```

### 3. End-to-End Testing
1. **Product Selection**: Select product with 3 images
2. **Image Editing**: Click "Edit" → Select AI tool → Confirm
3. **Processing**: Wait for job completion (30-60 sec)
4. **Upload Verification**: Check product in Shopify Admin for new image
5. **Error Scenarios**:
   - Invalid image URL
   - Shopify API rate limit
   - PikcelAI service down
   - Network timeout

---

## Deployment Checklist

### Prerequisites
- [x] Shopify Partner account
- [x] Shopify development store
- [ ] Production database (PostgreSQL)
- [ ] PikcelAI API key
- [ ] Domain with SSL (for production)

### Environment Variables
```bash
# Shopify App (.env)
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SHOPIFY_APP_URL=https://shopify-app.pikcel.ai
DATABASE_URL=postgresql://user:pass@host/db
PIKCEL_API_KEY=sk_live_xxxxx
PIKCEL_API_URL=https://app.pikcel.ai
PIKCEL_WEBHOOK_SECRET=whsec_xxxxx

# PikcelAI Platform (.env)
SHOPIFY_CALLBACK_ALLOWED_DOMAINS=shopify-app.pikcel.ai,*.myshopify.com
```

### Deployment Steps
1. **Database Migration**: `npx prisma migrate deploy`
2. **Build App**: `npm run build`
3. **Deploy to Hosting**: (DigitalOcean, Heroku, Fly.io)
4. **Update Shopify App URLs**: Partners dashboard → App settings
5. **Test OAuth Flow**: Install on development store
6. **Configure Webhooks**: Verify webhook delivery
7. **Monitor Logs**: Setup error tracking (Sentry)

---

## Security Considerations

### 1. Data Privacy
- Never log access tokens or session data
- Encrypt sensitive data in database
- Use HTTPS for all communications
- Comply with GDPR/CCPA for user data

### 2. API Security
```typescript
// Rate limiting for PikcelAI API
const rateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.headers['x-shopify-shop']
});

app.post('/api/process-image', rateLimit, async (req, res) => {
  // ...
});
```

### 3. Input Validation
```typescript
// Validate image URLs
function isValidShopifyImageUrl(url: string): boolean {
  const shopifyDomains = [
    'cdn.shopify.com',
    'shopifycdn.com'
  ];

  try {
    const { hostname } = new URL(url);
    return shopifyDomains.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}
```

---

## Monitoring & Analytics

### Key Metrics to Track
1. **Processing Metrics**:
   - Total images processed
   - Average processing time
   - Success/failure rate
   - Most used AI tools

2. **Shopify Integration**:
   - Connected stores count
   - Products synced
   - Images uploaded back
   - Webhook delivery rate

3. **Performance**:
   - API response times
   - Job queue length
   - Error rates by type
   - Shopify API rate limit hits

### Implementation
```typescript
// Track metrics with analytics service
async function trackImageProcessing(jobData: {
  shop: string;
  productId: string;
  toolId: string;
  duration: number;
  success: boolean;
}) {
  await analyticsService.track('image_processed', {
    shop: jobData.shop,
    product_id: jobData.productId,
    tool_id: jobData.toolId,
    duration_ms: jobData.duration,
    success: jobData.success,
    timestamp: new Date()
  });
}
```

---

## Support & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Session not found" | Expired/invalid session | Reinstall app on store |
| "Failed to fetch products" | Invalid GraphQL query | Check API version compatibility |
| "Image upload failed" | Shopify rate limit | Implement exponential backoff |
| "Webhook not received" | Firewall/network issue | Check webhook URL accessibility |
| "PikcelAI API timeout" | Large image processing | Increase timeout to 120s |

### Debug Tools
```bash
# View Shopify app logs
npm run logs

# Test webhook delivery
curl -X POST https://shopify-app.pikcel.ai/api/pikcel/callback \
  -H "Content-Type: application/json" \
  -H "X-PikcelAI-Signature: xxxxx" \
  -d '{"jobId":"123","status":"completed"}'

# Check database
npx prisma studio
```

---

## Future Enhancements

1. **AI-Powered Suggestions**:
   - Automatic product image optimization recommendations
   - Bulk apply edits to similar products
   - A/B testing for image variants

2. **Advanced Workflows**:
   - Custom approval flows before publishing
   - Scheduled image updates
   - Multi-language alt text generation

3. **Integration Expansion**:
   - WooCommerce support (already in progress)
   - BigCommerce integration
   - Magento connector
   - Custom e-commerce platforms

4. **Enterprise Features**:
   - Team collaboration tools
   - Brand kit management
   - Custom AI model training
   - Dedicated processing queues

---

## Conclusion

This integration plan provides a comprehensive roadmap for connecting the Shopify embedded app with the PikcelAI platform. The architecture supports both embedded processing (for seamless UX) and standalone platform access (for advanced features).

**Next Steps**:
1. Review and approve the integration approach
2. Set up PikcelAI API keys and webhook secrets
3. Implement Phase 1 (core integration)
4. Test on development store
5. Deploy to production

**Key Success Metrics**:
- < 3 second product loading time
- < 60 second average image processing time
- > 99% webhook delivery rate
- > 95% successful image upload rate

---

**Document Version**: 1.0
**Last Updated**: October 5, 2025
**Author**: Claude (AI Assistant)
**Status**: Ready for Implementation
