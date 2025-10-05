/**
 * Job Service - Server-side job management
 *
 * Handles job tracking, status updates, and database operations
 */

import { prisma } from '../db.server';
import { getPikcelAIClient } from './pikcelai.server';
import type { Job as PrismaJob, JobBatch as PrismaJobBatch } from '@prisma/client';
import type { Job as PikcelJob, JobStatus } from './pikcelai.types';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateJobParams {
  shop: string;
  pikcelJobId: string;
  toolId: string;
  toolName?: string;
  inputImageUrl: string;
  parameters?: Record<string, any>;
  priority?: string;
  productId?: string;
  productTitle?: string;
  variantId?: string;
  imageId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateJobParams {
  status?: string;
  outputImageUrl?: string;
  errorMessage?: string;
  creditsUsed?: number;
  processingTimeMs?: number;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface GetJobsParams {
  shop: string;
  limit?: number;
  offset?: number;
  status?: string;
  toolId?: string;
  productId?: string;
  fromDate?: Date;
  toDate?: Date;
}

// ============================================================================
// JOB CRUD OPERATIONS
// ============================================================================

export const jobService = {
  /**
   * Create a new job record
   */
  async createJob(params: CreateJobParams): Promise<PrismaJob> {
    return prisma.job.create({
      data: {
        shop: params.shop,
        pikcelJobId: params.pikcelJobId,
        toolId: params.toolId,
        toolName: params.toolName,
        inputImageUrl: params.inputImageUrl,
        parameters: params.parameters ? JSON.stringify(params.parameters) : null,
        priority: params.priority || 'normal',
        productId: params.productId,
        productTitle: params.productTitle,
        variantId: params.variantId,
        imageId: params.imageId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: string, shop: string): Promise<PrismaJob | null> {
    return prisma.job.findFirst({
      where: {
        id: jobId,
        shop,
      },
    });
  },

  /**
   * Get job by PikcelAI job ID
   */
  async getJobByPikcelId(pikcelJobId: string, shop: string): Promise<PrismaJob | null> {
    return prisma.job.findFirst({
      where: {
        pikcelJobId,
        shop,
      },
    });
  },

  /**
   * Update job
   */
  async updateJob(jobId: string, shop: string, updates: UpdateJobParams): Promise<PrismaJob> {
    return prisma.job.update({
      where: {
        id: jobId,
      },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Mark job as pushed to Shopify
   */
  async markAsPushed(jobId: string, shop: string): Promise<PrismaJob> {
    return prisma.job.update({
      where: {
        id: jobId,
      },
      data: {
        pushedToShopify: true,
        pushedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Get jobs with filters and pagination
   */
  async getJobs(params: GetJobsParams): Promise<{ jobs: PrismaJob[]; total: number }> {
    const where: any = {
      shop: params.shop,
    };

    if (params.status) {
      where.status = params.status;
    }

    if (params.toolId) {
      where.toolId = params.toolId;
    }

    if (params.productId) {
      where.productId = params.productId;
    }

    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) {
        where.createdAt.gte = params.fromDate;
      }
      if (params.toDate) {
        where.createdAt.lte = params.toDate;
      }
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.job.count({ where }),
    ]);

    return { jobs, total };
  },

  /**
   * Get job statistics for a shop
   */
  async getJobStats(shop: string) {
    const [total, pending, processing, completed, failed] = await Promise.all([
      prisma.job.count({ where: { shop } }),
      prisma.job.count({ where: { shop, status: 'pending' } }),
      prisma.job.count({ where: { shop, status: 'processing' } }),
      prisma.job.count({ where: { shop, status: 'completed' } }),
      prisma.job.count({ where: { shop, status: 'failed' } }),
    ]);

    return {
      total,
      pending,
      processing,
      completed,
      failed,
    };
  },

  /**
   * Delete job
   */
  async deleteJob(jobId: string, shop: string): Promise<void> {
    await prisma.job.delete({
      where: {
        id: jobId,
      },
    });
  },

  /**
   * Sync job status from PikcelAI
   */
  async syncJobStatus(jobId: string, shop: string): Promise<PrismaJob> {
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        shop,
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    // Skip if already completed or failed
    if (job.status === 'completed' || job.status === 'failed') {
      return job;
    }

    try {
      const client = getPikcelAIClient();
      const response = await client.getJobStatus(job.pikcelJobId);
      const pikcelJob = response.data;

      // Update local job with PikcelAI job data
      const updates: UpdateJobParams = {
        status: pikcelJob.status,
        outputImageUrl: pikcelJob.output_image_url || undefined,
        errorMessage: pikcelJob.error_message || undefined,
        creditsUsed: pikcelJob.credits_used,
        processingTimeMs: pikcelJob.processing_time_ms || undefined,
      };

      if (pikcelJob.started_at && !job.startedAt) {
        updates.startedAt = new Date(pikcelJob.started_at);
      }

      if (pikcelJob.completed_at && !job.completedAt) {
        updates.completedAt = new Date(pikcelJob.completed_at);
      }

      return await this.updateJob(jobId, shop, updates);
    } catch (error) {
      console.error('Error syncing job status:', error);
      throw error;
    }
  },

  /**
   * Sync multiple jobs in parallel
   */
  async syncMultipleJobs(jobIds: string[], shop: string): Promise<PrismaJob[]> {
    const results = await Promise.allSettled(
      jobIds.map((jobId) => this.syncJobStatus(jobId, shop))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<PrismaJob> => result.status === 'fulfilled')
      .map((result) => result.value);
  },
};

// ============================================================================
// JOB BATCH OPERATIONS
// ============================================================================

export const jobBatchService = {
  /**
   * Create a new batch
   */
  async createBatch(params: {
    shop: string;
    name?: string;
    toolId: string;
    toolName?: string;
    parameters?: Record<string, any>;
  }): Promise<PrismaJobBatch> {
    return prisma.jobBatch.create({
      data: {
        shop: params.shop,
        name: params.name,
        toolId: params.toolId,
        toolName: params.toolName,
        parameters: params.parameters ? JSON.stringify(params.parameters) : null,
      },
    });
  },

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string, shop: string): Promise<PrismaJobBatch | null> {
    return prisma.jobBatch.findFirst({
      where: {
        id: batchId,
        shop,
      },
    });
  },

  /**
   * Update batch statistics
   */
  async updateBatchStats(
    batchId: string,
    shop: string,
    stats: {
      totalJobs?: number;
      completedJobs?: number;
      failedJobs?: number;
      status?: string;
      totalCreditsUsed?: number;
    }
  ): Promise<PrismaJobBatch> {
    return prisma.jobBatch.update({
      where: {
        id: batchId,
      },
      data: {
        ...stats,
        updatedAt: new Date(),
      },
    });
  },

  /**
   * Get batches with pagination
   */
  async getBatches(params: {
    shop: string;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ batches: PrismaJobBatch[]; total: number }> {
    const where: any = {
      shop: params.shop,
    };

    if (params.status) {
      where.status = params.status;
    }

    const [batches, total] = await Promise.all([
      prisma.jobBatch.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.jobBatch.count({ where }),
    ]);

    return { batches, total };
  },
};

export default jobService;
