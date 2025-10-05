/**
 * PikcelAI API Type Definitions
 *
 * Complete TypeScript types for all PikcelAI API requests and responses
 */

// ============================================================================
// AI MODELS & TOOLS
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  description: string;
  category: string;
  credits_required: number;
  base_price: number;
  replicate_model_id?: string;
  replicate_version_id?: string;
  openai_prompt_template?: string;
  default_parameters?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetAIModelsResponse {
  success: boolean;
  data: AIModel[];
  count: number;
}

// ============================================================================
// TEMPLATES
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  tool_id: string;
  parameters: Record<string, any>;
  preview_url?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GetTemplatesResponse {
  success: boolean;
  data: Template[];
  count: number;
}

// ============================================================================
// JOBS & PROCESSING
// ============================================================================

export type JobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface DispatchJobParams {
  tool_id: string;
  input_image_url: string;
  parameters?: Record<string, any>;
  template_id?: string;
  priority?: JobPriority;
  webhook_url?: string;
  metadata?: Record<string, any>;
}

export interface Job {
  id: string;
  user_id: string;
  tool_id: string;
  tool_name?: string;
  status: JobStatus;
  priority: JobPriority;
  input_image_url: string;
  output_image_url?: string;
  parameters: Record<string, any>;
  error_message?: string;
  credits_used: number;
  processing_time_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface DispatchJobResponse {
  success: boolean;
  data: Job;
  message?: string;
}

export interface GetJobStatusResponse {
  success: boolean;
  data: Job;
}

export interface GetJobHistoryParams {
  limit?: number;
  offset?: number;
  status?: JobStatus;
  tool_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface GetJobHistoryResponse {
  success: boolean;
  data: Job[];
  count: number;
  total: number;
  has_more: boolean;
}

// ============================================================================
// USER PROFILE & CREDITS
// ============================================================================

export interface UserSubscription {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired';
  credits_included: number;
  renewal_date?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  credits_balance: number;
  subscription: UserSubscription;
  total_jobs_processed: number;
  created_at: string;
  updated_at: string;
}

export interface GetUserProfileResponse {
  success: boolean;
  data: UserProfile;
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

export interface UploadImageParams {
  file: File | Blob;
  filename?: string;
  folder?: string;
}

export interface UploadImageResponse {
  success: boolean;
  data: {
    url: string;
    path: string;
    size: number;
    mime_type: string;
    uploaded_at: string;
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkJobParams {
  tool_id: string;
  input_images: Array<{
    url: string;
    metadata?: Record<string, any>;
  }>;
  parameters?: Record<string, any>;
  template_id?: string;
  priority?: JobPriority;
  webhook_url?: string;
}

export interface BulkJob {
  id: string;
  total_images: number;
  completed: number;
  failed: number;
  status: JobStatus;
  jobs: Job[];
  created_at: string;
  updated_at: string;
}

export interface DispatchBulkJobResponse {
  success: boolean;
  data: BulkJob;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface PikcelAPIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  status: number;
}

export type PikcelAPIResponse<T> = T | PikcelAPIError;

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

// ============================================================================
// WEBHOOK PAYLOAD
// ============================================================================

export interface WebhookPayload {
  event: 'job.completed' | 'job.failed' | 'job.started';
  job_id: string;
  job: Job;
  timestamp: string;
  signature: string;
}
