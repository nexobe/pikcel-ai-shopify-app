# Shopify Products Browser - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PikcelAI Shopify App                            │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │  app.tsx     │───▶│ app.products │───▶│ app.ai-editor│             │
│  │  Navigation  │    │   Browser    │    │  AI Tools    │             │
│  └──────────────┘    └──────────────┘    └──────────────┘             │
│                              │                    │                     │
│                              ▼                    ▼                     │
│                      ┌──────────────┐    ┌──────────────┐             │
│                      │ Session      │    │ AI Processing│             │
│                      │ Storage      │    │ Backend      │             │
│                      └──────────────┘    └──────────────┘             │
│                              │                    │                     │
└──────────────────────────────┼────────────────────┼─────────────────────┘
                               │                    │
                               ▼                    ▼
                    ┌──────────────────────────────────┐
                    │      Shopify Admin API           │
                    │  (GraphQL + REST)                │
                    └──────────────────────────────────┘
```

## Component Architecture

```
app/routes/app.products.tsx
├── Loader Function
│   ├── authenticate.admin(request)
│   ├── Parse URL params (cursor, direction, query)
│   ├── Execute PRODUCTS_QUERY
│   └── Return paginated data
│
├── Action Function
│   ├── Handle bulk edit
│   └── Return action results
│
└── Component
    ├── State Management
    │   ├── selectedProducts (Set<string>)
    │   ├── searchTerm (string)
    │   └── viewMode ('grid' | 'list')
    │
    ├── Product Display
    │   ├── Grid View (responsive)
    │   └── List View (compact)
    │
    ├── Search & Filters
    │   ├── Search input
    │   ├── Clear button
    │   └── View mode toggle
    │
    ├── Selection
    │   ├── Individual checkboxes
    │   └── Select all checkbox
    │
    ├── Actions
    │   ├── Edit with AI (single)
    │   ├── Edit Selected (batch)
    │   ├── View in Admin
    │   └── Clear selection
    │
    └── Pagination
        ├── Next button
        └── Previous button
```

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │
└─────┬───────┘
      │ 1. Navigate to /app/products
      ▼
┌─────────────────────────────────────────────┐
│  Loader: authenticate + fetch products      │
│                                             │
│  Variables: {                               │
│    first: 20,                               │
│    after: cursor,                           │
│    query: searchQuery                       │
│  }                                          │
└─────┬───────────────────────────────────────┘
      │ 2. GraphQL Request
      ▼
┌─────────────────────────────────────────────┐
│  Shopify Admin API                          │
│                                             │
│  PRODUCTS_QUERY                             │
│  Returns: {                                 │
│    products: {                              │
│      edges: [...],                          │
│      pageInfo: { hasNextPage, ... }         │
│    }                                        │
│  }                                          │
└─────┬───────────────────────────────────────┘
      │ 3. Return data
      ▼
┌─────────────────────────────────────────────┐
│  Component Render                           │
│                                             │
│  - Display 20 products                      │
│  - Show images, titles, prices              │
│  - Render checkboxes                        │
│  - Enable/disable pagination                │
└─────┬───────────────────────────────────────┘
      │ 4. User selects product(s)
      ▼
┌─────────────────────────────────────────────┐
│  Selection State Update                     │
│                                             │
│  selectedProducts.add(productId)            │
│  - Update selection count                   │
│  - Enable bulk edit button                  │
└─────┬───────────────────────────────────────┘
      │ 5. Click "Edit with AI"
      ▼
┌─────────────────────────────────────────────┐
│  handleEditWithAI(product)                  │
│                                             │
│  1. Create context object                   │
│  2. Save to sessionStorage                  │
│  3. Navigate to /app/ai-editor              │
└─────┬───────────────────────────────────────┘
      │ 6. Navigation
      ▼
┌─────────────────────────────────────────────┐
│  AI Editor Loader                           │
│                                             │
│  1. Load context from sessionStorage        │
│  2. Display product images                  │
│  3. Show AI tools                           │
└─────┬───────────────────────────────────────┘
      │ 7. User edits with AI
      ▼
┌─────────────────────────────────────────────┐
│  AI Processing                              │
│                                             │
│  1. Send image to AI backend                │
│  2. Process with selected model             │
│  3. Return edited image URL                 │
└─────┬───────────────────────────────────────┘
      │ 8. Upload edited image
      ▼
┌─────────────────────────────────────────────┐
│  Image Upload Workflow                      │
│                                             │
│  1. createStagedUpload()                    │
│     → Get S3 upload URL                     │
│                                             │
│  2. uploadToStagedTarget()                  │
│     → Upload blob to S3                     │
│                                             │
│  3. createProductMedia()                    │
│     → Link media to product                 │
└─────┬───────────────────────────────────────┘
      │ 9. Success
      ▼
┌─────────────────────────────────────────────┐
│  Product Updated in Shopify                 │
│                                             │
│  - New image appears in product             │
│  - Toast notification shown                 │
│  - Navigate back to products                │
└─────────────────────────────────────────────┘
```

