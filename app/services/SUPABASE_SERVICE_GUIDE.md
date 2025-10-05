# Supabase Service Layer - Complete Guide

## Overview

The Supabase service layer provides direct access to PikcelAI's production database for querying AI models, editing templates, subscription products, jobs, and user profiles. It includes built-in caching, error handling, and TypeScript type safety.

## Setup

### 1. Environment Variables

Add these variables to your `.env` file:

```env
SUPABASE_URL=https://cvzkmmxdbkjhgfongupg.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### 2. Installation

The service uses `@supabase/supabase-js@2.58.0` which is already installed.

## Usage

### Getting the Service Instance

```typescript
import { getSupabaseService } from '~/services/supabase.server';

// Get singleton instance (recommended)
const supabase = getSupabaseService();

// Or create a new instance with custom config
import { createSupabaseService } from '~/services/supabase.server';

const customSupabase = createSupabaseService({
  url: process.env.SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_KEY!,
  options: {
    auth: {
      persistSession: false,
    },
  },
});
```

## AI Models

### Get All Active AI Models

```typescript
const models = await supabase.getActiveAIModels();

// Result: Array of AI models
// {
//   id: 'background-removal',
//   name: 'Background Removal',
//   description: 'Remove backgrounds from images',
//   provider: 'openai',
//   category: 'background-removal',
//   credits_required: 1,
//   is_active: true,
//   ...
// }
```

### Get Model by ID

```typescript
const model = await supabase.getModelById('background-removal');

if (model) {
  console.log('Model found:', model.name);
  console.log('Credits required:', model.credits_required);
  console.log('Provider:', model.provider);
}
```

### Get Models by Category

```typescript
// Get all background removal models
const bgModels = await supabase.getModelsByCategory('background-removal');

// Get all active models in a category
const activeModels = await supabase.getModelsByCategory('image-enhancement', true);

// Get all models (including inactive) in a category
const allModels = await supabase.getModelsByCategory('color-correction', false);
```

### Get Models by Provider

```typescript
// Get all OpenAI models
const openAIModels = await supabase.getModelsByProvider('openai');

// Get all Replicate models
const replicateModels = await supabase.getModelsByProvider('replicate');

// Get all providers including inactive
const allProviders = await supabase.getModelsByProvider('anthropic', false);
```

### Get All Models (Including Inactive)

```typescript
const allModels = await supabase.getAllAIModels();
```

## Editing Templates

### Get All Public Templates

```typescript
const templates = await supabase.getTemplates();

// Result: Array of public editing templates
// {
//   id: 'uuid',
//   name: 'Amazon Standard - White Background',
//   category: 'ecommerce',
//   subcategory: 'Amazon',
//   operations: [...],
//   tags: ['amazon', 'white-background', 'product'],
//   usage_count: 1234,
//   ...
// }
```

### Get Template by ID

```typescript
const template = await supabase.getTemplateById('template-uuid');

if (template) {
  console.log('Template:', template.name);
  console.log('Operations:', template.operations);
}
```

### Get Templates by Category

```typescript
// Get all e-commerce templates
const ecomTemplates = await supabase.getTemplatesByCategory('ecommerce');

// Get Amazon-specific templates
const amazonTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Amazon');

// Get Shopify templates
const shopifyTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Shopify');

// Get photo editing templates
const photoTemplates = await supabase.getTemplatesByCategory('photo-editing');
```

### Search Templates by Tags

```typescript
// Find templates with ANY of these tags
const vintageTemplates = await supabase.searchTemplatesByTags(['vintage', 'retro']);

// Find templates with ALL of these tags
const amazonWhiteBg = await supabase.searchTemplatesByTags(
  ['amazon', 'white-background'],
  true // matchAll = true
);
```

## Subscription Products

### Get All Subscription Plans

```typescript
const plans = await supabase.getSubscriptionPlans();

