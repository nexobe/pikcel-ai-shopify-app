import { useState, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

// Types
interface Product {
  id: string;
  title: string;
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText?: string;
      };
    }>;
  };
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  credits_required: number;
  provider: string;
  default_parameters?: Record<string, any>;
  is_active: boolean;
}

interface Job {
  id: string;
  status: string;
  result_url?: string;
  error?: string;
}

// Loader - Fetch products and AI models
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch products with images
  const productsResponse = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 50) {
          edges {
            node {
              id
              title
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
          }
        }
      }`,
  );

  const productsData = await productsResponse.json();

  // Mock AI models data (replace with actual API call to your backend)
  const aiModels: AIModel[] = [
    {
      id: "background-removal",
      name: "Background Removal",
      description: "Remove background from product images",
      credits_required: 1,
      provider: "replicate",
      default_parameters: { strength: 0.8 },
      is_active: true,
    },
    {
      id: "image-enhancement",
      name: "Image Enhancement",
      description: "Enhance image quality and clarity",
      credits_required: 1,
      provider: "openai",
      is_active: true,
    },
    {
      id: "color-correction",
      name: "Color Correction",
      description: "Correct colors and white balance",
      credits_required: 1,
      provider: "replicate",
      default_parameters: { intensity: 0.7 },
      is_active: true,
    },
  ];

  return {
    products: productsData.data?.products?.edges || [],
    aiModels: aiModels.filter((m) => m.is_active),
  };
};

// Action - Handle job submission and image upload
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "submitJob") {
    // Handle job submission
    const selectedModel = formData.get("selectedModel");
    const selectedImage = formData.get("selectedImage");
    const parameters = formData.get("parameters");

    // Mock job creation (replace with actual API call to your backend)
    const job: Job = {
      id: `job_${Date.now()}`,
      status: "processing",
    };

    return { success: true, job };
  }

  if (actionType === "pushToShopify") {
    // Handle pushing result to Shopify
    const productId = formData.get("productId");
    const imageUrl = formData.get("imageUrl");
    const altText = formData.get("altText");

    // Upload image to Shopify product
    const response = await admin.graphql(
      `#graphql
        mutation productAppendImages($productId: ID!, $images: [ImageInput!]!) {
          productAppendImages(productId: $productId, images: $images) {
            newImages {
              id
              url
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          productId,
          images: [
            {
              src: imageUrl,
              altText: altText || "AI Processed Image",
            },
          ],
        },
      },
    );

    const responseJson = await response.json();

    if (responseJson.data?.productAppendImages?.userErrors?.length > 0) {
      return {
        success: false,
        error: responseJson.data.productAppendImages.userErrors[0].message,
      };
    }

    return {
      success: true,
      newImages: responseJson.data?.productAppendImages?.newImages,
    };
  }

  return { success: false, error: "Invalid action" };
};

