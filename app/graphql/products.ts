/**
 * Shopify GraphQL Queries and Mutations for Products
 *
 * Comprehensive collection of GraphQL operations for product management
 */

/**
 * Main Products Query with Pagination
 * Fetches products with images, variants, and metadata
 */
export const PRODUCTS_QUERY = `#graphql
  query getProducts($first: Int, $after: String, $before: String, $last: Int, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, before: $before, last: $last, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges {
        node {
          id
          title
          handle
          descriptionHtml
          vendor
          productType
          status
          totalInventory
          tags
          createdAt
          updatedAt
          publishedAt
          onlineStoreUrl
          onlineStorePreviewUrl
          featuredImage {
            id
            url
            altText
            width
            height
          }
          images(first: 250) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                compareAtPrice
                barcode
                availableForSale
                requiresShipping
                taxable
                weight
                weightUnit
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Single Product Query
 * Fetches detailed information for a single product
 */
export const PRODUCT_QUERY = `#graphql
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      descriptionHtml
      description
      vendor
      productType
      status
      totalInventory
      tags
      createdAt
      updatedAt
      publishedAt
      onlineStoreUrl
      onlineStorePreviewUrl
      featuredImage {
        id
        url
        altText
        width
        height
      }
      images(first: 250) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price
            sku
            inventoryQuantity
            compareAtPrice
            barcode
            availableForSale
            requiresShipping
            taxable
            weight
            weightUnit
          }
        }
      }
    }
  }
`;

/**
 * Products Count Query
 * Returns the total count of products matching a query
 */
export const PRODUCTS_COUNT_QUERY = `#graphql
  query getProductsCount($query: String) {
    productsCount(query: $query) {
      count
    }
  }
`;

/**
 * Product Media Query
 * Fetches all media (images, videos) for a product
 */
export const PRODUCT_MEDIA_QUERY = `#graphql
  query getProductMedia($id: ID!) {
    product(id: $id) {
      id
      media(first: 250) {
        edges {
          node {
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
            ... on Video {
              id
              alt
              sources {
                url
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Update Product Mutation
 * Updates product fields (not images)
 */
export const PRODUCT_UPDATE_MUTATION = `#graphql
  mutation updateProduct($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        descriptionHtml
        vendor
        productType
        status
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Product Create Mutation
 * Creates a new product
 */
export const PRODUCT_CREATE_MUTATION = `#graphql
  mutation createProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        status
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Product Delete Mutation
 * Deletes a product
 */
export const PRODUCT_DELETE_MUTATION = `#graphql
  mutation deleteProduct($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Create Product Media Mutation
 * Uploads images/media to a product
 */
export const PRODUCT_CREATE_MEDIA_MUTATION = `#graphql
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
      product {
        id
      }
    }
  }
`;

/**
 * Update Product Media Mutation
 * Updates existing media (alt text, etc.)
 */
export const PRODUCT_UPDATE_MEDIA_MUTATION = `#graphql
  mutation productUpdateMedia($media: [UpdateMediaInput!]!, $productId: ID!) {
    productUpdateMedia(media: $media, productId: $productId) {
      media {
        ... on MediaImage {
          id
          alt
          image {
            url
          }
        }
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

/**
 * Delete Product Media Mutation
 * Removes images/media from a product
 */
export const PRODUCT_DELETE_MEDIA_MUTATION = `#graphql
  mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
    productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
      deletedMediaIds
      mediaUserErrors {
        field
        message
      }
      product {
        id
      }
    }
  }
`;

/**
 * Reorder Product Media Mutation
 * Changes the order of product images
 */
export const PRODUCT_REORDER_MEDIA_MUTATION = `#graphql
  mutation productReorderMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job {
        id
        done
      }
      mediaUserErrors {
        field
        message
      }
    }
  }
`;

/**
 * Publish Product Mutation
 * Publishes a product to sales channels
 */
export const PRODUCT_PUBLISH_MUTATION = `#graphql
  mutation publishProduct($input: ProductPublishInput!) {
    productPublish(input: $input) {
      product {
        id
        publishedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Unpublish Product Mutation
 * Unpublishes a product from sales channels
 */
export const PRODUCT_UNPUBLISH_MUTATION = `#graphql
  mutation unpublishProduct($input: ProductUnpublishInput!) {
    productUnpublish(input: $input) {
      product {
        id
        publishedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Staged Uploads Create Mutation
 * Creates staged upload targets for large files
 */
export const STAGED_UPLOADS_CREATE_MUTATION = `#graphql
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

/**
 * Bulk Operation Run Mutation
 * Runs bulk operations (useful for large product updates)
 */
export const BULK_OPERATION_RUN_MUTATION = `#graphql
  mutation bulkOperationRunMutation($mutation: String!, $stagedUploadPath: String!) {
    bulkOperationRunMutation(mutation: $mutation, stagedUploadPath: $stagedUploadPath) {
      bulkOperation {
        id
        url
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Product Variants Update Mutation
 * Updates multiple product variants
 */
export const PRODUCT_VARIANTS_BULK_UPDATE_MUTATION = `#graphql
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants {
        id
        price
        compareAtPrice
        sku
        inventoryQuantity
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Get Vendors Query
 * Fetches unique vendors for filtering
 */
export const GET_VENDORS_QUERY = `#graphql
  query getVendors {
    shop {
      productVendors(first: 100) {
        edges {
          node
        }
      }
    }
  }
`;

/**
 * Get Product Types Query
 * Fetches unique product types for filtering
 */
export const GET_PRODUCT_TYPES_QUERY = `#graphql
  query getProductTypes {
    shop {
      productTypes(first: 100) {
        edges {
          node
        }
      }
    }
  }
`;

/**
 * Get Product Tags Query
 * Fetches unique tags for filtering
 */
export const GET_PRODUCT_TAGS_QUERY = `#graphql
  query getProductTags($first: Int!) {
    shop {
      productTags(first: $first) {
        edges {
          node
        }
      }
    }
  }
`;
