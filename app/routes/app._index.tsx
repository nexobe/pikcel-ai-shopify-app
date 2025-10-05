/**
 * PikcelAI Shopify App - Home Page
 *
 * A comprehensive merchant-focused dashboard showing:
 * - Hero section with value proposition
 * - Quick stats (products synced, images edited, credits used)
 * - Featured AI tools (top 6-8 tools)
 * - Recent activity/jobs
 * - Quick actions (Upload, Browse Tools, View Templates)
 * - Getting started guide (if first-time user)
 */

import { useState, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { getPikcelAIClient } from "../services/pikcelai.server";
import { jobService } from "../services/job.server";
import type { AIModel } from "../types/ai-models";
import type { Job as PrismaJob } from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  totalProducts: number;
  totalImages: number;
  creditsBalance: number;
  creditsUsed: number;
  jobsCompleted: number;
  jobsPending: number;
  jobsFailed: number;
  timeSaved: number; // in hours
}

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText?: string;
      };
    }>;
  };
}

interface LoaderData {
  stats: DashboardStats;
  featuredTools: AIModel[];
  recentJobs: PrismaJob[];
  isFirstTimeUser: boolean;
  shop: string;
  error?: string;
}

// ============================================================================
// LOADER - Fetch all dashboard data
// ============================================================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Parallel data fetching for optimal performance
    const [
      shopifyProductsResponse,
      pikcelUserProfile,
      featuredToolsResponse,
      recentJobsData,
      jobStats,
    ] = await Promise.allSettled([
      // 1. Fetch Shopify products count
      admin.graphql(
        `#graphql
          query getProductsCount {
            products(first: 1) {
              edges {
                node {
                  id
                }
              }
              pageInfo {
                hasNextPage
              }
            }
            productsCount: productsCount {
              count
            }
          }`
      ),

      // 2. Fetch PikcelAI user profile (credits, subscription)
      getPikcelAIClient().getUserProfile(),

      // 3. Fetch featured AI tools
      getPikcelAIClient().getAIModels(),

      // 4. Fetch recent jobs from local database
      jobService.getJobs({
        shop,
        limit: 5,
        offset: 0,
      }),

      // 5. Get job statistics
      jobService.getJobStats(shop),
    ]);

    // Process Shopify products
    let totalProducts = 0;
    let totalImages = 0;

    if (shopifyProductsResponse.status === 'fulfilled') {
      const productsJson = await shopifyProductsResponse.value.json();
      totalProducts = productsJson.data?.productsCount?.count || 0;

      // Fetch images count (sample first 50 products)
      const imagesResponse = await admin.graphql(
        `#graphql
          query getProductImages {
            products(first: 50) {
              edges {
                node {
                  id
                  images(first: 10) {
                    edges {
                      node {
                        id
                      }
                    }
                  }
                }
              }
            }
          }`
      );

      const imagesJson = await imagesResponse.json();
      const products = imagesJson.data?.products?.edges || [];
      totalImages = products.reduce((sum: number, product: any) => {
        return sum + (product.node.images?.edges?.length || 0);
      }, 0);

      // Estimate total images based on sample
      if (totalProducts > 50) {
        totalImages = Math.round((totalImages / Math.min(products.length, 50)) * totalProducts);
      }
    }

    // Process PikcelAI profile
    let creditsBalance = 0;
    let creditsUsed = 0;

    if (pikcelUserProfile.status === 'fulfilled') {
      const profile = pikcelUserProfile.value.data;
      creditsBalance = profile.credits_balance || 0;
      // Note: creditsUsed would need to be calculated from job history
    }

    // Process featured tools (top 8)
    let featuredTools: AIModel[] = [];

    if (featuredToolsResponse.status === 'fulfilled') {
      const allTools = featuredToolsResponse.value.data || [];
      // Get popular tools from various categories
      featuredTools = allTools
        .filter((tool: AIModel) => tool.is_active)
        .sort((a: AIModel, b: AIModel) => a.base_price - b.base_price) // Sort by popularity (using price as proxy)
        .slice(0, 8);
    }

    // Process recent jobs
    let recentJobs: PrismaJob[] = [];

    if (recentJobsData.status === 'fulfilled') {
      recentJobs = recentJobsData.value.jobs;
    }

    // Process job statistics
    let jobsCompleted = 0;
    let jobsPending = 0;
    let jobsFailed = 0;

    if (jobStats.status === 'fulfilled') {
      jobsCompleted = jobStats.value.completed;
      jobsPending = jobStats.value.pending + jobStats.value.processing;
      jobsFailed = jobStats.value.failed;

      // Calculate credits used from completed jobs
      const completedJobs = await jobService.getJobs({
        shop,
        status: 'completed',
        limit: 1000,
      });

      creditsUsed = completedJobs.jobs.reduce((sum, job) => sum + (job.creditsUsed || 0), 0);
    }

    // Calculate time saved (assume 5 minutes saved per completed job)
    const timeSaved = Math.round((jobsCompleted * 5) / 60 * 10) / 10; // in hours

    // Determine if first-time user
    const isFirstTimeUser = jobsCompleted === 0;

    const stats: DashboardStats = {
      totalProducts,
      totalImages,
      creditsBalance,
      creditsUsed,
      jobsCompleted,
      jobsPending,
      jobsFailed,
      timeSaved,
    };

    return {
      stats,
      featuredTools,
      recentJobs,
      isFirstTimeUser,
      shop,
    } as LoaderData;
  } catch (error) {
    console.error('Error loading dashboard data:', error);

    // Return minimal data on error
    return {
      stats: {
        totalProducts: 0,
        totalImages: 0,
        creditsBalance: 0,
        creditsUsed: 0,
        jobsCompleted: 0,
        jobsPending: 0,
        jobsFailed: 0,
        timeSaved: 0,
      },
      featuredTools: [],
      recentJobs: [],
      isFirstTimeUser: true,
      shop,
      error: error instanceof Error ? error.message : 'Failed to load dashboard data',
    } as LoaderData;
  }
};

