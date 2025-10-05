/**
 * Template Library Types
 *
 * Type definitions for PikcelAI templates used in Shopify app
 */

// ============================================================================
// TEMPLATE CATEGORIES
// ============================================================================

export type TemplateCategory =
  | 'ecommerce'
  | 'photo-editing'
  | 'trending'
  | 'custom';

// ============================================================================
// TEMPLATE OPERATION
// ============================================================================

export interface TemplateOperation {
  id: string;
  name: string;
  description: string;
  order: number;
  parameters?: Record<string, any>;
}

// ============================================================================
// TEMPLATE DEFINITION
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;

  // Visual
  preview_image_url: string;
  example_before_url?: string;
  example_after_url?: string;

  // Operations
  operations: TemplateOperation[];

  // Metadata
  usage_count: number;
  popularity_score: number;
  tags: string[];

  // Timing
  estimated_time_seconds: number;
  credits_required: number;

  // Status
  is_featured: boolean;
  is_premium: boolean;
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ============================================================================
// TEMPLATE FILTERS
// ============================================================================

export interface TemplateFilters {
  category?: TemplateCategory;
  search?: string;
  tags?: string[];
  is_featured?: boolean;
  is_premium?: boolean;
  sort_by?: 'popularity' | 'name' | 'created_at' | 'usage_count';
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GetTemplatesResponse {
  success: boolean;
  data: Template[];
  count: number;
  total: number;
  has_more: boolean;
}

export interface GetTemplateResponse {
  success: boolean;
  data: Template;
}

// ============================================================================
// TEMPLATE APPLICATION
// ============================================================================

export interface ApplyTemplateParams {
  template_id: string;
  product_ids: string[];
  override_parameters?: Record<string, any>;
}

export interface ApplyTemplateResponse {
  success: boolean;
  batch_id: string;
  jobs_created: number;
  estimated_completion_time: number;
  message: string;
}

// ============================================================================
// PREDEFINED TEMPLATES (for reference)
// ============================================================================

export const PREDEFINED_TEMPLATES = {
  // E-commerce Templates
  AMAZON_WHITE_BG: 'amazon_standard_white_background',
  SHOPIFY_TRANSPARENT: 'shopify_transparent_background',
  ETSY_CLEAN_BG: 'etsy_clean_background',
  PRODUCT_SHADOW: 'product_drop_shadow',

  // Photo Editing Templates
  BLUR_BACKGROUND: 'blur_background',
  COLOR_SPLASH: 'color_splash_effect',
  VINTAGE_LOOK: 'vintage_photo_look',
  BLACK_WHITE: 'black_and_white_conversion',

  // Trending Templates
  MOTION_BLUR: 'motion_blur_effect',
  FILM_LOOK: 'cinematic_film_look',
  HDR_ENHANCEMENT: 'hdr_photo_enhancement',
  PORTRAIT_RETOUCH: 'portrait_retouching',
} as const;

// ============================================================================
// TEMPLATE CATEGORIES METADATA
// ============================================================================

export interface CategoryMetadata {
  id: TemplateCategory;
  label: string;
  description: string;
  icon?: string;
  color?: string;
}

export const TEMPLATE_CATEGORIES: CategoryMetadata[] = [
  {
    id: 'ecommerce',
    label: 'E-commerce',
    description: 'Platform-specific standards (Amazon, Shopify, Etsy)',
    color: 'blue',
  },
  {
    id: 'photo-editing',
    label: 'Photo Editing',
    description: 'Professional photo effects and enhancements',
    color: 'green',
  },
  {
    id: 'trending',
    label: 'Trending',
    description: 'Popular and trending editing styles',
    color: 'purple',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'User-created custom templates',
    color: 'gray',
  },
];
