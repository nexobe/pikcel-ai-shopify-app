# Supabase Service Layer

## Overview

Direct Supabase client for querying PikcelAI's production database. This service layer provides type-safe access to AI models, editing templates, subscription products, jobs, and user profiles.

## Files

- **`supabase.server.ts`** - Main service implementation with caching and error handling
- **`../types/supabase.types.ts`** - Complete TypeScript type definitions
- **`SUPABASE_SERVICE_GUIDE.md`** - Comprehensive usage guide
- **`supabase.examples.ts`** - Practical example implementations

## Quick Start

### 1. Setup Environment Variables

```bash
# .env
SUPABASE_URL=https://cvzkmmxdbkjhgfongupg.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### 2. Import and Use

```typescript
import { getSupabaseService } from '~/services/supabase.server';

export async function loader() {
  const supabase = getSupabaseService();

  // Get active AI models
  const models = await supabase.getActiveAIModels();

  // Get editing templates
  const templates = await supabase.getTemplates();

  // Get subscription plans
  const plans = await supabase.getSubscriptionPlans();

  return json({ models, templates, plans });
}
```

## Key Features

### Comprehensive Data Access

- **AI Models**: Get models by ID, category, provider, or all active models
- **Editing Templates**: Query by category, subcategory, or search by tags
- **Products**: Access subscription plans and credit packs
- **Jobs**: Track processing jobs and their statuses
- **Profiles**: Get user profile and credit information

### Built-in Caching

```typescript
// Cached by default (5-15 minutes based on data type)
const models = await supabase.getActiveAIModels();

// Bypass cache for fresh data
const models = await supabase.getActiveAIModels(false);

// Manual cache management
supabase.clearCache();
supabase.invalidateAIModelsCache();
```

### Type Safety

```typescript
import type {
  AIModel,
  EditingTemplate,
  Product,
  TemplateOperation,
} from '~/types/supabase.types';

// Fully typed responses
const model: AIModel = await supabase.getModelById('bg-removal');
const template: EditingTemplate = await supabase.getTemplateById('id');
```

### Error Handling

```typescript
try {
  const models = await supabase.getActiveAIModels();
} catch (error) {
  console.error('Failed:', error.message);
}

// Methods that might not find data return null
const model = await supabase.getModelById('invalid-id');
if (!model) {
  console.log('Model not found');
}
```

## Available Methods

### AI Models

```typescript
getActiveAIModels() // All active models
getAllAIModels() // All models including inactive
getModelById(id) // Single model by ID
getModelsByCategory(category, activeOnly?) // Models by category
getModelsByProvider(provider, activeOnly?) // Models by provider
```

### Editing Templates

```typescript
getTemplates() // All public templates
getTemplateById(id) // Single template
getTemplatesByCategory(category, subcategory?) // By category/platform
searchTemplatesByTags(tags, matchAll?) // Search by tags
```

### Products

```typescript
getSubscriptionPlans() // All subscription plans
getCreditPacks() // All credit packs
getAllProducts() // Both subscriptions and packs
getProductById(id) // Single product
getProductByTier(tier) // Product by tier (free, business, etc.)
```

### Jobs

```typescript
getJobById(jobId) // Single job
getJobsByStatus(status, limit?) // Jobs by status
getJobsByProfileId(profileId, limit?) // User's jobs
```

### Profiles

```typescript
getProfileById(profileId) // Single profile
getProfileByEmail(email) // Profile by email
```

### Cache Management

```typescript
clearCache() // Clear all caches
invalidateCache(key) // Invalidate specific cache
invalidateCachePattern(pattern) // Invalidate by regex pattern
invalidateAIModelsCache() // Clear all AI model caches
invalidateTemplatesCache() // Clear all template caches
invalidateProductsCache() // Clear all product caches
```

## Common Use Cases

### 1. Load AI Models for Selection

```typescript
const models = await supabase.getActiveAIModels();
const modelsByCategory = models.reduce((acc, model) => {
  acc[model.category] = acc[model.category] || [];
  acc[model.category].push(model);
  return acc;
}, {});
```

### 2. Get Platform-Specific Templates

```typescript
// Amazon templates
const amazonTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Amazon');

// Shopify templates
const shopifyTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Shopify');
```

### 3. Check User Credits

```typescript
const profile = await supabase.getProfileById(userId);
const creditsRemaining = profile.image_quota - profile.images_used;
```

### 4. Validate Model Compatibility

```typescript
const model = await supabase.getModelById(modelId);

if (!model.supported_formats.includes(imageFormat)) {
  throw new Error('Unsupported format');
}

if (imageSize > model.max_input_size) {
  throw new Error('File too large');
}
```

### 5. Load Dashboard Data

```typescript
const [models, templates, plans] = await Promise.all([
  supabase.getActiveAIModels(),
  supabase.getTemplates(),
  supabase.getSubscriptionPlans(),
]);
```

## Database Schema

### AI Models (ai_models_new)

Provider-agnostic AI models with JSON configuration:

- **Provider**: openai, replicate, anthropic, google
- **Model Config**: Provider-specific configuration
- **Pricing**: credits_required, base_price, cost_multiplier
- **Capabilities**: Supported formats, max size, processing time

### Editing Templates (editing_templates)

Reusable image editing workflows:

- **Categories**: ecommerce, photo-editing, social-media, trending
- **Subcategories**: Amazon, Shopify, Etsy, Instagram, etc.
- **Operations**: JSON array of editing steps
- **Tags**: Searchable tags array

### Products (products)

Subscription plans and credit packs:

- **Type**: subscription or pack
- **Tier**: free, business, etc.
- **Pricing**: price_usd, credits_granted
- **Limits**: image_upload_limit (subscriptions only)

## Advanced Usage

### Raw Client Access

```typescript
const client = supabase.getClient();

const { data, error } = await client
  .from('ai_models_new')
  .select('*')
  .eq('provider', 'openai')
  .order('credits_required');
```

### Custom Caching Strategy

```typescript
// Disable cache for real-time data
const jobs = await supabase.getJobsByStatus('processing', 10);

// Use cache for static data
const templates = await supabase.getTemplates(); // Cached 10 min
```

## Performance

- **Request Deduplication**: Simultaneous identical requests share fetch
- **Smart Caching**: TTLs optimized for data change frequency
- **Parallel Loading**: Use Promise.all() for independent queries
- **Indexed Queries**: Database indexes on frequently queried fields

## Security

- ⚠️ **Server-side only** - Never expose service key to client
- ⚠️ **Use in `.server.ts` files only**
- ⚠️ **Service role bypasses RLS** - Be careful with permissions
- ✅ **Validate user input** before using in queries
- ✅ **Sanitize data** returned to clients

## Testing

```typescript
import { resetGlobalSupabaseService } from '~/services/supabase.server';

afterEach(() => {
  resetGlobalSupabaseService();
});
```

## Documentation

- **Full Guide**: See `SUPABASE_SERVICE_GUIDE.md`
- **Examples**: See `supabase.examples.ts`
- **Types**: See `../types/supabase.types.ts`

## Support

For questions or issues:

1. Check the comprehensive guide: `SUPABASE_SERVICE_GUIDE.md`
2. Review practical examples: `supabase.examples.ts`
3. Examine type definitions: `../types/supabase.types.ts`

## Version

- **Supabase JS Client**: v2.58.0
- **Service Layer**: v1.0.0
- **Last Updated**: October 2025
