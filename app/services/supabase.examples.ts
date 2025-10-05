/**
 * Supabase Service - Example Usage Patterns
 *
 * Practical examples demonstrating how to use the Supabase service layer
 * in various scenarios.
 *
 * @module supabase.examples
 */

import { getSupabaseService } from './supabase.server';
import type {
  AIModel,
  EditingTemplate,
  Product,
  TemplateOperation,
} from '../types/supabase.types';

// ============================================================================
// EXAMPLE 1: Load AI Models for Selection UI
// ============================================================================

export async function loadAIModelsForUI() {
  const supabase = getSupabaseService();

  try {
    // Get all active AI models
    const models = await supabase.getActiveAIModels();

    // Group models by category for organized display
    const modelsByCategory = models.reduce((acc, model) => {
      const category = model.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(model);
      return acc;
    }, {} as Record<string, AIModel[]>);

    // Sort each category by credits required
    Object.keys(modelsByCategory).forEach((category) => {
      modelsByCategory[category].sort(
        (a, b) => a.credits_required - b.credits_required
      );
    });

    return {
      success: true,
      data: {
        all: models,
        byCategory: modelsByCategory,
        categories: Object.keys(modelsByCategory),
      },
    };
  } catch (error) {
    console.error('Failed to load AI models:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 2: Get Model Details with Pricing
// ============================================================================

export async function getModelWithPricing(modelId: string) {
  const supabase = getSupabaseService();

  try {
    const model = await supabase.getModelById(modelId);

    if (!model) {
      return {
        success: false,
        error: 'Model not found',
      };
    }

    // Calculate actual price based on cost multiplier
    const actualPrice = model.base_price * model.cost_multiplier;

    return {
      success: true,
      data: {
        ...model,
        actualPrice,
        estimatedProcessingTime: `~${model.processing_time_estimate}s`,
        supportedFormats: model.supported_formats,
        outputFormats: model.output_formats,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 3: Load Templates by E-commerce Platform
// ============================================================================

export async function getTemplatesForPlatform(platform: string) {
  const supabase = getSupabaseService();

  try {
    // Get e-commerce templates for specific platform
    const templates = await supabase.getTemplatesByCategory(
      'ecommerce',
      platform
    );

    // Sort by usage count (most popular first)
    templates.sort((a, b) => b.usage_count - a.usage_count);

    return {
      success: true,
      data: templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        operations: template.operations,
        tags: template.tags,
        usageCount: template.usage_count,
        previewUrl: template.preview_url,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 4: Build Template Operation Summary
// ============================================================================

export function summarizeTemplateOperations(template: EditingTemplate): string {
  const operations = template.operations as TemplateOperation[];

  const steps = operations.map((op) => {
    switch (op.type) {
      case 'background_removal':
        return 'Remove background';
      case 'background_replace':
        return `Replace background with ${op.color}`;
      case 'resize':
        return `Resize to ${op.width}x${op.height}`;
      case 'color_correction':
        return 'Adjust colors';
      case 'export':
        return `Export as ${op.format}`;
      case 'shadows':
        return 'Add realistic shadows';
      case 'blur':
        return `Apply blur (${op.amount})`;
      case 'brightness':
        return `Adjust brightness (${op.value > 0 ? '+' : ''}${op.value})`;
      case 'contrast':
        return `Adjust contrast (${op.value > 0 ? '+' : ''}${op.value})`;
      case 'sepia':
        return `Apply sepia tone (${op.intensity * 100}%)`;
      case 'grayscale':
        return 'Convert to grayscale';
      default:
        return 'Unknown operation';
    }
  });

  return steps.join(' → ');
}

// ============================================================================
// EXAMPLE 5: Get Subscription Plans with Features
// ============================================================================

export async function getSubscriptionPlanComparison() {
  const supabase = getSupabaseService();

  try {
    const plans = await supabase.getSubscriptionPlans();

    return {
      success: true,
      data: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        tier: plan.tier,
        price: plan.price_usd,
        credits: plan.credits_granted,
        imageLimit: plan.image_upload_limit,
        pricePerCredit:
          plan.price_usd && plan.credits_granted
            ? (plan.price_usd / plan.credits_granted).toFixed(4)
            : null,
        displayOrder: plan.display_order,
        stripeProductId: plan.stripe_product_id,
        stripePriceId: plan.stripe_price_id,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 6: Search for Specific Templates
// ============================================================================

export async function findRelevantTemplates(searchTags: string[]) {
  const supabase = getSupabaseService();

  try {
    // Search for templates with any of the provided tags
    const templates = await supabase.searchTemplatesByTags(searchTags);

    // Calculate relevance score based on tag matches
    const templatesWithScore = templates.map((template) => {
      const matchingTags = searchTags.filter((tag) =>
        template.tags?.includes(tag)
      );
      const score = matchingTags.length;

      return {
        ...template,
        relevanceScore: score,
        matchingTags,
      };
    });

    // Sort by relevance score, then by usage count
    templatesWithScore.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.usage_count - a.usage_count;
    });

    return {
      success: true,
      data: templatesWithScore,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 7: Get User Credit Balance
// ============================================================================

export async function getUserCreditBalance(profileId: string) {
  const supabase = getSupabaseService();

  try {
    const profile = await supabase.getProfileById(profileId);

    if (!profile) {
      return {
        success: false,
        error: 'Profile not found',
      };
    }

    const creditsRemaining = profile.image_quota - profile.images_used;

    return {
      success: true,
      data: {
        total: profile.image_quota,
        used: profile.images_used,
        remaining: creditsRemaining,
        percentageUsed: (
          (profile.images_used / profile.image_quota) *
          100
        ).toFixed(1),
        subscriptionStatus: profile.subscription_status,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 8: Get Processing Job History
// ============================================================================

export async function getUserJobHistory(profileId: string, limit = 20) {
  const supabase = getSupabaseService();

  try {
    const jobs = await supabase.getJobsByProfileId(profileId, limit);

    const statistics = {
      total: jobs.length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      pending: jobs.filter((j) => j.status === 'pending').length,
      processing: jobs.filter((j) => j.status === 'processing').length,
    };

    return {
      success: true,
      data: {
        jobs,
        statistics,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 9: Recommend Models Based on Category
// ============================================================================

export async function recommendModelsForCategory(category: string) {
  const supabase = getSupabaseService();

  try {
    const models = await supabase.getModelsByCategory(category);

    // Separate by quality tier
    const byQuality = {
      ultra: models.filter((m) => m.model_quality === 'ultra'),
      hd: models.filter((m) => m.model_quality === 'hd'),
      standard: models.filter((m) => m.model_quality === 'standard'),
    };

    // Get the most affordable option
    const mostAffordable = models.reduce((min, model) =>
      model.credits_required < min.credits_required ? model : min
    );

    // Get the fastest option
    const fastest = models.reduce((min, model) =>
      model.processing_time_estimate < min.processing_time_estimate
        ? model
        : min
    );

    return {
      success: true,
      data: {
        all: models,
        byQuality,
        recommended: {
          mostAffordable,
          fastest,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 10: Get Credit Pack Options
// ============================================================================

export async function getCreditPackOptions() {
  const supabase = getSupabaseService();

  try {
    const packs = await supabase.getCreditPacks();

    return {
      success: true,
      data: packs.map((pack) => ({
        id: pack.id,
        name: pack.name,
        description: pack.description,
        price: pack.price_usd,
        credits: pack.credits_granted,
        pricePerCredit: pack.price_usd
          ? (pack.price_usd / pack.credits_granted).toFixed(4)
          : null,
        savingsVsBase:
          pack.price_usd && pack.credits_granted
            ? (
                ((0.5 - pack.price_usd / pack.credits_granted) / 0.5) *
                100
              ).toFixed(0)
            : null,
        stripePriceId: pack.stripe_price_id,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 11: Validate Model Compatibility
// ============================================================================

export async function validateModelForImage(
  modelId: string,
  imageFormat: string,
  imageSize: number
) {
  const supabase = getSupabaseService();

  try {
    const model = await supabase.getModelById(modelId);

    if (!model) {
      return {
        compatible: false,
        reason: 'Model not found',
      };
    }

    if (!model.is_active) {
      return {
        compatible: false,
        reason: 'Model is not currently active',
      };
    }

    if (!model.supported_formats.includes(imageFormat)) {
      return {
        compatible: false,
        reason: `Image format ${imageFormat} is not supported. Supported formats: ${model.supported_formats.join(', ')}`,
      };
    }

    if (imageSize > model.max_input_size) {
      return {
        compatible: false,
        reason: `Image size ${(imageSize / 1024 / 1024).toFixed(2)}MB exceeds maximum of ${(model.max_input_size / 1024 / 1024).toFixed(2)}MB`,
      };
    }

    return {
      compatible: true,
      model,
      estimatedProcessingTime: model.processing_time_estimate,
      creditsRequired: model.credits_required,
    };
  } catch (error) {
    return {
      compatible: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXAMPLE 12: Refresh Cached Data After Admin Update
// ============================================================================

export async function refreshAIModelsCache() {
  const supabase = getSupabaseService();

  // Invalidate all AI model caches
  supabase.invalidateAIModelsCache();

  // Fetch fresh data (will be cached again)
  const models = await supabase.getActiveAIModels();

  return {
    success: true,
    message: 'AI models cache refreshed',
    count: models.length,
  };
}

// ============================================================================
// EXAMPLE 13: Parallel Data Loading
// ============================================================================

export async function loadDashboardData() {
  const supabase = getSupabaseService();

  try {
    // Load multiple resources in parallel for better performance
    const [models, templates, subscriptions, creditPacks] = await Promise.all([
      supabase.getActiveAIModels(),
      supabase.getTemplates(),
      supabase.getSubscriptionPlans(),
      supabase.getCreditPacks(),
    ]);

    return {
      success: true,
      data: {
        models: {
          total: models.length,
          byProvider: models.reduce((acc, model) => {
            acc[model.provider] = (acc[model.provider] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        templates: {
          total: templates.length,
          byCategory: templates.reduce((acc, template) => {
            acc[template.category] = (acc[template.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        pricing: {
          subscriptions: subscriptions.length,
          creditPacks: creditPacks.length,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// EXPORT ALL EXAMPLES
// ============================================================================

export const examples = {
  loadAIModelsForUI,
  getModelWithPricing,
  getTemplatesForPlatform,
  summarizeTemplateOperations,
  getSubscriptionPlanComparison,
  findRelevantTemplates,
  getUserCreditBalance,
  getUserJobHistory,
  recommendModelsForCategory,
  getCreditPackOptions,
  validateModelForImage,
  refreshAIModelsCache,
  loadDashboardData,
};
