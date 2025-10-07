# PikcelAI x Shopify Integration Flows - Visual Reference

## Quick Reference Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                            │
└────────────────────────────────────────────────────────────────┘

1. Install App → 2. View Products → 3. Edit Image → 4. Get Results

┌────────────────────────────────────────────────────────────────┐
│                     SYSTEM COMPONENTS                          │
└────────────────────────────────────────────────────────────────┘

Shopify Admin ←→ Shopify App ←→ PikcelAI API ←→ AI Processing
      ↕                ↕              ↕              ↕
  Products      PostgreSQL    Supabase DB    Image Storage
```

---

## Flow 1: App Installation & OAuth

```
┌─────────┐         ┌──────────────┐         ┌─────────────┐
│ Merchant│         │  Shopify App │         │   Shopify   │
└────┬────┘         └──────┬───────┘         └──────┬──────┘
     │                     │                         │
     │ 1. Install App      │                         │
     │────────────────────>│                         │
     │                     │                         │
     │                     │ 2. Redirect to Auth     │
     │                     │────────────────────────>│
     │                     │                         │
     │ 3. Authorize App    │                         │
     │<────────────────────────────────────────────>│
     │                     │                         │
     │                     │ 4. Callback with code   │
     │                     │<────────────────────────│
     │                     │                         │
     │                     │ 5. Exchange for token   │
     │                     │────────────────────────>│
     │                     │                         │
     │                     │ 6. Access token         │
     │                     │<────────────────────────│
     │                     │                         │
     │                     │ 7. Store session        │
     │                     │ (PostgreSQL)            │
     │                     │                         │
     │ 8. Redirect to App  │                         │
     │<────────────────────│                         │
     │                     │                         │
```

**Database after installation:**
```sql
sessions
├── id: "offline_mystore.myshopify.com"
├── shop: "mystore.myshopify.com"
├── accessToken: "shpat_xxxxxxxxxxxxx" (encrypted)
├── scope: "read_products,write_products,read_files,write_files"
└── isOnline: false
```

---

## Flow 2: Product Fetching & Display

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────┐
│  User   │    │  Shopify App │    │   Shopify   │    │ PostgreSQL │
└────┬────┘    └──────┬───────┘    └──────┬──────┘    └─────┬──────┘
     │                │                    │                  │
     │ 1. Open App    │                    │                  │
     │───────────────>│                    │                  │
     │                │                    │                  │
     │                │ 2. Get Session     │                  │
     │                │────────────────────────────────────────>
     │                │                    │                  │
     │                │ 3. Session Data    │                  │
     │                │<────────────────────────────────────────
     │                │                    │                  │
     │                │ 4. GraphQL Query   │                  │
     │                │ (Get Products)     │                  │
     │                │───────────────────>│                  │
     │                │                    │                  │
     │                │ 5. Products + Images                  │
     │                │<───────────────────│                  │
     │                │                    │                  │
     │ 6. Display UI  │                    │                  │
     │<───────────────│                    │                  │
     │                │                    │                  │
```

**GraphQL Query Used:**
```graphql
query GetProducts($first: Int!) {
  products(first: $first) {
    edges {
      node {
        id                          # gid://shopify/Product/123456
        title                       # "Blue T-Shirt"
        media(first: 10) {
          edges {
            node {
              ... on MediaImage {
                id                  # gid://shopify/MediaImage/789
                image {
                  url               # https://cdn.shopify.com/...
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Flow 3: Image Processing (Embedded Approach)

```
┌─────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐
│  User   │  │  Shopify App │  │ PikcelAI   │  │ AI Processing│
│         │  │              │  │ API        │  │ Engine       │
└────┬────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘
     │              │                 │                │
     │ 1. Click     │                 │                │
     │ "Edit Image" │                 │                │
     │─────────────>│                 │                │
     │              │                 │                │
     │              │ 2. Extract      │                │
     │              │    Image Data   │                │
     │              │    (URL, ID)    │                │
     │              │                 │                │
     │              │ 3. POST /jobs   │                │
     │              │    /dispatch    │                │
     │              │────────────────>│                │
     │              │                 │                │
     │              │                 │ 4. Create Job  │
     │              │                 │───────────────>│
     │              │                 │                │
     │              │                 │ 5. Job ID      │
     │              │                 │<───────────────│
     │              │                 │                │
     │              │ 6. Job Created  │                │
     │              │<────────────────│                │
     │              │                 │                │
     │ 7. Show      │                 │                │
     │    "Processing"                │                │
     │<─────────────│                 │                │
     │              │                 │                │
     │              │                 │ 8. Download    │
     │              │                 │    Image from  │
     │              │                 │    Shopify CDN │
     │              │                 │<───────────────│
     │              │                 │                │
     │              │                 │ 9. Process with│
     │              │                 │    AI Model    │
     │              │                 │───────────────>│
     │              │                 │                │
     │              │                 │ 10. Result     │
     │              │                 │<───────────────│
     │              │                 │                │
     │              │                 │ 11. Upload to  │
     │              │                 │     Storage    │
     │              │                 │                │