// Result: Array of subscription products
// {
//   id: 'uuid',
//   type: 'subscription',
//   tier: 'business',
//   name: 'Business Plan',
//   price_usd: 29.99,
//   credits_granted: 500,
//   image_upload_limit: 1000,
//   ...
// }
```

### Get All Credit Packs

```typescript
const packs = await supabase.getCreditPacks();

// Result: Array of credit pack products
// {
//   id: 'uuid',
//   type: 'pack',
//   name: 'Small Credit Pack',
//   price_usd: 9.99,
//   credits_granted: 100,
//   ...
// }
```

### Get All Products

```typescript
// Get both subscriptions and credit packs
const allProducts = await supabase.getAllProducts();
```

### Get Product by ID

```typescript
const product = await supabase.getProductById('product-uuid');

if (product) {
  console.log('Product:', product.name);
  console.log('Type:', product.type); // 'subscription' | 'pack'
  console.log('Credits:', product.credits_granted);
}
```

### Get Product by Tier

```typescript
// Get free tier
const freePlan = await supabase.getProductByTier('free');

// Get business tier
const businessPlan = await supabase.getProductByTier('business');

// Get credit pack
const smallPack = await supabase.getProductByTier('pack_small');
```

## Jobs

### Get Job by ID

```typescript
const job = await supabase.getJobById('job-uuid');

if (job) {
  console.log('Status:', job.status);
  console.log('Input:', job.input_url);
  console.log('Output:', job.output_url);
}
```

### Get Jobs by Status

```typescript
// Get pending jobs
const pendingJobs = await supabase.getJobsByStatus('pending', 10);

// Get completed jobs
const completedJobs = await supabase.getJobsByStatus('completed', 20);

// Get failed jobs
const failedJobs = await supabase.getJobsByStatus('failed');
```

### Get Jobs by Profile

```typescript
const userJobs = await supabase.getJobsByProfileId('profile-id', 50);
```

## User Profiles

### Get Profile by ID

```typescript
const profile = await supabase.getProfileById('profile-id');

if (profile) {
  console.log('Email:', profile.email);
  console.log('Credits:', profile.image_quota - profile.images_used);
  console.log('Subscription:', profile.subscription_status);
}
```

### Get Profile by Email

```typescript
const profile = await supabase.getProfileByEmail('user@example.com');
```

## Caching

### Cache Duration

The service automatically caches responses with the following durations:

- **AI Models**: 5 minutes (active) / 5 minutes (all)
- **Individual Model**: 10 minutes
- **Templates**: 10 minutes (public templates)
- **Individual Template**: 10 minutes
- **Products**: 15 minutes
- **Jobs**: No caching (always fresh data)
- **Profiles**: No caching (always fresh data)

### Disable Cache for Specific Query

```typescript
// Bypass cache and fetch fresh data
const models = await supabase.getActiveAIModels(false);
const templates = await supabase.getTemplates(false);
const products = await supabase.getSubscriptionPlans(false);
```

### Clear All Caches

```typescript
supabase.clearCache();
```

### Invalidate Specific Cache

```typescript
// Invalidate a specific cache key
supabase.invalidateCache('ai-models:active');

// Invalidate by pattern
supabase.invalidateCachePattern(/^ai-model/);

// Invalidate all AI model caches
supabase.invalidateAIModelsCache();

// Invalidate all template caches
supabase.invalidateTemplatesCache();

// Invalidate all product caches
supabase.invalidateProductsCache();
```

## Error Handling

All methods throw errors with descriptive messages. Wrap calls in try-catch:

```typescript
try {
  const models = await supabase.getActiveAIModels();
  console.log('Models:', models.length);
} catch (error) {
  console.error('Failed to fetch models:', error.message);
}
```

### Handling Not Found

Some methods return `null` instead of throwing errors:

```typescript
const model = await supabase.getModelById('non-existent-id');
if (!model) {
  console.log('Model not found');
}

const template = await supabase.getTemplateById('bad-id');
if (!template) {
  console.log('Template not found');
}
```

## Advanced Usage

### Raw Client Access

For complex queries not covered by helper methods:

```typescript
const client = supabase.getClient();