// Main Editor Component
export default function EditorPage() {
  const { products, aiModels } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const steps = [
    "Select Image",
    "Choose Tool",
    "Configure",
    "Processing",
    "Review & Push",
  ];

  // Handle job submission
  const handleSubmitJob = () => {
    const formData = new FormData();
    formData.append("actionType", "submitJob");
    formData.append("selectedModel", selectedModel?.id || "");
    formData.append("selectedImage", selectedImage || "");
    formData.append("parameters", JSON.stringify(parameters));

    fetcher.submit(formData, { method: "POST" });
  };

  // Poll job status
  useEffect(() => {
    if (jobId && jobStatus === "processing") {
      const interval = setInterval(async () => {
        // Mock status check (replace with actual API call)
        setTimeout(() => {
          setJobStatus("completed");
          setResultUrl("https://example.com/result.jpg");
        }, 3000);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [jobId, jobStatus]);

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.job) {
      setJobId(fetcher.data.job.id);
      setJobStatus(fetcher.data.job.status);
      setCurrentStep(3); // Move to processing step
    }
  }, [fetcher.data]);

  // Handle push to Shopify
  const handlePushToShopify = () => {
    if (!selectedProduct || !resultUrl) return;

    const formData = new FormData();
    formData.append("actionType", "pushToShopify");
    formData.append("productId", selectedProduct.id);
    formData.append("imageUrl", resultUrl);
    formData.append("altText", "AI Processed Image");

    fetcher.submit(formData, { method: "POST" });
  };

  useEffect(() => {
    if (
      fetcher.data?.success &&
      fetcher.data?.newImages &&
      currentStep === 4
    ) {
      shopify.toast.show("Image uploaded to Shopify successfully!");
    }
  }, [fetcher.data, currentStep, shopify]);

  return (
    <s-page heading="AI Image Editor">
      <s-section>
        {/* Progress Bar */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            {steps.map((step, index) => (
              <div
                key={step}
                style={{
                  flex: 1,
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor:
                      index <= currentStep ? "#008060" : "#E0E0E0",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginBottom: "0.5rem",
                  }}
                >
                  {index < currentStep ? "✓" : index + 1}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: index <= currentStep ? "#000" : "#999",
                  }}
                >
                  {step}
                </div>
                {index < steps.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "16px",
                      left: "calc(50% + 16px)",
                      width: "calc(100% - 32px)",
                      height: "2px",
                      backgroundColor:
                        index < currentStep ? "#008060" : "#E0E0E0",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Image Selection */}
        {currentStep === 0 && (
          <div>
            <h2
              style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}
            >
              Select a Product Image
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              {products.map((edge: any) => {
                const product = edge.node;
                return product.images.edges.map((imgEdge: any) => {
                  const image = imgEdge.node;
                  return (
                    <div
                      key={image.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedImage(image.url);
                        setCurrentStep(1);
                      }}
                      style={{
                        border:
                          selectedImage === image.url
                            ? "2px solid #008060"
                            : "1px solid #E0E0E0",
                        borderRadius: "8px",
                        padding: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.altText || product.title}
                        style={{
                          width: "100%",
                          height: "150px",
                          objectFit: "cover",
                          borderRadius: "4px",
                        }}
                      />
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                        }}
                      >
                        {product.title}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        )}

        {/* Step 2: Tool Selection */}
        {currentStep === 1 && (
          <div>
            <h2
              style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}
            >
              Choose AI Tool
            </h2>
            <div style={{ display: "grid", gap: "1rem" }}>
              {aiModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setParameters(model.default_parameters || {});
                    setCurrentStep(2);
                  }}
                  style={{
                    border:
                      selectedModel?.id === model.id
                        ? "2px solid #008060"
                        : "1px solid #E0E0E0",
                    borderRadius: "8px",
                    padding: "1rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                    {model.name}
                  </h3>
                  <p style={{ color: "#666", marginBottom: "0.5rem" }}>
                    {model.description}
                  </p>
                  <div style={{ fontSize: "0.875rem", color: "#008060" }}>
                    {model.credits_required} credit{model.credits_required !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
            <s-button
              onClick={() => setCurrentStep(0)}
              variant="secondary"
              style={{ marginTop: "1rem" }}
            >
              Back
            </s-button>
          </div>
        )}

        {/* Step 3: Parameters */}
        {currentStep === 2 && selectedModel && (
          <div>
            <h2
              style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}
            >
              Configure Parameters
            </h2>
            <p style={{ marginBottom: "1rem", color: "#666" }}>
              Fine-tune settings for {selectedModel.name}
            </p>

            {selectedModel.provider === "openai" ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#F0F8FF",
                  borderRadius: "8px",
                }}
              >
                <p>This tool uses optimized default settings.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {Object.entries(parameters).map(([key, value]) => (
                  <div key={key}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "500",
                        textTransform: "capitalize",
                      }}
                    >
                      {key.replace(/_/g, " ")}
                    </label>
                    {typeof value === "number" ? (
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={value}
                        onChange={(e) =>
                          setParameters({
                            ...parameters,
                            [key]: parseFloat(e.target.value),
                          })
                        }
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setParameters({
                            ...parameters,
                            [key]: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #E0E0E0",
                          borderRadius: "4px",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <s-stack direction="inline" gap="base" style={{ marginTop: "1rem" }}>
              <s-button onClick={() => setCurrentStep(1)} variant="secondary">
                Back
              </s-button>
              <s-button onClick={handleSubmitJob}>Start Processing</s-button>
            </s-stack>
          </div>
        )}

        {/* Step 4: Processing */}
        {currentStep === 3 && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                border: "4px solid #E0E0E0",
                borderTopColor: "#008060",
                borderRadius: "50%",
                margin: "0 auto 1rem",
                animation: "spin 1s linear infinite",
              }}
            />
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Processing Your Image
            </h2>
            <p style={{ color: "#666" }}>
              Status: {jobStatus || "Initializing..."}
            </p>
            {jobStatus === "completed" && (
              <s-button
                onClick={() => setCurrentStep(4)}
                style={{ marginTop: "1rem" }}
              >
                View Results
              </s-button>
            )}
          </div>
        )}

        {/* Step 5: Review & Push */}
        {currentStep === 4 && resultUrl && (
          <div>
            <h2
              style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1rem" }}
            >
              Review Results
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                  Original
                </h3>
                <img
                  src={selectedImage || ""}
                  alt="Original"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #E0E0E0",
                  }}
                />
              </div>
              <div>
                <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                  Processed
                </h3>
                <img
                  src={resultUrl}
                  alt="Processed"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #E0E0E0",
                  }}
                />
              </div>
            </div>

            <s-stack direction="inline" gap="base">
              <s-button onClick={handlePushToShopify}>
                Push to Shopify
              </s-button>
              <s-button
                variant="secondary"
                onClick={() => {
                  // Download functionality
                  const link = document.createElement("a");
                  link.href = resultUrl;
                  link.download = "processed-image.jpg";
                  link.click();
                }}
              >
                Download
              </s-button>
              <s-button
                variant="tertiary"
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedProduct(null);
                  setSelectedImage(null);
                  setSelectedModel(null);
                  setParameters({});
                  setJobId(null);
                  setJobStatus(null);
                  setResultUrl(null);
                }}
              >
                Process Another Image
              </s-button>
            </s-stack>
          </div>
        )}
      </s-section>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
