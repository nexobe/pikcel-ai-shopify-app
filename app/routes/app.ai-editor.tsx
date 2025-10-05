import { useState, useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";
import type { ProductEditContext, BulkEditContext } from "../types/shopify-products";
import { loadProductContext, loadBulkEditContext, clearProductContext } from "../utils/shopify-products";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function AIEditorPage() {
  const shopify = useAppBridge();
  const [searchParams] = useSearchParams();
  const [productContext, setProductContext] = useState<ProductEditContext | null>(null);
  const [bulkContext, setBulkContext] = useState<BulkEditContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isBulkEdit = searchParams.get("bulk") === "true";
  const productCount = searchParams.get("count");

  useEffect(() => {
    // Load product context from session storage
    if (isBulkEdit) {
      const context = loadBulkEditContext();
      if (context) {
        setBulkContext(context);
        shopify.toast.show(`Loaded ${context.productIds.length} products for batch editing`);
      } else {
        shopify.toast.show("No products selected for bulk editing", { isError: true });
      }
    } else {
      const context = loadProductContext();
      if (context) {
        setProductContext(context);
        shopify.toast.show(`Loaded ${context.productTitle} for editing`);
      } else {
        shopify.toast.show("No product selected for editing", { isError: true });
      }
    }
    setIsLoading(false);
  }, [isBulkEdit, shopify]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearProductContext();
    };
  }, []);

  if (isLoading) {
    return (
      <s-page heading="AI Image Editor">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-text>Loading product data...</s-text>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  if (isBulkEdit && bulkContext) {
    return (
      <s-page heading="AI Batch Editor">
        <s-button slot="primary-action" href="/app/products">
          Back to Products
        </s-button>

        <s-section heading="Batch Edit Mode">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              You are editing {bulkContext.productIds.length} products simultaneously.
            </s-paragraph>

            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-heading>Selected Products:</s-heading>
                {bulkContext.products.map((product) => (
                  <s-text key={product.id}>
                    • {product.title} ({product.images.edges.length} images)
                  </s-text>
                ))}
              </s-stack>
            </s-box>

            <s-paragraph>
              AI image editing tools will be implemented here.
              This is where you would integrate your AI models for:
            </s-paragraph>

            <s-unordered-list>
              <s-list-item>Background removal</s-list-item>
              <s-list-item>Image enhancement</s-list-item>
              <s-list-item>Color correction</s-list-item>
              <s-list-item>Image resizing</s-list-item>
              <s-list-item>And more...</s-list-item>
            </s-unordered-list>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  if (!isBulkEdit && productContext) {
    return (
      <s-page heading={`Edit: ${productContext.productTitle}`}>
        <s-button slot="primary-action" href="/app/products">
          Back to Products
        </s-button>

        <s-section heading="Product Images">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Editing {productContext.images.length} image(s) for {productContext.productTitle}
            </s-paragraph>

            {productContext.vendor && (
              <s-text variant="bodySm" tone="subdued">
                Vendor: {productContext.vendor}
              </s-text>
            )}

            {productContext.productType && (
              <s-text variant="bodySm" tone="subdued">
                Type: {productContext.productType}
              </s-text>
            )}

            <s-box padding="base" background="subdued" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-heading>Images:</s-heading>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {productContext.images.map((image) => (
                    <div
                      key={image.id}
                      style={{
                        border: "1px solid var(--p-color-border)",
                        borderRadius: "var(--p-border-radius-200)",
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.altText || "Product image"}
                        style={{ width: "100%", height: "auto" }}
                      />
                      {image.altText && (
                        <div style={{ padding: "0.5rem" }}>
                          <s-text variant="bodySm">{image.altText}</s-text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </s-stack>
            </s-box>

            <s-paragraph>
              AI image editing interface will be implemented here.
              Integrate with your existing AI models from:
            </s-paragraph>

            <s-unordered-list>
              <s-list-item>Image Studio</s-list-item>
              <s-list-item>Photo Retouching Tools</s-list-item>
              <s-list-item>Background Removal</s-list-item>
              <s-list-item>Color Correction</s-list-item>
            </s-unordered-list>
          </s-stack>
        </s-section>

        <s-section slot="aside" heading="Next Steps">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              To complete the AI editor integration:
            </s-paragraph>
            <s-unordered-list>
              <s-list-item>Connect to your AI processing backend</s-list-item>
              <s-list-item>Add image upload/download logic</s-list-item>
              <s-list-item>Implement tool selection UI</s-list-item>
              <s-list-item>Add preview functionality</s-list-item>
              <s-list-item>Handle edited image upload to Shopify</s-list-item>
            </s-unordered-list>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="AI Image Editor">
      <s-section>
        <s-box padding="loose" background="subdued" borderRadius="base">
          <s-stack direction="block" gap="base">
            <s-heading>No Product Selected</s-heading>
            <s-paragraph>
              Please select a product from the Products page to begin editing.
            </s-paragraph>
            <s-button href="/app/products">Go to Products</s-button>
          </s-stack>
        </s-box>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
