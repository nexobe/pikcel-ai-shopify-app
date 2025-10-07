# Supabase Service - Quick Start Guide

## 5-Minute Setup

### Step 1: Add Environment Variables

Add to your `.env` file:

```bash
SUPABASE_URL=https://cvzkmmxdbkjhgfongupg.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

> **Note**: Get the service role key from Supabase dashboard → Settings → API

### Step 2: Import and Use

```typescript
import { getSupabaseService } from '~/services/supabase.server';

export async function loader() {
  const supabase = getSupabaseService();

  // Get AI models
  const models = await supabase.getActiveAIModels();

  return json({ models });
}
```

### Step 3: Test the Connection

Create a test route: `app/routes/test.supabase.tsx`

```typescript
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSupabaseService } from '~/services/supabase.server';

export async function loader() {
  const supabase = getSupabaseService();

  const [models, templates, plans] = await Promise.all([
    supabase.getActiveAIModels(),
    supabase.getTemplates(),
    supabase.getSubscriptionPlans(),
  ]);

  return json({
    models: models.length,
    templates: templates.length,
    plans: plans.length,
  });
}

export default function TestSupabase() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Supabase Connection Test</h1>
      <ul>
        <li>AI Models: {data.models}</li>
        <li>Templates: {data.templates}</li>
        <li>Plans: {data.plans}</li>
      </ul>
    </div>
  );
}
```

Visit `/test/supabase` to verify the connection.

## Common Use Cases

### 1. Load AI Models for Selection

```typescript
export async function loader() {
  const supabase = getSupabaseService();
  const models = await supabase.getActiveAIModels();

  // Group by category
  const grouped = models.reduce((acc, model) => {
    acc[model.category] = acc[model.category] || [];
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  return json({ modelsByCategory: grouped });
}
```

### 2. Get Templates for Platform

```typescript
// Get Amazon templates
const amazonTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Amazon');

// Get Shopify templates
const shopifyTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Shopify');
```

### 3. Check User Credits

```typescript
const profile = await supabase.getProfileById(userId);
const creditsRemaining = profile.image_quota - profile.images_used;

if (creditsRemaining < 1) {
  // Show upgrade message
}
```

### 4. Get Subscription Plans

```typescript
const plans = await supabase.getSubscriptionPlans();
const packs = await supabase.getCreditPacks();

return json({ plans, packs });
```

## Available Methods

### AI Models
```typescript
getActiveAIModels()                    // All active models
getModelById(id)                       // Single model
getModelsByCategory(category)          // By category
getModelsByProvider(provider)          // By provider (openai, replicate)
```

### Templates
```typescript
getTemplates()                         // All public templates
getTemplateById(id)                    // Single template
getTemplatesByCategory(cat, subcat?)   // By category/platform
searchTemplatesByTags(tags)            // Search by tags
```

### Products
```typescript
getSubscriptionPlans()                 // All subscription plans
getCreditPacks()                       // All credit packs
getProductById(id)                     // Single product
getProductByTier(tier)                 // By tier (free, business)
```

### Jobs & Profiles
```typescript
getJobById(jobId)                      // Single job
getJobsByStatus(status)                // By status
getProfileById(profileId)              // User profile
```

## Caching

### Use Cache (Default)
```typescript
const models = await supabase.getActiveAIModels(); // Cached 5 min
```

### Bypass Cache
```typescript
const models = await supabase.getActiveAIModels(false); // Fresh data
```

### Clear Cache
```typescript
supabase.clearCache();                 // Clear all
supabase.invalidateAIModelsCache();    // Clear AI models only
```

## Error Handling

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

## TypeScript Types

```typescript
import type {
  AIModel,
  EditingTemplate,
  Product,
} from '~/types/supabase.types';

const processModels = (models: AIModel[]) => {
  models.forEach((model) => {
    console.log(model.name, model.provider, model.credits_required);
  });
};
```

## Performance Tips

1. **Use caching** - Default behavior, great for static data
2. **Parallelize queries** - Use `Promise.all()` for independent queries
3. **Bypass cache sparingly** - Only when you need real-time data

```typescript
// ✅ Good - Parallel loading
const [models, templates] = await Promise.all([
  supabase.getActiveAIModels(),
  supabase.getTemplates(),
]);

// ❌ Bad - Sequential loading
const models = await supabase.getActiveAIModels();
const templates = await supabase.getTemplates();
```

## Security Checklist

- ✅ Service key in `.env` (not committed to git)
- ✅ Only use in `.server.ts` files
- ✅ Validate user input before queries
- ✅ Never expose service in client code

## Troubleshooting

### Connection Error
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
- Check service key has correct permissions
- Ensure using service role key (not anon key)

### Type Errors
- Import types from `~/types/supabase.types`
- Check TypeScript version (>=5.0)
- Restart TypeScript server

### Cache Issues
- Clear cache: `supabase.clearCache()`
- Use `useCache: false` for debugging
- Check cache TTLs in service implementation

## Next Steps

1. ✅ **Test connection** - Visit `/test/supabase`
2. 📚 **Read full docs** - `app/services/SUPABASE_SERVICE_GUIDE.md`
3. 💡 **Check examples** - `app/services/supabase.examples.ts`
4. 🧪 **Run tests** - `app/services/supabase.test.example.ts`

## Documentation

- **Quick Reference**: `app/services/SUPABASE_README.md`
- **Full Guide**: `app/services/SUPABASE_SERVICE_GUIDE.md`
- **Examples**: `app/services/supabase.examples.ts`
- **Types**: `app/types/supabase.types.ts`

## Support

Need help? Check:

1. Error messages (usually descriptive)
2. Full documentation in `SUPABASE_SERVICE_GUIDE.md`
3. Examples in `supabase.examples.ts`
4. Type definitions in `supabase.types.ts`

---

**You're all set!** The Supabase service layer is ready to use. Start by adding your environment variables and testing the connection.