## File Structure Tree

```
pikcel-ai-shopify-app/
│
├── app/
│   ├── routes/
│   │   ├── app.tsx                          ← Main app layout + nav
│   │   ├── app.products.tsx                 ← ⭐ Products browser
│   │   └── app.ai-editor.tsx                ← ⭐ AI editor
│   │
│   ├── types/
│   │   └── shopify-products.ts              ← ⭐ TypeScript types
│   │
│   ├── utils/
│   │   ├── shopify-products.ts              ← ⭐ Helper functions
│   │   └── shopify-image-upload.ts          ← ⭐ Upload workflow
│   │
│   └── graphql/
│       └── products.ts                      ← ⭐ GraphQL queries
│
├── PRODUCTS_FEATURE.md                      ← ⭐ Feature docs
├── PRODUCTS_IMPLEMENTATION_SUMMARY.md       ← ⭐ Implementation summary
└── PRODUCTS_ARCHITECTURE.md                 ← ⭐ This file

⭐ = Files created for this feature
```

## State Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    Component State                         │
└────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ selectedProducts│ │  searchTerm  │   │  viewMode    │
│  Set<string> │   │    string    │   │ 'grid'|'list'│
└──────────────┘   └──────────────┘   └──────────────┘
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Update on:   │   │ Update on:   │   │ Update on:   │
│ - Checkbox   │   │ - Search     │   │ - Toggle     │
│ - Select all │   │ - Clear      │   │   button     │
│ - Clear      │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Session Storage Flow

```
Products Browser                    Session Storage                AI Editor
─────────────────                   ───────────────                ─────────

1. User clicks
   "Edit with AI"
        │
        │ saveProductContext()
        ├──────────────────────▶  {
        │                           productId: "...",
        │                           productTitle: "...",
        │                           images: [...]
        │                         }
        │
        │ navigate('/app/ai-editor')
        │
        └─────────────────────────────────────────────────────────▶
                                                                   │
                                                                   │ loadProductContext()
                                                                   ◀────────┘
                                                                   │
                                                                   │ Display images
                                                                   │ Show AI tools
                                                                   │
                                        After editing:             │
                                        clearProductContext()      │
                                        ◀──────────────────────────┘
```

## GraphQL Query Flow

```
Component                GraphQL Variables              Shopify API
─────────                ─────────────────              ───────────

Page Load
  │
  ├─▶ {
  │     first: 20,
  │     query: null,                     ────────▶  PRODUCTS_QUERY
  │     sortKey: "UPDATED_AT",                          │
  │     reverse: true                                   │
  │   }                                                 │
  │                                      ◀───────── products.edges[]
  │                                                  pageInfo
  │
Search
  │
  ├─▶ {
  │     first: 20,
  │     query: "sneakers",              ────────▶  PRODUCTS_QUERY
  │     sortKey: "UPDATED_AT",                          │
  │     reverse: true                                   │
  │   }                                                 │
  │                                      ◀───────── filtered results
  │
Pagination (Next)
  │
  └─▶ {
        first: 20,
        after: "cursor_123",             ────────▶  PRODUCTS_QUERY
        query: "sneakers",                           │
        sortKey: "UPDATED_AT",                       │
        reverse: true                                │
      }                                              │
                                         ◀───────── next 20 products
```