```

**Request Body for Job Creation:**
```json
{
  "type": "ai_processing",
  "operationId": "background-removal",
  "inputUrl": "https://cdn.shopify.com/s/files/1/0001/product.jpg",
  "parameters": {
    "shopify_product_id": "gid://shopify/Product/123456",
    "shopify_shop": "mystore.myshopify.com",
    "shopify_image_id": "gid://shopify/MediaImage/789",
    "callback_url": "https://shopify-app.pikcel.ai/api/pikcel/callback"
  }
}
```

**Response:**
```json
{
  "jobId": "job_2024_abc123xyz",
  "status": "processing",
  "estimatedTime": 45,
  "creditsRequired": 2
}
```

---

## Flow 4: Webhook Callback & Image Upload

```
┌────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐
│ PikcelAI   │  │  Shopify App │  │   Shopify   │  │PostgreSQL│
│ Processing │  │              │  │   Admin API │  │          │
└─────┬──────┘  └──────┬───────┘  └──────┬──────┘  └────┬─────┘
      │                │                 │               │
      │ 1. Job Done    │                 │               │
      │                │                 │               │
      │ 2. POST        │                 │               │
      │   /callback    │                 │               │
      │───────────────>│                 │               │
      │                │                 │               │
      │                │ 3. Verify       │               │
      │                │    Signature    │               │
      │                │                 │               │
      │                │ 4. Get Job      │               │
      │                │    Record       │               │
      │                │─────────────────────────────────>│
      │                │                 │               │
      │                │ 5. Job Data     │               │
      │                │<─────────────────────────────────│
      │                │                 │               │
      │                │ 6. Create       │               │
      │                │    Staged       │               │
      │                │    Upload       │               │
      │                │────────────────>│               │
      │                │                 │               │
      │                │ 7. Upload URL   │               │
      │                │<────────────────│               │
      │                │                 │               │
      │                │ 8. Fetch Output │               │
      │                │    from PikcelAI│               │
      │<───────────────│                 │               │
      │                │                 │               │
      │ 9. Image Blob  │                 │               │
      │───────────────>│                 │               │
      │                │                 │               │
      │                │ 10. Upload to   │               │
      │                │     Staged URL  │               │
      │                │────────────────>│               │
      │                │                 │               │
      │                │ 11. Success     │               │
      │                │<────────────────│               │
      │                │                 │               │
      │                │ 12. Attach      │               │
      │                │     Media to    │               │
      │                │     Product     │               │
      │                │────────────────>│               │
      │                │                 │               │
      │                │ 13. Media ID    │               │
      │                │<────────────────│               │
      │                │                 │               │
      │                │ 14. Update Job  │               │
      │                │     Status      │               │
      │                │─────────────────────────────────>│
      │                │                 │               │
      │                │ 15. Send 200 OK │               │
      │<───────────────│                 │               │
      │                │                 │               │
