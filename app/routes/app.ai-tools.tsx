import { useState, useMemo } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { getSupabaseService } from "../services/supabase.server";
import type { AIModel, AIToolCategory, CategoryGroup } from "../types/ai-models";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    // Fetch AI models directly from PikcelAI Supabase database
    const supabase = getSupabaseService();
    const models = await supabase.getActiveAIModels();

    return {
      models,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching AI models:", error);
    return {
      models: [],
      error: error instanceof Error ? error.message : "Failed to load AI tools",
    };
  }
};

// Category metadata with icons and descriptions
const CATEGORY_METADATA: Record<
  AIToolCategory,
  { description: string; icon: string; color: string }
> = {
  "Content Generation": {
    description: "Create custom images from text descriptions",
    icon: "✨",
    color: "purple",
  },
  "Product Enhancement": {
    description: "Professional product beautification and staging",
    icon: "🎨",
    color: "blue",
  },
  Fashion: {
    description: "Virtual models, ghost mannequin, flat lay photography",
    icon: "👗",
    color: "pink",
  },
  Background: {
    description: "Background removal and replacement",
    icon: "🖼️",
    color: "green",
  },
  Design: {
    description: "Logos, icons, graphics, and design elements",
    icon: "🎯",
    color: "orange",
  },
  Photography: {
    description: "Professional photography across multiple styles",
    icon: "📸",
    color: "cyan",
  },
  "Social Marketing": {
    description: "Instagram stories, quotes, and social content",
    icon: "📱",
    color: "red",
  },
};