// Custom query
const { data, error } = await client
  .from('ai_models_new')
  .select('id, name, provider')
  .eq('provider', 'openai')
  .gte('credits_required', 5)
  .order('credits_required', { ascending: true })
  .limit(10);

if (error) {
  console.error('Query failed:', error.message);
} else {
  console.log('Results:', data);
}
```

### Combining Multiple Queries

```typescript
// Fetch multiple resources in parallel
const [models, templates, products] = await Promise.all([
  supabase.getActiveAIModels(),
  supabase.getTemplates(),
  supabase.getSubscriptionPlans(),
]);

console.log(`Found ${models.length} models`);
console.log(`Found ${templates.length} templates`);
console.log(`Found ${products.length} plans`);
```

## TypeScript Types

All methods are fully typed. Import types as needed:

```typescript
import type {
  AIModel,
  EditingTemplate,
  Product,
  Job,
  Profile,
  TemplateOperation,
  ModelConfig,
} from '~/types/supabase.types';

// Use types for type safety
const processModel = (model: AIModel) => {
  console.log(`Processing ${model.name}`);
  console.log(`Provider: ${model.provider}`);
  console.log(`Credits: ${model.credits_required}`);
};

const applyTemplate = (template: EditingTemplate) => {
  const operations = template.operations as TemplateOperation[];
  operations.forEach((op) => {
    if (op.type === 'background_removal') {
      console.log('Removing background');
    } else if (op.type === 'resize') {
      console.log(`Resizing to ${op.width}x${op.height}`);
    }
  });
};
```

## Example: Building a Model Selection UI

```typescript
import { getSupabaseService } from '~/services/supabase.server';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const supabase = getSupabaseService();

  try {
    // Get AI models grouped by category
    const models = await supabase.getActiveAIModels();

    // Group by category
    const groupedModels = models.reduce((acc, model) => {
      if (!acc[model.category]) {
        acc[model.category] = [];
      }
      acc[model.category].push(model);
      return acc;
    }, {} as Record<string, typeof models>);

    // Get templates for quick workflows
    const templates = await supabase.getTemplates();

    // Get subscription plans for pricing
    const plans = await supabase.getSubscriptionPlans();

    return json({
      modelsByCategory: groupedModels,
      templates,
      subscriptionPlans: plans,
    });
  } catch (error) {
    console.error('Loader error:', error);
    return json(
      { error: 'Failed to load data' },
      { status: 500 }
    );
  }
}
```

## Testing

### Reset Service for Tests

```typescript
import { resetGlobalSupabaseService } from '~/services/supabase.server';

// In test teardown
afterEach(() => {
  resetGlobalSupabaseService();
});
```

### Mock Service for Unit Tests

```typescript
import { createSupabaseService } from '~/services/supabase.server';

const mockSupabase = createSupabaseService({
  url: 'http://localhost:54321',
  serviceKey: 'test-key',
});

// Use mock in tests
const models = await mockSupabase.getActiveAIModels();
```

## Best Practices

1. **Use the singleton instance** (`getSupabaseService()`) for most cases
2. **Enable caching** for frequently accessed data (default behavior)
3. **Disable caching** only when you need fresh data immediately
4. **Handle null returns** for methods like `getModelById()`
5. **Use TypeScript types** for compile-time safety
6. **Invalidate caches** when data changes (e.g., after admin updates)
7. **Parallelize independent queries** with `Promise.all()`
8. **Use raw client** for complex queries not covered by helpers

## Performance Tips

- The service includes request deduplication - simultaneous identical requests share the same underlying fetch
- Cache TTLs are optimized based on data change frequency
- Use `useCache: false` sparingly as it bypasses performance optimizations
- Batch related queries with `Promise.all()` instead of sequential awaits

## Security Notes

- **Never expose the service key** in client-side code
- This service should **only be used in server-side code** (`.server.ts` files)
- Row Level Security (RLS) policies are bypassed when using the service role key
- Validate and sanitize any user input before using it in queries
