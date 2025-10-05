/**
 * Job Utilities
 *
 * Helper functions for job management and formatting
 */

import type { Job as PrismaJob } from '@prisma/client';

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isJobCompleted(job: PrismaJob): boolean {
  return job.status === 'completed';
}

export function isJobFailed(job: PrismaJob): boolean {
  return job.status === 'failed';
}

export function isJobActive(job: PrismaJob): boolean {
  return job.status === 'pending' || job.status === 'processing';
}

export function canRetryJob(job: PrismaJob): boolean {
  return job.status === 'failed' || job.status === 'cancelled';
}

export function canPushToShopify(job: PrismaJob): boolean {
  return (
    job.status === 'completed' &&
    !!job.outputImageUrl &&
    !!job.productId &&
    !job.pushedToShopify
  );
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export function formatJobStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
}

export function formatJobPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return priorityMap[priority] || priority;
}

export function formatProcessingTime(ms?: number | null): string {
  if (!ms) return 'N/A';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatCredits(credits: number): string {
  return credits.toLocaleString();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(d);
  }
}

// ============================================================================
// METADATA HELPERS
// ============================================================================

export function parseJobMetadata(job: PrismaJob): Record<string, any> | null {
  if (!job.metadata) return null;

  try {
    return JSON.parse(job.metadata);
  } catch {
    return null;
  }
}

export function parseJobParameters(job: PrismaJob): Record<string, any> | null {
  if (!job.parameters) return null;

  try {
    return JSON.parse(job.parameters);
  } catch {
    return null;
  }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export function calculateBatchProgress(
  totalJobs: number,
  completedJobs: number,
  failedJobs: number
): number {
  if (totalJobs === 0) return 0;
  const processedJobs = completedJobs + failedJobs;
  return Math.round((processedJobs / totalJobs) * 100);
}

export function calculateBatchSuccessRate(
  completedJobs: number,
  failedJobs: number
): number {
  const totalProcessed = completedJobs + failedJobs;
  if (totalProcessed === 0) return 0;
  return Math.round((completedJobs / totalProcessed) * 100);
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateJobParameters(
  toolId: string,
  parameters?: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Add tool-specific validation here
  // For now, just basic validation

  if (!toolId) {
    errors.push('Tool ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// URL HELPERS
// ============================================================================

export function getJobImageUrl(
  job: PrismaJob,
  type: 'input' | 'output' | 'thumbnail'
): string | null {
  switch (type) {
    case 'input':
      return job.inputImageUrl;
    case 'output':
      return job.outputImageUrl;
    case 'thumbnail':
      return job.thumbnailUrl || job.inputImageUrl;
    default:
      return null;
  }
}

export function getShopifyProductUrl(
  shop: string,
  productId: string
): string {
  const numericId = productId.replace('gid://shopify/Product/', '');
  return `https://${shop}/admin/products/${numericId}`;
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface JobStatistics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalCreditsUsed: number;
  averageProcessingTime: number;
  successRate: number;
}

export function calculateJobStatistics(jobs: PrismaJob[]): JobStatistics {
  const stats: JobStatistics = {
    total: jobs.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    totalCreditsUsed: 0,
    averageProcessingTime: 0,
    successRate: 0,
  };

  let totalProcessingTime = 0;
  let processedCount = 0;

  for (const job of jobs) {
    // Count by status
    switch (job.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'processing':
        stats.processing++;
        break;
      case 'completed':
        stats.completed++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
    }

    // Sum credits
    stats.totalCreditsUsed += job.creditsUsed;

    // Sum processing time
    if (job.processingTimeMs) {
      totalProcessingTime += job.processingTimeMs;
      processedCount++;
    }
  }

  // Calculate averages
  if (processedCount > 0) {
    stats.averageProcessingTime = totalProcessingTime / processedCount;
  }

  // Calculate success rate
  const totalProcessed = stats.completed + stats.failed;
  if (totalProcessed > 0) {
    stats.successRate = (stats.completed / totalProcessed) * 100;
  }

  return stats;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  isJobCompleted,
  isJobFailed,
  isJobActive,
  canRetryJob,
  canPushToShopify,
  formatJobStatus,
  formatJobPriority,
  formatProcessingTime,
  formatCredits,
  formatDate,
  formatRelativeTime,
  parseJobMetadata,
  parseJobParameters,
  calculateBatchProgress,
  calculateBatchSuccessRate,
  validateJobParameters,
  getJobImageUrl,
  getShopifyProductUrl,
  calculateJobStatistics,
};
