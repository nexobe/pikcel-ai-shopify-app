/**
 * Supabase Database Type Definitions
 *
 * Complete TypeScript types for PikcelAI Supabase database schema.
 * Auto-generated types based on database structure.
 *
 * @module supabase.types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export type ProductType = 'subscription' | 'pack';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

export interface Database {
  public: {
    Tables: {
      // AI Models Table (New Provider-Agnostic)
      ai_models_new: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          provider: string; // 'openai', 'replicate', 'anthropic', 'google'
          model_config: Json; // Provider-specific configuration
          prompt_template: string | null;
          default_parameters: Json;
          capabilities: Json;
          supported_formats: string[];
          output_formats: string[];
          max_input_size: number;
          processing_time_estimate: number;
          credits_required: number;
          base_price: number;
          cost_multiplier: number;
          icon_name: string | null;
          category: string;
          difficulty_level: number;
          model_quality: 'standard' | 'hd' | 'ultra';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          provider: string;
          model_config: Json;
          prompt_template?: string | null;
          default_parameters?: Json;
          capabilities?: Json;
          supported_formats?: string[];
          output_formats?: string[];
          max_input_size?: number;
          processing_time_estimate?: number;
          credits_required?: number;
          base_price?: number;
          cost_multiplier?: number;
          icon_name?: string | null;
          category?: string;
          difficulty_level?: number;
          model_quality?: 'standard' | 'hd' | 'ultra';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          provider?: string;
          model_config?: Json;
          prompt_template?: string | null;
          default_parameters?: Json;
          capabilities?: Json;
          supported_formats?: string[];
          output_formats?: string[];
          max_input_size?: number;
          processing_time_estimate?: number;
          credits_required?: number;
          base_price?: number;
          cost_multiplier?: number;
          icon_name?: string | null;
          category?: string;
          difficulty_level?: number;
          model_quality?: 'standard' | 'hd' | 'ultra';
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Editing Templates Table
      editing_templates: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: string;
          subcategory: string | null;
          operations: Json; // Array of operations
          preview_url: string | null;
          tags: string[];
          created_by: string | null;
          is_public: boolean;
          is_active: boolean;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          subcategory?: string | null;
          operations: Json;
          preview_url?: string | null;
          tags?: string[];
          created_by?: string | null;
          is_public?: boolean;
          is_active?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          subcategory?: string | null;
          operations?: Json;
          preview_url?: string | null;
          tags?: string[];
          created_by?: string | null;
          is_public?: boolean;
          is_active?: boolean;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Products Table (Subscriptions & Credit Packs)
      products: {
        Row: {
          id: string;
          type: ProductType;
          tier: string | null;
          name: string;
          description: string | null;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          price_usd: number | null;
          credits_granted: number;
          image_upload_limit: number | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type: ProductType;
          tier?: string | null;
          name: string;
          description?: string | null;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          price_usd?: number | null;
          credits_granted?: number;
          image_upload_limit?: number | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: ProductType;
          tier?: string | null;
          name?: string;
          description?: string | null;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          price_usd?: number | null;
          credits_granted?: number;
          image_upload_limit?: number | null;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Jobs Table
      jobs: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          status: JobStatus;
          input_url: string;
          output_url: string | null;
          parameters: Json | null;
          replicate_prediction_id: string | null;
          stripe_payment_intent_id: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: string;
          status?: JobStatus;
          input_url: string;
          output_url?: string | null;
          parameters?: Json | null;
          replicate_prediction_id?: string | null;
          stripe_payment_intent_id?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          type?: string;
          status?: JobStatus;
          input_url?: string;
          output_url?: string | null;
          parameters?: Json | null;
          replicate_prediction_id?: string | null;
          stripe_payment_intent_id?: string | null;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Profiles Table
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          image_quota: number;
          images_used: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          subscription_plan_id: string | null;
          subscription_period_end: string | null;
          license_key_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          image_quota?: number;
          images_used?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_plan_id?: string | null;
          subscription_period_end?: string | null;
          license_key_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          image_quota?: number;
          images_used?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_plan_id?: string | null;
          subscription_period_end?: string | null;
          license_key_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Enterprise Plans Table
      enterprise_plans: {
        Row: {
          id: string;
          name: string;
          storage_quota: number;
          custom_features: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          storage_quota: number;
          custom_features?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          storage_quota?: number;
          custom_features?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // License Keys Table
      license_keys: {
        Row: {
          id: string;
          key: string;
          enterprise_plan_id: string;
          assigned_profile_id: string | null;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          enterprise_plan_id: string;
          assigned_profile_id?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          enterprise_plan_id?: string;
          assigned_profile_id?: string | null;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // AI Job Payments Table
      ai_job_payments: {
        Row: {
          id: number;
          profile_id: string;
          job_id: string;
          amount: number;
          status: string;
          stripe_payment_intent_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          profile_id: string;
          job_id: string;
          amount: number;
          status: string;
          stripe_payment_intent_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          profile_id?: string;
          job_id?: string;
          amount?: number;
          status?: string;
          stripe_payment_intent_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Users Table (Auth-related)
      users: {
        Row: {
          id: number;
          auth_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          auth_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          auth_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_template_usage: {
        Args: {
          template_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      product_type: ProductType;
    };
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

// AI Model Types
export type AIModel = Database['public']['Tables']['ai_models_new']['Row'];
export type AIModelInsert = Database['public']['Tables']['ai_models_new']['Insert'];
export type AIModelUpdate = Database['public']['Tables']['ai_models_new']['Update'];

// Template Types
export type EditingTemplate = Database['public']['Tables']['editing_templates']['Row'];
export type EditingTemplateInsert = Database['public']['Tables']['editing_templates']['Insert'];
export type EditingTemplateUpdate = Database['public']['Tables']['editing_templates']['Update'];

// Product Types
export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Job Types
export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

// Profile Types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Enterprise Plan Types
export type EnterprisePlan = Database['public']['Tables']['enterprise_plans']['Row'];
export type EnterprisePlanInsert = Database['public']['Tables']['enterprise_plans']['Insert'];
export type EnterprisePlanUpdate = Database['public']['Tables']['enterprise_plans']['Update'];

// License Key Types
export type LicenseKey = Database['public']['Tables']['license_keys']['Row'];
export type LicenseKeyInsert = Database['public']['Tables']['license_keys']['Insert'];
export type LicenseKeyUpdate = Database['public']['Tables']['license_keys']['Update'];

// Payment Types
export type AIJobPayment = Database['public']['Tables']['ai_job_payments']['Row'];
export type AIJobPaymentInsert = Database['public']['Tables']['ai_job_payments']['Insert'];
export type AIJobPaymentUpdate = Database['public']['Tables']['ai_job_payments']['Update'];

// User Types
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

// ============================================================================
// MODEL CONFIG TYPES
// ============================================================================

// OpenAI Model Config
export interface OpenAIModelConfig {
  model: string; // e.g., 'image-gpt-1'
  version?: string;
  api_endpoint?: string;
}

// Replicate Model Config
export interface ReplicateModelConfig {
  model_id: string;
  version_id: string;
  webhook_url?: string;
}

// Anthropic Model Config
export interface AnthropicModelConfig {
  model: string;
  version?: string;
}

// Google Model Config
export interface GoogleModelConfig {
  model: string;
  project_id?: string;
}

// Union type for all model configs
export type ModelConfig =
  | OpenAIModelConfig
  | ReplicateModelConfig
  | AnthropicModelConfig
  | GoogleModelConfig;

// ============================================================================
// TEMPLATE OPERATION TYPES
// ============================================================================

export interface BackgroundRemovalOperation {
  type: 'background_removal';
}

export interface BackgroundReplaceOperation {
  type: 'background_replace';
  color: string;
}

export interface ResizeOperation {
  type: 'resize';
  width: number;
  height: number;
  fit?: 'contain' | 'cover' | 'fill';
  padding?: number;
}

export interface ColorCorrectionOperation {
  type: 'color_correction';
  white_balance?: 'auto' | 'manual';
  temperature?: number;
}

export interface ExportOperation {
  type: 'export';
  format: 'JPEG' | 'PNG' | 'WEBP';
  quality?: number;
}

export interface ShadowOperation {
  type: 'shadows';
  add_realistic_shadow?: boolean;
  angle?: number;
  intensity?: number;
}

export interface BlurOperation {
  type: 'blur';
  amount: number;
}

export interface BrightnessOperation {
  type: 'brightness';
  value: number;
}

export interface ContrastOperation {
  type: 'contrast';
  value: number;
}

export interface SepiaOperation {
  type: 'sepia';
  intensity: number;
}

export interface GrayscaleOperation {
  type: 'grayscale';
  contrast_boost?: boolean;
}

// Union type for all operations
export type TemplateOperation =
  | BackgroundRemovalOperation
  | BackgroundReplaceOperation
  | ResizeOperation
  | ColorCorrectionOperation
  | ExportOperation
  | ShadowOperation
  | BlurOperation
  | BrightnessOperation
  | ContrastOperation
  | SepiaOperation
  | GrayscaleOperation;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}
