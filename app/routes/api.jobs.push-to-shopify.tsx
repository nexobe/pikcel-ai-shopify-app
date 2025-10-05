/**
 * API Route: Push Job to Shopify
 *
 * Uploads the processed image to a Shopify product
 */

import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { jobService } from '../services/job.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session, admin } = await authenticate.admin(request);
    const shop = session.shop;

    const formData = await request.formData();
    const jobId = formData.get('jobId') as string;

    if (!jobId) {
      return Response.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get job
    const job = await jobService.getJob(jobId, shop);

    if (!job) {
      return Response.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (!job.outputImageUrl) {
      return Response.json(
        { success: false, error: 'Job has no output image' },
        { status: 400 }
      );
    }

    if (!job.productId) {
      return Response.json(
        { success: false, error: 'Job has no associated product' },
        { status: 400 }
      );
    }

    // Upload image to Shopify
    const productIdNum = job.productId.replace('gid://shopify/Product/', '');

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
              originalSource: job.outputImageUrl,
              alt: `Processed by ${job.toolName || job.toolId}`,
              mediaContentType: 'IMAGE',
            },
          ],
        },
      }
    );

    const responseJson = await response.json();

    if (responseJson.data?.productCreateMedia?.mediaUserErrors?.length > 0) {
      return Response.json(
        {
          success: false,
          error: responseJson.data.productCreateMedia.mediaUserErrors[0].message,
        },
        { status: 400 }
      );
    }

    // Mark job as pushed
    const updatedJob = await jobService.markAsPushed(jobId, shop);

    return Response.json({ success: true, job: updatedJob });
  } catch (error) {
    console.error('Push to Shopify error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