export default function AIToolsPage() {
  const { models, error } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // State management
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AIToolCategory | "All">("All");
  const [expandedCategories, setExpandedCategories] = useState<Set<AIToolCategory>>(
    new Set(Object.keys(CATEGORY_METADATA) as AIToolCategory[])
  );

  // Group tools by category
  const categorizedTools = useMemo(() => {
    const groups: CategoryGroup[] = [];

    Object.keys(CATEGORY_METADATA).forEach((categoryName) => {
      const category = categoryName as AIToolCategory;
      const toolsInCategory = models.filter((model) => model.category === category);

      if (toolsInCategory.length > 0) {
        groups.push({
          name: category,
          description: CATEGORY_METADATA[category].description,
          icon: CATEGORY_METADATA[category].icon,
          tools: toolsInCategory,
        });
      }
    });

    return groups;
  }, [models]);

  // Filter tools based on search and category
  const filteredGroups = useMemo(() => {
    return categorizedTools
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) => {
          // Category filter
          if (selectedCategory !== "All" && tool.category !== selectedCategory) {
            return false;
          }

          // Search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              tool.name.toLowerCase().includes(query) ||
              tool.description.toLowerCase().includes(query) ||
              tool.category.toLowerCase().includes(query)
            );
          }

          return true;
        }),
      }))
      .filter((group) => group.tools.length > 0);
  }, [categorizedTools, searchQuery, selectedCategory]);

  // Toggle category expansion
  const toggleCategory = (category: AIToolCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Handle tool selection
  const handleToolSelect = (tool: AIModel) => {
    // Store selected tool in session storage for the editor
    sessionStorage.setItem("selectedAITool", JSON.stringify(tool));
    // Navigate to editor (you'll need to create this route)
    navigate(`/app/editor?tool=${tool.id}`);
  };

  // Expand/collapse all categories
  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(CATEGORY_METADATA) as AIToolCategory[]));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Calculate total tools
  const totalTools = models.length;
  const filteredToolsCount = filteredGroups.reduce(
    (sum, group) => sum + group.tools.length,
    0
  );

  return (
    <s-page heading="AI Tools">
      <s-button slot="primary-action" onClick={() => navigate("/app")}>
        Back to Home
      </s-button>

      {error ? (
        <s-section>
          <s-banner status="critical" onDismiss={() => {}}>
            <s-text>{error}</s-text>
          </s-banner>
        </s-section>
      ) : (
        <>
          {/* Header Section */}
          <s-section>
            <s-stack direction="block" gap="loose">
              <s-text variant="bodyMd">
                Explore {totalTools} professional AI-powered tools for image editing,
                generation, and enhancement. All tools are powered by advanced AI models
                optimized for e-commerce and product photography.
              </s-text>

              {/* Search and Filters */}
              <s-stack direction="inline" gap="base" alignment="end">
                <div style={{ flex: 1, minWidth: "300px" }}>
                  <s-text-field
                    label="Search tools"
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, description, or category..."
                    clearButton
                    onClearButtonClick={() => setSearchQuery("")}
                  />
                </div>

                <s-select
                  label="Category"
                  value={selectedCategory}
                  onChange={(e: any) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All Categories ({totalTools})</option>
                  {Object.keys(CATEGORY_METADATA).map((category) => {
                    const count = models.filter((m) => m.category === category).length;
                    return (
                      <option key={category} value={category}>
                        {category} ({count})
                      </option>
                    );
                  })}
                </s-select>

                <s-button-group>
                  <s-button onClick={expandAll} variant="tertiary">
                    Expand All
                  </s-button>
                  <s-button onClick={collapseAll} variant="tertiary">
                    Collapse All
                  </s-button>
                </s-button-group>
              </s-stack>

              {/* Results count */}
              {searchQuery || selectedCategory !== "All" ? (
                <s-text variant="bodySm" tone="subdued">
                  Showing {filteredToolsCount} of {totalTools} tools
                </s-text>
              ) : null}
            </s-stack>
          </s-section>

          {/* Tools Grid by Category */}
          {filteredGroups.length === 0 ? (
            <s-section>
              <s-empty-state
                heading="No tools found"
                message="Try adjusting your search or filter criteria"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <s-button onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}>
                  Clear filters
                </s-button>
              </s-empty-state>
            </s-section>
          ) : (
            filteredGroups.map((group) => (
              <s-section
                key={group.name}
                heading={`${group.icon} ${group.name} (${group.tools.length})`}
              >
                <s-stack direction="block" gap="base">
                  <s-text variant="bodySm" tone="subdued">
                    {group.description}
                  </s-text>

                  <s-button
                    onClick={() => toggleCategory(group.name)}
                    variant="tertiary"
                    size="slim"
                  >
                    {expandedCategories.has(group.name) ? "Hide tools" : "Show tools"}
                  </s-button>

                  {expandedCategories.has(group.name) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "16px",
                        marginTop: "12px",
                      }}
                    >
                      {group.tools.map((tool) => (
                        <s-card key={tool.id}>
                          <s-stack direction="block" gap="tight">
                            {/* Tool Preview Image */}
                            {tool.preview_image_url && (
                              <div
                                style={{
                                  width: "100%",
                                  height: "180px",
                                  overflow: "hidden",
                                  borderRadius: "8px 8px 0 0",
                                  marginBottom: "8px",
                                  position: "relative",
                                }}
                              >
                                <img
                                  src={tool.preview_image_url}
                                  alt={tool.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                                {/* Credits badge overlay */}
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "8px",
                                    right: "8px",
                                    background: "rgba(0,0,0,0.7)",
                                    color: "white",
                                    padding: "4px 12px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                  }}
                                >
                                  {tool.credits_required} credits
                                </div>
                              </div>
                            )}

                            {/* Tool Info */}
                            <s-stack direction="block" gap="tight">
                              <s-stack direction="inline" gap="tight" alignment="center">
                                {tool.icon_name && !tool.preview_image_url && (
                                  <s-text variant="headingMd">{tool.icon_name}</s-text>
                                )}
                                <s-text variant="headingMd">{tool.name}</s-text>
                              </s-stack>

                              <s-text variant="bodySm">{tool.description}</s-text>

                              {/* Tool Details */}
                              <s-stack direction="inline" gap="tight" alignment="center">
                                <s-badge>
                                  {tool.credits_required} credit
                                  {tool.credits_required !== 1 ? "s" : ""}
                                </s-badge>

                                <s-badge tone="info">{tool.provider}</s-badge>

                                {tool.capabilities?.multi_image && (
                                  <s-badge tone="success">Multi-image</s-badge>
                                )}

                                {tool.processing_time_estimate && (
                                  <s-text variant="bodySm" tone="subdued">
                                    ~{tool.processing_time_estimate}s
                                  </s-text>
                                )}
                              </s-stack>

                              {/* Pricing */}
                              <s-stack direction="inline" gap="tight" alignment="center">
                                <s-text variant="bodySm" tone="subdued">
                                  Price: ${tool.base_price.toFixed(2)}
                                </s-text>
                              </s-stack>

                              {/* Action Button */}
                              <s-button
                                onClick={() => handleToolSelect(tool)}
                                variant="primary"
                                fullWidth
                              >
                                Select Tool
                              </s-button>
                            </s-stack>
                          </s-stack>
                        </s-card>
                      ))}
                    </div>
                  )}
                </s-stack>
              </s-section>
            ))
          )}
        </>
      )}

      {/* Aside - Tool Statistics */}
      <s-section slot="aside" heading="Overview">
        <s-stack direction="block" gap="loose">
          <s-paragraph>
            <s-text weight="bold">Total Tools:</s-text> {totalTools}
          </s-paragraph>

          <s-paragraph>
            <s-text weight="bold">Categories:</s-text> {categorizedTools.length}
          </s-paragraph>

          <s-paragraph>
            <s-text weight="bold">Providers:</s-text>
            <s-stack direction="block" gap="tight">
              {Array.from(new Set(models.map((m) => m.provider))).map((provider) => (
                <s-badge key={provider}>{provider}</s-badge>
              ))}
            </s-stack>
          </s-paragraph>

          <s-divider />

          <s-text variant="headingSm">Credit Range</s-text>
          <s-text variant="bodySm">
            {Math.min(...models.map((m) => m.credits_required))} -{" "}
            {Math.max(...models.map((m) => m.credits_required))} credits per tool
          </s-text>
        </s-stack>
      </s-section>

      {/* Aside - Getting Started */}
      <s-section slot="aside" heading="Getting Started">
        <s-unordered-list>
          <s-list-item>Browse tools by category or search</s-list-item>
          <s-list-item>Select a tool to view details</s-list-item>
          <s-list-item>Check credit requirements</s-list-item>
          <s-list-item>Start editing with AI power</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
