/**
 * API Route: Job Sync
 *
 * Syncs job status from PikcelAI
 */

import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { jobService } from '../services/job.server';

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

    const job = await jobService.syncJobStatus(jobId, shop);

    return Response.json({ success: true, job });
  } catch (error) {
    console.error('Job sync error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
