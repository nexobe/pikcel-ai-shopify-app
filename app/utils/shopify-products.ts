/**
 * Utility functions for working with Shopify products
 */

import type {
  ShopifyProduct,
  ShopifyProductImage,
  NumericId,
  ProductEditContext,
  BulkEditContext,
  STORAGE_KEYS,
} from "../types/shopify-products";

/**
 * Extract numeric ID from Shopify GID
 * @param gid - Shopify Global ID (e.g., "gid://shopify/Product/123456")
 * @returns Numeric ID as string
 */
export function extractNumericId(gid: string): NumericId {
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] : gid;
}

/**
 * Build Shopify Admin URL for a product
 * @param productId - Shopify Product GID or numeric ID
 * @returns Shopify admin URL
 */
export function buildAdminUrl(productId: string): string {
  const numericId = extractNumericId(productId);
  return `shopify:admin/products/${numericId}`;
}

/**
 * Format price with currency symbol
 * @param price - Price as string
 * @param currency - Currency code (default: "USD")
 * @returns Formatted price string
 */
export function formatPrice(
  price: string,
  currency: string = "USD"
): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numPrice);
}

/**
 * Get the main image for a product (featured or first image)
 * @param product - Shopify product
 * @returns Main product image or null
 */
export function getMainImage(
  product: ShopifyProduct
): ShopifyProductImage | null {
  if (product.featuredImage) {
    return product.featuredImage;
  }

  if (product.images?.edges?.length > 0) {
    return product.images.edges[0].node;
  }

  return null;
}

/**
 * Check if product has images
 * @param product - Shopify product
 * @returns Boolean indicating if product has images
 */
export function hasImages(product: ShopifyProduct): boolean {
  return (
    !!product.featuredImage ||
    (!!product.images?.edges && product.images.edges.length > 0)
  );
}

/**
 * Get total image count for a product
 * @param product - Shopify product
 * @returns Number of images
 */
export function getImageCount(product: ShopifyProduct): number {
  return product.images?.edges?.length || 0;
}

/**
 * Get all product images as a flat array
 * @param product - Shopify product
 * @returns Array of product images
 */
export function getAllImages(product: ShopifyProduct): ShopifyProductImage[] {
  if (!product.images?.edges) return [];
  return product.images.edges.map((edge) => edge.node);
}

/**
 * Save product context to session storage for AI editing
 * @param context - Product edit context
 */
export function saveProductContext(context: ProductEditContext): void {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(
    "shopify_product_context",
    JSON.stringify(context)
  );
}

/**
 * Save bulk edit context to session storage
 * @param context - Bulk edit context
 */
export function saveBulkEditContext(context: BulkEditContext): void {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(
    "shopify_bulk_edit_context",
    JSON.stringify(context)
  );
}

/**
 * Load product context from session storage
 * @returns Product edit context or null
 */
export function loadProductContext(): ProductEditContext | null {
  if (typeof window === "undefined") return null;

  const data = sessionStorage.getItem("shopify_product_context");
  if (!data) return null;

  try {
    return JSON.parse(data) as ProductEditContext;
  } catch {
    return null;
  }
}

/**
 * Load bulk edit context from session storage
 * @returns Bulk edit context or null
 */
export function loadBulkEditContext(): BulkEditContext | null {
  if (typeof window === "undefined") return null;

  const data = sessionStorage.getItem("shopify_bulk_edit_context");
  if (!data) return null;

  try {
    return JSON.parse(data) as BulkEditContext;
  } catch {
    return null;
  }
}

/**
 * Clear product context from session storage
 */
export function clearProductContext(): void {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem("shopify_product_context");
  sessionStorage.removeItem("shopify_bulk_edit_context");
}

/**
 * Build GraphQL query string for product filtering
 * @param filters - Object with filter criteria
 * @returns GraphQL query string
 */
export function buildProductQueryString(filters: {
  status?: string;
  vendor?: string;
  productType?: string;
  tag?: string;
  title?: string;
}): string {
  const parts: string[] = [];

  if (filters.status) {
    parts.push(`status:${filters.status}`);
  }

  if (filters.vendor) {
    parts.push(`vendor:"${filters.vendor}"`);
  }

  if (filters.productType) {
    parts.push(`product_type:"${filters.productType}"`);
  }

  if (filters.tag) {
    parts.push(`tag:"${filters.tag}"`);
  }

  if (filters.title) {
    parts.push(`title:*${filters.title}*`);
  }

  return parts.join(" AND ");
}

/**
 * Truncate text to a maximum length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Get variant count for a product
 * @param product - Shopify product
 * @returns Number of variants
 */
export function getVariantCount(product: ShopifyProduct): number {
  return product.variants?.edges?.length || 0;
}

/**
 * Check if product has multiple variants
 * @param product - Shopify product
 * @returns Boolean indicating if product has multiple variants
 */
export function hasMultipleVariants(product: ShopifyProduct): boolean {
  return getVariantCount(product) > 1;
}

/**
 * Get price range for a product
 * @param product - Shopify product
 * @returns Price range object or null
 */
export function getPriceRange(product: ShopifyProduct): {
  min: string;
  max: string;
} | null {
  if (!product.variants?.edges || product.variants.edges.length === 0) {
    return null;
  }

  const prices = product.variants.edges
    .map((edge) => parseFloat(edge.node.price))
    .filter((price) => !isNaN(price));

  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    min: min.toFixed(2),
    max: max.toFixed(2),
  };
}

/**
 * Format price range as display string
 * @param product - Shopify product
 * @param currency - Currency code
 * @returns Formatted price range string
 */
export function formatPriceRange(
  product: ShopifyProduct,
  currency: string = "USD"
): string {
  const range = getPriceRange(product);

  if (!range) return "N/A";

  if (range.min === range.max) {
    return formatPrice(range.min, currency);
  }

  return `${formatPrice(range.min, currency)} - ${formatPrice(
    range.max,
    currency
  )}`;
}

/**
 * Get status badge color based on product status
 * @param status - Product status
 * @returns Badge tone for Polaris
 */
export function getStatusBadgeTone(
  status: string
): "success" | "attention" | "info" | "warning" {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "info";
    case "ARCHIVED":
      return "warning";
    default:
      return "attention";
  }
}

/**
 * Create product edit context from product data
 * @param product - Shopify product
 * @returns Product edit context
 */
export function createProductEditContext(
  product: ShopifyProduct
): ProductEditContext {
  return {
    productId: product.id,
    productTitle: product.title,
    images: getAllImages(product),
    vendor: product.vendor,
    productType: product.productType,
  };
}

/**
 * Create bulk edit context from multiple products
 * @param products - Array of Shopify products
 * @returns Bulk edit context
 */
export function createBulkEditContext(
  products: ShopifyProduct[]
): BulkEditContext {
  return {
    productIds: products.map((p) => p.id),
    products,
    bulkEdit: true,
  };
}

/**
 * Validate product has editable images
 * @param product - Shopify product
 * @returns Validation result
 */
export function validateProductForEditing(product: ShopifyProduct): {
  valid: boolean;
  error?: string;
} {
  if (!hasImages(product)) {
    return {
      valid: false,
      error: "Product has no images to edit",
    };
  }

  return { valid: true };
}

/**
 * Sort products by a given field
 * @param products - Array of products
 * @param field - Field to sort by
 * @param ascending - Sort direction
 * @returns Sorted array of products
 */
export function sortProducts(
  products: ShopifyProduct[],
  field: keyof ShopifyProduct,
  ascending: boolean = true
): ShopifyProduct[] {
  return [...products].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === undefined || bVal === undefined) return 0;

    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}