// ============================================================================
// ACTION - Handle quick actions
// ============================================================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const action = formData.get('action') as string;

  // Handle different actions
  switch (action) {
    case 'refresh':
      // Trigger a data refresh
      return { success: true, message: 'Dashboard refreshed' };

    default:
      return { success: false, error: 'Unknown action' };
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function HomePage() {
  const { stats, featuredTools, recentJobs, isFirstTimeUser, shop, error } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const fetcher = useFetcher<typeof action>();

  const [dismissedGettingStarted, setDismissedGettingStarted] = useState(false);

  useEffect(() => {
    // Check if user has dismissed getting started
    const dismissed = localStorage.getItem('pikcel-dismissed-getting-started');
    if (dismissed === 'true') {
      setDismissedGettingStarted(true);
    }
  }, []);

  const handleDismissGettingStarted = () => {
    localStorage.setItem('pikcel-dismissed-getting-started', 'true');
    setDismissedGettingStarted(true);
  };

  const handleRefresh = () => {
    fetcher.submit({ action: 'refresh' }, { method: 'post' });
  };

  // Show getting started for first-time users
  const showGettingStarted = isFirstTimeUser && !dismissedGettingStarted;

  return (
    <s-page heading="PikcelAI Dashboard">
      <s-button
        slot="primary-action"
        onClick={handleRefresh}
        variant="secondary"
        {...(fetcher.state !== 'idle' ? { loading: true } : {})}
      >
        Refresh
      </s-button>

      {/* Error Banner */}
      {error && (
        <s-section>
          <s-banner status="critical">
            <s-text>{error}</s-text>
          </s-banner>
        </s-section>
      )}

      {/* Hero Section */}
      <s-section>
        <s-stack direction="block" gap="loose">
          <s-heading variant="headingLg">
            Welcome to PikcelAI - Professional Product Image Editing
          </s-heading>

          <s-text variant="bodyMd" tone="subdued">
            Transform your product images with AI-powered editing tools. Remove backgrounds,
            enhance quality, create lifestyle scenes, and more - all optimized for e-commerce.
          </s-text>

          {/* Quick Action Buttons */}
          <s-stack direction="inline" gap="base">
            <s-button
              onClick={() => navigate('/app/editor')}
              variant="primary"
            >
              Upload & Edit Image
            </s-button>

            <s-button
              onClick={() => navigate('/app/ai-tools')}
              variant="secondary"
            >
              Browse AI Tools
            </s-button>

            <s-button
              onClick={() => navigate('/app/templates')}
              variant="tertiary"
            >
              View Templates
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      {/* Quick Stats Cards */}
      <s-section heading="Quick Stats">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Products Synced */}
          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="bodyMd" tone="subdued">
                Products in Store
              </s-text>
              <s-heading variant="headingXl">
                {stats.totalProducts.toLocaleString()}
              </s-heading>
              <s-text variant="bodySm" tone="subdued">
                {stats.totalImages.toLocaleString()} total images
              </s-text>
            </s-stack>
          </s-card>

          {/* Images Edited */}
          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="bodyMd" tone="subdued">
                Images Edited
              </s-text>
              <s-heading variant="headingXl">
                {stats.jobsCompleted.toLocaleString()}
              </s-heading>
              <s-text variant="bodySm" tone="subdued">
                {stats.jobsPending} in progress
              </s-text>
            </s-stack>
          </s-card>

          {/* Credits Balance */}
          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="bodyMd" tone="subdued">
                Credits Balance
              </s-text>
              <s-heading variant="headingXl">
                {stats.creditsBalance.toLocaleString()}
              </s-heading>
              <s-text variant="bodySm" tone="subdued">
                {stats.creditsUsed} used
              </s-text>
            </s-stack>
          </s-card>

          {/* Time Saved */}
          <s-card>
            <s-stack direction="block" gap="tight">
              <s-text variant="bodyMd" tone="subdued">
                Time Saved
              </s-text>
              <s-heading variant="headingXl">
                {stats.timeSaved}h
              </s-heading>
              <s-text variant="bodySm" tone="subdued">
                ~5 min per image
              </s-text>
            </s-stack>
          </s-card>
        </div>
      </s-section>

      {/* Getting Started Guide (First-time users only) */}
      {showGettingStarted && (
        <s-section heading="Getting Started">
          <s-banner
            status="info"
            onDismiss={handleDismissGettingStarted}
          >
            <s-stack direction="block" gap="base">
              <s-text variant="headingMd">Welcome to PikcelAI!</s-text>

              <s-text variant="bodyMd">
                Here's how to get started with professional AI-powered image editing:
              </s-text>

              <s-unordered-list>
                <s-list-item>
                  <strong>Step 1:</strong> Upload your product images or select from your Shopify products
                </s-list-item>
                <s-list-item>
                  <strong>Step 2:</strong> Choose an AI editing tool (background removal, enhancement, etc.)
                </s-list-item>
                <s-list-item>
                  <strong>Step 3:</strong> Review the edited image and push it back to Shopify
                </s-list-item>
              </s-unordered-list>

              <s-button
                onClick={() => navigate('/app/editor')}
                variant="primary"
              >
                Start Editing Now
              </s-button>
            </s-stack>
          </s-banner>
        </s-section>
      )}

      {/* Featured AI Tools */}
      {featuredTools.length > 0 && (
        <s-section heading="Featured AI Tools">
          <s-stack direction="block" gap="base">
            <s-text variant="bodyMd" tone="subdued">
              Popular tools to enhance your product images
            </s-text>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {featuredTools.map((tool) => (
                <s-card key={tool.id}>
                  <s-stack direction="block" gap="tight">
                    {/* Tool Preview Image */}
                    {tool.preview_image_url && (
                      <div
                        style={{
                          width: '100%',
                          height: '160px',
                          overflow: 'hidden',
                          borderRadius: '8px',
                          marginBottom: '8px',
                        }}
                      >
                        <img
                          src={tool.preview_image_url}
                          alt={tool.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    )}

                    {/* Tool Info */}
                    <s-stack direction="inline" gap="tight" alignment="center">
                      {tool.icon_name && !tool.preview_image_url && (
                        <s-text variant="headingMd">{tool.icon_name}</s-text>
                      )}
                      <s-text variant="headingMd">{tool.name}</s-text>
                    </s-stack>

                    <s-text variant="bodySm">{tool.description}</s-text>

                    <s-stack direction="inline" gap="tight" alignment="center">
                      <s-badge>
                        {tool.credits_required} credit{tool.credits_required !== 1 ? 's' : ''}
                      </s-badge>
                      <s-text variant="bodySm" tone="subdued">
                        ${tool.base_price.toFixed(2)}
                      </s-text>
                    </s-stack>

                    <s-button
                      onClick={() => {
                        sessionStorage.setItem('selectedAITool', JSON.stringify(tool));
                        navigate(`/app/editor?tool=${tool.id}`);
                      }}
                      variant="primary"
                      fullWidth
                    >
                      Use This Tool
                    </s-button>
                  </s-stack>
                </s-card>
              ))}
            </div>

            <s-button
              onClick={() => navigate('/app/ai-tools')}
              variant="tertiary"
              fullWidth
            >
              View All AI Tools
            </s-button>
          </s-stack>
        </s-section>
      )}

      {/* Recent Activity */}
      {recentJobs.length > 0 && (
        <s-section heading="Recent Activity">
          <s-stack direction="block" gap="base">
            <s-text variant="bodyMd" tone="subdued">
              Your latest image editing jobs
            </s-text>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '12px',
              }}
            >
              {recentJobs.map((job) => (
                <s-card key={job.id}>
                  <s-stack direction="inline" gap="base" alignment="center">
                    {/* Job Thumbnail */}
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        overflow: 'hidden',
                        borderRadius: '8px',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={job.outputImageUrl || job.inputImageUrl}
                        alt={job.toolName || job.toolId}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    {/* Job Details */}
                    <s-stack direction="block" gap="tight" style={{ flex: 1 }}>
                      <s-text variant="headingMd">
                        {job.toolName || job.toolId}
                      </s-text>

                      <s-text variant="bodySm" tone="subdued">
                        {job.productTitle || 'Untitled Product'}
                      </s-text>

                      <s-stack direction="inline" gap="tight">
                        <s-badge
                          tone={
                            job.status === 'completed' ? 'success' :
                            job.status === 'failed' ? 'critical' :
                            job.status === 'processing' ? 'info' :
                            undefined
                          }
                        >
                          {job.status}
                        </s-badge>

                        {job.creditsUsed > 0 && (
                          <s-text variant="bodySm" tone="subdued">
                            {job.creditsUsed} credits
                          </s-text>
                        )}

                        <s-text variant="bodySm" tone="subdued">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </s-text>
                      </s-stack>
                    </s-stack>

                    {/* Action Button */}
                    {job.status === 'completed' && !job.pushedToShopify && (
                      <s-button
                        onClick={() => navigate(`/app/jobs?jobId=${job.id}`)}
                        variant="primary"
                      >
                        Push to Shopify
                      </s-button>
                    )}

                    {job.status === 'failed' && (
                      <s-button
                        onClick={() => navigate(`/app/jobs?jobId=${job.id}`)}
                        variant="secondary"
                      >
                        Retry
                      </s-button>
                    )}
                  </s-stack>
                </s-card>
              ))}
            </div>

            <s-button
              onClick={() => navigate('/app/jobs')}
              variant="tertiary"
              fullWidth
            >
              View All Jobs
            </s-button>
          </s-stack>
        </s-section>
      )}

      {/* No Jobs Yet - Empty State */}
      {recentJobs.length === 0 && !showGettingStarted && (
        <s-section heading="Recent Activity">
          <s-empty-state
            heading="No jobs yet"
            message="Start editing your product images with AI-powered tools"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <s-button
              onClick={() => navigate('/app/editor')}
              variant="primary"
            >
              Start Editing
            </s-button>
          </s-empty-state>
        </s-section>
      )}

      {/* Aside - Quick Actions */}
      <s-section slot="aside" heading="Quick Actions">
        <s-stack direction="block" gap="base">
          <s-button
            onClick={() => navigate('/app/editor')}
            variant="primary"
            fullWidth
          >
            Upload Product Image
          </s-button>

          <s-button
            onClick={() => navigate('/app/products')}
            variant="secondary"
            fullWidth
          >
            Select from Products
          </s-button>

          <s-button
            onClick={() => navigate('/app/ai-tools')}
            variant="secondary"
            fullWidth
          >
            Browse AI Tools
          </s-button>

          <s-button
            onClick={() => navigate('/app/templates')}
            variant="secondary"
            fullWidth
          >
            View Templates
          </s-button>

          <s-button
            onClick={() => navigate('/app/jobs')}
            variant="tertiary"
            fullWidth
          >
            View Job History
          </s-button>
        </s-stack>
      </s-section>

      {/* Aside - Account Info */}
      <s-section slot="aside" heading="Account">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text weight="bold">Store:</s-text>
            <br />
            <s-text>{shop}</s-text>
          </s-paragraph>

          <s-paragraph>
            <s-text weight="bold">Credits Balance:</s-text>
            <br />
            <s-heading variant="headingLg">
              {stats.creditsBalance.toLocaleString()}
            </s-heading>
          </s-paragraph>

          <s-paragraph>
            <s-text variant="bodySm" tone="subdued">
              Total Credits Used: {stats.creditsUsed.toLocaleString()}
            </s-text>
          </s-paragraph>

          <s-divider />

          <s-paragraph>
            <s-text weight="bold">Need More Credits?</s-text>
            <br />
            <s-text variant="bodySm">
              Purchase additional credits or upgrade your plan
            </s-text>
          </s-paragraph>

          <s-button
            onClick={() => {
              // Open external pricing page
              window.open('https://pikcel.ai/pricing', '_blank');
            }}
            variant="primary"
            fullWidth
          >
            View Pricing
          </s-button>
        </s-stack>
      </s-section>

      {/* Aside - Support */}
      <s-section slot="aside" heading="Need Help?">
        <s-stack direction="block" gap="base">
          <s-unordered-list>
            <s-list-item>
              <s-link
                href="https://docs.pikcel.ai"
                target="_blank"
              >
                Documentation
              </s-link>
            </s-list-item>
            <s-list-item>
              <s-link
                href="https://pikcel.ai/support"
                target="_blank"
              >
                Support Center
              </s-link>
            </s-list-item>
            <s-list-item>
              <s-link
                href="https://pikcel.ai/tutorials"
                target="_blank"
              >
                Video Tutorials
              </s-link>
            </s-list-item>
          </s-unordered-list>

          <s-button
            onClick={() => {
              window.open('mailto:support@pikcel.ai', '_blank');
            }}
            variant="secondary"
            fullWidth
          >
            Contact Support
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
