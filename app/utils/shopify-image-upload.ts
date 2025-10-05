/**
 * Utility functions for uploading edited images back to Shopify
 *
 * Handles the complete workflow of:
 * 1. Staging uploads
 * 2. Uploading files to Shopify CDN
 * 3. Creating product media records
 * 4. Updating product images
 */

import type { ShopifyProductImage } from "../types/shopify-products";

/**
 * Staged Upload Target Response
 */
interface StagedUploadTarget {
  url: string;
  resourceUrl: string;
  parameters: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Staged Upload Response
 */
interface StagedUploadResponse {
  data: {
    stagedUploadsCreate: {
      stagedTargets: StagedUploadTarget[];
      userErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

/**
 * Product Media Create Response
 */
interface ProductMediaCreateResponse {
  data: {
    productCreateMedia: {
      media: Array<{
        id: string;
        alt?: string;
        image: {
          url: string;
          width: number;
          height: number;
        };
        status: string;
      }>;
      mediaUserErrors: Array<{
        field: string[];
        message: string;
      }>;
    };
  };
}

/**
 * Create a staged upload target for an image
 * @param admin - Shopify Admin GraphQL client
 * @param filename - Name of the file to upload
 * @param mimeType - MIME type of the file
 * @param fileSize - Size of the file in bytes
 * @returns Staged upload target
 */
export async function createStagedUpload(
  admin: any,
  filename: string,
  mimeType: string = "image/png",
  fileSize: number
): Promise<StagedUploadTarget> {
  const STAGED_UPLOADS_CREATE_MUTATION = `#graphql
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

  const response = await admin.graphql(STAGED_UPLOADS_CREATE_MUTATION, {
    variables: {
      input: [
        {
          resource: "PRODUCT_IMAGE",
          filename,
          mimeType,
          fileSize: fileSize.toString(),
          httpMethod: "POST",
        },
      ],
    },
  });

  const responseJson = (await response.json()) as StagedUploadResponse;

  if (responseJson.data.stagedUploadsCreate.userErrors.length > 0) {
    throw new Error(
      responseJson.data.stagedUploadsCreate.userErrors[0].message
    );
  }

  return responseJson.data.stagedUploadsCreate.stagedTargets[0];
}

/**
 * Upload a file to Shopify's CDN using staged upload
 * @param stagedTarget - Staged upload target from createStagedUpload
 * @param file - File blob or buffer to upload
 * @returns Resource URL of the uploaded file
 */
export async function uploadToStagedTarget(
  stagedTarget: StagedUploadTarget,
  file: Blob | Buffer
): Promise<string> {
  const formData = new FormData();

  // Add all parameters from staged target
  stagedTarget.parameters.forEach((param) => {
    formData.append(param.name, param.value);
  });

  // Add the file
  formData.append("file", file);

  const response = await fetch(stagedTarget.url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return stagedTarget.resourceUrl;
}

/**
 * Create product media from uploaded images
 * @param admin - Shopify Admin GraphQL client
 * @param productId - Shopify Product GID
 * @param resourceUrls - Array of resource URLs from staged uploads
 * @param altTexts - Optional array of alt texts for images
 * @returns Created media records
 */
export async function createProductMedia(
  admin: any,
  productId: string,
  resourceUrls: string[],
  altTexts?: string[]
): Promise<ShopifyProductImage[]> {
  const PRODUCT_CREATE_MEDIA_MUTATION = `#graphql
    mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
      productCreateMedia(media: $media, productId: $productId) {
        media {
          ... on MediaImage {
            id
            alt
            image {
              url
              width
              height
            }
            status
          }
        }
        mediaUserErrors {
          field
          message
        }
      }
    }
  `;

  const mediaInput = resourceUrls.map((url, index) => ({
    alt: altTexts?.[index] || "",
    mediaContentType: "IMAGE",
    originalSource: url,
  }));

  const response = await admin.graphql(PRODUCT_CREATE_MEDIA_MUTATION, {
    variables: {
      productId,
      media: mediaInput,
    },
  });

  const responseJson = (await response.json()) as ProductMediaCreateResponse;

  if (responseJson.data.productCreateMedia.mediaUserErrors.length > 0) {
    throw new Error(
      responseJson.data.productCreateMedia.mediaUserErrors[0].message
    );
  }

  return responseJson.data.productCreateMedia.media.map((media) => ({
    id: media.id,
    url: media.image.url,
    altText: media.alt,
    width: media.image.width,
    height: media.image.height,
  }));
}

/**
 * Delete product media
 * @param admin - Shopify Admin GraphQL client
 * @param productId - Shopify Product GID
 * @param mediaIds - Array of media IDs to delete
 */
export async function deleteProductMedia(
  admin: any,
  productId: string,
  mediaIds: string[]
): Promise<void> {
  const PRODUCT_DELETE_MEDIA_MUTATION = `#graphql
    mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
      productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
        deletedMediaIds
        mediaUserErrors {
          field
          message
        }
      }
    }
  `;

  const response = await admin.graphql(PRODUCT_DELETE_MEDIA_MUTATION, {
    variables: {
      productId,
      mediaIds,
    },
  });

  const responseJson = await response.json();

  if (responseJson.data.productDeleteMedia.mediaUserErrors.length > 0) {
    throw new Error(
      responseJson.data.productDeleteMedia.mediaUserErrors[0].message
    );
  }
}

/**
 * Complete workflow to upload an edited image to a product
 * @param admin - Shopify Admin GraphQL client
 * @param productId - Shopify Product GID
 * @param imageBlob - Image file as Blob or Buffer
 * @param filename - Name for the file
 * @param altText - Optional alt text for the image
 * @param replaceExisting - If true, deletes old images before uploading
 * @returns Created product image
 */
export async function uploadEditedImage(
  admin: any,
  productId: string,
  imageBlob: Blob | Buffer,
  filename: string,
  altText?: string,
  replaceExisting: boolean = false
): Promise<ShopifyProductImage> {
  try {
    // Step 1: Get file size
    const fileSize =
      imageBlob instanceof Blob ? imageBlob.size : imageBlob.length;

    // Step 2: Create staged upload target
    const stagedTarget = await createStagedUpload(
      admin,
      filename,
      "image/png",
      fileSize
    );

    // Step 3: Upload to staged target
    const resourceUrl = await uploadToStagedTarget(stagedTarget, imageBlob);

    // Step 4: Create product media
    const createdMedia = await createProductMedia(
      admin,
      productId,
      [resourceUrl],
      altText ? [altText] : undefined
    );

    return createdMedia[0];
  } catch (error) {
    console.error("Error uploading edited image:", error);
    throw error;
  }
}

/**
 * Batch upload multiple edited images to a product
 * @param admin - Shopify Admin GraphQL client
 * @param productId - Shopify Product GID
 * @param images - Array of images to upload
 * @returns Array of created product images
 */
export async function batchUploadImages(
  admin: any,
  productId: string,
  images: Array<{
    blob: Blob | Buffer;
    filename: string;
    altText?: string;
  }>
): Promise<ShopifyProductImage[]> {
  try {
    const resourceUrls: string[] = [];
    const altTexts: string[] = [];

    // Step 1: Create staged uploads and upload all files
    for (const image of images) {
      const fileSize =
        image.blob instanceof Blob ? image.blob.size : image.blob.length;

      const stagedTarget = await createStagedUpload(
        admin,
        image.filename,
        "image/png",
        fileSize
      );

      const resourceUrl = await uploadToStagedTarget(
        stagedTarget,
        image.blob
      );

      resourceUrls.push(resourceUrl);
      altTexts.push(image.altText || "");
    }

    // Step 2: Create all media records in one batch
    const createdMedia = await createProductMedia(
      admin,
      productId,
      resourceUrls,
      altTexts
    );

    return createdMedia;
  } catch (error) {
    console.error("Error batch uploading images:", error);
    throw error;
  }
}

/**
 * Replace a product image with an edited version
 * @param admin - Shopify Admin GraphQL client
 * @param productId - Shopify Product GID
 * @param oldImageId - ID of the image to replace
 * @param newImageBlob - New image blob
 * @param filename - Filename for new image
 * @param altText - Optional alt text
 * @returns Created product image
 */
export async function replaceProductImage(
  admin: any,
  productId: string,
  oldImageId: string,
  newImageBlob: Blob | Buffer,
  filename: string,
  altText?: string
): Promise<ShopifyProductImage> {
  try {
    // Step 1: Upload new image
    const newImage = await uploadEditedImage(
      admin,
      productId,
      newImageBlob,
      filename,
      altText
    );

    // Step 2: Delete old image
    await deleteProductMedia(admin, productId, [oldImageId]);

    return newImage;
  } catch (error) {
    console.error("Error replacing product image:", error);
    throw error;
  }
}

/**
 * Convert a data URL to Blob
 * @param dataUrl - Data URL string (e.g., from canvas.toDataURL())
 * @returns Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Convert a File to Blob
 * @param file - File object
 * @returns Blob
 */
export async function fileToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Blob([reader.result]));
      } else {
        reject(new Error("Failed to convert file to blob"));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Download an image from a URL and convert to Blob
 * @param imageUrl - URL of the image
 * @returns Blob
 */
export async function downloadImageAsBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Example usage in an action function:
 *
 * export const action = async ({ request }: ActionFunctionArgs) => {
 *   const { admin } = await authenticate.admin(request);
 *   const formData = await request.formData();
 *
 *   const productId = formData.get("productId") as string;
 *   const imageFile = formData.get("image") as File;
 *   const altText = formData.get("altText") as string;
 *
 *   // Upload the edited image
 *   const uploadedImage = await uploadEditedImage(
 *     admin,
 *     productId,
 *     await fileToBlob(imageFile),
 *     imageFile.name,
 *     altText
 *   );
 *
 *   return { success: true, image: uploadedImage };
 * };
 */