## Image Upload Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Step 1: Create Staged Upload                                │
│                                                              │
│  createStagedUpload(admin, filename, mimeType, fileSize)    │
│                                                              │
│  GraphQL Mutation: stagedUploadsCreate                       │
│  Returns: {                                                  │
│    url: "https://s3.amazonaws.com/...",                      │
│    resourceUrl: "https://cdn.shopify.com/...",               │
│    parameters: [{name: "key", value: "..."}]                 │
│  }                                                           │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 2: Upload to Staged Target                             │
│                                                              │
│  uploadToStagedTarget(stagedTarget, imageBlob)              │
│                                                              │
│  HTTP POST to S3:                                            │
│  - FormData with parameters                                  │
│  - File blob                                                 │
│                                                              │
│  Returns: resourceUrl                                        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 3: Create Product Media                                │
│                                                              │
│  createProductMedia(admin, productId, [resourceUrl])        │
│                                                              │
│  GraphQL Mutation: productCreateMedia                        │
│  Variables: {                                                │
│    productId: "gid://shopify/Product/123",                   │
│    media: [{                                                 │
│      originalSource: resourceUrl,                            │
│      mediaContentType: "IMAGE",                              │
│      alt: "Product image"                                    │
│    }]                                                        │
│  }                                                           │
│                                                              │
│  Returns: Created media with Shopify image ID                │
└──────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────┐
│  Error Detection                                        │
└───────┬─────────────────────────────────────────────────┘
        │
        ├─▶ GraphQL Error
        │   └─▶ Show toast notification
        │       └─▶ Log to console
        │           └─▶ Return error state
        │
        ├─▶ Network Error
        │   └─▶ Show "Network error" message
        │       └─▶ Retry prompt
        │           └─▶ Fallback to cached data
        │
        ├─▶ Authentication Error
        │   └─▶ Redirect to login
        │       └─▶ Show "Session expired"
        │
        ├─▶ Validation Error
        │   └─▶ Highlight invalid field
        │       └─▶ Show inline error
        │           └─▶ Prevent submission
        │
        └─▶ Upload Error
            └─▶ Show upload failed message
                └─▶ Offer retry
                    └─▶ Log failure details
```

## Performance Optimization Points

```
1. Cursor Pagination
   ├── Efficient for large datasets
   ├── Stateless (no offset tracking)
   └── Scales to millions of products

2. Image Lazy Loading
   ├── Load images as they enter viewport
   ├── Reduce initial page load
   └── Better perceived performance

3. React Optimizations
   ├── useCallback for event handlers
   ├── useMemo for expensive computations
   └── React.memo for product cards

4. GraphQL Optimizations
   ├── Fetch only needed fields
   ├── Batch multiple images per product
   └── Use fragments for reusability

5. Session Storage
   ├── Client-side caching
   ├── Reduce server requests
   └── Persist selections across pages

6. Batch Operations
   ├── Upload multiple images at once
   ├── Reduce API calls
   └── Better user experience
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Authentication                                │
│  - authenticate.admin(request)                          │
│  - Shopify session validation                           │
│  - Token verification                                   │
└───────┬─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: Authorization                                 │
│  - Scoped API permissions                               │
│  - read_products, write_products                        │
│  - Product ownership validation                         │
└───────┬─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Input Validation                              │
│  - GraphQL query validation                             │
│  - File type validation                                 │
│  - File size limits                                     │
└───────┬─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Secure Upload                                 │
│  - Staged uploads (no direct CDN access)                │
│  - Signed URLs with expiration                          │
│  - HTTPS only                                           │
└───────┬─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Data Protection                               │
│  - Session storage (not localStorage)                   │
│  - Encrypted Prisma session storage                     │
│  - CSRF protection via App Bridge                       │
└─────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌────────────────────────────────────────────────────────────┐
│  Existing Features                                         │
│                                                            │
│  ┌─────────────┐     ┌─────────────┐    ┌─────────────┐  │
│  │ AI Studio   │     │ Templates   │    │ Jobs Queue  │  │
│  └──────┬──────┘     └──────┬──────┘    └──────┬──────┘  │
│         │                   │                   │          │
│         └───────────────────┼───────────────────┘          │
│                             │                              │
└─────────────────────────────┼──────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Products Browser │ ← New Feature
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────────┐  ┌──────────────────┐
          │ AI Editor        │  │ Shopify API      │
          │ (uses context)   │  │ (GraphQL)        │
          └──────────────────┘  └──────────────────┘
```

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Type-safe data flow
- ✅ Efficient pagination
- ✅ Secure authentication
- ✅ Scalable design
- ✅ Easy maintenance
- ✅ Comprehensive error handling
- ✅ Performance optimizations

The modular design allows for easy testing, debugging, and future enhancements while maintaining code quality and user experience.
