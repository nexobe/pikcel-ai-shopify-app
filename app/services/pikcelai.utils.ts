/**
 * PikcelAI Utility Functions
 *
 * Helper functions for common PikcelAI operations
 */

import type { Job, JobStatus } from './pikcelai.types';
import { PikcelAIClient } from './pikcelai.server';

// ============================================================================
// JOB STATUS HELPERS
// ============================================================================

/**
 * Check if job is in a final state
 */
export function isJobFinal(status: JobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/**
 * Check if job is still processing
 */
export function isJobProcessing(status: JobStatus): boolean {
  return status === 'pending' || status === 'processing';
}

/**
 * Check if job succeeded
 */
export function isJobSuccessful(job: Job): boolean {
  return job.status === 'completed' && !!job.output_image_url;
}

/**
 * Get human-readable job status
 */
export function getJobStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  return labels[status] || 'Unknown';
}

// ============================================================================
// CREDIT CALCULATIONS
// ============================================================================

/**
 * Calculate total credits required for a job
 */
export function calculateJobCredits(
  baseCredits: number,
  quantity: number = 1,
  priority: Job['priority'] = 'normal'
): number {
  const priorityMultiplier: Record<Job['priority'], number> = {
    low: 0.8,
    normal: 1.0,
    high: 1.5,
    urgent: 2.0,
  };

  return Math.ceil(baseCredits * quantity * priorityMultiplier[priority]);
}

/**
 * Check if user has enough credits
 */
export function hasEnoughCredits(
  userBalance: number,
  requiredCredits: number
): boolean {
  return userBalance >= requiredCredits;
}

// ============================================================================
// IMAGE VALIDATION
// ============================================================================

/**
 * Supported image formats
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/**
 * Maximum image size (10MB)
 */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file type
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type as any)) {
    return {
      valid: false,
      error: `Unsupported format. Supported: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const maxSizeMB = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Get image dimensions from File
 */
export function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// ============================================================================
// BATCH PROCESSING HELPERS
// ============================================================================

/**
 * Split array into batches
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Process items in parallel with concurrency limit
 */
export async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<R[]> {
  const results: R[] = [];
  const batches = batchArray(items, concurrency);

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map((item, i) => processor(item, results.length + i))
    );
    results.push(...batchResults);
  }

  return results;
}

// ============================================================================
// WEBHOOK HELPERS
// ============================================================================

/**
 * Parse webhook payload safely
 */
export function parseWebhookPayload<T>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Verify webhook timestamp (prevent replay attacks)
 */
export function isWebhookTimestampValid(
  timestamp: string,
  toleranceMs: number = 5 * 60 * 1000 // 5 minutes
): boolean {
  const webhookTime = new Date(timestamp).getTime();
  const now = Date.now();

  return Math.abs(now - webhookTime) <= toleranceMs;
}

// ============================================================================
// ERROR FORMATTING
// ============================================================================

/**
 * Format API error for display
 */
export function formatAPIError(error: any): string {
  if (error.name === 'PikcelAPIError') {
    return error.message;
  }

  if (error.name === 'PikcelNetworkError') {
    return 'Network error. Please check your connection.';
  }

  if (error.name === 'PikcelRateLimitError') {
    return error.retryAfter
      ? `Rate limit exceeded. Try again in ${error.retryAfter} seconds.`
      : 'Rate limit exceeded. Please try again later.';
  }

  return error.message || 'An unexpected error occurred';
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * Calculate job progress percentage
 */
export function calculateJobProgress(job: Job): number {
  switch (job.status) {
    case 'pending':
      return 0;
    case 'processing':
      return 50;
    case 'completed':
      return 100;
    case 'failed':
    case 'cancelled':
      return 0;
    default:
      return 0;
  }
}

/**
 * Estimate time remaining for job
 */
export function estimateTimeRemaining(
  job: Job,
  averageProcessingTimeMs?: number
): number | null {
  if (job.status !== 'processing' || !job.started_at) {
    return null;
  }

  const elapsed = Date.now() - new Date(job.started_at).getTime();

  // Use average if provided, otherwise estimate 30 seconds
  const estimated = averageProcessingTimeMs || 30000;

  return Math.max(0, estimated - elapsed);
}

// ============================================================================
// URL HELPERS
// ============================================================================

/**
 * Check if URL is accessible (basic validation)
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Convert Shopify CDN URL to optimized size
 */
export function optimizeShopifyImageUrl(
  url: string,
  size: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string {
  const sizeMap = {
    small: '480x480',
    medium: '1024x1024',
    large: '2048x2048',
    original: 'master',
  };

  // Shopify CDN URL pattern
  if (url.includes('cdn.shopify.com')) {
    const sizeSuffix = sizeMap[size];
    return url.replace(/\.(jpg|jpeg|png|webp)/i, `_${sizeSuffix}.$1`);
  }

  return url;
}

// ============================================================================
// TEMPLATE HELPERS
// ============================================================================

/**
 * Merge template parameters with custom parameters
 */
export function mergeTemplateParameters(
  templateParams: Record<string, any>,
  customParams: Record<string, any>
): Record<string, any> {
  return {
    ...templateParams,
    ...customParams,
  };
}

/**
 * Validate required parameters
 */
export function validateRequiredParameters(
  params: Record<string, any>,
  required: string[]
): { valid: boolean; missing: string[] } {
  const missing = required.filter((key) => !(key in params));

  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================================================
// RETRY HELPERS
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format date relative to now
 */
export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;

  if (diffMs < 60000) return 'just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  if (diffMs < 604800000) return `${Math.floor(diffMs / 86400000)}d ago`;

  return new Date(date).toLocaleDateString();
}
