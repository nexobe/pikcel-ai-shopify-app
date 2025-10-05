// Enhanced AI Image Editor with Component-Based Architecture
// This version uses separate components for better organization
import { useState, useEffect, useCallback } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ProgressBar } from "../components/editor/ProgressBar";
import { ImageComparisonSlider } from "../components/editor/ImageComparisonSlider";

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
  category?: string;
}

interface Job {
  id: string;
  status: string;
  result_url?: string;
  error?: string;
  progress?: number;
}

// Loader
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

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

  const aiModels: AIModel[] = [
    {
      id: "background-removal",
      name: "Background Removal",
      description: "Precisely remove backgrounds while preserving fine details",
      credits_required: 1,
      provider: "replicate",
      category: "Background & Masking",
      default_parameters: { strength: 0.8 },
      is_active: true,
    },
    {
      id: "image-enhancement",
      name: "Image Enhancement",
      description: "AI-powered quality enhancement and detail improvement",
      credits_required: 1,
      provider: "openai",
      category: "Enhancement",
      is_active: true,
    },
    {
      id: "color-correction",
      name: "Color Correction",
      description: "Professional color grading and white balance correction",
      credits_required: 1,
      provider: "replicate",
      category: "Color Management",
      default_parameters: {
        intensity: 0.7,
        auto_white_balance: true,
      },
      is_active: true,
    },
    {
      id: "ghost-mannequin",
      name: "Ghost Mannequin Effect",
      description: "Create professional ghost mannequin effect for apparel",
      credits_required: 2,
      provider: "replicate",
      category: "Fashion & Apparel",
      default_parameters: { blend_strength: 0.9 },
      is_active: true,
    },
    {
      id: "photo-retouching",
      name: "Photo Retouching",
      description: "Remove blemishes, dust, and imperfections automatically",
      credits_required: 1,
      provider: "openai",
      category: "Enhancement",
      is_active: true,
    },
    {
      id: "upscale-4x",
      name: "AI Upscaling (4x)",
      description: "Upscale images to 4x resolution with AI enhancement",
      credits_required: 2,
      provider: "replicate",
      category: "Enhancement",
      default_parameters: {
        scale: 4,
        face_enhance: true,
      },
      is_active: true,
    },
  ];

  return {
    products: productsData.data?.products?.edges || [],
    aiModels: aiModels.filter((m) => m.is_active),
  };
};

