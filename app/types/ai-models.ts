// AI Model Types for PikcelAI Integration

export interface AIModel {
  // Core fields
  id: string;
  name: string;
  description: string;
  provider: 'gemini' | 'openai' | 'replicate' | 'image-gpt-1';
  is_active: boolean;

  // Provider-agnostic configuration
  model_config?: Record<string, any>;
  prompt_template?: string;
  default_parameters?: Record<string, any>;
  capabilities?: {
    multi_image?: boolean;
    batch_processing?: boolean;
    aspect_ratios?: string[];
    [key: string]: any;
  };

  // Technical specifications
  supported_formats?: string[];
  output_formats?: string[];
  max_input_size?: number;
  processing_time_estimate?: number;

  // Pricing and business logic
  credits_required: number;
  base_price: number;
  cost_multiplier?: number;

  // UI and categorization
  icon_name?: string;
  category: AIToolCategory;
  difficulty_level?: number;
  model_quality?: string;
  preview_image_url?: string;
  preview_image_source?: 'pexels' | 'unsplash' | 'custom' | 'placeholder';

  // Timestamps
  created_at?: string;
  updated_at?: string;

  // Legacy compatibility
  price?: number;
  credits?: number;
  icon?: string;
  parameters?: Record<string, any>;
}

export type AIToolCategory =
  | 'Content Generation'
  | 'Product Enhancement'
  | 'Fashion'
  | 'Background'
  | 'Design'
  | 'Photography'
  | 'Social Marketing';

export interface CategoryGroup {
  name: AIToolCategory;
  description: string;
  icon: string;
  tools: AIModel[];
}

export interface ToolFilters {
  search: string;
  category: AIToolCategory | 'All';
  minCredits?: number;
  maxCredits?: number;
  provider?: string;
}
