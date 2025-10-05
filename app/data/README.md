# AI Models Data

This directory contains AI models data exported from the PikcelAI Supabase database.

## Database Connection

- **Project ID**: `cvzkmmxdbkjhgfongupg`
- **URL**: `https://cvzkmmxdbkjhgfongupg.supabase.co`
- **Database**: `ai_models` table

## Total Active Models

**68 active AI models** across 20 categories

## Model Categories

| Category | Description |
|----------|-------------|
| background-editing | Background removal, replacement, and editing tools |
| batch-processing | Consistent batch editing across multiple images |
| color-correction | Professional color grading and correction |
| color-enhancement | Advanced color matching and enhancement |
| composition | Multi-image composition and masking |
| content-generation | AI-generated content and modifications |
| design-graphics | Logo, poster, icon, and graphic design |
| effects | Shadow generation and visual effects |
| enhancement | Product beautification and enhancement |
| fashion-apparel | Ghost mannequin and virtual model tools |
| general | General-purpose tools |
| image-editing | AI-powered image editing |
| image-generation | Text-to-image generation |
| photo-editing | Professional photo retouching and editing |
| photography | Various photography styles (product, food, landscape, etc.) |
| platform-optimization | Platform-specific optimization (Amazon, Etsy, Instagram, Shopify) |
| product-editing | Professional product editing tools |
| product-enhancement | Product staging and beautification |
| product-photography | Professional product photography tools |
| social-marketing | Social media graphics and marketing materials |

## Providers

- **Google** (gemini-2.5-flash-image-preview): 64 models
- **Replicate**: 3 models
- **RemoveBG**: 1 model

## Key Model Features

### Studio Tools (2 models)
- AI Image Editor (`image-studio-edit`)
- AI Image Generation (`image-studio-generation`)

### Popular Tools (66 models shown on tools page)
Most models are available on the tools page for direct user access.

## Database Schema

```typescript
interface AIModel {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  model_config: {
    model?: string;
    output_mime?: string;
    model_id?: string;
    version_id?: string;
    // ... other config fields
  };
  prompt_template: string | null;
  default_parameters: Record<string, any>;
  capabilities: {
    tags?: string[];
    features?: string[];
    max_input_images?: number;
    supports_multi_image?: boolean;
  };
  supported_formats: string[];
  output_formats: string[];
  max_input_size: number;
  processing_time_estimate: number;
  credits_required: number;
  base_price: string;
  cost_multiplier: string;
  icon_name: string | null;
  category: string;
  difficulty_level: number;
  model_quality: string;
  preview_image_url: string | null;
  preview_image_source: string;
  is_studio_tool: boolean;
  show_in_tools_page: boolean;
  show_in_templates: boolean;
}
```

## Fetching Data Dynamically

To fetch fresh data from Supabase:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cvzkmmxdbkjhgfongupg.supabase.co',
  process.env.SUPABASE_ANON_KEY
);

const { data: models, error } = await supabase
  .from('ai_models')
  .select('*')
  .eq('is_active', true)
  .order('category')
  .order('name');
```

## Files

- `ai-models.ts` - TypeScript interfaces and helper functions
- `ai-models-metadata.ts` - Compact metadata (IDs, names, categories, pricing)
- `README.md` - This documentation file

## Usage Examples

```typescript
import { getModelById, getModelsByCategory, STATS } from './ai-models';

// Get a specific model
const bgRemoval = getModelById('gemini-background-removal');

// Get all models in a category
const photographyTools = getModelsByCategory('photography');

// View statistics
console.log(`Total models: ${STATS.totalModels}`);
console.log(`Google models: ${STATS.byProvider.google}`);
```

## Model Pricing

Prices range from:
- **Minimum**: $0.25 (Icon design)
- **Maximum**: $1.00 (Complex tasks like ghost mannequin, masking)
- **Most common**: $0.50-$0.75

Credits required: 1-4 credits per operation

## Processing Time

- **Fastest**: 20 seconds (Simple effects)
- **Average**: 30-35 seconds
- **Slowest**: 50 seconds (Complex generations like virtual models)

## Last Updated

October 5, 2025

## Notes

- All models use HD quality output
- Most models support both JPEG and PNG formats
- Maximum input size: 10-15 MB depending on model
- All models are production-ready and actively used in PikcelAI
