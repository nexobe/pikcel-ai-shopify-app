import { useState, useEffect, useCallback } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

/**
 * TypeScript Interfaces
 */
interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

interface ProductVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  inventoryQuantity?: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  status: string;
  totalInventory?: number;
  images: {
    edges: Array<{
      node: ProductImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ProductVariant;
    }>;
  };
  featuredImage?: ProductImage;
}

interface ProductsData {
  products: {
    edges: Array<{
      node: Product;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor: string;
      endCursor: string;
    };
  };
}

interface LoaderData {
  products: ProductsData;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  endCursor: string | null;
  startCursor: string | null;
}

/**
 * GraphQL Query for fetching products with pagination
 */
const PRODUCTS_QUERY = `#graphql
  query getProducts($first: Int, $after: String, $before: String, $last: Int, $query: String) {
    products(first: $first, after: $after, before: $before, last: $last, query: $query, sortKey: UPDATED_AT, reverse: true) {
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
          featuredImage {
            id
            url
            altText
            width
            height
          }
          images(first: 10) {
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
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
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
 * Loader Function - Fetches products from Shopify
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Parse query parameters for pagination and search
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const direction = url.searchParams.get("direction") || "next";
  const searchQuery = url.searchParams.get("query") || "";

  // Build GraphQL variables
  const variables: {
    first?: number;
    after?: string;
    before?: string;
    last?: number;
    query?: string;
  } = {
    query: searchQuery || undefined,
  };

  if (direction === "next") {
    variables.first = 20;
    if (cursor) variables.after = cursor;
  } else {
    variables.last = 20;
    if (cursor) variables.before = cursor;
  }

  try {
    const response = await admin.graphql(PRODUCTS_QUERY, { variables });
    const data = (await response.json()) as { data: ProductsData };

    return {
      products: data.data,
      hasNextPage: data.data.products.pageInfo.hasNextPage,
      hasPreviousPage: data.data.products.pageInfo.hasPreviousPage,
      endCursor: data.data.products.pageInfo.endCursor,
      startCursor: data.data.products.pageInfo.startCursor,
      searchQuery,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Response("Failed to load products", { status: 500 });
  }
};

/**
 * Action Function - Handles form submissions (search, bulk actions)
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "bulkEdit") {
    const productIds = formData.get("productIds") as string;
    const ids = productIds.split(",");

    // Return the product IDs for client-side handling
    return { success: true, productIds: ids };
  }

  return { success: false };
};

/**
 * Main Component
 */
export default function ProductsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  // State management
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState(
    loaderData.searchQuery || ""
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Extract products from loader data
  const products =
    loaderData.products?.products?.edges?.map((edge) => edge.node) || [];

  /**
   * Toggle product selection
   */
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all products on current page
   */
  const selectAllProducts = useCallback(() => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  }, [products, selectedProducts.size]);

  /**
   * Navigate to edit images page with selected product context
   */
  const handleEditWithAI = useCallback(
    (product: Product) => {
      const imageData = {
        productId: product.id,
        productTitle: product.title,
        images: product.images.edges.map((edge) => edge.node),
      };

      // Store in session storage for AI editor
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "shopify_product_context",
          JSON.stringify(imageData)
        );
      }

      shopify.toast.show(`Preparing ${product.title} for AI editing`);

      // Navigate to AI editor (you'll need to create this route)
      navigate(`/app/ai-editor?productId=${encodeURIComponent(product.id)}`);
    },
    [navigate, shopify]
  );

  /**
   * Handle bulk edit action
   */
  const handleBulkEdit = useCallback(() => {
    if (selectedProducts.size === 0) {
      shopify.toast.show("Please select products to edit", { isError: true });
      return;
    }

    const productIds = Array.from(selectedProducts);
    const imageData = {
      productIds,
      products: products.filter((p) => productIds.includes(p.id)),
      bulkEdit: true,
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "shopify_bulk_edit_context",
        JSON.stringify(imageData)
      );
    }

    shopify.toast.show(
      `Preparing ${selectedProducts.size} products for batch editing`
    );
    navigate(`/app/ai-editor?bulk=true&count=${selectedProducts.size}`);
  }, [selectedProducts, products, navigate, shopify]);

  /**
   * Handle search
   */
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const query = searchTerm.trim();
      navigate(query ? `/app/products?query=${encodeURIComponent(query)}` : "/app/products");
    },
    [searchTerm, navigate]
  );

  /**
   * Clear search
   */
  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    navigate("/app/products");
  }, [navigate]);

  /**
   * Pagination handlers
   */
  const handleNextPage = useCallback(() => {
    if (loaderData.hasNextPage && loaderData.endCursor) {
      const url = new URL(window.location.href);
      url.searchParams.set("cursor", loaderData.endCursor);
      url.searchParams.set("direction", "next");
      navigate(`/app/products?${url.searchParams.toString()}`);
    }
  }, [loaderData, navigate]);

  const handlePreviousPage = useCallback(() => {
    if (loaderData.hasPreviousPage && loaderData.startCursor) {
      const url = new URL(window.location.href);
      url.searchParams.set("cursor", loaderData.startCursor);
      url.searchParams.set("direction", "prev");
      navigate(`/app/products?${url.searchParams.toString()}`);
    }
  }, [loaderData, navigate]);

  /**
   * View product in Shopify admin
   */
  const viewProductInAdmin = useCallback(
    (productId: string) => {
      const numericId = productId.replace("gid://shopify/Product/", "");
      window.open(`shopify:admin/products/${numericId}`, "_blank");
    },
    []
  );

  return (
    <s-page heading="Products">
      <s-button slot="primary-action" onClick={handleBulkEdit}>
        Edit Selected with AI ({selectedProducts.size})
      </s-button>

      <s-section>
        {/* Search and Filters */}
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-text-field
              label=""
              placeholder="Search products by title, SKU, or vendor..."
              value={searchTerm}
              onInput={(e: any) => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <s-button onClick={handleSearch}>Search</s-button>
            {searchTerm && (
              <s-button variant="tertiary" onClick={handleClearSearch}>
                Clear
              </s-button>
            )}
          </s-stack>

          {/* View Mode Toggle */}
          <s-stack direction="inline" gap="base">
            <s-button
              variant={viewMode === "grid" ? "primary" : "tertiary"}
              onClick={() => setViewMode("grid")}
            >
              Grid View
            </s-button>
            <s-button
              variant={viewMode === "list" ? "primary" : "tertiary"}
              onClick={() => setViewMode("list")}
            >
              List View
            </s-button>
            <s-checkbox
              label="Select All"
              checked={
                products.length > 0 && selectedProducts.size === products.length
              }
              onChange={selectAllProducts}
            />
          </s-stack>
        </s-stack>
      </s-section>

      {/* Products Display */}
      {products.length === 0 ? (
        <s-section>
          <s-box padding="loose" background="subdued" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-heading>No products found</s-heading>
              <s-paragraph>
                {loaderData.searchQuery
                  ? `No products match your search "${loaderData.searchQuery}"`
                  : "Create your first product to get started"}
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-section>
      ) : viewMode === "grid" ? (
        <s-section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              const imageUrl = product.featuredImage?.url || product.images.edges[0]?.node.url;
              const imageCount = product.images.edges.length;
              const numericId = product.id.replace("gid://shopify/Product/", "");

              return (
                <div
                  key={product.id}
                  style={{
                    border: isSelected
                      ? "2px solid var(--p-color-border-brand)"
                      : "1px solid var(--p-color-border)",
                    borderRadius: "var(--p-border-radius-200)",
                    overflow: "hidden",
                    backgroundColor: "var(--p-color-bg-surface)",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Product Image */}
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      backgroundColor: "var(--p-color-bg-surface-secondary)",
                      overflow: "hidden",
                    }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          color: "var(--p-color-text-disabled)",
                        }}
                      >
                        No Image
                      </div>
                    )}

                    {/* Selection Checkbox Overlay */}
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                      }}
                    >
                      <s-checkbox
                        checked={isSelected}
                        onChange={() => toggleProductSelection(product.id)}
                      />
                    </div>

                    {/* Image Count Badge */}
                    {imageCount > 1 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {imageCount} images
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: "1rem" }}>
                    <s-stack direction="block" gap="tight">
                      <s-heading>{product.title}</s-heading>
                      <s-stack direction="inline" gap="tight">
                        {product.vendor && (
                          <s-badge tone="info">{product.vendor}</s-badge>
                        )}
                        <s-badge
                          tone={
                            product.status === "ACTIVE" ? "success" : "attention"
                          }
                        >
                          {product.status}
                        </s-badge>
                      </s-stack>
                      {product.variants.edges[0] && (
                        <s-text variant="bodySm" tone="subdued">
                          ${product.variants.edges[0].node.price}
                        </s-text>
                      )}
                    </s-stack>
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      padding: "0 1rem 1rem",
                      display: "flex",
                      gap: "0.5rem",
                    }}
                  >
                    <s-button
                      onClick={() => handleEditWithAI(product)}
                      style={{ flex: 1 }}
                    >
                      Edit with AI
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() => viewProductInAdmin(product.id)}
                    >
                      View
                    </s-button>
                  </div>
                </div>
              );
            })}
          </div>
        </s-section>
      ) : (
        /* List View */
        <s-section>
          <s-stack direction="block" gap="base">
            {products.map((product) => {
              const isSelected = selectedProducts.has(product.id);
              const imageUrl = product.featuredImage?.url || product.images.edges[0]?.node.url;
              const imageCount = product.images.edges.length;

              return (
                <div
                  key={product.id}
                  style={{
                    border: isSelected
                      ? "2px solid var(--p-color-border-brand)"
                      : "1px solid var(--p-color-border)",
                    borderRadius: "var(--p-border-radius-200)",
                    padding: "1rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    backgroundColor: "var(--p-color-bg-surface)",
                  }}
                >
                  <s-checkbox
                    checked={isSelected}
                    onChange={() => toggleProductSelection(product.id)}
                  />

                  {/* Thumbnail */}
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      flexShrink: 0,
                      backgroundColor: "var(--p-color-bg-surface-secondary)",
                      borderRadius: "var(--p-border-radius-100)",
                      overflow: "hidden",
                    }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                          fontSize: "10px",
                          color: "var(--p-color-text-disabled)",
                        }}
                      >
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div style={{ flex: 1 }}>
                    <s-stack direction="block" gap="tight">
                      <s-heading>{product.title}</s-heading>
                      <s-stack direction="inline" gap="tight">
                        {product.vendor && (
                          <s-text variant="bodySm" tone="subdued">
                            Vendor: {product.vendor}
                          </s-text>
                        )}
                        {product.productType && (
                          <s-text variant="bodySm" tone="subdued">
                            • Type: {product.productType}
                          </s-text>
                        )}
                        <s-text variant="bodySm" tone="subdued">
                          • {imageCount} {imageCount === 1 ? "image" : "images"}
                        </s-text>
                      </s-stack>
                      {product.variants.edges[0] && (
                        <s-text variant="bodySm">
                          Price: ${product.variants.edges[0].node.price}
                        </s-text>
                      )}
                    </s-stack>
                  </div>

                  {/* Status Badge */}
                  <s-badge
                    tone={product.status === "ACTIVE" ? "success" : "attention"}
                  >
                    {product.status}
                  </s-badge>

                  {/* Action Buttons */}
                  <s-stack direction="inline" gap="tight">
                    <s-button onClick={() => handleEditWithAI(product)}>
                      Edit with AI
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() => viewProductInAdmin(product.id)}
                    >
                      View
                    </s-button>
                  </s-stack>
                </div>
              );
            })}
          </s-stack>
        </s-section>
      )}

      {/* Pagination */}
      {(loaderData.hasNextPage || loaderData.hasPreviousPage) && (
        <s-section>
          <s-stack direction="inline" gap="base">
            <s-button
              onClick={handlePreviousPage}
              {...(!loaderData.hasPreviousPage ? { disabled: true } : {})}
            >
              Previous
            </s-button>
            <s-button
              onClick={handleNextPage}
              {...(!loaderData.hasNextPage ? { disabled: true } : {})}
            >
              Next
            </s-button>
          </s-stack>
        </s-section>
      )}

      {/* Results Summary */}
      <s-section slot="aside" heading="Summary">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Showing {products.length} products
          </s-paragraph>
          {selectedProducts.size > 0 && (
            <s-paragraph>
              {selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected
            </s-paragraph>
          )}
          {loaderData.searchQuery && (
            <s-paragraph tone="subdued">
              Search: "{loaderData.searchQuery}"
            </s-paragraph>
          )}
        </s-stack>
      </s-section>

      {/* Quick Actions */}
      <s-section slot="aside" heading="Quick Actions">
        <s-stack direction="block" gap="base">
          <s-button onClick={handleBulkEdit} style={{ width: "100%" }}>
            Batch Edit Selected
          </s-button>
          <s-button
            variant="tertiary"
            onClick={() => setSelectedProducts(new Set())}
            style={{ width: "100%" }}
          >
            Clear Selection
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