// Action
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "submitJob") {
    const job: Job = {
      id: `job_${Date.now()}`,
      status: "processing",
      progress: 0,
    };
    return { success: true, job };
  }

  if (actionType === "pushToShopify") {
    const productId = formData.get("productId");
    const imageUrl = formData.get("imageUrl");
    const altText = formData.get("altText");

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
          images: [{ src: imageUrl, altText: altText || "AI Processed Image" }],
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

// Main Component
export default function EnhancedEditorPage() {
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
  const [jobProgress, setJobProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const steps = [
    { label: "Select Image", description: "Choose from your products" },
    { label: "Choose Tool", description: "Pick an AI model" },
    { label: "Configure", description: "Fine-tune settings" },
    { label: "Processing", description: "AI at work" },
    { label: "Review & Push", description: "Save to Shopify" },
  ];

  // Group models by category
  const groupedModels = aiModels.reduce((acc, model) => {
    const category = model.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  // Handle job submission
  const handleSubmitJob = useCallback(() => {
    const formData = new FormData();
    formData.append("actionType", "submitJob");
    formData.append("selectedModel", selectedModel?.id || "");
    formData.append("selectedImage", selectedImage || "");
    formData.append("parameters", JSON.stringify(parameters));
    fetcher.submit(formData, { method: "POST" });
  }, [selectedModel, selectedImage, parameters, fetcher]);

  // Poll job status
  useEffect(() => {
    if (jobId && jobStatus === "processing") {
      const interval = setInterval(() => {
        // Simulate progress
        setJobProgress((prev) => {
          if (prev >= 90) {
            // Mock completion
            setTimeout(() => {
              setJobStatus("completed");
              setResultUrl("https://picsum.photos/800/600?random=" + Date.now());
              setCurrentStep(4);
            }, 1000);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [jobId, jobStatus]);

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.job) {
      setJobId(fetcher.data.job.id);
      setJobStatus(fetcher.data.job.status);
      setCurrentStep(3);
    }
  }, [fetcher.data]);

  // Handle push to Shopify
  const handlePushToShopify = useCallback(() => {
    if (!selectedProduct || !resultUrl) return;
    const formData = new FormData();
    formData.append("actionType", "pushToShopify");
    formData.append("productId", selectedProduct.id);
    formData.append("imageUrl", resultUrl);
    formData.append("altText", `AI Processed - ${selectedModel?.name}`);
    fetcher.submit(formData, { method: "POST" });
  }, [selectedProduct, resultUrl, selectedModel, fetcher]);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data?.newImages && currentStep === 4) {
      shopify.toast.show("Image uploaded to Shopify successfully!");
    }
  }, [fetcher.data, currentStep, shopify]);

  // Render parameter input
  const renderParameter = (key: string, value: any) => {
    if (typeof value === "number") {
      return (
        <div key={key} style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            <span style={{ textTransform: "capitalize" }}>
              {key.replace(/_/g, " ")}
            </span>
            <span
              style={{
                backgroundColor: "#F0F8FF",
                padding: "0.125rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
              }}
            >
              {value}
            </span>
          </label>
          <input
            type="range"
            min="0"
            max={key === "scale" ? "4" : "1"}
            step={key === "scale" ? "1" : "0.1"}
            value={value}
            onChange={(e) =>
              setParameters({
                ...parameters,
                [key]: parseFloat(e.target.value),
              })
            }
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              outline: "none",
              background: "#E1E3E5",
            }}
          />
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            padding: "0.75rem",
            backgroundColor: "#F6F6F7",
            borderRadius: "6px",
          }}
        >
          <span
            style={{
              fontWeight: "500",
              textTransform: "capitalize",
            }}
          >
            {key.replace(/_/g, " ")}
          </span>
          <label style={{ display: "inline-flex", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={value}
              onChange={(e) =>
                setParameters({
                  ...parameters,
                  [key]: e.target.checked,
                })
              }
              style={{ marginRight: "0.5rem" }}
            />
            <span>{value ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <s-page heading="AI Image Editor">
      <s-section>
        <ProgressBar steps={steps} currentStep={currentStep} />

        {/* Step 1: Image Selection */}
        {currentStep === 0 && (
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Select a Product Image
            </h2>
            <p style={{ color: "#6D7175", marginBottom: "1.5rem" }}>
              Choose an image from your Shopify products to edit with AI
            </p>

            {products.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  backgroundColor: "#F6F6F7",
                  borderRadius: "8px",
                }}
              >
                <p style={{ color: "#6D7175" }}>
                  No products with images found. Add products to your store to get started.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                {products.map((edge: any) => {
                  const product = edge.node;
                  return product.images.edges.map((imgEdge: any) => {
                    const image = imgEdge.node;
                    const isSelected = selectedImage === image.url;
                    return (
                      <div
                        key={image.id}
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedImage(image.url);
                          setCurrentStep(1);
                        }}
                        style={{
                          border: isSelected
                            ? "2px solid #008060"
                            : "1px solid #E1E3E5",
                          borderRadius: "8px",
                          padding: "0.5rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          backgroundColor: isSelected ? "#F0F8FF" : "white",
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
                            color: "#202223",
                          }}
                        >
                          {product.title}
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              marginTop: "0.25rem",
                              fontSize: "0.75rem",
                              color: "#008060",
                              fontWeight: "600",
                            }}
                          >
                            ✓ Selected
                          </div>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Tool Selection */}
        {currentStep === 1 && (
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Choose AI Tool
            </h2>
            <p style={{ color: "#6D7175", marginBottom: "1.5rem" }}>
              Select which AI operation to apply to your image
            </p>

            {Object.entries(groupedModels).map(([category, models]) => (
              <div key={category} style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#202223",
                  }}
                >
                  {category}
                </h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {models.map((model) => {
                    const isSelected = selectedModel?.id === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model);
                          setParameters(model.default_parameters || {});
                          setCurrentStep(2);
                        }}
                        style={{
                          border: isSelected
                            ? "2px solid #008060"
                            : "1px solid #E1E3E5",
                          borderRadius: "8px",
                          padding: "1rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          backgroundColor: isSelected ? "#F0F8FF" : "white",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h4
                              style={{
                                fontWeight: "600",
                                marginBottom: "0.5rem",
                                color: "#202223",
                              }}
                            >
                              {model.name}
                            </h4>
                            <p style={{ color: "#6D7175", fontSize: "0.875rem" }}>
                              {model.description}
                            </p>
                          </div>
                          <div
                            style={{
                              backgroundColor: "#008060",
                              color: "white",
                              padding: "0.25rem 0.75rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            {model.credits_required} credit
                            {model.credits_required !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <s-button
              onClick={() => setCurrentStep(0)}
              variant="secondary"
              style={{ marginTop: "1rem" }}
            >
              ← Back
            </s-button>
          </div>
        )}

        {/* Step 3: Parameters */}
        {currentStep === 2 && selectedModel && (
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Configure Parameters
            </h2>
            <p style={{ color: "#6D7175", marginBottom: "1.5rem" }}>
              Fine-tune settings for {selectedModel.name}
            </p>

            {selectedModel.provider === "openai" ||
            Object.keys(parameters).length === 0 ? (
              <div
                style={{
                  padding: "2rem",
                  backgroundColor: "#F0F8FF",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    marginBottom: "1rem",
                  }}
                >
                  ✨
                </div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                  }}
                >
                  Ready to Process
                </h3>
                <p style={{ color: "#6D7175" }}>
                  This tool uses optimized default settings for best results.
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #E1E3E5",
                  borderRadius: "8px",
                  padding: "1.5rem",
                }}
              >
                {Object.entries(parameters).map(([key, value]) =>
                  renderParameter(key, value),
                )}
              </div>
            )}

            <s-stack
              direction="inline"
              gap="base"
              style={{ marginTop: "1.5rem" }}
            >
              <s-button onClick={() => setCurrentStep(1)} variant="secondary">
                ← Back
              </s-button>
              <s-button onClick={handleSubmitJob}>Start Processing →</s-button>
            </s-stack>
          </div>
        )}

        {/* Step 4: Processing */}
        {currentStep === 3 && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                border: "6px solid #E1E3E5",
                borderTopColor: "#008060",
                borderRadius: "50%",
                margin: "0 auto 1.5rem",
                animation: "spin 1s linear infinite",
              }}
            />
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Processing Your Image
            </h2>
            <p style={{ color: "#6D7175", marginBottom: "1rem" }}>
              AI is working on your image...
            </p>

            {/* Progress bar */}
            <div
              style={{
                maxWidth: "400px",
                margin: "1rem auto",
                backgroundColor: "#E1E3E5",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${jobProgress}%`,
                  height: "8px",
                  backgroundColor: "#008060",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <p style={{ fontSize: "0.875rem", color: "#6D7175" }}>
              {jobProgress}% complete
            </p>
          </div>
        )}

        {/* Step 5: Review & Push */}
        {currentStep === 4 && resultUrl && selectedImage && (
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Review Results
            </h2>
            <p style={{ color: "#6D7175", marginBottom: "1.5rem" }}>
              Compare your original and processed images
            </p>

            <ImageComparisonSlider
              beforeImage={selectedImage}
              afterImage={resultUrl}
              beforeLabel="Original"
              afterLabel="AI Processed"
            />

            <s-stack
              direction="inline"
              gap="base"
              style={{ marginTop: "1.5rem" }}
            >
              <s-button onClick={handlePushToShopify}>
                Upload to Shopify
              </s-button>
              <s-button
                variant="secondary"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = resultUrl;
                  link.download = `processed-${Date.now()}.jpg`;
                  link.click();
                }}
              >
                Download Image
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
                  setJobProgress(0);
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
