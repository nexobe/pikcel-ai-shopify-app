import { useState, useMemo } from 'react';
import type {
  HeadersFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from 'react-router';
import { useLoaderData, useFetcher } from 'react-router';
import { boundary } from '@shopify/shopify-app-react-router/server';
import { authenticate } from '../shopify.server';
import { pikcelService } from '../services/pikcelai.service';
import type {
  Template,
  TemplateCategory,
} from '../types/templates';

// ============================================================================
// LOADER - Fetch Templates from PikcelAI API
// ============================================================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const category = url.searchParams.get('category') as TemplateCategory | null;
  const search = url.searchParams.get('search');

  try {
    const response = await pikcelService.templates.getTemplates({
      category: category || undefined,
      search: search || undefined,
      limit: 100,
    });

    return {
      templates: response.data || [],
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch templates:', error);

    // Return mock data for demonstration
    return {
      templates: getMockTemplates(),
      success: false,
      error: 'Failed to fetch templates from PikcelAI API. Showing demo data.',
    };
  }
};

// ============================================================================
// ACTION - Apply Template to Products
// ============================================================================

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const templateId = formData.get('template_id') as string;
  const productIds = JSON.parse(formData.get('product_ids') as string);

  try {
    const response = await pikcelService.templates.applyTemplate({
      template_id: templateId,
      product_ids: productIds,
    });

    return json({
      success: true,
      batch_id: response.batch_id,
      message: `Template applied to ${response.jobs_created} products. Processing started.`,
    });
  } catch (error) {
    console.error('Failed to apply template:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply template',
      },
      { status: 500 }
    );
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function TemplatesPage() {
  const { templates, success, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  // State
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, selectedCategory, searchQuery]);

  // Group by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, Template[]> = {};
    filteredTemplates.forEach((template) => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [filteredTemplates]);

  // Handlers
  const handleApplyTemplate = (template: Template) => {
    setSelectedTemplate(template);
    // In a real implementation, this would open a modal to select products
    // For now, we'll show a toast notification
    alert(`Template "${template.name}" selected. Choose products to apply to.`);
  };

  const categories: Array<{ id: TemplateCategory; label: string }> = [
    { id: 'ecommerce', label: 'E-commerce' },
    { id: 'photo-editing', label: 'Photo Editing' },
    { id: 'trending', label: 'Trending' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <s-page heading="Template Library">
      <s-button slot="primary-action" variant="primary">
        Create Custom Template
      </s-button>

      {/* Error Banner */}
      {error && (
        <s-box padding="base" background="warning" borderRadius="base">
          <s-text>{error}</s-text>
        </s-box>
      )}

      {/* Search & Filters */}
      <s-section>
        <s-stack direction="block" gap="base">
          {/* Search Bar */}
          <s-text-field
            label="Search templates"
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            placeholder="Search by name, description, or tags..."
          />

          {/* Category Filters */}
          <s-stack direction="inline" gap="base" wrap>
            <s-button
              variant={selectedCategory === null ? 'primary' : 'tertiary'}
              onClick={() => setSelectedCategory(null)}
            >
              All Templates
            </s-button>
            {categories.map((cat) => (
              <s-button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'primary' : 'tertiary'}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </s-button>
            ))}
          </s-stack>
        </s-stack>
      </s-section>

      {/* Templates Grid */}
      {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
        <s-section
          key={category}
          heading={getCategoryLabel(category as TemplateCategory)}
        >
          <s-grid columns={3} gap="base">
            {categoryTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={handleApplyTemplate}
              />
            ))}
          </s-grid>

          {categoryTemplates.length === 0 && (
            <s-box padding="large">
              <s-text alignment="center">
                No templates found in this category.
              </s-text>
            </s-box>
          )}
        </s-section>
      ))}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <s-section>
          <s-box padding="large">
            <s-stack direction="block" gap="base" alignment="center">
              <s-text size="large" weight="bold">
                No templates found
              </s-text>
              <s-text>Try adjusting your search or filters</s-text>
              <s-button onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}>
                Clear Filters
              </s-button>
            </s-stack>
          </s-box>
        </s-section>
      )}

      {/* Aside Info */}
      <s-section slot="aside" heading="About Templates">
        <s-paragraph>
          Templates are pre-configured workflows that apply multiple editing
          operations to your product images in one click.
        </s-paragraph>
        <s-paragraph>
          Choose from e-commerce standards, professional photo effects, or create
          your own custom templates.
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Quick Stats">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text weight="bold">{templates.length}</s-text> total templates
          </s-paragraph>
          <s-paragraph>
            <s-text weight="bold">{filteredTemplates.length}</s-text> matching
            filters
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-page>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: Template;
  onApply: (template: Template) => void;
}

