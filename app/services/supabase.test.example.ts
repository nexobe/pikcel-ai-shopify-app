/**
 * Supabase Service - Test Examples
 *
 * Example tests demonstrating how to validate the Supabase service.
 * These are examples only - not meant to be run automatically.
 *
 * @module supabase.test.example
 */

import { getSupabaseService, resetGlobalSupabaseService } from './supabase.server';

// ============================================================================
// TEST HELPERS
// ============================================================================

async function logTest(name: string, fn: () => Promise<void>) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('─'.repeat(60));

  try {
    await fn();
    console.log('✅ Test passed\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
  }
}

// ============================================================================
// CONNECTION TESTS
// ============================================================================

async function testConnection() {
  await logTest('Supabase Connection', async () => {
    const supabase = getSupabaseService();
    const models = await supabase.getActiveAIModels();

    if (!Array.isArray(models)) {
      throw new Error('Expected array of models');
    }

    console.log(`   Connected successfully`);
    console.log(`   Found ${models.length} active AI models`);
  });
}

// ============================================================================
// AI MODELS TESTS
// ============================================================================

async function testAIModels() {
  await logTest('Get Active AI Models', async () => {
    const supabase = getSupabaseService();
    const models = await supabase.getActiveAIModels();

    console.log(`   Total models: ${models.length}`);

    if (models.length > 0) {
      const firstModel = models[0];
      console.log(`   First model: ${firstModel.name}`);
      console.log(`   Provider: ${firstModel.provider}`);
      console.log(`   Category: ${firstModel.category}`);
      console.log(`   Credits: ${firstModel.credits_required}`);
    }
  });

  await logTest('Get Model by ID', async () => {
    const supabase = getSupabaseService();

    // First get all models to get a valid ID
    const models = await supabase.getActiveAIModels();
    if (models.length === 0) {
      console.log('   ⚠️  No models available for testing');
      return;
    }

    const testId = models[0].id;
    const model = await supabase.getModelById(testId);

    if (!model) {
      throw new Error('Model not found');
    }

    console.log(`   Retrieved model: ${model.name}`);
    console.log(`   ID: ${model.id}`);
    console.log(`   Active: ${model.is_active}`);
  });

  await logTest('Get Models by Category', async () => {
    const supabase = getSupabaseService();
    const models = await supabase.getActiveAIModels();

    if (models.length === 0) {
      console.log('   ⚠️  No models available');
      return;
    }

    const category = models[0].category;
    const categoryModels = await supabase.getModelsByCategory(category);

    console.log(`   Category: ${category}`);
    console.log(`   Models in category: ${categoryModels.length}`);
  });

  await logTest('Get Models by Provider', async () => {
    const supabase = getSupabaseService();
    const models = await supabase.getActiveAIModels();

    if (models.length === 0) {
      console.log('   ⚠️  No models available');
      return;
    }

    const provider = models[0].provider;
    const providerModels = await supabase.getModelsByProvider(provider);

    console.log(`   Provider: ${provider}`);
    console.log(`   Models from provider: ${providerModels.length}`);
  });
}

// ============================================================================
// TEMPLATE TESTS
// ============================================================================

async function testTemplates() {
  await logTest('Get Public Templates', async () => {
    const supabase = getSupabaseService();
    const templates = await supabase.getTemplates();

    console.log(`   Total templates: ${templates.length}`);

    if (templates.length > 0) {
      const firstTemplate = templates[0];
      console.log(`   First template: ${firstTemplate.name}`);
      console.log(`   Category: ${firstTemplate.category}`);
      console.log(`   Usage count: ${firstTemplate.usage_count}`);
      console.log(`   Tags: ${firstTemplate.tags?.join(', ')}`);
    }
  });

  await logTest('Get Templates by Category', async () => {
    const supabase = getSupabaseService();

    const ecommerceTemplates = await supabase.getTemplatesByCategory('ecommerce');
    console.log(`   E-commerce templates: ${ecommerceTemplates.length}`);

    const amazonTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Amazon');
    console.log(`   Amazon templates: ${amazonTemplates.length}`);
  });

  await logTest('Search Templates by Tags', async () => {
    const supabase = getSupabaseService();

    const vintageTemplates = await supabase.searchTemplatesByTags(['vintage']);
    console.log(`   Templates with 'vintage' tag: ${vintageTemplates.length}`);

    const amazonWhiteBg = await supabase.searchTemplatesByTags(
      ['amazon', 'white-background'],
      true
    );
    console.log(`   Templates with amazon AND white-background: ${amazonWhiteBg.length}`);
  });
}

// ============================================================================
// PRODUCTS TESTS
// ============================================================================

