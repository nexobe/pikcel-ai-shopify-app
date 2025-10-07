# Shopify Products Browser - Complete Implementation Guide

## Overview

This document provides a comprehensive guide to the Shopify Products Browser implementation for the PikcelAI embedded app. The feature allows merchants to browse, search, filter, and select products for AI-powered image editing.

## File Structure

```
app/
├── routes/
│   ├── app.products.tsx          # Main products browser page
│   └── app.tsx                    # Updated with Products nav link
├── types/
│   └── shopify-products.ts        # TypeScript type definitions
├── utils/
│   └── shopify-products.ts        # Utility helper functions
└── graphql/
    └── products.ts                # GraphQL queries and mutations
```

## Features

### 1. Product Display
- **Grid View**: Responsive card-based layout with product images
- **List View**: Compact list layout for browsing many products
- **Image Preview**: Hover effects and quick image preview
- **Product Details**: Title, vendor, status, price, image count
- **Status Badges**: Color-coded badges for product status (Active, Draft, Archived)

### 2. Search and Filtering
- **Full-Text Search**: Search by product title, SKU, vendor
- **Real-time Search**: Instant search results as you type
- **Clear Search**: Quick button to clear search query
- **Query Persistence**: Search terms preserved in URL

### 3. Product Selection
- **Single Selection**: Click checkbox to select individual products
- **Bulk Selection**: "Select All" checkbox for current page
- **Visual Feedback**: Selected products highlighted with border
- **Selection Count**: Real-time counter showing selected products

### 4. Pagination
- **Cursor-Based Pagination**: Efficient GraphQL cursor pagination
- **Next/Previous Navigation**: Navigate through product pages
- **20 Products Per Page**: Optimized page size for performance
- **Page Info**: Shows current page context

### 5. AI Integration
- **Edit with AI**: Individual product editing
- **Batch Edit**: Edit multiple products simultaneously
- **Session Storage**: Product context saved for AI editor
- **Product Context**: All product data and images passed to editor

### 6. Actions
- **View in Admin**: Opens product in Shopify admin
- **Quick Edit**: Direct link to AI editor
- **Bulk Actions**: Process multiple products at once

## Technical Implementation

### Routes

#### `/app/products` - Main Products Page

**Loader Function:**
- Authenticates Shopify admin session
- Parses URL parameters (cursor, direction, query)
- Fetches products via GraphQL API
- Returns paginated product data

**Action Function:**
- Handles form submissions
- Processes bulk edit requests
- Returns action results

### TypeScript Types

**Core Types:**
```typescript
interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  vendor?: string;
  status: ProductStatus;
  images: { edges: Array<{ node: ShopifyProductImage }> };
  variants: { edges: Array<{ node: ShopifyProductVariant }> };
}

interface ProductEditContext {
  productId: string;
  productTitle: string;
  images: ShopifyProductImage[];
}

interface BulkEditContext {
  productIds: string[];
  products: ShopifyProduct[];
  bulkEdit: true;
}
```

### GraphQL Queries

**Main Products Query:**
```graphql
query getProducts($first: Int, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        images(first: 10) { ... }
        variants(first: 10) { ... }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Utility Functions

**Key Helpers:**
- `extractNumericId()` - Convert Shopify GID to numeric ID
- `buildAdminUrl()` - Generate Shopify admin URLs
- `formatPrice()` - Currency formatting
- `getMainImage()` - Get featured or first image
- `saveProductContext()` - Save to session storage
- `validateProductForEditing()` - Pre-edit validation

## Usage Guide

### Basic Navigation

1. **Access Products Page**: Click "Products" in app navigation
2. **View Products**: Browse products in grid or list view
3. **Search Products**: Use search bar to filter products
4. **Select Products**: Click checkboxes to select products
5. **Edit with AI**: Click "Edit with AI" button

### Searching Products

```typescript
// Search by title
?query=sneakers

// Search by vendor
?query=vendor:Nike

// Search by status
?query=status:ACTIVE

// Combined search
?query=vendor:Nike status:ACTIVE
```

### Pagination

```typescript
// Next page
?cursor=CURSOR_STRING&direction=next

