/**
 * Example React component showing how to use the Shopify upload functionality
 */

import { useState } from 'react';
import {
  uploadImageToShopify,
  batchUploadToShopify,
  replaceProductImage,
  addPrimaryProductImage,
  validateImageUrl,
  formatFileSize,
  getProgressMessage
} from '../utils/shopify-upload.client';
import type { UploadProgress, UploadResult } from '../types/shopify-upload';

export function SingleImageUploadExample() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleUpload = async () => {
    setUploading(true);
    setResult(null);

    const uploadResult = await uploadImageToShopify({
      productId: 'gid://shopify/Product/123456',
      imageUrl: 'https://example.com/edited-image.jpg',
      altText: 'Edited product image',
      setPrimary: true
    }, {
      onProgress: (prog) => {
        setProgress(prog);
        console.log(`Upload progress: ${prog.progress}% - ${prog.message}`);
      },
      onSuccess: (res) => {
        console.log('Upload successful:', res);
        setResult(res);
      },
      onError: (error) => {
        console.error('Upload failed:', error);
      }
    });

    setUploading(false);
    setResult(uploadResult);
  };

  return (
    <div>
      <h3>Single Image Upload</h3>

      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>

      {progress && (
        <div>
          <div>Step: {progress.step}</div>
          <div>Progress: {progress.progress}%</div>
          <div>{getProgressMessage(progress)}</div>
          <progress value={progress.progress} max={100} />
        </div>
      )}

      {result && (
        <div>
          {result.success ? (
            <div>
              <p style={{ color: 'green' }}>Upload successful!</p>
              <p>Media ID: {result.mediaId}</p>
              <p>Image URL: {result.imageUrl}</p>
            </div>
          ) : (
            <div>
              <p style={{ color: 'red' }}>Upload failed: {result.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReplaceImageExample() {
  const [uploading, setUploading] = useState(false);

  const handleReplace = async () => {
    setUploading(true);

    const result = await replaceProductImage(
      'gid://shopify/Product/123456',
      'gid://shopify/ProductImage/789',
      'https://example.com/new-image.jpg',
      'Updated product image'
    );

    setUploading(false);

    if (result.success) {
      console.log('Image replaced successfully:', result.mediaId);
    } else {
      console.error('Failed to replace image:', result.error);
    }
  };

  return (
    <div>
      <h3>Replace Existing Image</h3>
      <button onClick={handleReplace} disabled={uploading}>
        {uploading ? 'Replacing...' : 'Replace Image'}
      </button>
    </div>
  );
}

export function BatchUploadExample() {
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, UploadProgress>>({});

  const handleBatchUpload = async () => {
    setUploading(true);
    setProgressMap({});

    const images = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ];

    const result = await batchUploadToShopify(
      images.map((url, index) => ({
        productId: 'gid://shopify/Product/123456',
        imageUrl: url,
        altText: `Product image ${index + 1}`,
        position: index
      })),
      {
        onProgress: (index, prog) => {
          setProgressMap(prev => ({
            ...prev,
            [index]: prog
          }));
        },
        onError: (index, error) => {
          console.error(`Upload ${index + 1} failed:`, error);
        },
        onSuccess: (results) => {
          console.log('Batch upload complete:', results);
        }
      }
    );

    setUploading(false);

    const successCount = result.results.filter(r => r.success).length;
    console.log(`${successCount}/${images.length} images uploaded successfully`);
  };

  return (
    <div>
      <h3>Batch Upload</h3>
      <button onClick={handleBatchUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload 3 Images'}
      </button>

      {Object.entries(progressMap).map(([index, progress]) => (
        <div key={index}>
          <div>Image {parseInt(index) + 1}: {progress.progress}%</div>
          <progress value={progress.progress} max={100} />
        </div>
      ))}
    </div>
  );
}

export function ImageValidationExample() {
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  const handleValidate = async () => {
    setValidating(true);

    const result = await validateImageUrl('https://example.com/image.jpg');
    setValidation(result);

    setValidating(false);
  };

  return (
    <div>
      <h3>Image Validation</h3>
      <button onClick={handleValidate} disabled={validating}>
        {validating ? 'Validating...' : 'Validate Image'}
      </button>

      {validation && (
        <div>
          {validation.valid ? (
            <div>
              <p style={{ color: 'green' }}>Image is valid</p>
              <p>Type: {validation.type}</p>
              <p>Size: {validation.size ? formatFileSize(validation.size) : 'Unknown'}</p>
            </div>
          ) : (
            <div>
              <p style={{ color: 'red' }}>Invalid image: {validation.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Complete workflow example: Process image with AI, then upload to Shopify
 */
export function AIProcessAndUploadExample() {
  const [processing, setProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const handleProcessAndUpload = async () => {
    setProcessing(true);

    try {
      // Step 1: Process image with AI (this would be your existing AI processing logic)
      // For this example, we'll simulate it
      const simulatedProcessedUrl = 'https://example.com/ai-processed-image.jpg';
      setProcessedImageUrl(simulatedProcessedUrl);

      // Step 2: Upload processed image to Shopify
      const result = await uploadImageToShopify({
        productId: 'gid://shopify/Product/123456',
        imageUrl: simulatedProcessedUrl,
        altText: 'AI-enhanced product image',
        setPrimary: true
      }, {
        onProgress: (progress) => {
          console.log(`Upload: ${progress.progress}% - ${progress.message}`);
        }
      });

      setUploadResult(result);

      if (result.success) {
        console.log('Image processed and uploaded successfully!');
        // Optionally refresh product data or show success message
      }

    } catch (error) {
      console.error('Failed to process and upload:', error);
    }

    setProcessing(false);
  };

  return (
    <div>
      <h3>AI Process + Upload Workflow</h3>
      <button onClick={handleProcessAndUpload} disabled={processing}>
        {processing ? 'Processing & Uploading...' : 'Process with AI & Upload'}
      </button>

      {processedImageUrl && (
        <div>
          <p>Processed image: {processedImageUrl}</p>
        </div>
      )}

      {uploadResult && (
        <div>
          {uploadResult.success ? (
            <div>
              <p style={{ color: 'green' }}>Successfully uploaded to Shopify!</p>
              <p>Media ID: {uploadResult.mediaId}</p>
              <img src={uploadResult.imageUrl} alt="Uploaded" style={{ maxWidth: 200 }} />
            </div>
          ) : (
            <div>
              <p style={{ color: 'red' }}>Upload failed: {uploadResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
