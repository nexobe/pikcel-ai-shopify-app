/**
 * PikcelAI API Service Layer
 *
 * Complete API client for connecting to PikcelAI backend services.
 * Handles authentication, error handling, retries, and rate limiting.
 *
 * @module pikcelai.server
 * @version 1.0.0
 */

import type {
  AIModel,
  GetAIModelsResponse,
  Template,
  GetTemplatesResponse,
  DispatchJobParams,
  DispatchJobResponse,
  GetJobStatusResponse,
  GetJobHistoryParams,
  GetJobHistoryResponse,
  GetUserProfileResponse,
  UploadImageParams,
  UploadImageResponse,
  BulkJobParams,
  DispatchBulkJobResponse,
  PikcelAPIError,
  RequestOptions,
} from './pikcelai.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface PikcelAIConfig {
  apiUrl: string;
  apiKey: string;
  webhookSecret?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const DEFAULT_CONFIG = {
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class PikcelAPIErrorClass extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PikcelAPIError';
  }
}

export class PikcelNetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'PikcelNetworkError';
  }
}

export class PikcelRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'PikcelRateLimitError';
  }
}

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

class ResponseCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private pending = new Map<string, Promise<any>>();

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.pending.clear();
  }

  /**
   * Request deduplication: if the same request is in-flight, return the pending promise
   */
  getPending<T>(key: string): Promise<T> | null {
    return (this.pending.get(key) as Promise<T>) || null;
  }

  setPending<T>(key: string, promise: Promise<T>): void {
    this.pending.set(key, promise);
    // Clean up after promise resolves or rejects
    promise.finally(() => this.pending.delete(key));
  }
}

// ============================================================================
// PIKCELAI CLIENT CLASS
// ============================================================================

export class PikcelAIClient {
  private config: Required<PikcelAIConfig>;
  private cache = new ResponseCache();

