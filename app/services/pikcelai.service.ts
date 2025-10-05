/**
 * PikcelAI API Service
 *
 * Service layer for communicating with PikcelAI Enterprise API
 */

import type {
  GetTemplatesResponse,
  ApplyTemplateParams,
  ApplyTemplateResponse,
} from '../types/templates';
import type {
  DispatchJobParams,
  DispatchJobResponse,
  GetJobStatusResponse,
  GetJobHistoryResponse,
  GetAIModelsResponse,
} from './pikcelai.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const PIKCEL_API_BASE_URL =
  process.env.PIKCEL_API_URL || 'https://app.pikcel.ai';
const PIKCEL_API_KEY = process.env.PIKCEL_API_KEY || '';

// ============================================================================
// HTTP CLIENT
// ============================================================================

interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

async function apiRequest<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
  } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${PIKCEL_API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PIKCEL_API_KEY}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      throw new Error(`PikcelAI API Error: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// TEMPLATES API
// ============================================================================

export const templatesService = {
  /**
   * Get all templates from PikcelAI Enterprise API
   */
  async getTemplates(params?: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<GetTemplatesResponse> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());

    const query = queryParams.toString();
    const endpoint = `/api/enterprise/bulk/templates${query ? `?${query}` : ''}`;

    return apiRequest<GetTemplatesResponse>(endpoint);
  },

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string) {
    return apiRequest(`/api/enterprise/bulk/templates/${templateId}`);
  },

  /**
   * Apply template to products (create batch job)
   */
  async applyTemplate(
    params: ApplyTemplateParams
  ): Promise<ApplyTemplateResponse> {
    return apiRequest<ApplyTemplateResponse>(
      '/api/enterprise/bulk/apply-template',
      {
        method: 'POST',
        body: params,
      }
    );
  },
};

// ============================================================================
// JOBS API
// ============================================================================

export const jobsService = {
  /**
   * Dispatch a single job
   */
  async dispatchJob(params: DispatchJobParams): Promise<DispatchJobResponse> {
    return apiRequest<DispatchJobResponse>('/api/jobs/dispatch', {
      method: 'POST',
      body: params,
    });
  },

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<GetJobStatusResponse> {
    return apiRequest<GetJobStatusResponse>(`/api/jobs/${jobId}`);
  },

  /**
   * Get job history
   */
  async getJobHistory(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<GetJobHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.offset) queryParams.set('offset', params.offset.toString());
    if (params?.status) queryParams.set('status', params.status);

    const query = queryParams.toString();
    const endpoint = `/api/jobs${query ? `?${query}` : ''}`;

    return apiRequest<GetJobHistoryResponse>(endpoint);
  },
};

// ============================================================================
// AI MODELS API
// ============================================================================

export const aiModelsService = {
  /**
   * Get all AI models/tools
   */
  async getModels(): Promise<GetAIModelsResponse> {
    return apiRequest<GetAIModelsResponse>('/api/ai-models');
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const pikcelService = {
  templates: templatesService,
  jobs: jobsService,
  aiModels: aiModelsService,
};

export default pikcelService;
