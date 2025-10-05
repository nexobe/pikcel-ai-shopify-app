import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { apiVersion } from "../shopify.server";

// Types for upload request
interface UploadRequest {
  productId: string;
  imageUrl: string;
  altText?: string;
  replaceImageId?: string; // If provided, will replace existing image
  setPrimary?: boolean; // Set as primary product image
  position?: number; // Image position in product gallery
}

interface UploadProgress {
  step: 'validating' | 'staging' | 'uploading' | 'attaching' | 'complete';
  progress: number;
  message: string;
}

interface UploadResult {
  success: boolean;
  mediaId?: string;
  imageUrl?: string;
  error?: string;
  details?: any;
}

// Image validation settings
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const COMPRESSION_THRESHOLD = 5 * 1024 * 1024; // 5MB - compress if larger

/**
 * Validates image format and size
 */
async function validateImage(imageUrl: string): Promise<{
  valid: boolean;
  mimeType?: string;
  size?: number;
  error?: string;
  blob?: Blob;
}> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return { valid: false, error: 'Failed to fetch image' };
    }

    const blob = await response.blob();
    const mimeType = blob.type || response.headers.get('content-type') || '';

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid image format. Allowed formats: JPG, PNG, WebP. Got: ${mimeType}`
      };
    }

    // Validate size
    if (blob.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Image too large. Maximum size: 20MB. Got: ${(blob.size / 1024 / 1024).toFixed(2)}MB`
      };
    }

    return {
      valid: true,
      mimeType,
      size: blob.size,
      blob
    };
  } catch (error) {
    return {
      valid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Compresses image if needed (for images over compression threshold)
 */
async function compressImageIfNeeded(blob: Blob, mimeType: string): Promise<Blob> {
  if (blob.size <= COMPRESSION_THRESHOLD) {
    return blob;
  }

  // For now, return original blob
  // TODO: Implement client-side compression using canvas or image libraries
  console.log(`Image size ${(blob.size / 1024 / 1024).toFixed(2)}MB exceeds threshold, consider compression`);
  return blob;
}

/**
 * Gets the appropriate filename and extension from MIME type
 */
function getFilenamFromMimeType(mimeType: string): { filename: string; extension: string } {
  const typeMap: Record<string, { extension: string; name: string }> = {
    'image/jpeg': { extension: 'jpg', name: 'edited-image' },
    'image/png': { extension: 'png', name: 'edited-image' },
    'image/webp': { extension: 'webp', name: 'edited-image' }
  };

  const type = typeMap[mimeType] || { extension: 'jpg', name: 'edited-image' };
  return {
    filename: `${type.name}-${Date.now()}.${type.extension}`,
    extension: type.extension
  };
}

/**
 * Retries a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Unknown error during retry');
}

/**
 * Step 1: Create staged upload in Shopify
 */
async function createStagedUpload(
  admin: any,
  filename: string,
  mimeType: string
): Promise<{ url: string; resourceUrl: string; parameters: Array<{ name: string; value: string }> }> {
  const mutation = `
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      input: [{
        resource: 'PRODUCT_IMAGE',
        filename,
        mimeType,
        httpMethod: 'POST'
      }]
    }
  });

  const data = await response.json();

  if (data.data.stagedUploadsCreate.userErrors.length > 0) {
    throw new Error(
      `Failed to create staged upload: ${JSON.stringify(data.data.stagedUploadsCreate.userErrors)}`
    );
  }

  const stagedTarget = data.data.stagedUploadsCreate.stagedTargets[0];
  if (!stagedTarget) {
    throw new Error('No staged upload target returned');
  }

  return stagedTarget;
}

/**
 * Step 2: Upload image blob to staged URL
 */
async function uploadToStagedUrl(
  stagedUrl: string,
  parameters: Array<{ name: string; value: string }>,
  imageBlob: Blob
): Promise<void> {
  const formData = new FormData();

  // Add all staging parameters
  parameters.forEach(param => {
    formData.append(param.name, param.value);
  });

  // Add the file
  formData.append('file', imageBlob);

  const response = await fetch(stagedUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Failed to upload to staged URL: ${response.status} ${response.statusText}`);
  }
}

/**
 * Step 3: Attach uploaded image to product (or replace existing)
 */
