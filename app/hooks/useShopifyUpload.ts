/**
 * React hook for managing Shopify image uploads with state management
 */

import { useState, useCallback } from 'react';
import {
  uploadImageToShopify,
  batchUploadToShopify,
  replaceProductImage,
  addPrimaryProductImage
} from '../utils/shopify-upload.client';
import type {
  UploadRequest,
  UploadResult,
  UploadProgress,
  BatchUploadResult
} from '../types/shopify-upload';

interface UploadState {
  uploading: boolean;
  progress: UploadProgress | null;
  result: UploadResult | null;
  error: Error | null;
}

interface BatchUploadState {
  uploading: boolean;
  progressMap: Record<number, UploadProgress>;
  result: BatchUploadResult | null;
  error: Error | null;
}

/**
 * Hook for single image upload
 */
export function useShopifyUpload() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: null,
    result: null,
    error: null
  });

  const upload = useCallback(async (request: UploadRequest) => {
    setState({
      uploading: true,
      progress: null,
      result: null,
      error: null
    });

    try {
      const result = await uploadImageToShopify(request, {
        onProgress: (progress) => {
          setState(prev => ({
            ...prev,
            progress
          }));
        },
        onError: (error) => {
          setState(prev => ({
            ...prev,
            error
          }));
        }
      });

      setState(prev => ({
        ...prev,
        uploading: false,
        result
      }));

      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState({
        uploading: false,
        progress: null,
        result: null,
        error: errorObj
      });
      throw errorObj;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: null,
      result: null,
      error: null
    });
  }, []);

  return {
    upload,
    reset,
    ...state
  };
}

/**
 * Hook for batch image upload
 */
export function useBatchShopifyUpload() {
  const [state, setState] = useState<BatchUploadState>({
    uploading: false,
    progressMap: {},
    result: null,
    error: null
  });

  const upload = useCallback(async (uploads: UploadRequest[]) => {
    setState({
      uploading: true,
      progressMap: {},
      result: null,
      error: null
    });

    try {
      const result = await batchUploadToShopify(uploads, {
        onProgress: (index, progress) => {
          setState(prev => ({
            ...prev,
            progressMap: {
              ...prev.progressMap,
              [index]: progress
            }
          }));
        },
        onError: (index, error) => {
          console.error(`Upload ${index + 1} failed:`, error);
        }
      });

      setState(prev => ({
        ...prev,
        uploading: false,
        result
      }));

      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState({
        uploading: false,
        progressMap: {},
        result: null,
        error: errorObj
      });
      throw errorObj;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progressMap: {},
      result: null,
      error: null
    });
  }, []);

  return {
    upload,
    reset,
    ...state
  };
}

/**
 * Hook for replacing product images
 */
export function useReplaceProductImage() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: null,
    result: null,
    error: null
  });

  const replace = useCallback(async (
    productId: string,
    oldImageId: string,
    newImageUrl: string,
    altText?: string
  ) => {
    setState({
      uploading: true,
      progress: null,
      result: null,
      error: null
    });

    try {
      const result = await replaceProductImage(
        productId,
        oldImageId,
        newImageUrl,
        altText,
        {
          onProgress: (progress) => {
            setState(prev => ({
              ...prev,
              progress
            }));
          }
        }
      );

      setState(prev => ({
        ...prev,
        uploading: false,
        result
      }));

      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState({
        uploading: false,
        progress: null,
        result: null,
        error: errorObj
      });
      throw errorObj;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: null,
      result: null,
      error: null
    });
  }, []);

  return {
    replace,
    reset,
    ...state
  };
}

/**
 * Hook for adding primary product image
 */
export function useAddPrimaryImage() {
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: null,
    result: null,
    error: null
  });

  const addPrimary = useCallback(async (
    productId: string,
    imageUrl: string,
    altText?: string
  ) => {
    setState({
      uploading: true,
      progress: null,
      result: null,
      error: null
    });

    try {
      const result = await addPrimaryProductImage(
        productId,
        imageUrl,
        altText,
        {
          onProgress: (progress) => {
            setState(prev => ({
              ...prev,
              progress
            }));
          }
        }
      );

      setState(prev => ({
        ...prev,
        uploading: false,
        result
      }));

      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setState({
        uploading: false,
        progress: null,
        result: null,
        error: errorObj
      });
      throw errorObj;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      uploading: false,
      progress: null,
      result: null,
      error: null
    });
  }, []);

  return {
    addPrimary,
    reset,
    ...state
  };
}

/**
 * Combined hook for all upload operations
 */
export function useShopifyUploads() {
  const singleUpload = useShopifyUpload();
  const batchUpload = useBatchShopifyUpload();
  const replaceImage = useReplaceProductImage();
  const addPrimary = useAddPrimaryImage();

  return {
    single: singleUpload,
    batch: batchUpload,
    replace: replaceImage,
    primary: addPrimary
  };
}
