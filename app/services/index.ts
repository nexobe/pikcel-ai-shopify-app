/**
 * PikcelAI Service Layer - Main Export
 *
 * Centralized exports for all PikcelAI service functionality
 */

// ============================================================================
// CLIENT EXPORTS
// ============================================================================

export {
  PikcelAIClient,
  createPikcelAIClient,
  getPikcelAIClient,
  resetGlobalClient,
  type default as DefaultPikcelAIClient,
} from './pikcelai.server';

// ============================================================================
// ERROR EXPORTS
// ============================================================================

export {
  PikcelAPIErrorClass,
  PikcelNetworkError,
  PikcelRateLimitError,
} from './pikcelai.server';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Models & Tools
  AIModel,
  GetAIModelsResponse,

  // Templates
  Template,
  GetTemplatesResponse,

  // Jobs
  Job,
  JobStatus,
  JobPriority,
  DispatchJobParams,
  DispatchJobResponse,
  GetJobStatusResponse,
  GetJobHistoryParams,
  GetJobHistoryResponse,

  // User Profile
  UserProfile,
  UserSubscription,
  GetUserProfileResponse,

  // Image Upload
  UploadImageParams,
  UploadImageResponse,

  // Bulk Operations
  BulkJobParams,
  BulkJob,
  DispatchBulkJobResponse,

  // Error Handling
  PikcelAPIError,
  PikcelAPIResponse,

  // Request Options
  RequestOptions,

  // Webhooks
  WebhookPayload,
} from './pikcelai.types';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  // Job Status Helpers
  isJobFinal,
  isJobProcessing,
  isJobSuccessful,
  getJobStatusLabel,

  // Credit Calculations
  calculateJobCredits,
  hasEnoughCredits,

  // Image Validation
  SUPPORTED_IMAGE_FORMATS,
  MAX_IMAGE_SIZE_BYTES,
  validateImageFile,
  getImageDimensions,

  // Batch Processing
  batchArray,
  processInParallel,

  // Webhook Helpers
  parseWebhookPayload,
  isWebhookTimestampValid,

  // Error Formatting
  formatAPIError,

  // Progress Tracking
  calculateJobProgress,
  estimateTimeRemaining,

  // URL Helpers
  isValidImageUrl,
  optimizeShopifyImageUrl,

  // Template Helpers
  mergeTemplateParameters,
  validateRequiredParameters,

  // Retry Helpers
  retryWithBackoff,

  // Formatting Helpers
  formatBytes,
  formatDuration,
  formatRelativeTime,
} from './pikcelai.utils';