```

**Webhook Payload:**
```json
{
  "jobId": "job_2024_abc123xyz",
  "status": "completed",
  "outputUrl": "https://storage.pikcel.ai/outputs/edited_image.jpg",
  "metadata": {
    "shopify_product_id": "gid://shopify/Product/123456",
    "shopify_shop": "mystore.myshopify.com",
    "shopify_image_id": "gid://shopify/MediaImage/789",
    "callback_url": "https://shopify-app.pikcel.ai/api/pikcel/callback"
  },
  "processingTime": 42000,
  "creditsUsed": 2,
  "aiModel": "background-removal-v2"
}
```

**Staged Upload Mutation:**
```graphql
mutation CreateStagedUpload {
  stagedUploadsCreate(input: [{
    resource: PRODUCT_IMAGE
    filename: "edited_image.jpg"
    mimeType: "image/jpeg"
    httpMethod: POST
  }]) {
    stagedTargets {
      url                    # Upload endpoint
      resourceUrl            # Final resource identifier
      parameters {
        name
        value
      }
    }
  }
}
```

**Attach Media Mutation:**
```graphql
mutation AttachMedia($productId: ID!, $mediaUrl: String!) {
  productCreateMedia(
    productId: $productId
    media: [{
      originalSource: $mediaUrl
      alt: "Edited with PikcelAI"
      mediaContentType: IMAGE
    }]
  ) {
    media {
      id                     # gid://shopify/MediaImage/999
      status
      ... on MediaImage {
        image {
          url
          altText
        }
      }
    }
  }
}
```

---

## Flow 5: Alternative - Redirect to PikcelAI Platform

```
┌─────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────┐
│  User   │    │  Shopify App │    │ PikcelAI Web   │    │Supabase │
│         │    │              │    │   Platform     │    │         │
└────┬────┘    └──────┬───────┘    └───────┬────────┘    └────┬────┘
     │                │                     │                  │
     │ 1. Click       │                     │                  │
     │ "Advanced Edit"│                     │                  │
     │───────────────>│                     │                  │
     │                │                     │                  │
     │                │ 2. Generate Token   │                  │
     │                │    with Context     │                  │
     │                │                     │                  │
     │                │ 3. Redirect with    │                  │
     │                │    Image Context    │                  │
     │<───────────────│                     │                  │
     │                │                     │                  │
     │ 4. Navigate to │                     │                  │
     │    PikcelAI    │                     │                  │
     │────────────────────────────────────>│                  │
     │                │                     │                  │
     │                │                     │ 5. Validate      │
     │                │                     │    Token         │
     │                │                     │─────────────────>│
     │                │                     │                  │
     │                │                     │ 6. User Session  │
     │                │                     │<─────────────────│
     │                │                     │                  │
     │                │                     │ 7. Load Images   │
     │                │                     │    from URLs     │
     │                │                     │                  │
     │ 8. AI Studio   │                     │                  │
     │    Interface   │                     │                  │
     │<────────────────────────────────────│                  │
     │                │                     │                  │
     │ 9. Edit with   │                     │                  │
     │    Full Tools  │                     │                  │
     │────────────────────────────────────>│                  │
     │                │                     │                  │
     │                │                     │ 10. Process Job  │
     │                │                     │─────────────────>│
     │                │                     │                  │
     │                │                     │ 11. Job Results  │
     │                │                     │<─────────────────│
     │                │                     │                  │
     │ 12. Download   │                     │                  │
     │     or Push to │                     │                  │
     │     Shopify    │                     │                  │
     │<────────────────────────────────────│                  │
     │                │                     │                  │
```

**Redirect URL Format:**
```
https://app.pikcel.ai/ai-studio?
  source=shopify&
  token=eyJhbGc...&
  data=eyJzaG9w...
