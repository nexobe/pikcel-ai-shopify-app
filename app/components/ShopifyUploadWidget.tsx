/**
 * Production-ready Shopify Upload Widget
 * Complete UI component for uploading images to Shopify with progress tracking
 */

import { useState, useEffect } from 'react';
import { useShopifyUpload, useBatchShopifyUpload } from '../hooks/useShopifyUpload';
import { validateImageUrl, formatFileSize, getProgressMessage } from '../utils/shopify-upload.client';
import type { UploadRequest } from '../types/shopify-upload';

interface ShopifyUploadWidgetProps {
  productId: string;
  mode?: 'single' | 'batch';
  onSuccess?: (mediaId: string | string[]) => void;
  onError?: (error: Error) => void;
  maxImages?: number;
  defaultAltText?: string;
  setPrimaryImage?: boolean;
}

export function ShopifyUploadWidget({
  productId,
  mode = 'single',
  onSuccess,
  onError,
  maxImages = 10,
  defaultAltText = 'Product image',
  setPrimaryImage = false
}: ShopifyUploadWidgetProps) {
  const singleUpload = useShopifyUpload();
  const batchUpload = useBatchShopifyUpload();

  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [altTexts, setAltTexts] = useState<string[]>([defaultAltText]);
  const [validations, setValidations] = useState<Record<number, any>>({});

  const isSingleMode = mode === 'single';
  const uploadState = isSingleMode ? singleUpload : batchUpload;

  // Validate images before upload
  const validateImages = async () => {
    const newValidations: Record<number, any> = {};

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      if (url) {
        const validation = await validateImageUrl(url);
        newValidations[i] = validation;
      }
    }

    setValidations(newValidations);
    return Object.values(newValidations).every(v => v.valid);
  };

  const handleSingleUpload = async () => {
    const isValid = await validateImages();
    if (!isValid) {
      onError?.(new Error('Image validation failed'));
      return;
    }

    try {
      const result = await singleUpload.upload({
        productId,
        imageUrl: imageUrls[0],
        altText: altTexts[0] || defaultAltText,
        setPrimary: setPrimaryImage
      });

      if (result.success && result.mediaId) {
        onSuccess?.([result.mediaId]);
      } else {
        onError?.(new Error(result.error || 'Upload failed'));
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleBatchUpload = async () => {
    const isValid = await validateImages();
    if (!isValid) {
      onError?.(new Error('Some images failed validation'));
      return;
    }

    const uploads: UploadRequest[] = imageUrls
      .filter(url => url.trim())
      .map((url, index) => ({
        productId,
        imageUrl: url,
        altText: altTexts[index] || defaultAltText,
        position: index,
        setPrimary: index === 0 && setPrimaryImage
      }));

    try {
      const result = await batchUpload.upload(uploads);

      if (result.success) {
        const mediaIds = result.results
          .filter(r => r.success && r.mediaId)
          .map(r => r.mediaId!);
        onSuccess?.(mediaIds);
      } else {
        const failedCount = result.results.filter(r => !r.success).length;
        onError?.(new Error(`${failedCount} uploads failed`));
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleUpload = () => {
    if (isSingleMode) {
      handleSingleUpload();
    } else {
      handleBatchUpload();
    }
  };

  const addImageField = () => {
    if (imageUrls.length < maxImages) {
      setImageUrls([...imageUrls, '']);
      setAltTexts([...altTexts, defaultAltText]);
    }
  };

  const removeImageField = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
    setAltTexts(altTexts.filter((_, i) => i !== index));
    const newValidations = { ...validations };
    delete newValidations[index];
    setValidations(newValidations);
  };

  const updateImageUrl = (index: number, url: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = url;
    setImageUrls(newUrls);

    // Clear validation for this field
    const newValidations = { ...validations };
    delete newValidations[index];
    setValidations(newValidations);
  };

  const updateAltText = (index: number, text: string) => {
    const newTexts = [...altTexts];
    newTexts[index] = text;
    setAltTexts(newTexts);
  };

  const hasValidImages = imageUrls.some(url => url.trim());
  const canUpload = hasValidImages && !uploadState.uploading;

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Upload to Shopify</h2>

      {/* Image URL inputs */}
      {imageUrls.map((url, index) => (
        <div key={index} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Image URL {!isSingleMode && `${index + 1}`}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => updateImageUrl(index, e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              disabled={uploadState.uploading}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Alt Text
            </label>
            <input
              type="text"
              value={altTexts[index] || ''}
              onChange={(e) => updateAltText(index, e.target.value)}
              placeholder="Product image description"
              style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              disabled={uploadState.uploading}
            />
          </div>

          {/* Validation status */}
          {validations[index] && (
            <div style={{
              padding: '10px',
              borderRadius: '4px',
              backgroundColor: validations[index].valid ? '#d4edda' : '#f8d7da',
              color: validations[index].valid ? '#155724' : '#721c24',
              marginTop: '10px'
            }}>
              {validations[index].valid ? (
                <div>
                  <strong>Valid image</strong>
                  {validations[index].size && (
                    <div>Size: {formatFileSize(validations[index].size)}</div>
                  )}
                  {validations[index].type && (
                    <div>Type: {validations[index].type}</div>
                  )}
                </div>
              ) : (
                <div>
                  <strong>Invalid image</strong>
                  <div>{validations[index].error}</div>
                </div>
              )}
            </div>
          )}

          {/* Remove button for batch mode */}
          {!isSingleMode && imageUrls.length > 1 && (
            <button
              onClick={() => removeImageField(index)}
              style={{
                marginTop: '10px',
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              disabled={uploadState.uploading}
            >
              Remove
            </button>
          )}

          {/* Progress for this image in batch mode */}
          {!isSingleMode && batchUpload.progressMap[index] && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ marginBottom: '5px', fontSize: '14px' }}>
                {getProgressMessage(batchUpload.progressMap[index])}
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${batchUpload.progressMap[index].progress}%`,
                  height: '100%',
                  backgroundColor: '#007bff',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                {batchUpload.progressMap[index].progress}%
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add more images button for batch mode */}
      {!isSingleMode && imageUrls.length < maxImages && (
        <button
          onClick={addImageField}
          style={{
            marginBottom: '20px',
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          disabled={uploadState.uploading}
        >
          Add Image ({imageUrls.length}/{maxImages})
        </button>
      )}

      {/* Upload button */}
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          style={{
            padding: '12px 24px',
            backgroundColor: canUpload ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: canUpload ? 'pointer' : 'not-allowed',
            marginRight: '10px'
          }}
        >
          {uploadState.uploading ? 'Uploading...' : `Upload ${isSingleMode ? 'Image' : 'Images'}`}
        </button>

        <button
          onClick={validateImages}
          disabled={uploadState.uploading || !hasValidImages}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Validate
        </button>
      </div>

      {/* Single upload progress */}
      {isSingleMode && singleUpload.progress && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
            {getProgressMessage(singleUpload.progress)}
          </div>
          <div style={{
            width: '100%',
            height: '10px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${singleUpload.progress.progress}%`,
              height: '100%',
              backgroundColor: '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{ marginTop: '5px', fontSize: '14px', color: '#6c757d' }}>
            {singleUpload.progress.progress}%
          </div>
        </div>
      )}

      {/* Result display */}
      {uploadState.result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: uploadState.result.success ? '#d4edda' : '#f8d7da',
          color: uploadState.result.success ? '#155724' : '#721c24'
        }}>
          {isSingleMode ? (
            // Single upload result
            singleUpload.result?.success ? (
              <div>
                <strong>Upload successful!</strong>
                <div>Media ID: {singleUpload.result.mediaId}</div>
                {singleUpload.result.imageUrl && (
                  <div>
                    <a href={singleUpload.result.imageUrl} target="_blank" rel="noopener noreferrer">
                      View image
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong>Upload failed</strong>
                <div>{singleUpload.result?.error}</div>
              </div>
            )
          ) : (
            // Batch upload result
            batchUpload.result && (
              <div>
                <strong>
                  {batchUpload.result.success ? 'All uploads successful!' : 'Some uploads failed'}
                </strong>
                <div style={{ marginTop: '10px' }}>
                  {batchUpload.result.results.map((result, index) => (
                    <div key={index} style={{ marginBottom: '5px' }}>
                      Image {index + 1}: {result.success ? (
                        <span style={{ color: '#155724' }}>Success (ID: {result.mediaId})</span>
                      ) : (
                        <span style={{ color: '#721c24' }}>Failed: {result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Error display */}
      {uploadState.error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {uploadState.error.message}
        </div>
      )}
    </div>
  );
}

/**
 * Simple component for quick image replacement
 */
export function ReplaceImageButton({
  productId,
  oldImageId,
  newImageUrl,
  altText,
  onSuccess,
  onError
}: {
  productId: string;
  oldImageId: string;
  newImageUrl: string;
  altText?: string;
  onSuccess?: (mediaId: string) => void;
  onError?: (error: Error) => void;
}) {
  const { replace, uploading, progress, result, error } = require('../hooks/useShopifyUpload').useReplaceProductImage();

  const handleReplace = async () => {
    try {
      const uploadResult = await replace(productId, oldImageId, newImageUrl, altText);
      if (uploadResult.success && uploadResult.mediaId) {
        onSuccess?.(uploadResult.mediaId);
      } else {
        onError?.(new Error(uploadResult.error || 'Replace failed'));
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return (
    <div>
      <button
        onClick={handleReplace}
        disabled={uploading}
        style={{
          padding: '8px 16px',
          backgroundColor: uploading ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
      >
        {uploading ? 'Replacing...' : 'Replace Image'}
      </button>

      {progress && (
        <div style={{ marginTop: '10px', fontSize: '14px' }}>
          {getProgressMessage(progress)} ({progress.progress}%)
        </div>
      )}

      {result && (
        <div style={{ marginTop: '10px', color: result.success ? 'green' : 'red' }}>
          {result.success ? `Replaced! New ID: ${result.mediaId}` : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
}