// Previous page
?cursor=CURSOR_STRING&direction=prev
```

### Session Storage

**Product Context Structure:**
```json
{
  "productId": "gid://shopify/Product/123456",
  "productTitle": "Blue Running Shoes",
  "images": [
    {
      "id": "gid://shopify/ProductImage/789",
      "url": "https://cdn.shopify.com/...",
      "altText": "Blue shoes front view"
    }
  ]
}
```

**Bulk Edit Context:**
```json
{
  "productIds": ["gid://shopify/Product/123", "gid://shopify/Product/456"],
  "products": [...],
  "bulkEdit": true
}
```

## Integration with AI Editor

### Single Product Edit Flow

1. User clicks "Edit with AI" on a product
2. Product context saved to `sessionStorage.shopify_product_context`
3. Navigate to `/app/ai-editor?productId=...`
4. AI Editor loads context from session storage
5. User edits images with AI tools
6. Edited images uploaded back to product

### Bulk Edit Flow

1. User selects multiple products (checkboxes)
2. User clicks "Edit Selected with AI" button
3. Bulk context saved to `sessionStorage.shopify_bulk_edit_context`
4. Navigate to `/app/ai-editor?bulk=true&count=N`
5. AI Editor processes all products
6. Images updated for all selected products

## Polaris Components Used

- `<s-page>` - Page container with heading
- `<s-section>` - Content sections
- `<s-button>` - Action buttons
- `<s-text-field>` - Search input
- `<s-checkbox>` - Product selection
- `<s-badge>` - Status indicators
- `<s-stack>` - Layout containers
- `<s-box>` - Styled containers
- `<s-heading>` - Section headings
- `<s-paragraph>` - Text content

## Performance Optimizations

1. **Cursor Pagination**: Efficient pagination for large catalogs
2. **Image Lazy Loading**: Images load as needed
3. **Memoized Callbacks**: useCallback for event handlers
4. **Optimistic Updates**: Instant UI feedback
5. **Session Storage**: Client-side caching of selections

## Error Handling

- **No Products**: Empty state with helpful message
- **Search No Results**: Clear feedback for empty searches
- **No Images**: Validation before AI editing
- **GraphQL Errors**: User-friendly error messages
- **Loading States**: Visual feedback during data fetching

## Security Considerations

1. **Authentication**: All requests authenticated via `authenticate.admin()`
2. **Session Validation**: Shopify session storage with Prisma
3. **CSRF Protection**: Built into Shopify App Bridge
4. **Scoped Permissions**: Only requests data user has access to
5. **Input Sanitization**: GraphQL variables properly escaped

## Future Enhancements

### Planned Features
- [ ] Advanced filters (price range, inventory, collections)
- [ ] Sorting options (price, date, name)
- [ ] Saved filter presets
- [ ] Export selected products
- [ ] Product comparison view
- [ ] Bulk status updates
- [ ] Image replacement workflow
- [ ] Analytics dashboard

### Performance Improvements
- [ ] Virtual scrolling for large lists
- [ ] GraphQL query caching
- [ ] Prefetch next page
- [ ] Image optimization
- [ ] Service worker for offline support

## Testing

### Manual Testing Checklist

- [ ] Products load correctly on page load
- [ ] Search filters products accurately
- [ ] Pagination works in both directions
- [ ] Grid/List view toggle works
- [ ] Product selection persists correctly
- [ ] "Edit with AI" navigates correctly
- [ ] Bulk edit handles multiple products
- [ ] Session storage saves/loads properly
- [ ] Empty states display correctly
- [ ] Error states handle gracefully

### Test Data

```typescript
// Create test products in Shopify admin:
// 1. Product with no images
// 2. Product with single image
// 3. Product with multiple images
// 4. Draft product
// 5. Archived product
// 6. Product with variants
```

## Troubleshooting

### Common Issues

**Problem**: Products not loading
- **Solution**: Check Shopify API permissions (read_products scope)

**Problem**: Images not displaying
- **Solution**: Verify CORS settings and CDN access

**Problem**: Pagination not working
- **Solution**: Ensure cursors are properly encoded in URL

**Problem**: Session storage not persisting
- **Solution**: Check browser storage permissions

**Problem**: "Edit with AI" navigates to wrong page
- **Solution**: Verify route exists at `/app/ai-editor`

## API Reference

### Loader Function

```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  // Parse parameters
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction");
  const searchQuery = url.searchParams.get("query");

  // Fetch products
  const response = await admin.graphql(PRODUCTS_QUERY, { variables });

  return { products, hasNextPage, endCursor };
};
```

### Action Function

```typescript
export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "bulkEdit") {
    // Handle bulk edit
  }

  return { success: true };
};
```

## Best Practices

1. **Always validate products before editing**: Check for images
2. **Use session storage wisely**: Clear after use
3. **Provide visual feedback**: Loading states, toasts
4. **Handle errors gracefully**: User-friendly messages
5. **Test with real data**: Use actual Shopify products
6. **Monitor performance**: Watch query times and page load

## Resources

- [Shopify Admin GraphQL API](https://shopify.dev/api/admin-graphql)
- [App Bridge Documentation](https://shopify.dev/docs/apps/tools/app-bridge)
- [Polaris Web Components](https://shopify.dev/docs/api/app-home)
- [React Router Documentation](https://reactrouter.com/)

## Support

For issues or questions:
- Check Shopify Developer Docs
- Review GraphQL API reference
- Test in Shopify GraphiQL explorer
- Check browser console for errors

## License

Part of PikcelAI Shopify App - All Rights Reserved