```

**Decoded Token Payload:**
```json
{
  "shop": "mystore.myshopify.com",
  "user_id": "shop_owner_12345",
  "exp": 1735689600,
  "iat": 1735686000
}
```

**Decoded Data Payload:**
```json
{
  "source": "shopify",
  "shopDomain": "mystore.myshopify.com",
  "productId": "gid://shopify/Product/123456",
  "productTitle": "Blue T-Shirt - Large",
  "images": [
    {
      "id": "gid://shopify/MediaImage/789",
      "url": "https://cdn.shopify.com/s/files/1/0001/product.jpg",
      "altText": "Blue T-Shirt Front View",
      "width": 2000,
      "height": 2000
    }
  ]
}
```

---

## Flow 6: Error Handling & Retries

```
┌──────────────┐         ┌─────────────┐         ┌────────────┐
│ Shopify App  │         │  PikcelAI   │         │   Shopify  │
└──────┬───────┘         └──────┬──────┘         └─────┬──────┘
       │                        │                       │
       │ 1. Process Request     │                       │
       │───────────────────────>│                       │
       │                        │                       │
       │                        │ 2. ERROR: Rate Limit  │
       │ 3. 429 Response        │                       │
       │<───────────────────────│                       │
       │                        │                       │
       │ 4. Wait (Exp Backoff)  │                       │
       │    2^attempt * 1000ms  │                       │
       │                        │                       │
       │ 5. Retry Request       │                       │
       │───────────────────────>│                       │
       │                        │                       │
       │                        │ 6. Success            │
       │ 7. 200 OK              │                       │
       │<───────────────────────│                       │
       │                        │                       │
       │ 8. Upload Image        │                       │
       │────────────────────────────────────────────────>
       │                        │                       │
       │                        │ 9. ERROR: Network     │
       │ 10. Network Error      │                       │
       │<────────────────────────────────────────────────
       │                        │                       │
       │ 11. Store in Queue     │                       │
       │     for Retry          │                       │
       │                        │                       │
       │ 12. Cron Job Retry     │                       │
       │     (5 min later)      │                       │
       │────────────────────────────────────────────────>
       │                        │                       │
       │                        │ 13. Success           │
       │ 14. Update Status      │                       │
       │<────────────────────────────────────────────────
       │                        │                       │
```

**Error Handling Strategy:**

| Error Type | Status Code | Retry Strategy | Max Attempts |
|------------|-------------|----------------|--------------|
| Rate Limit | 429 | Exponential backoff | 5 |
| Network Timeout | - | Exponential backoff | 3 |
| Invalid Token | 401 | Refresh session | 1 |
| Server Error | 500 | Exponential backoff | 3 |
| Not Found | 404 | No retry | 0 |
| Validation Error | 400 | No retry | 0 |

**Exponential Backoff Formula:**
```typescript
const delay = Math.min(
  Math.pow(2, attempt) * 1000 + Math.random() * 1000,
  30000 // Max 30 seconds
);
```

---

## Flow 7: Session Management

```
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌────────────┐
│ Browser │    │  Shopify App │    │   Shopify   │    │ PostgreSQL │
└────┬────┘    └──────┬───────┘    └──────┬──────┘    └─────┬──────┘
     │                │                    │                  │
     │ 1. Request     │                    │                  │
     │───────────────>│                    │                  │
     │                │                    │                  │
     │                │ 2. Get Session     │                  │
     │                │────────────────────────────────────────>
     │                │                    │                  │
     │                │ 3. Session Expired │                  │
     │                │<────────────────────────────────────────
     │                │                    │                  │
     │                │ 4. Refresh Token   │                  │
     │                │───────────────────>│                  │
     │                │                    │                  │
     │                │ 5. New Token       │                  │
     │                │<───────────────────│                  │
     │                │                    │                  │
     │                │ 6. Update Session  │                  │
     │                │────────────────────────────────────────>
     │                │                    │                  │
     │                │ 7. Continue Request│                  │
     │                │                    │                  │
     │ 8. Response    │                    │                  │
     │<───────────────│                    │                  │
     │                │                    │                  │
```

**Session Lifecycle:**
```
Install → Create Session → Use Session → Refresh Token → Use Session
   ↓                                          ↓
Store in DB ──────────────────────────────> Update DB
   ↓                                          ↓
Encrypted                                  Encrypted
```

---

## Flow 8: Batch Processing

```
┌─────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐
│  User   │  │  Shopify App │  │  PikcelAI  │  │ Job Processor│
└────┬────┘  └──────┬───────┘  └─────┬──────┘  └──────┬───────┘
     │              │                 │                │
     │ 1. Select    │                 │                │
     │    Multiple  │                 │                │
     │    Products  │                 │                │
     │─────────────>│                 │                │
     │              │                 │                │
     │ 2. Choose    │                 │                │
     │    Edit Tool │                 │                │
     │─────────────>│                 │                │
     │              │                 │                │
     │              │ 3. Create Batch │                │
     │              │────────────────>│                │
     │              │                 │                │
     │              │                 │ 4. Queue Jobs  │
     │              │                 │───────────────>│
     │              │                 │                │
     │              │                 │ 5. Process Job │
     │              │                 │    (Parallel)  │
     │              │                 │<───────────────│
     │              │                 │                │
     │              │ 6. Progress     │                │
     │              │    Update       │                │
     │              │<────────────────│                │
     │              │                 │                │
     │ 7. Show      │                 │                │
     │    Progress  │                 │                │
     │    (3/10)    │                 │                │
     │<─────────────│                 │                │
     │              │                 │                │
     │              │                 │ 8. All Jobs    │
     │              │                 │    Complete    │
     │              │                 │<───────────────│
     │              │                 │                │
     │              │ 9. Batch Done   │                │
     │              │<────────────────│                │
     │              │                 │                │
     │              │ 10. Upload All  │                │
     │              │     to Shopify  │                │
     │              │     (Parallel)  │                │
     │              │                 │                │
     │ 11. Success  │                 │                │
     │     (10/10)  │                 │                │
     │<─────────────│                 │                │
     │              │                 │                │
