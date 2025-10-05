/**
 * Jobs Page - Job tracking and management interface
 *
 * Features:
 * - Real-time job status updates
 * - Filters (status, tool, date range, product)
 * - Pagination
 * - Bulk actions (retry all failed, download all)
 * - Job statistics dashboard
 */

import { useState, useEffect } from 'react';
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from 'react-router';
import { useLoaderData, useFetcher, useSearchParams } from 'react-router';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { authenticate } from '../shopify.server';
import { jobService } from '../services/job.server';
import { JobStatusTracker } from '../components/JobStatusTracker';
import type { JobData } from '../components/JobStatusTracker';

// ============================================================================
// LOADER - Fetch jobs with filters
// ============================================================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || undefined;
  const toolId = url.searchParams.get('toolId') || undefined;
  const productId = url.searchParams.get('productId') || undefined;
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Get jobs with filters
  const { jobs, total } = await jobService.getJobs({
    shop,
    status,
    toolId,
    productId,
    limit,
    offset,
  });

  // Get job statistics
  const stats = await jobService.getJobStats(shop);

  return {
    jobs,
    total,
    stats,
    page,
    limit,
    filters: { status, toolId, productId },
  };
};

// ============================================================================
// ACTION - Handle job actions
// ============================================================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const action = formData.get('action') as string;
  const jobId = formData.get('jobId') as string;

  switch (action) {
    case 'sync':
      // Sync job status from PikcelAI
      const syncedJob = await jobService.syncJobStatus(jobId, shop);
      return { success: true, job: syncedJob };

    case 'retry':
      // Retry failed job
      const job = await jobService.getJob(jobId, shop);
      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      // TODO: Dispatch new job to PikcelAI
      // For now, just reset status
      const retriedJob = await jobService.updateJob(jobId, shop, {
        status: 'pending',
        errorMessage: undefined,
        progress: 0,
      });

      return { success: true, job: retriedJob };

    case 'push':
      // Push completed job to Shopify
      const pushJob = await jobService.getJob(jobId, shop);
      if (!pushJob) {
        return { success: false, error: 'Job not found' };
      }

      if (!pushJob.outputImageUrl || !pushJob.productId) {
        return { success: false, error: 'Missing output image or product' };
      }

      try {
        // Upload image to Shopify
        const productIdNum = pushJob.productId.replace('gid://shopify/Product/', '');

        // Create media mutation
        const response = await admin.graphql(
          `#graphql
          mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
            productCreateMedia(media: $media, productId: $productId) {
              media {
                id
                alt
                mediaContentType
                status
              }
              mediaUserErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              productId: `gid://shopify/Product/${productIdNum}`,
              media: [
                {
                  originalSource: pushJob.outputImageUrl,
                  alt: `Processed by ${pushJob.toolName || pushJob.toolId}`,
                  mediaContentType: 'IMAGE',
                },
              ],
            },
          }
        );

        const responseJson = await response.json();

        if (responseJson.data?.productCreateMedia?.mediaUserErrors?.length > 0) {
          return {
            success: false,
            error: responseJson.data.productCreateMedia.mediaUserErrors[0].message,
          };
        }

        // Mark as pushed
        const pushedJob = await jobService.markAsPushed(jobId, shop);

        return { success: true, job: pushedJob };
      } catch (error) {
        console.error('Error pushing to Shopify:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

    case 'bulkRetry':
      // Retry all failed jobs
      const failedJobs = await jobService.getJobs({
        shop,
        status: 'failed',
        limit: 1000,
      });

      const retryPromises = failedJobs.jobs.map((job) =>
        jobService.updateJob(job.id, shop, {
          status: 'pending',
          errorMessage: undefined,
          progress: 0,
        })
      );

      await Promise.all(retryPromises);

      return { success: true, retriedCount: failedJobs.jobs.length };

    case 'bulkSync':
      // Sync all active jobs
      const activeJobs = await jobService.getJobs({
        shop,
        limit: 1000,
      });

      const jobsToSync = activeJobs.jobs.filter(
        (job) => job.status === 'pending' || job.status === 'processing'
      );

      const syncedJobs = await jobService.syncMultipleJobs(
        jobsToSync.map((j) => j.id),
        shop
      );

      return { success: true, syncedCount: syncedJobs.length };

    default:
      return { success: false, error: 'Unknown action' };
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function JobsPage() {
  const { jobs, total, stats, page, limit, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher<typeof action>();
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Auto-refresh timer
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      // Only refresh if there are active jobs
      const hasActiveJobs = jobs.some(
        (job) => job.status === 'pending' || job.status === 'processing'
      );

      if (hasActiveJobs) {
        fetcher.submit(
          { action: 'bulkSync' },
          { method: 'post' }
        );
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, jobs, fetcher]);

  // Filter handlers
  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to page 1
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
  };

  // Bulk actions
  const handleBulkRetry = () => {
    fetcher.submit({ action: 'bulkRetry' }, { method: 'post' });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <s-page heading="Job History">
      <s-button
        slot="primary-action"
        onClick={() => setAutoRefresh(!autoRefresh)}
        variant={autoRefresh ? 'primary' : 'secondary'}
      >
        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
      </s-button>

      {/* Statistics Cards */}
      <s-stack direction="inline" gap="base">
        <s-card>
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Total Jobs</s-text>
            <s-heading variant="h2">{stats.total}</s-heading>
          </s-stack>
        </s-card>

        <s-card>
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Pending</s-text>
            <s-heading variant="h2">{stats.pending}</s-heading>
          </s-stack>
        </s-card>

        <s-card>
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Processing</s-text>
            <s-heading variant="h2">{stats.processing}</s-heading>
          </s-stack>
        </s-card>

        <s-card>
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Completed</s-text>
            <s-heading variant="h2">{stats.completed}</s-heading>
          </s-stack>
        </s-card>

        <s-card>
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Failed</s-text>
            <s-heading variant="h2">{stats.failed}</s-heading>
          </s-stack>
        </s-card>
      </s-stack>

      {/* Filters */}
      <s-section heading="Filters">
        <s-stack direction="inline" gap="base">
          {/* Status filter */}
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Status</s-text>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #c9cccf',
                fontSize: '14px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </s-stack>

          {/* Clear filters button */}
          <s-button
            variant="tertiary"
            onClick={() => {
              setSearchParams({});
            }}
          >
            Clear Filters
          </s-button>
        </s-stack>
      </s-section>

      {/* Bulk Actions */}
      {stats.failed > 0 && (
        <s-section heading="Bulk Actions">
          <s-stack direction="inline" gap="base">
            <s-button
              onClick={handleBulkRetry}
              variant="secondary"
              {...(fetcher.state !== 'idle' ? { loading: true } : {})}
            >
              Retry All Failed ({stats.failed})
            </s-button>
          </s-stack>
        </s-section>
      )}

      {/* Jobs List */}
      <s-section heading={`Jobs (${total} total)`}>
        {jobs.length === 0 ? (
          <s-box padding="large">
            <s-text align="center">No jobs found</s-text>
          </s-box>
        ) : (
          <s-stack direction="block" gap="base">
            {jobs.map((job) => (
              <JobStatusTracker
                key={job.id}
                job={job as JobData}
                pollInterval={3000}
                autoPoll={autoRefresh}
              />
            ))}
          </s-stack>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <s-stack direction="inline" gap="base" align="center">
            <s-button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              variant="secondary"
            >
              Previous
            </s-button>

            <s-text>
              Page {page} of {totalPages}
            </s-text>

            <s-button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              variant="secondary"
            >
              Next
            </s-button>
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