  constructor(config: PikcelAIConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    if (!this.config.apiUrl) {
      throw new Error('PikcelAI API URL is required');
    }

    if (!this.config.apiKey) {
      throw new Error('PikcelAI API Key is required');
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Build full API URL
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    const path = endpoint.replace(/^\//, '');
    return `${baseUrl}/api/${path}`;
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(isFormData = false): HeadersInit {
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'X-Client-Name': 'pikcel-shopify-app',
      'X-Client-Version': '1.0.0',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(status?: number): boolean {
    if (!status) return true; // Network errors are retryable
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<PikcelAPIError> {
    let errorData: any;

    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: {
          code: 'UNKNOWN_ERROR',
          message: response.statusText || 'Unknown error occurred',
        },
      };
    }

    return {
      success: false,
      error: {
        code: errorData.error?.code || 'API_ERROR',
        message: errorData.error?.message || 'An error occurred',
        details: errorData.error?.details,
      },
      status: response.status,
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(endpoint);
    const timeout = options.timeout || this.config.timeout;
    const maxRetries = options.retries ?? this.config.maxRetries;
    const retryDelay = options.retryDelay || this.config.retryDelay;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const isFormData = body instanceof FormData;

        const response = await fetch(url, {
          method,
          headers: this.getHeaders(isFormData),
          body: isFormData ? body : body ? JSON.stringify(body) : undefined,
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
          throw new PikcelRateLimitError(
            'Rate limit exceeded. Please try again later.',
            retryAfter
          );
        }

        // Handle errors
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);

          // Don't retry client errors (4xx except 429)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new PikcelAPIErrorClass(
              errorData.error.code,
              errorData.error.message,
              response.status,
              errorData.error.details
            );
          }

          // Retry server errors
          if (attempt < maxRetries && this.isRetryableError(response.status)) {
            lastError = new PikcelAPIErrorClass(
              errorData.error.code,
              errorData.error.message,
              response.status,
              errorData.error.details
            );
            await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
            continue;
          }

          throw new PikcelAPIErrorClass(
            errorData.error.code,
            errorData.error.message,
            response.status,
            errorData.error.details
          );
        }

        // Success
        const data = await response.json();
        return data as T;
      } catch (error) {
        // Handle abort/timeout
        if (error instanceof Error && error.name === 'AbortError') {
          throw new PikcelNetworkError('Request timeout', error);
        }

        // Re-throw non-retryable errors
        if (
          error instanceof PikcelAPIErrorClass ||
          error instanceof PikcelRateLimitError
        ) {
          throw error;
        }

        // Retry network errors
        if (attempt < maxRetries) {
          lastError = error as Error;
          await this.sleep(retryDelay * Math.pow(2, attempt));
          continue;
        }

        throw new PikcelNetworkError(
          'Network error occurred',
          error as Error
        );
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Request failed after all retries');
  }

  // ==========================================================================
  // PUBLIC API METHODS
  // ==========================================================================

  /**
   * Get all available AI models/tools
   *
   * @param options - Request options
   * @returns List of AI models
   *
   * @example
   * const models = await client.getAIModels();
   * console.log(models.data); // Array of AI models
   */
  async getAIModels(options?: RequestOptions): Promise<GetAIModelsResponse> {
    const cacheKey = 'ai-models';

    // Check cache first
    const cached = this.cache.get<GetAIModelsResponse>(cacheKey);
    if (cached) return cached;

    // Check if request is in-flight (deduplication)
    const pending = this.cache.getPending<GetAIModelsResponse>(cacheKey);
    if (pending) return pending;

    // Make request
    const promise = this.request<GetAIModelsResponse>('GET', '/ai-models', undefined, options);
    this.cache.setPending(cacheKey, promise);

    const response = await promise;

    // Cache for 5 minutes
    this.cache.set(cacheKey, response, 5 * 60 * 1000);

    return response;
  }

  /**
   * Get editing templates
   *
   * @param options - Request options
   * @returns List of templates
   *
   * @example
   * const templates = await client.getTemplates();
   */
  async getTemplates(options?: RequestOptions): Promise<GetTemplatesResponse> {
    const cacheKey = 'templates';

    // Check cache
    const cached = this.cache.get<GetTemplatesResponse>(cacheKey);
    if (cached) return cached;

    // Deduplication
    const pending = this.cache.getPending<GetTemplatesResponse>(cacheKey);
    if (pending) return pending;

    const promise = this.request<GetTemplatesResponse>(
      'GET',
      '/enterprise/bulk/templates',
      undefined,
      options
    );
    this.cache.setPending(cacheKey, promise);

    const response = await promise;

    // Cache for 10 minutes
    this.cache.set(cacheKey, response, 10 * 60 * 1000);

    return response;
  }

  /**
   * Dispatch a new processing job
   *
   * @param params - Job parameters
   * @param options - Request options
   * @returns Created job details
   *
   * @example
   * const job = await client.dispatchJob({
   *   tool_id: 'background-removal',
   *   input_image_url: 'https://example.com/image.jpg',
   *   parameters: { quality: 'high' }
   * });
   */
  async dispatchJob(
    params: DispatchJobParams,
    options?: RequestOptions
  ): Promise<DispatchJobResponse> {
    return this.request<DispatchJobResponse>('POST', '/jobs/dispatch', params, options);
  }

  /**
   * Get job status and details
   *
   * @param jobId - Job ID
   * @param options - Request options
   * @returns Job details
   *
   * @example
   * const job = await client.getJobStatus('job-123');
   * if (job.data.status === 'completed') {
   *   console.log('Output:', job.data.output_image_url);
   * }
   */
  async getJobStatus(
    jobId: string,
    options?: RequestOptions
  ): Promise<GetJobStatusResponse> {
    return this.request<GetJobStatusResponse>('GET', `/jobs/${jobId}`, undefined, options);
  }

  /**
   * Get job history for the current user
   *
   * @param params - Query parameters for filtering
   * @param options - Request options
   * @returns List of jobs
   *
   * @example
   * const history = await client.getJobHistory({ limit: 10, status: 'completed' });
   */
  async getJobHistory(
    params?: GetJobHistoryParams,
    options?: RequestOptions
  ): Promise<GetJobHistoryResponse> {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<GetJobHistoryResponse>('GET', `/jobs${queryString}`, undefined, options);
  }

  /**
   * Get user profile including credits and subscription
   *
   * @param options - Request options
   * @returns User profile data
   *
   * @example
   * const profile = await client.getUserProfile();
   * console.log('Credits:', profile.data.credits_balance);
   */
  async getUserProfile(options?: RequestOptions): Promise<GetUserProfileResponse> {
    const cacheKey = 'user-profile';

    // Short cache (30 seconds) to avoid stale credit data
    const cached = this.cache.get<GetUserProfileResponse>(cacheKey);
    if (cached) return cached;

    const response = await this.request<GetUserProfileResponse>(
      'GET',
      '/profiles/me',
      undefined,
      options
    );

    this.cache.set(cacheKey, response, 30 * 1000);

    return response;
  }

  /**
   * Upload image to PikcelAI storage
   *
   * @param params - Upload parameters
   * @param options - Request options
   * @returns Upload response with image URL
   *
   * @example
   * const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
   * const upload = await client.uploadImageToPikcel({ file });
   * console.log('Uploaded to:', upload.data.url);
   */
  async uploadImageToPikcel(
    params: UploadImageParams,
    options?: RequestOptions
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', params.file, params.filename || 'upload.jpg');

    if (params.folder) {
      formData.append('folder', params.folder);
    }

    return this.request<UploadImageResponse>('POST', '/upload', formData, options);
  }

  /**
   * Dispatch bulk processing job for multiple images
   *
   * @param params - Bulk job parameters
   * @param options - Request options
   * @returns Bulk job details
   *
   * @example
   * const bulkJob = await client.dispatchBulkJob({
   *   tool_id: 'background-removal',
   *   input_images: [
   *     { url: 'https://example.com/image1.jpg' },
   *     { url: 'https://example.com/image2.jpg' }
   *   ]
   * });
   */
  async dispatchBulkJob(
    params: BulkJobParams,
    options?: RequestOptions
  ): Promise<DispatchBulkJobResponse> {
    return this.request<DispatchBulkJobResponse>(
      'POST',
      '/enterprise/bulk/dispatch',
      params,
      options
    );
  }

  /**
   * Poll job status until completion or failure
   *
   * @param jobId - Job ID to poll
   * @param onProgress - Optional callback for progress updates
   * @param pollIntervalMs - Polling interval in milliseconds (default: 2000)
   * @param timeoutMs - Maximum time to poll in milliseconds (default: 5 minutes)
   * @returns Final job status
   *
   * @example
   * const job = await client.pollJobUntilComplete('job-123', (job) => {
   *   console.log('Status:', job.status);
   * });
   */
  async pollJobUntilComplete(
    jobId: string,
    onProgress?: (job: GetJobStatusResponse['data']) => void,
    pollIntervalMs = 2000,
    timeoutMs = 5 * 60 * 1000
  ): Promise<GetJobStatusResponse> {
    const startTime = Date.now();

    while (true) {
      const response = await this.getJobStatus(jobId);
      const job = response.data;

      if (onProgress) {
        onProgress(job);
      }

      // Job completed or failed
      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return response;
      }

      // Timeout check
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Job polling timeout after ${timeoutMs}ms`);
      }

      // Wait before next poll
      await this.sleep(pollIntervalMs);
    }
  }

  /**
   * Verify webhook signature
   *
   * @param payload - Webhook payload as string
   * @param signature - Signature from webhook headers
   * @returns True if signature is valid
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Use Web Crypto API for HMAC verification
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a PikcelAI client instance
 *
 * @param config - Client configuration
 * @returns PikcelAI client instance
 *
 * @example
 * const client = createPikcelAIClient({
 *   apiUrl: process.env.PIKCEL_API_URL!,
 *   apiKey: process.env.PIKCEL_API_KEY!,
 *   webhookSecret: process.env.PIKCEL_WEBHOOK_SECRET
 * });
 */
export function createPikcelAIClient(config: PikcelAIConfig): PikcelAIClient {
  return new PikcelAIClient(config);
}

// ============================================================================
// SINGLETON INSTANCE (OPTIONAL)
// ============================================================================

let globalClient: PikcelAIClient | null = null;

/**
 * Get or create global PikcelAI client instance
 *
 * @returns Global client instance
 *
 * @example
 * const client = getPikcelAIClient();
 * const models = await client.getAIModels();
 */
export function getPikcelAIClient(): PikcelAIClient {
  if (!globalClient) {
    const apiUrl = process.env.PIKCEL_API_URL;
    const apiKey = process.env.PIKCEL_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error(
        'PIKCEL_API_URL and PIKCEL_API_KEY environment variables are required'
      );
    }

    globalClient = createPikcelAIClient({
      apiUrl,
      apiKey,
      webhookSecret: process.env.PIKCEL_WEBHOOK_SECRET,
    });
  }

  return globalClient;
}

/**
 * Reset global client (useful for testing)
 */
export function resetGlobalClient(): void {
  globalClient = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PikcelAIClient;
