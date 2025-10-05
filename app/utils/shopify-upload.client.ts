/**
 * Client-side utilities for uploading images to Shopify
 */

import type {
  UploadRequest,
  UploadResult,
  BatchUploadRequest,
  BatchUploadResult,
  UploadProgress
} from '../types/shopify-upload';

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onError?: (error: Error) => void;
  onSuccess?: (result: UploadResult) => void;
}

export interface BatchUploadOptions {
  onProgress?: (index: number, progress: UploadProgress) => void;
  onError?: (index: number, error: Error) => void;
  onSuccess?: (results: BatchUploadResult) => void;
  stopOnError?: boolean; // Stop batch if one upload fails
}

/**
 * Uploads a single image to Shopify
 */
export async function uploadImageToShopify(
  request: UploadRequest,
  options?: UploadOptions
): Promise<UploadResult> {
  try {
    const response = await fetch('/api/upload-to-shopify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const result: UploadResult = await response.json();

    if (result.success) {
      options?.onSuccess?.(result);
    } else {
      options?.onError?.(new Error(result.error || 'Upload failed'));
    }

    return result;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    options?.onError?.(errorObj);

    return {
      success: false,
      error: errorObj.message
    };
  }
}

/**
 * Uploads multiple images to Shopify in batch
 */
export async function batchUploadToShopify(
  uploads: UploadRequest[],
  options?: BatchUploadOptions
): Promise<BatchUploadResult> {
  try {
    const request: BatchUploadRequest = { uploads };

    const response = await fetch('/api/upload-to-shopify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    const result: BatchUploadResult = await response.json();

    if (result.success) {
      options?.onSuccess?.(result);
    } else {
      // Report individual errors
      result.results.forEach((uploadResult, index) => {
        if (!uploadResult.success) {
          options?.onError?.(index, new Error(uploadResult.error || 'Upload failed'));
        }
      });
    }

    return result;

  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    options?.onError?.(0, errorObj);

    return {
      success: false,
      results: uploads.map(() => ({
        success: false,
        error: errorObj.message
      }))
    };
  }
}

/**
 * Helper to replace an existing product image
 */
export async function replaceProductImage(
  productId: string,
  oldImageId: string,
  newImageUrl: string,
  altText?: string,
  options?: UploadOptions
): Promise<UploadResult> {
  return uploadImageToShopify({
    productId,
    imageUrl: newImageUrl,
    altText,
    replaceImageId: oldImageId
  }, options);
}

/**
 * Helper to add a new product image and set it as primary
 */
export async function addPrimaryProductImage(
  productId: string,
  imageUrl: string,
  altText?: string,
  options?: UploadOptions
): Promise<UploadResult> {
  return uploadImageToShopify({
    productId,
    imageUrl,
    altText,
    setPrimary: true
  }, options);
}

/**
 * Helper to add multiple images to a product
 */
export async function addMultipleProductImages(
  productId: string,
  imageUrls: string[],
  altTexts?: string[],
  options?: BatchUploadOptions
): Promise<BatchUploadResult> {
  const uploads: UploadRequest[] = imageUrls.map((imageUrl, index) => ({
    productId,
    imageUrl,
    altText: altTexts?.[index] || 'Edited with PikcelAI',
    position: index
  }));

  return batchUploadToShopify(uploads, options);
}

/**
 * Validates image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<{
  valid: boolean;
  error?: string;
  size?: number;
  type?: string;
}> {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return {
        valid: false,
        error: `Failed to fetch image: ${response.status} ${response.statusText}`
      };
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (contentType && !allowedTypes.includes(contentType)) {
      return {
        valid: false,
        error: `Invalid image type: ${contentType}. Allowed: JPG, PNG, WebP`
      };
    }

    return {
      valid: true,
      size: contentLength ? parseInt(contentLength, 10) : undefined,
      type: contentType || undefined
    };

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Get upload progress percentage message
 */
export function getProgressMessage(progress: UploadProgress): string {
  const messages = {
    validating: 'Validating image format and size...',
    staging: 'Preparing upload to Shopify...',
    uploading: 'Uploading image...',
    attaching: 'Attaching image to product...',
    complete: 'Upload complete!'
  };

  return messages[progress.step] || progress.message;
}
