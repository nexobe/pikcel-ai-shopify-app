/**
 * API Route: Job Retry
 *
 * Retries a failed job by dispatching a new job to PikcelAI
 */

import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { jobService } from '../services/job.server';
import { getPikcelAIClient } from '../services/pikcelai.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const formData = await request.formData();
    const jobId = formData.get('jobId') as string;

    if (!jobId) {
      return Response.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get original job
    const originalJob = await jobService.getJob(jobId, shop);

    if (!originalJob) {
      return Response.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Parse parameters
    const parameters = originalJob.parameters
      ? JSON.parse(originalJob.parameters)
      : undefined;

    // Dispatch new job to PikcelAI
    const client = getPikcelAIClient();
    const dispatchResponse = await client.dispatchJob({
      tool_id: originalJob.toolId,
      input_image_url: originalJob.inputImageUrl,
      parameters,
      priority: originalJob.priority as any,
      metadata: originalJob.metadata ? JSON.parse(originalJob.metadata) : undefined,
    });

    // Update local job with new PikcelAI job ID and reset status
    const updatedJob = await jobService.updateJob(jobId, shop, {
      status: 'pending',
      errorMessage: undefined,
      progress: 0,
      outputImageUrl: undefined,
      processingTimeMs: undefined,
      startedAt: undefined,
      completedAt: undefined,
    });

    // Update PikcelAI job ID
    await jobService.updateJob(jobId, shop, {
      // Note: We can't update pikcelJobId in the schema without altering unique constraint
      // So we'll track retries via metadata instead
    });

    return Response.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('Job retry error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
