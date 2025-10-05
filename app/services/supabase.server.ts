/**
 * Supabase Service Layer for PikcelAI Data
 *
 * Direct Supabase client for querying PikcelAI production database.
 * Provides typed methods for accessing AI models, templates, products, and more.
 *
 * @module supabase.server
 * @version 1.0.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SupabaseConfig {
  url: string;
  serviceKey: string;
  options?: {
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
    };
    db?: {
      schema?: string;
    };
  };
}

const DEFAULT_CONFIG = {
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  },
};

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class SupabaseCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Pattern-based invalidation
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// ============================================================================
// SUPABASE CLIENT CLASS
// ============================================================================

export class SupabaseService {
  private client: SupabaseClient<Database>;
  private cache = new SupabaseCache();

  constructor(config: SupabaseConfig) {
    if (!config.url) {
      throw new Error('Supabase URL is required');
    }

    if (!config.serviceKey) {
      throw new Error('Supabase service key is required');
    }

    this.client = createClient<Database>(
      config.url,
      config.serviceKey,
      {
        ...DEFAULT_CONFIG.options,
        ...config.options,
      }
    );
  }

  // ==========================================================================
  // AI MODELS METHODS
  // ==========================================================================

  /**
   * Get all active AI models
   *
   * @param useCache - Whether to use cached data (default: true)
   * @returns Array of active AI models
   *
   * @example
   * const models = await supabase.getActiveAIModels();
   */
  async getActiveAIModels(useCache = true) {
    const cacheKey = 'ai-models:active';

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['ai_models_new']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('ai_models_new')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`);
    }

    // Cache for 5 minutes
    this.cache.set(cacheKey, data || [], 5 * 60 * 1000);

    return data || [];
  }

  /**
   * Get all AI models (including inactive)
   *
   * @param useCache - Whether to use cached data
   * @returns Array of all AI models
   */
  async getAllAIModels(useCache = true) {
    const cacheKey = 'ai-models:all';

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['ai_models_new']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('ai_models_new')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch all AI models: ${error.message}`);
    }

    // Cache for 5 minutes
    this.cache.set(cacheKey, data || [], 5 * 60 * 1000);

    return data || [];
  }

  /**
   * Get AI model by ID
   *
   * @param id - Model ID
   * @param useCache - Whether to use cached data
   * @returns AI model or null if not found
   *
   * @example
   * const model = await supabase.getModelById('background-removal');
   */
  async getModelById(id: string, useCache = true) {
    const cacheKey = `ai-model:${id}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['ai_models_new']['Row']>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('ai_models_new')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch AI model: ${error.message}`);
    }

    // Cache for 10 minutes
    if (data) {
      this.cache.set(cacheKey, data, 10 * 60 * 1000);
    }

    return data;
  }

  /**
   * Get AI models by category
   *
   * @param category - Model category
   * @param activeOnly - Only return active models (default: true)
   * @param useCache - Whether to use cached data
   * @returns Array of AI models in the category
   *
   * @example
   * const models = await supabase.getModelsByCategory('background-removal');
   */
  async getModelsByCategory(category: string, activeOnly = true, useCache = true) {
    const cacheKey = `ai-models:category:${category}:${activeOnly}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['ai_models_new']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.client
      .from('ai_models_new')
      .select('*')
      .eq('category', category);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch AI models by category: ${error.message}`);
    }

    // Cache for 5 minutes
    this.cache.set(cacheKey, data || [], 5 * 60 * 1000);

    return data || [];
  }

  /**
   * Get AI models by provider
   *
   * @param provider - Provider name (openai, replicate, anthropic, google)
   * @param activeOnly - Only return active models (default: true)
   * @param useCache - Whether to use cached data
   * @returns Array of AI models from the provider
   */
  async getModelsByProvider(provider: string, activeOnly = true, useCache = true) {
    const cacheKey = `ai-models:provider:${provider}:${activeOnly}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['ai_models_new']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.client
      .from('ai_models_new')
      .select('*')
      .eq('provider', provider);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch AI models by provider: ${error.message}`);
    }

    // Cache for 5 minutes
    this.cache.set(cacheKey, data || [], 5 * 60 * 1000);

    return data || [];
  }

  // ==========================================================================
  // EDITING TEMPLATES METHODS
  // ==========================================================================

  /**
   * Get all public editing templates
   *
   * @param useCache - Whether to use cached data
   * @returns Array of public templates
   *
   * @example
   * const templates = await supabase.getTemplates();
   */
  async getTemplates(useCache = true) {
    const cacheKey = 'templates:public';

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['editing_templates']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('editing_templates')
      .select('*')
      .eq('is_public', true)
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    // Cache for 10 minutes
    this.cache.set(cacheKey, data || [], 10 * 60 * 1000);

    return data || [];
  }

  /**
   * Get template by ID
   *
   * @param id - Template ID
   * @param useCache - Whether to use cached data
   * @returns Template or null if not found
   */
  async getTemplateById(id: string, useCache = true) {
    const cacheKey = `template:${id}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['editing_templates']['Row']>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('editing_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    // Cache for 10 minutes
    if (data) {
      this.cache.set(cacheKey, data, 10 * 60 * 1000);
    }

    return data;
  }

  /**
   * Get templates by category
   *
   * @param category - Template category (ecommerce, photo-editing, social-media, trending, custom)
   * @param subcategory - Optional subcategory filter (Amazon, Shopify, Etsy, etc.)
   * @param useCache - Whether to use cached data
   * @returns Array of templates
   *
   * @example
   * const amazonTemplates = await supabase.getTemplatesByCategory('ecommerce', 'Amazon');
   */
  async getTemplatesByCategory(category: string, subcategory?: string, useCache = true) {
    const cacheKey = `templates:category:${category}${subcategory ? `:${subcategory}` : ''}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['editing_templates']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    let query = this.client
      .from('editing_templates')
      .select('*')
      .eq('category', category)
      .eq('is_active', true);

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query
      .order('usage_count', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch templates by category: ${error.message}`);
    }

    // Cache for 10 minutes
    this.cache.set(cacheKey, data || [], 10 * 60 * 1000);

    return data || [];
  }

  /**
   * Search templates by tags
   *
   * @param tags - Array of tags to search for
   * @param matchAll - If true, require all tags to match (default: false)
   * @param useCache - Whether to use cached data
   * @returns Array of matching templates
   */
  async searchTemplatesByTags(tags: string[], matchAll = false, useCache = true) {
    const cacheKey = `templates:tags:${tags.sort().join(',')}:${matchAll}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['editing_templates']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('editing_templates')
      .select('*')
      .eq('is_active', true)
      .contains('tags', tags);

    if (error) {
      throw new Error(`Failed to search templates by tags: ${error.message}`);
    }

    let results = data || [];

    // If matchAll is true, filter to only templates that have ALL tags
    if (matchAll && results.length > 0) {
      results = results.filter(template =>
        tags.every(tag => template.tags?.includes(tag))
      );
    }

    // Cache for 5 minutes
    this.cache.set(cacheKey, results, 5 * 60 * 1000);

    return results;
  }

  // ==========================================================================
  // SUBSCRIPTION PRODUCTS METHODS
  // ==========================================================================

  /**
   * Get all active subscription plans
   *
   * @param useCache - Whether to use cached data
   * @returns Array of active subscription products
   *
   * @example
   * const plans = await supabase.getSubscriptionPlans();
   */
  async getSubscriptionPlans(useCache = true) {
    const cacheKey = 'products:subscriptions';

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['products']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('type', 'subscription')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch subscription plans: ${error.message}`);
    }

    // Cache for 15 minutes
    this.cache.set(cacheKey, data || [], 15 * 60 * 1000);

    return data || [];
  }

  /**
   * Get all active credit packs
   *
   * @param useCache - Whether to use cached data
   * @returns Array of active credit pack products
   */
  async getCreditPacks(useCache = true) {
    const cacheKey = 'products:packs';

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['products']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('type', 'pack')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch credit packs: ${error.message}`);
    }

    // Cache for 15 minutes
    this.cache.set(cacheKey, data || [], 15 * 60 * 1000);

    return data || [];
  }

  /**
   * Get all active products (subscriptions and packs)
   *
   * @param useCache - Whether to use cached data
   * @returns Array of all active products
   */
  async getAllProducts(useCache = true) {
    const cacheKey = 'products:all';

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['products']['Row'][]>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    // Cache for 15 minutes
    this.cache.set(cacheKey, data || [], 15 * 60 * 1000);

    return data || [];
  }

  /**
   * Get product by ID
   *
   * @param id - Product ID
   * @param useCache - Whether to use cached data
   * @returns Product or null if not found
   */
  async getProductById(id: string, useCache = true) {
    const cacheKey = `product:${id}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['products']['Row']>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    // Cache for 15 minutes
    if (data) {
      this.cache.set(cacheKey, data, 15 * 60 * 1000);
    }

    return data;
  }

  /**
   * Get product by tier
   *
   * @param tier - Product tier (free, business, pack_small, etc.)
   * @param useCache - Whether to use cached data
   * @returns Product or null if not found
   */
  async getProductByTier(tier: string, useCache = true) {
    const cacheKey = `product:tier:${tier}`;

    if (useCache) {
      const cached = this.cache.get<Database['public']['Tables']['products']['Row']>(cacheKey);
      if (cached) return cached;
    }

    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('tier', tier)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch product by tier: ${error.message}`);
    }

    // Cache for 15 minutes
    if (data) {
      this.cache.set(cacheKey, data, 15 * 60 * 1000);
    }

    return data;
  }

  // ==========================================================================
  // JOBS METHODS
  // ==========================================================================

  /**
   * Get job by ID
   *
   * @param jobId - Job ID
   * @returns Job or null if not found
   */
  async getJobById(jobId: string) {
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch job: ${error.message}`);
    }

    return data;
  }

  /**
   * Get jobs by status
   *
   * @param status - Job status (pending, processing, completed, failed, cancelled)
   * @param limit - Maximum number of jobs to return (default: 50)
   * @returns Array of jobs
   */
  async getJobsByStatus(status: string, limit = 50) {
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch jobs by status: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get jobs by profile ID
   *
   * @param profileId - Profile ID
   * @param limit - Maximum number of jobs to return (default: 50)
   * @returns Array of jobs
   */
  async getJobsByProfileId(profileId: string, limit = 50) {
    const { data, error } = await this.client
      .from('jobs')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch jobs by profile: ${error.message}`);
    }

    return data || [];
  }

  // ==========================================================================
  // PROFILES METHODS
  // ==========================================================================

  /**
   * Get profile by ID
   *
   * @param profileId - Profile ID
   * @returns Profile or null if not found
   */
  async getProfileById(profileId: string) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    return data;
  }

  /**
   * Get profile by email
   *
   * @param email - Email address
   * @returns Profile or null if not found
   */
  async getProfileByEmail(email: string) {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch profile by email: ${error.message}`);
    }

    return data;
  }

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate specific cache entry
   *
   * @param key - Cache key to invalidate
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   *
   * @param pattern - RegExp pattern to match cache keys
   *
   * @example
   * // Invalidate all AI model caches
   * supabase.invalidateCachePattern(/^ai-model/);
   */
  invalidateCachePattern(pattern: RegExp): void {
    this.cache.invalidatePattern(pattern);
  }

  /**
   * Invalidate all AI model caches
   */
  invalidateAIModelsCache(): void {
    this.invalidateCachePattern(/^ai-model/);
  }

  /**
   * Invalidate all template caches
   */
  invalidateTemplatesCache(): void {
    this.invalidateCachePattern(/^template/);
  }

  /**
   * Invalidate all product caches
   */
  invalidateProductsCache(): void {
    this.invalidateCachePattern(/^product/);
  }

  // ==========================================================================
  // RAW CLIENT ACCESS
  // ==========================================================================

  /**
   * Get raw Supabase client for advanced queries
   *
   * @returns Supabase client instance
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Supabase service instance
 *
 * @param config - Supabase configuration
 * @returns Supabase service instance
 *
 * @example
 * const supabase = createSupabaseService({
 *   url: process.env.SUPABASE_URL!,
 *   serviceKey: process.env.SUPABASE_SERVICE_KEY!
 * });
 */
export function createSupabaseService(config: SupabaseConfig): SupabaseService {
  return new SupabaseService(config);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let globalSupabaseService: SupabaseService | null = null;

/**
 * Get or create global Supabase service instance
 *
 * @returns Global Supabase service instance
 *
 * @example
 * const supabase = getSupabaseService();
 * const models = await supabase.getActiveAIModels();
 */
export function getSupabaseService(): SupabaseService {
  if (!globalSupabaseService) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required'
      );
    }

    globalSupabaseService = createSupabaseService({
      url,
      serviceKey,
    });
  }

  return globalSupabaseService;
}

/**
 * Reset global Supabase service (useful for testing)
 */
export function resetGlobalSupabaseService(): void {
  globalSupabaseService = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SupabaseService;
