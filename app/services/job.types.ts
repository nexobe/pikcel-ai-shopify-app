/**
 * Job Tracking Types
 *
 * Type definitions for job tracking system
 */

import type { Job as PrismaJob, JobBatch as PrismaJobBatch } from '@prisma/client';

// ============================================================================
// JOB TYPES
// ============================================================================

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Job extends PrismaJob {}
export interface JobBatch extends PrismaJobBatch {}

// ============================================================================
// JOB CREATION
// ============================================================================

export interface CreateJobParams {
  shop: string;
  pikcelJobId: string;
  toolId: string;
  toolName?: string;
  inputImageUrl: string;
  parameters?: Record<string, any>;
  priority?: JobPriority;
  productId?: string;
  productTitle?: string;
  variantId?: string;
  imageId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateJobParams {
  status?: JobStatus;
  outputImageUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  creditsUsed?: number;
  processingTimeMs?: number;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
}

// ============================================================================
// JOB QUERIES
// ============================================================================

export interface GetJobsParams {
  shop: string;
  limit?: number;
  offset?: number;
  status?: JobStatus;
  toolId?: string;
  productId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface GetJobsResponse {
  jobs: Job[];
  total: number;
}

export interface JobStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled?: number;
}

// ============================================================================
// BATCH TYPES
// ============================================================================

export interface CreateBatchParams {
  shop: string;
  name?: string;
  toolId: string;
  toolName?: string;
  parameters?: Record<string, any>;
}

export interface UpdateBatchParams {
  totalJobs?: number;
  completedJobs?: number;
  failedJobs?: number;
  status?: JobStatus;
  totalCreditsUsed?: number;
}

export interface GetBatchesParams {
  shop: string;
  limit?: number;
  offset?: number;
  status?: JobStatus;
}

export interface GetBatchesResponse {
  batches: JobBatch[];
  total: number;
}

// ============================================================================
// JOB ACTIONS
// ============================================================================

export interface JobActionResponse {
  success: boolean;
  job?: Job;
  error?: string;
  message?: string;
}

export interface BulkActionResponse {
  success: boolean;
  count?: number;
  error?: string;
  message?: string;
}

// ============================================================================
// JOB FILTERS
// ============================================================================

export interface JobFilters {
  status?: JobStatus;
  toolId?: string;
  productId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

// ============================================================================
// JOB METADATA
// ============================================================================

export interface JobMetadata {
  source?: string;
  version?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface JobParameters {
  [key: string]: any;
}

// ============================================================================
// EXPORT
// ============================================================================

export type {
  Job,
  JobBatch,
  JobStatus,
  JobPriority,
  CreateJobParams,
  UpdateJobParams,
  GetJobsParams,
  GetJobsResponse,
  JobStats,
  CreateBatchParams,
  UpdateBatchParams,
  GetBatchesParams,
  GetBatchesResponse,
  JobActionResponse,
  BulkActionResponse,
  JobFilters,
  JobMetadata,
  JobParameters,
};