async function attachImageToProduct(
  admin: any,
  productId: string,
  resourceUrl: string,
  altText?: string,
  replaceImageId?: string,
  position?: number
): Promise<{ mediaId: string; imageUrl: string }> {
  if (replaceImageId) {
    // Replace existing image
    const mutation = `
      mutation productDeleteImages($id: ID!, $imageIds: [ID!]!) {
        productDeleteImages(id: $id, imageIds: $imageIds) {
          deletedImageIds
          product {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const deleteResponse = await admin.graphql(mutation, {
      variables: {
        id: productId,
        imageIds: [replaceImageId]
      }
    });

    const deleteData = await deleteResponse.json();

    if (deleteData.data.productDeleteImages.userErrors.length > 0) {
      console.warn('Failed to delete old image:', deleteData.data.productDeleteImages.userErrors);
    }
  }

  // Create new media
  const mutation = `
    mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
      productCreateMedia(productId: $productId, media: $media) {
        media {
          ... on MediaImage {
            id
            image {
              url
            }
          }
        }
        mediaUserErrors {
          field
          message
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      productId,
      media: [{
        originalSource: resourceUrl,
        alt: altText || 'Edited with PikcelAI',
        mediaContentType: 'IMAGE'
      }]
    }
  });

  const data = await response.json();

  const errors = data.data.productCreateMedia.mediaUserErrors || data.data.productCreateMedia.userErrors;
  if (errors && errors.length > 0) {
    throw new Error(`Failed to attach image: ${JSON.stringify(errors)}`);
  }

  const media = data.data.productCreateMedia.media[0];
  if (!media) {
    throw new Error('No media returned after creation');
  }

  return {
    mediaId: media.id,
    imageUrl: media.image.url
  };
}

/**
 * Sets an image as the primary product image
 */
async function setAsPrimaryImage(
  admin: any,
  productId: string,
  mediaId: string
): Promise<void> {
  const mutation = `
    mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) {
      productReorderMedia(id: $id, moves: $moves) {
        job {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(mutation, {
    variables: {
      id: productId,
      moves: [{
        id: mediaId,
        newPosition: '0'
      }]
    }
  });

  const data = await response.json();

  if (data.data.productReorderMedia.userErrors.length > 0) {
    console.warn('Failed to set as primary:', data.data.productReorderMedia.userErrors);
  }
}

/**
 * Main upload handler with retry logic and progress tracking
 */
async function uploadImageToShopify(
  admin: any,
  request: UploadRequest,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Step 1: Validate image
    onProgress?.({ step: 'validating', progress: 10, message: 'Validating image...' });

    const validation = await validateImage(request.imageUrl);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { mimeType, blob } = validation;
    if (!mimeType || !blob) {
      return { success: false, error: 'Failed to retrieve image data' };
    }

    // Compress if needed
    const processedBlob = await compressImageIfNeeded(blob, mimeType);
    const { filename } = getFilenamFromMimeType(mimeType);

    // Step 2: Create staged upload
    onProgress?.({ step: 'staging', progress: 30, message: 'Creating staged upload...' });

    const stagedTarget = await retryWithBackoff(
      () => createStagedUpload(admin, filename, mimeType),
      3,
      1000
    );

    // Step 3: Upload to staged URL
    onProgress?.({ step: 'uploading', progress: 50, message: 'Uploading image...' });

    await retryWithBackoff(
      () => uploadToStagedUrl(stagedTarget.url, stagedTarget.parameters, processedBlob),
      3,
      2000
    );

    // Step 4: Attach to product
    onProgress?.({ step: 'attaching', progress: 70, message: 'Attaching to product...' });

    const { mediaId, imageUrl } = await retryWithBackoff(
      () => attachImageToProduct(
        admin,
        request.productId,
        stagedTarget.resourceUrl,
        request.altText,
        request.replaceImageId,
        request.position
      ),
      3,
      1000
    );

    // Step 5: Set as primary if requested
    if (request.setPrimary) {
      onProgress?.({ step: 'attaching', progress: 85, message: 'Setting as primary image...' });
      await setAsPrimaryImage(admin, request.productId, mediaId);
    }

    onProgress?.({ step: 'complete', progress: 100, message: 'Upload complete!' });

    return {
      success: true,
      mediaId,
      imageUrl
    };

  } catch (error) {
    console.error('Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

/**
 * Batch upload handler
 */
async function batchUploadImages(
  admin: any,
  uploads: UploadRequest[],
  onProgress?: (index: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < uploads.length; i++) {
    const upload = uploads[i];

    const result = await uploadImageToShopify(
      admin,
      upload,
      (progress) => onProgress?.(i, progress)
    );

    results.push(result);

    // If one fails and we're in a transaction, rollback
    if (!result.success) {
      console.error(`Upload ${i + 1} failed:`, result.error);
      // For now, continue with other uploads
      // TODO: Implement full transaction rollback if needed
    }
  }

  return results;
}

/**
 * Main action handler
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const body = await request.json();

    // Handle single upload
    if (body.productId && body.imageUrl) {
      const uploadRequest: UploadRequest = {
        productId: body.productId,
        imageUrl: body.imageUrl,
        altText: body.altText,
        replaceImageId: body.replaceImageId,
        setPrimary: body.setPrimary,
        position: body.position
      };

      const result = await uploadImageToShopify(admin, uploadRequest);

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Handle batch upload
    if (body.uploads && Array.isArray(body.uploads)) {
      const results = await batchUploadImages(admin, body.uploads);

      const allSuccess = results.every(r => r.success);

      return new Response(JSON.stringify({
        success: allSuccess,
        results
      }), {
        status: allSuccess ? 200 : 207, // 207 Multi-Status for partial success
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request: Must provide either productId+imageUrl or uploads array'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Upload to Shopify failed:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
