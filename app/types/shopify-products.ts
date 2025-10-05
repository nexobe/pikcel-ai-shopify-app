/**
 * TypeScript Type Definitions for Shopify Products
 *
 * Comprehensive type definitions for working with Shopify products
 * via the Admin GraphQL API.
 */

/**
 * Shopify Product Image
 */
export interface ShopifyProductImage {
  id: string;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

/**
 * Shopify Product Variant
 */
export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  inventoryQuantity?: number;
  weight?: number;
  weightUnit?: string;
  compareAtPrice?: string;
  barcode?: string;
  availableForSale?: boolean;
  requiresShipping?: boolean;
  taxable?: boolean;
}

/**
 * Shopify Product Status
 */
export type ProductStatus = "ACTIVE" | "ARCHIVED" | "DRAFT";

/**
 * Shopify Product
 */
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml?: string;
  description?: string;
  vendor?: string;
  productType?: string;
  status: ProductStatus;
  totalInventory?: number;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  onlineStoreUrl?: string;
  onlineStorePreviewUrl?: string;
  featuredImage?: ShopifyProductImage;
  images: {
    edges: Array<{
      node: ShopifyProductImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyProductVariant;
    }>;
  };
}

/**
 * Shopify Products Connection (for pagination)
 */
export interface ShopifyProductsConnection {
  edges: Array<{
    node: ShopifyProduct;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
  };
}

/**
 * GraphQL Query Response
 */
export interface ShopifyProductsQueryResponse {
  data: {
    products: ShopifyProductsConnection;
  };
}

/**
 * Product Context for AI Editing
 */
export interface ProductEditContext {
  productId: string;
  productTitle: string;
  images: ShopifyProductImage[];
  vendor?: string;
  productType?: string;
}

/**
 * Bulk Edit Context for AI Editing
 */
export interface BulkEditContext {
  productIds: string[];
  products: ShopifyProduct[];
  bulkEdit: true;
}

/**
 * Product Filter Options
 */
export interface ProductFilterOptions {
  status?: ProductStatus;
  vendor?: string;
  productType?: string;
  tag?: string;
  collection?: string;
  availability?: "available" | "unavailable";
}

/**
 * Product Sort Options
 */
export type ProductSortKey =
  | "TITLE"
  | "PRODUCT_TYPE"
  | "VENDOR"
  | "INVENTORY_TOTAL"
  | "UPDATED_AT"
  | "CREATED_AT"
  | "PUBLISHED_AT"
  | "ID"
  | "RELEVANCE";

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

/**
 * Product Query Variables
 */
export interface ProductQueryVariables extends PaginationParams {
  query?: string;
  sortKey?: ProductSortKey;
  reverse?: boolean;
}

/**
 * Image Upload Input
 */
export interface ImageUploadInput {
  altText?: string;
  src?: string;
  mediaContentType?: "IMAGE";
}

/**
 * Product Create Input
 */
export interface ProductCreateInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  images?: ImageUploadInput[];
  status?: ProductStatus;
}

/**
 * Product Update Input
 */
export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: string;
}

/**
 * Product Media Create Input
 */
export interface ProductMediaCreateInput {
  productId: string;
  media: Array<{
    alt?: string;
    mediaContentType: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO" | "MODEL_3D";
    originalSource: string;
  }>;
}

/**
 * Product Image Update Input
 */
export interface ProductImageUpdateInput {
  id: string;
  altText?: string;
  src?: string;
}

/**
 * Session Storage Keys
 */
export const STORAGE_KEYS = {
  PRODUCT_CONTEXT: "shopify_product_context",
  BULK_EDIT_CONTEXT: "shopify_bulk_edit_context",
  SELECTED_PRODUCTS: "shopify_selected_products",
} as const;

/**
 * Helper type for extracting numeric ID from Shopify GID
 */
export type NumericId = string;

/**
 * Utility function types
 */
export interface ProductUtils {
  extractNumericId: (gid: string) => NumericId;
  buildAdminUrl: (productId: string) => string;
  formatPrice: (price: string) => string;
  getMainImage: (product: ShopifyProduct) => ShopifyProductImage | null;
  hasImages: (product: ShopifyProduct) => boolean;
  getImageCount: (product: ShopifyProduct) => number;
}
