/**
 * PikcelAI Service Layer - Example Tests
 *
 * This file demonstrates how to test the PikcelAI service layer.
 * Adapt these tests to your testing framework (Jest, Vitest, etc.)
 *
 * NOTE: This is an EXAMPLE file. Copy and adapt for your test suite.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createPikcelAIClient,
  PikcelAPIErrorClass,
  PikcelNetworkError,
  PikcelRateLimitError,
} from './pikcelai.server';
import {
  validateImageFile,
  hasEnoughCredits,
  calculateJobCredits,
  isJobFinal,
  formatAPIError,
} from './pikcelai.utils';

// ============================================================================
// MOCKS
// ============================================================================

// Mock fetch
global.fetch = vi.fn();

const mockFetch = (response: any, status = 200) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    headers: new Headers(),
  });
};

const mockFetchError = (status: number, error: any) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: async () => error,
    headers: new Headers(),
  });
};

// ============================================================================
// TEST SETUP
// ============================================================================

describe('PikcelAI Service Layer', () => {
  let client: ReturnType<typeof createPikcelAIClient>;

  beforeEach(() => {
    client = createPikcelAIClient({
      apiUrl: 'https://api.test.com',
      apiKey: 'test-key',
      webhookSecret: 'test-secret',
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    client.clearCache();
  });

  // ==========================================================================
  // CLIENT INITIALIZATION
  // ==========================================================================

  describe('Client Initialization', () => {
    it('should create client with valid config', () => {
      expect(client).toBeDefined();
    });

    it('should throw error without API URL', () => {
      expect(() =>
        createPikcelAIClient({
          apiUrl: '',
          apiKey: 'test',
        })
      ).toThrow('PikcelAI API URL is required');
    });

    it('should throw error without API key', () => {
      expect(() =>
        createPikcelAIClient({
          apiUrl: 'https://test.com',
          apiKey: '',
        })
      ).toThrow('PikcelAI API Key is required');
    });
  });

  // ==========================================================================
  // GET AI MODELS
  // ==========================================================================

  describe('getAIModels', () => {
    it('should fetch AI models successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'bg-removal',
            name: 'Background Removal',
            credits_required: 10,
            is_active: true,
          },
        ],
        count: 1,
      };

      mockFetch(mockResponse);

      const result = await client.getAIModels();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('bg-removal');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/ai-models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should cache AI models', async () => {
      mockFetch({ success: true, data: [], count: 0 });

      await client.getAIModels();
      await client.getAIModels(); // Second call should use cache

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // DISPATCH JOB
  // ==========================================================================

  describe('dispatchJob', () => {
    it('should dispatch job successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'job-123',
          status: 'pending',
          tool_id: 'bg-removal',
          input_image_url: 'https://test.com/image.jpg',
        },
      };

      mockFetch(mockResponse);

      const result = await client.dispatchJob({
        tool_id: 'bg-removal',
        input_image_url: 'https://test.com/image.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('job-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/jobs/dispatch',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            tool_id: 'bg-removal',
            input_image_url: 'https://test.com/image.jpg',
          }),
        })
      );
    });

    it('should include optional parameters', async () => {
      mockFetch({ success: true, data: { id: 'job-123' } });

      await client.dispatchJob({
        tool_id: 'bg-removal',
        input_image_url: 'https://test.com/image.jpg',
        parameters: { quality: 'high' },
        priority: 'urgent',
        webhook_url: 'https://test.com/webhook',
      });

      const call = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.parameters).toEqual({ quality: 'high' });
      expect(body.priority).toBe('urgent');
      expect(body.webhook_url).toBe('https://test.com/webhook');
    });
  });

  // ==========================================================================
  // GET JOB STATUS
  // ==========================================================================

  describe('getJobStatus', () => {
    it('should get job status', async () => {
      mockFetch({
        success: true,
        data: {
          id: 'job-123',
          status: 'completed',
          output_image_url: 'https://test.com/output.jpg',
        },
      });

      const result = await client.getJobStatus('job-123');

      expect(result.data.status).toBe('completed');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/api/jobs/job-123',
        expect.any(Object)
      );
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockFetchError(400, {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid parameters',
        },
      });

      await expect(
        client.dispatchJob({
          tool_id: 'invalid',
          input_image_url: 'invalid',
        })
      ).rejects.toThrow(PikcelAPIErrorClass);
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { code: 'RATE_LIMIT', message: 'Too many requests' },
        }),
        headers: new Headers({ 'Retry-After': '60' }),
      });

      await expect(
        client.getAIModels()
      ).rejects.toThrow(PikcelRateLimitError);
    });

    it('should retry on server errors', async () => {
      // First call fails, second succeeds
      mockFetchError(500, {
        error: { code: 'SERVER_ERROR', message: 'Server error' },
      });
      mockFetch({ success: true, data: [], count: 0 });

      const result = await client.getAIModels();

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const testClient = createPikcelAIClient({
        apiUrl: 'https://test.com',
        apiKey: 'test',
        maxRetries: 0, // Disable retries for this test
      });

      await expect(testClient.getAIModels()).rejects.toThrow(
        PikcelNetworkError
      );
    });
  });

  // ==========================================================================
  // POLLING
  // ==========================================================================

  describe('pollJobUntilComplete', () => {
    it('should poll until job completes', async () => {
      // Mock progression: pending -> processing -> completed
      mockFetch({ success: true, data: { id: 'job-123', status: 'pending' } });
      mockFetch({ success: true, data: { id: 'job-123', status: 'processing' } });
      mockFetch({
        success: true,
        data: {
          id: 'job-123',
          status: 'completed',
          output_image_url: 'https://test.com/output.jpg',
        },
      });

      const result = await client.pollJobUntilComplete('job-123', undefined, 10); // 10ms interval

      expect(result.data.status).toBe('completed');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should call progress callback', async () => {
      mockFetch({ success: true, data: { id: 'job-123', status: 'processing' } });
      mockFetch({ success: true, data: { id: 'job-123', status: 'completed' } });

      const onProgress = vi.fn();

      await client.pollJobUntilComplete('job-123', onProgress, 10);

      expect(onProgress).toHaveBeenCalledTimes(2);
    });

    it('should timeout after max time', async () => {
      // Always return processing
      (global.fetch as any).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: { status: 'processing' } }),
          headers: new Headers(),
        })
      );

      await expect(
        client.pollJobUntilComplete('job-123', undefined, 10, 50) // 50ms timeout
      ).rejects.toThrow('Job polling timeout');
    });
  });

  // ==========================================================================
  // WEBHOOK VERIFICATION
  // ==========================================================================

  describe('Webhook Verification', () => {
    it('should verify valid webhook signature', async () => {
      const payload = '{"event":"job.completed","job_id":"123"}';

      // Create expected signature using crypto
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode('test-secret'),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payload)
      );
      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const isValid = await client.verifyWebhookSignature(payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const payload = '{"event":"job.completed"}';
      const invalidSignature = 'invalid';

      const isValid = await client.verifyWebhookSignature(
        payload,
        invalidSignature
      );

      expect(isValid).toBe(false);
    });
  });

  // ==========================================================================
  // CACHE MANAGEMENT
  // ==========================================================================

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      mockFetch({ success: true, data: [], count: 0 });

      await client.getAIModels();
      client.clearCache();

      mockFetch({ success: true, data: [], count: 0 });
      await client.getAIModels();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should invalidate specific cache key', async () => {
      mockFetch({ success: true, data: [], count: 0 });

      await client.getAIModels();
      client.invalidateCache('ai-models');

      mockFetch({ success: true, data: [], count: 0 });
      await client.getAIModels();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('validateImageFile', () => {
    it('should validate correct image', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(true);
    });

    it('should reject unsupported format', () => {
      const file = new File([''], 'test.pdf', { type: 'application/pdf' });
      const result = validateImageFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });

    it('should reject file too large', () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.jpg', {
        type: 'image/jpeg',
      });
      const result = validateImageFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('hasEnoughCredits', () => {
    it('should return true when user has enough credits', () => {
      expect(hasEnoughCredits(100, 50)).toBe(true);
    });

    it('should return false when user lacks credits', () => {
      expect(hasEnoughCredits(10, 50)).toBe(false);
    });

    it('should handle exact match', () => {
      expect(hasEnoughCredits(50, 50)).toBe(true);
    });
  });

  describe('calculateJobCredits', () => {
    it('should calculate with normal priority', () => {
      expect(calculateJobCredits(10, 1, 'normal')).toBe(10);
    });

    it('should apply priority multiplier', () => {
      expect(calculateJobCredits(10, 1, 'high')).toBe(15);
      expect(calculateJobCredits(10, 1, 'urgent')).toBe(20);
      expect(calculateJobCredits(10, 1, 'low')).toBe(8);
    });

    it('should multiply by quantity', () => {
      expect(calculateJobCredits(10, 5, 'normal')).toBe(50);
    });

    it('should round up', () => {
      expect(calculateJobCredits(10, 1, 'low')).toBe(8); // 10 * 0.8 = 8
    });
  });

  describe('isJobFinal', () => {
    it('should identify final states', () => {
      expect(isJobFinal('completed')).toBe(true);
      expect(isJobFinal('failed')).toBe(true);
      expect(isJobFinal('cancelled')).toBe(true);
    });

    it('should identify non-final states', () => {
      expect(isJobFinal('pending')).toBe(false);
      expect(isJobFinal('processing')).toBe(false);
    });
  });

  describe('formatAPIError', () => {
    it('should format API error', () => {
      const error = new PikcelAPIErrorClass(
        'TEST_ERROR',
        'Test error message',
        400
      );

      expect(formatAPIError(error)).toBe('Test error message');
    });

    it('should format network error', () => {
      const error = new PikcelNetworkError('Connection failed');

      expect(formatAPIError(error)).toContain('Network error');
    });

    it('should format rate limit error', () => {
      const error = new PikcelRateLimitError('Too many requests', 60);

      expect(formatAPIError(error)).toContain('60 seconds');
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');

      expect(formatAPIError(error)).toBe('Unknown error');
    });
  });
});

// ============================================================================
// INTEGRATION TEST EXAMPLES
// ============================================================================

describe('Integration Tests (Example)', () => {
  // These tests require a test PikcelAI server
  // Skip in normal test runs
  it.skip('should complete full workflow', async () => {
    const client = createPikcelAIClient({
      apiUrl: 'http://localhost:8081',
      apiKey: 'test-key',
    });

    // Get models
    const models = await client.getAIModels();
    expect(models.data.length).toBeGreaterThan(0);

    // Upload image (mock file)
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const upload = await client.uploadImageToPikcel({ file });
    expect(upload.data.url).toBeDefined();

    // Dispatch job
    const job = await client.dispatchJob({
      tool_id: models.data[0].id,
      input_image_url: upload.data.url,
    });
    expect(job.data.id).toBeDefined();

    // Poll until complete
    const result = await client.pollJobUntilComplete(job.data.id);
    expect(result.data.status).toBe('completed');
  });
});
