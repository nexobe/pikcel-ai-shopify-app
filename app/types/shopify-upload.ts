/**
 * Type definitions for Shopify image upload functionality
 */

export interface UploadRequest {
  productId: string;
  imageUrl: string;
  altText?: string;
  replaceImageId?: string; // If provided, will replace existing image
  setPrimary?: boolean; // Set as primary product image
  position?: number; // Image position in product gallery
}

export interface BatchUploadRequest {
  uploads: UploadRequest[];
}

export type UploadProgressStep = 'validating' | 'staging' | 'uploading' | 'attaching' | 'complete';

export interface UploadProgress {
  step: UploadProgressStep;
  progress: number;
  message: string;
}

export interface UploadResult {
  success: boolean;
  mediaId?: string;
  imageUrl?: string;
  error?: string;
  details?: any;
}

export interface BatchUploadResult {
  success: boolean;
  results: UploadResult[];
}

export interface ImageValidation {
  valid: boolean;
  mimeType?: string;
  size?: number;
  error?: string;
  blob?: Blob;
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const COMPRESSION_THRESHOLD = 5 * 1024 * 1024; // 5MB
