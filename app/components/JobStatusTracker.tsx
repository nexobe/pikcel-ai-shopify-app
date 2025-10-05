/**
 * JobStatusTracker Component
 *
 * Real-time job status tracking with automatic polling
 * Displays job progress, status badges, and action buttons
 */

import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';

// ============================================================================
// TYPES
// ============================================================================

export interface JobData {
  id: string;
  shop: string;
  pikcelJobId: string;
  toolId: string;
  toolName?: string | null;
  status: string;
  priority: string;
  inputImageUrl: string;
  outputImageUrl?: string | null;
  thumbnailUrl?: string | null;
  parameters?: string | null;
  errorMessage?: string | null;
  creditsUsed: number;
  processingTimeMs?: number | null;
  progress: number;
  productId?: string | null;
  productTitle?: string | null;
  variantId?: string | null;
  imageId?: string | null;
  metadata?: string | null;
  pushedToShopify: boolean;
  pushedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatusTrackerProps {
  job: JobData;
  onStatusChange?: (job: JobData) => void;
  pollInterval?: number; // milliseconds
  autoPoll?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusBadge(status: string): { tone: string; text: string } {
  switch (status) {
    case 'completed':
      return { tone: 'success', text: 'Completed' };
    case 'processing':
      return { tone: 'info', text: 'Processing' };
    case 'pending':
      return { tone: 'attention', text: 'Pending' };
    case 'failed':
      return { tone: 'critical', text: 'Failed' };
    case 'cancelled':
      return { tone: 'warning', text: 'Cancelled' };
    default:
      return { tone: '', text: status };
  }
}

function getPriorityBadge(priority: string): { tone: string; text: string } {
  switch (priority) {
    case 'urgent':
      return { tone: 'critical', text: 'Urgent' };
    case 'high':
      return { tone: 'warning', text: 'High' };
    case 'normal':
      return { tone: 'info', text: 'Normal' };
    case 'low':
      return { tone: '', text: 'Low' };
    default:
      return { tone: '', text: priority };
  }
}

function formatDuration(ms?: number | null): string {
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function JobStatusTracker({
  job: initialJob,
  onStatusChange,
  pollInterval = 3000,
  autoPoll = true,
}: JobStatusTrackerProps) {
  const [job, setJob] = useState<JobData>(initialJob);
  const fetcher = useFetcher<{ job: JobData }>();
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if job needs polling
  const needsPolling = job.status === 'pending' || job.status === 'processing';

  // Update local job state when fetcher data changes
  useEffect(() => {
    if (fetcher.data?.job) {
      setJob(fetcher.data.job);
      onStatusChange?.(fetcher.data.job);
    }
  }, [fetcher.data, onStatusChange]);

  // Auto-polling for active jobs
  useEffect(() => {
    if (!autoPoll || !needsPolling) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    // Start polling
    pollTimerRef.current = setInterval(() => {
      fetcher.submit(
        { jobId: job.id, action: 'sync' },
        { method: 'post', action: '/api/jobs/sync' }
      );
    }, pollInterval);

    // Cleanup
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [autoPoll, needsPolling, pollInterval, job.id, fetcher]);

  const statusBadge = getStatusBadge(job.status);
  const priorityBadge = getPriorityBadge(job.priority);

  return (
    <s-card>
      {/* Header with status and priority */}
      <s-stack direction="inline" gap="tight" align="space-between">
        <s-stack direction="inline" gap="tight">
          <s-badge tone={statusBadge.tone}>{statusBadge.text}</s-badge>
          <s-badge tone={priorityBadge.tone}>{priorityBadge.text}</s-badge>
        </s-stack>
        <s-text variant="caption">{formatDate(job.createdAt)}</s-text>
      </s-stack>

      {/* Tool name */}
      <s-stack direction="block" gap="tight">
        <s-heading variant="h3">{job.toolName || job.toolId}</s-heading>

        {/* Product context if available */}
        {job.productTitle && (
          <s-text variant="caption">Product: {job.productTitle}</s-text>
        )}
      </s-stack>

      {/* Progress bar for processing jobs */}
      {job.status === 'processing' && (
        <s-stack direction="block" gap="tight">
          <s-text variant="caption">Progress: {job.progress}%</s-text>
          <s-progress-bar value={job.progress} />
        </s-stack>
      )}

      {/* Image previews */}
      <s-stack direction="inline" gap="base">
        {/* Input image */}
        <s-stack direction="block" gap="tight">
          <s-text variant="caption">Input</s-text>
          <s-box
            borderWidth="base"
            borderRadius="base"
            style={{
              width: '120px',
              height: '120px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={job.inputImageUrl}
              alt="Input"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </s-box>
        </s-stack>

        {/* Output image */}
        {job.outputImageUrl && (
          <s-stack direction="block" gap="tight">
            <s-text variant="caption">Output</s-text>
            <s-box
              borderWidth="base"
              borderRadius="base"
              style={{
                width: '120px',
                height: '120px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={job.outputImageUrl}
                alt="Output"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
            </s-box>
          </s-stack>
        )}
      </s-stack>

      {/* Job details */}
      <s-stack direction="block" gap="tight">
        <s-stack direction="inline" gap="base">
          <s-text variant="caption">Credits: {job.creditsUsed}</s-text>
          <s-text variant="caption">
            Duration: {formatDuration(job.processingTimeMs)}
          </s-text>
        </s-stack>
      </s-stack>

      {/* Error message */}
      {job.errorMessage && (
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="critical"
        >
          <s-text variant="caption" tone="critical">
            {job.errorMessage}
          </s-text>
        </s-box>
      )}

      {/* Action buttons */}
      <s-stack direction="inline" gap="tight">
        {/* Retry button for failed jobs */}
        {job.status === 'failed' && (
          <s-button
            onClick={() => {
              fetcher.submit(
                { jobId: job.id, action: 'retry' },
                { method: 'post', action: '/api/jobs/retry' }
              );
            }}
            variant="secondary"
            {...(fetcher.state !== 'idle' ? { loading: true } : {})}
          >
            Retry
          </s-button>
        )}

        {/* Download button for completed jobs */}
        {job.status === 'completed' && job.outputImageUrl && (
          <s-button
            href={job.outputImageUrl}
            target="_blank"
            variant="secondary"
          >
            Download
          </s-button>
        )}

        {/* Push to Shopify button */}
        {job.status === 'completed' &&
         job.outputImageUrl &&
         !job.pushedToShopify &&
         job.productId && (
          <s-button
            onClick={() => {
              fetcher.submit(
                { jobId: job.id, action: 'push' },
                { method: 'post', action: '/api/jobs/push-to-shopify' }
              );
            }}
            variant="primary"
            {...(fetcher.state !== 'idle' ? { loading: true } : {})}
          >
            Push to Shopify
          </s-button>
        )}

        {/* Already pushed indicator */}
        {job.pushedToShopify && (
          <s-badge tone="success">Pushed to Shopify</s-badge>
        )}

        {/* Refresh button */}
        {needsPolling && (
          <s-button
            onClick={() => {
              fetcher.submit(
                { jobId: job.id, action: 'sync' },
                { method: 'post', action: '/api/jobs/sync' }
              );
            }}
            variant="tertiary"
            {...(fetcher.state !== 'idle' ? { loading: true } : {})}
          >
            Refresh
          </s-button>
        )}
      </s-stack>
    </s-card>
  );
}

export default JobStatusTracker;