```

---

## Database Schema Relationships

```
┌─────────────────┐         ┌──────────────────┐
│    sessions     │         │  pikcelai_jobs   │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │◄───────┤ shopifySession   │
│ shop            │         │ productId        │
│ accessToken     │         │ imageUrl         │
│ scope           │         │ pikcelJobId      │
│ expires         │         │ status           │
└─────────────────┘         │ outputUrl        │
                            │ createdAt        │
                            └──────────────────┘

┌─────────────────┐
│ webhook_logs    │
├─────────────────┤
│ id (PK)         │
│ payload         │
│ attempts        │
│ lastAttempt     │
│ status          │
│ error           │
└─────────────────┘
```

---

## API Authentication Flow

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│ Shopify App │         │  PikcelAI    │         │  Supabase  │
└──────┬──────┘         └──────┬───────┘         └─────┬──────┘
       │                       │                        │
       │ 1. POST /jobs/dispatch                        │
       │    Authorization:     │                        │
       │    Bearer sk_live_xxx │                        │
       │──────────────────────>│                        │
       │                       │                        │
       │                       │ 2. Validate API Key    │
       │                       │───────────────────────>│
       │                       │                        │
       │                       │ 3. Key Valid + User ID │
       │                       │<───────────────────────│
       │                       │                        │
       │                       │ 4. Create Job          │
       │                       │    (user_id attached)  │
       │                       │                        │
       │ 5. Job Created        │                        │
       │<──────────────────────│                        │
       │                       │                        │
```

**API Key Format:**
```
sk_live_[environment]_[random_32_chars]
sk_test_[environment]_[random_32_chars]
```

**API Key Scopes:**
```json
{
  "key": "sk_live_prod_abc123...",
  "scopes": [
    "jobs:create",
    "jobs:read",
    "webhooks:receive"
  ],
  "rateLimit": {
    "requests": 100,
    "window": "1m"
  },
  "metadata": {
    "shop": "mystore.myshopify.com",
    "app_id": "shopify_app_123"
  }
}
```

---

## Monitoring & Observability

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  App Metrics │    │  Job Metrics │    │ Error Tracking│
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                    │
       │ Products Loaded   │ Jobs Created       │ 429 Errors
       │ Images Processed  │ Processing Time    │ 500 Errors
       │ Uploads Success   │ Success Rate       │ Network Fails
       │ Session Refreshes │ Queue Length       │ Webhook Fails
       │                   │                    │
       └───────────────────┴────────────────────┘
                           ↓
                ┌──────────────────────┐
                │  Analytics Dashboard │
                ├──────────────────────┤
                │ - Total Images: 1,234│
                │ - Avg Time: 42s      │
                │ - Success: 98.5%     │
                │ - Active Stores: 15  │
                └──────────────────────┘
```

---

## Quick Reference: Key Endpoints

### Shopify App
- `GET /app` - Main app page
- `GET /app/products` - Product list
- `POST /app/process-image` - Start processing
- `POST /api/pikcel/callback` - Webhook receiver

### PikcelAI API
- `POST /api/jobs/dispatch` - Create job
- `GET /api/jobs/:id` - Job status
- `GET /api/ai-models` - Available tools

### Shopify Admin API
- `POST /admin/api/graphql` - GraphQL endpoint
- Products query
- Media upload mutation
- Staged upload mutation

---

**Document Purpose**: Visual reference for development team
**Companion Doc**: INTEGRATION_PLAN.md (detailed specifications)
**Last Updated**: October 5, 2025