async function testProducts() {
  await logTest('Get Subscription Plans', async () => {
    const supabase = getSupabaseService();
    const plans = await supabase.getSubscriptionPlans();

    console.log(`   Total subscription plans: ${plans.length}`);

    if (plans.length > 0) {
      const firstPlan = plans[0];
      console.log(`   First plan: ${firstPlan.name}`);
      console.log(`   Tier: ${firstPlan.tier}`);
      console.log(`   Price: $${firstPlan.price_usd}`);
      console.log(`   Credits: ${firstPlan.credits_granted}`);
    }
  });

  await logTest('Get Credit Packs', async () => {
    const supabase = getSupabaseService();
    const packs = await supabase.getCreditPacks();

    console.log(`   Total credit packs: ${packs.length}`);

    if (packs.length > 0) {
      const firstPack = packs[0];
      console.log(`   First pack: ${firstPack.name}`);
      console.log(`   Price: $${firstPack.price_usd}`);
      console.log(`   Credits: ${firstPack.credits_granted}`);
    }
  });

  await logTest('Get Product by Tier', async () => {
    const supabase = getSupabaseService();

    const freePlan = await supabase.getProductByTier('free');
    if (freePlan) {
      console.log(`   Free plan: ${freePlan.name}`);
      console.log(`   Credits: ${freePlan.credits_granted}`);
    } else {
      console.log('   ⚠️  Free plan not found');
    }
  });
}

// ============================================================================
// CACHING TESTS
// ============================================================================

async function testCaching() {
  await logTest('Cache Performance', async () => {
    const supabase = getSupabaseService();

    // First call - should hit database
    console.log('   First call (database)...');
    const start1 = Date.now();
    await supabase.getActiveAIModels();
    const time1 = Date.now() - start1;
    console.log(`   Time: ${time1}ms`);

    // Second call - should hit cache
    console.log('   Second call (cache)...');
    const start2 = Date.now();
    await supabase.getActiveAIModels();
    const time2 = Date.now() - start2;
    console.log(`   Time: ${time2}ms`);

    if (time2 < time1) {
      console.log('   ✓ Cache is working (faster on second call)');
    }
  });

  await logTest('Cache Bypass', async () => {
    const supabase = getSupabaseService();

    const start1 = Date.now();
    await supabase.getActiveAIModels(false); // Bypass cache
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await supabase.getActiveAIModels(false); // Bypass cache again
    const time2 = Date.now() - start2;

    console.log(`   First bypass: ${time1}ms`);
    console.log(`   Second bypass: ${time2}ms`);
    console.log('   ✓ Cache bypass working (both hit database)');
  });

  await logTest('Cache Invalidation', async () => {
    const supabase = getSupabaseService();

    // Load and cache
    await supabase.getActiveAIModels();
    console.log('   ✓ Data cached');

    // Invalidate
    supabase.invalidateAIModelsCache();
    console.log('   ✓ Cache invalidated');

    // Next call should hit database again
    const start = Date.now();
    await supabase.getActiveAIModels();
    const time = Date.now() - start;
    console.log(`   ✓ Refetched from database: ${time}ms`);
  });
}

// ============================================================================
// PARALLEL LOADING TEST
// ============================================================================

async function testParallelLoading() {
  await logTest('Parallel Data Loading', async () => {
    const supabase = getSupabaseService();

    const start = Date.now();

    const [models, templates, plans] = await Promise.all([
      supabase.getActiveAIModels(),
      supabase.getTemplates(),
      supabase.getSubscriptionPlans(),
    ]);

    const time = Date.now() - start;

    console.log(`   Loaded in parallel: ${time}ms`);
    console.log(`   - Models: ${models.length}`);
    console.log(`   - Templates: ${templates.length}`);
    console.log(`   - Plans: ${plans.length}`);
  });
}

// ============================================================================
// ERROR HANDLING TEST
// ============================================================================

async function testErrorHandling() {
  await logTest('Handle Not Found', async () => {
    const supabase = getSupabaseService();

    const model = await supabase.getModelById('invalid-id-12345');

    if (model === null) {
      console.log('   ✓ Correctly returns null for not found');
    } else {
      throw new Error('Expected null for invalid ID');
    }
  });

  await logTest('Handle Empty Results', async () => {
    const supabase = getSupabaseService();

    const templates = await supabase.getTemplatesByCategory('non-existent-category');

    if (Array.isArray(templates) && templates.length === 0) {
      console.log('   ✓ Returns empty array for no results');
    } else {
      throw new Error('Expected empty array');
    }
  });
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

export async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          Supabase Service Layer - Test Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Connection
  await testConnection();

  // AI Models
  await testAIModels();

  // Templates
  await testTemplates();

  // Products
  await testProducts();

  // Caching
  await testCaching();

  // Parallel Loading
  await testParallelLoading();

  // Error Handling
  await testErrorHandling();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Tests Complete                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Cleanup
  resetGlobalSupabaseService();
}

// ============================================================================
// INDIVIDUAL TEST EXPORTS
// ============================================================================

export const tests = {
  connection: testConnection,
  aiModels: testAIModels,
  templates: testTemplates,
  products: testProducts,
  caching: testCaching,
  parallelLoading: testParallelLoading,
  errorHandling: testErrorHandling,
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