function TemplateCard({ template, onApply }: TemplateCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <s-card>
      <s-stack direction="block" gap="base">
        {/* Preview Image */}
        <s-box
          borderRadius="base"
          background="subdued"
          style={{
            width: '100%',
            height: '200px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {template.preview_image_url ? (
            <img
              src={template.preview_image_url}
              alt={template.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <s-text size="small">No preview</s-text>
          )}
        </s-box>

        {/* Template Info */}
        <s-stack direction="block" gap="tight">
          <s-text weight="bold" size="medium">
            {template.name}
          </s-text>

          <s-text size="small">{template.description}</s-text>

          {/* Tags */}
          <s-stack direction="inline" gap="tight" wrap>
            <s-badge tone="info">{getCategoryLabel(template.category)}</s-badge>
            {template.is_featured && <s-badge tone="success">Featured</s-badge>}
            {template.is_premium && <s-badge tone="warning">Premium</s-badge>}
          </s-stack>

          {/* Stats */}
          <s-stack direction="inline" gap="base">
            <s-text size="small">
              {template.usage_count.toLocaleString()} uses
            </s-text>
            <s-text size="small">{template.credits_required} credits</s-text>
            <s-text size="small">~{template.estimated_time_seconds}s</s-text>
          </s-stack>
        </s-stack>

        {/* Operations Details */}
        {showDetails && (
          <s-box padding="base" background="subdued" borderRadius="base">
            <s-stack direction="block" gap="tight">
              <s-text weight="bold" size="small">
                Operations ({template.operations.length}):
              </s-text>
              <s-stack direction="block" gap="tight">
                {template.operations.map((op, index) => (
                  <s-text key={op.id} size="small">
                    {index + 1}. {op.name}
                  </s-text>
                ))}
              </s-stack>
            </s-stack>
          </s-box>
        )}

        {/* Actions */}
        <s-stack direction="inline" gap="base">
          <s-button
            variant="primary"
            onClick={() => onApply(template)}
            style={{ flex: 1 }}
          >
            Apply Template
          </s-button>
          <s-button
            variant="tertiary"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Steps
          </s-button>
        </s-stack>
      </s-stack>
    </s-card>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCategoryLabel(category: TemplateCategory): string {
  const labels: Record<TemplateCategory, string> = {
    ecommerce: 'E-commerce',
    'photo-editing': 'Photo Editing',
    trending: 'Trending',
    custom: 'Custom',
  };
  return labels[category] || category;
}

// ============================================================================
// MOCK DATA (for demonstration when API is unavailable)
// ============================================================================

function getMockTemplates(): Template[] {
  return [
    // E-commerce Templates
    {
      id: 'tpl_amazon_white_bg',
      name: 'Amazon Standard White Background',
      description:
        'Convert product images to Amazon-compliant white background format',
      category: 'ecommerce',
      preview_image_url: 'https://picsum.photos/seed/amazon/400/300',
      operations: [
        { id: '1', name: 'Remove Background', description: '', order: 1 },
        { id: '2', name: 'Add White Background', description: '', order: 2 },
        { id: '3', name: 'Center Product', description: '', order: 3 },
        { id: '4', name: 'Resize to 2000x2000', description: '', order: 4 },
      ],
      usage_count: 15234,
      popularity_score: 95,
      tags: ['amazon', 'white-background', 'ecommerce'],
      estimated_time_seconds: 45,
      credits_required: 2,
      is_featured: true,
      is_premium: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tpl_shopify_transparent',
      name: 'Shopify Transparent Background',
      description: 'Create transparent PNG images perfect for Shopify stores',
      category: 'ecommerce',
      preview_image_url: 'https://picsum.photos/seed/shopify/400/300',
      operations: [
        { id: '1', name: 'Remove Background', description: '', order: 1 },
        { id: '2', name: 'Export as PNG', description: '', order: 2 },
      ],
      usage_count: 12456,
      popularity_score: 88,
      tags: ['shopify', 'transparent', 'png'],
      estimated_time_seconds: 30,
      credits_required: 1,
      is_featured: true,
      is_premium: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tpl_etsy_clean',
      name: 'Etsy Clean Background',
      description: 'Optimize product photos for Etsy marketplace standards',
      category: 'ecommerce',
      preview_image_url: 'https://picsum.photos/seed/etsy/400/300',
      operations: [
        { id: '1', name: 'Remove Background', description: '', order: 1 },
        { id: '2', name: 'Add Soft Shadow', description: '', order: 2 },
        { id: '3', name: 'Color Correction', description: '', order: 3 },
      ],
      usage_count: 8934,
      popularity_score: 82,
      tags: ['etsy', 'marketplace', 'clean'],
      estimated_time_seconds: 50,
      credits_required: 2,
      is_featured: false,
      is_premium: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },

    // Photo Editing Templates
    {
      id: 'tpl_blur_bg',
      name: 'Blur Background',
      description: 'Create professional depth-of-field effect with blurred background',
      category: 'photo-editing',
      preview_image_url: 'https://picsum.photos/seed/blur/400/300',
      operations: [
        { id: '1', name: 'Detect Subject', description: '', order: 1 },
        { id: '2', name: 'Apply Gaussian Blur', description: '', order: 2 },
      ],
      usage_count: 6723,
      popularity_score: 75,
      tags: ['blur', 'depth', 'portrait'],
      estimated_time_seconds: 35,
      credits_required: 2,
      is_featured: false,
      is_premium: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tpl_color_splash',
      name: 'Color Splash Effect',
      description: 'Keep product in color while converting background to black & white',
      category: 'photo-editing',
      preview_image_url: 'https://picsum.photos/seed/splash/400/300',
      operations: [
        { id: '1', name: 'Detect Subject', description: '', order: 1 },
        { id: '2', name: 'Desaturate Background', description: '', order: 2 },
        { id: '3', name: 'Enhance Product Colors', description: '', order: 3 },
      ],
      usage_count: 5612,
      popularity_score: 72,
      tags: ['color-splash', 'artistic', 'bw'],
      estimated_time_seconds: 40,
      credits_required: 2,
      is_featured: false,
      is_premium: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tpl_vintage',
      name: 'Vintage Photo Look',
      description: 'Apply retro film-style color grading and grain',
      category: 'photo-editing',
      preview_image_url: 'https://picsum.photos/seed/vintage/400/300',
      operations: [
        { id: '1', name: 'Color Grading', description: '', order: 1 },
        { id: '2', name: 'Add Film Grain', description: '', order: 2 },
        { id: '3', name: 'Vignette Effect', description: '', order: 3 },
      ],
      usage_count: 4823,
      popularity_score: 68,
      tags: ['vintage', 'retro', 'film'],
      estimated_time_seconds: 45,
      credits_required: 3,
      is_featured: false,
      is_premium: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },

    // Trending Templates
    {
      id: 'tpl_motion_blur',
      name: 'Motion Blur Effect',
      description: 'Add dynamic motion blur to create sense of movement',
      category: 'trending',
      preview_image_url: 'https://picsum.photos/seed/motion/400/300',
      operations: [
        { id: '1', name: 'Detect Motion Direction', description: '', order: 1 },
        { id: '2', name: 'Apply Directional Blur', description: '', order: 2 },
      ],
      usage_count: 3245,
      popularity_score: 85,
      tags: ['motion', 'dynamic', 'blur'],
      estimated_time_seconds: 38,
      credits_required: 2,
      is_featured: true,
      is_premium: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tpl_film_look',
      name: 'Cinematic Film Look',
      description: 'Professional color grading for cinematic appearance',
      category: 'trending',
      preview_image_url: 'https://picsum.photos/seed/film/400/300',
      operations: [
        { id: '1', name: 'Color Grading', description: '', order: 1 },
        { id: '2', name: 'Contrast Adjustment', description: '', order: 2 },
        { id: '3', name: 'Add Film LUT', description: '', order: 3 },
      ],
      usage_count: 7891,
      popularity_score: 91,
      tags: ['cinematic', 'film', 'lut'],
      estimated_time_seconds: 55,
      credits_required: 3,
      is_featured: true,
      is_premium: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}

// ============================================================================
// HEADERS
// ============================================================================

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
