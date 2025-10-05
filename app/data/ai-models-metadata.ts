/**
 * AI Models Metadata - Compact Summary
 * Total: 68 active models from PikcelAI database
 * Last Updated: 2025-10-05
 */

export interface ModelMetadata {
  id: string;
  name: string;
  category: string;
  provider: string;
  credits: number;
  price: string;
  difficulty: number;
  isStudioTool: boolean;
}

export const AI_MODELS_METADATA: ModelMetadata[] = [
  // BACKGROUND EDITING (3 models)
  { id: "background-replacement", name: "Background", category: "background-editing", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "gemini-background-removal", name: "Background Removal", category: "background-editing", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },
  { id: "gemini-background-replacement", name: "Background Replacement", category: "background-editing", provider: "google", credits: 3, price: "0.70", difficulty: 2, isStudioTool: false },

  // BATCH PROCESSING (1 model)
  { id: "gemini-batch-enhancement", name: "Batch Enhancement", category: "batch-processing", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },

  // COLOR CORRECTION (5 models)
  { id: "color-cast-removal", name: "Color Cast Removal", category: "color-correction", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },
  { id: "color-correction", name: "Color Correction", category: "color-correction", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },
  { id: "color-grading", name: "Color Grading", category: "color-correction", provider: "google", credits: 3, price: "0.75", difficulty: 1, isStudioTool: false },
  { id: "color-profile", name: "Color Profile Conversion", category: "color-correction", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },
  { id: "color-match", name: "Photo Color Match", category: "color-correction", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },

  // COLOR ENHANCEMENT (3 models)
  { id: "google-advanced-color-matching", name: "Advanced Color Matching", category: "color-enhancement", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "brand-color-matching", name: "Brand Color Matching", category: "color-enhancement", provider: "google", credits: 3, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "gemini-color-correction", name: "Color Correction", category: "color-enhancement", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },

  // COMPOSITION (3 models)
  { id: "photo-masking", name: "Hi-End Photo Masking", category: "composition", provider: "google", credits: 4, price: "1.00", difficulty: 1, isStudioTool: false },
  { id: "image-composition", name: "Image Composition", category: "composition", provider: "google", credits: 4, price: "1.00", difficulty: 1, isStudioTool: false },
  { id: "masking-services", name: "Image Masking Services", category: "composition", provider: "google", credits: 3, price: "0.75", difficulty: 1, isStudioTool: false },

  // CONTENT GENERATION (3 models)
  { id: "create-any-image", name: "Create Any Image", category: "content-generation", provider: "google", credits: 3, price: "0.75", difficulty: 2, isStudioTool: false },
  { id: "describe-any-change", name: "Describe Any Change", category: "content-generation", provider: "google", credits: 3, price: "0.75", difficulty: 2, isStudioTool: false },
  { id: "miniature-people", name: "Miniature People", category: "content-generation", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },

  // DESIGN GRAPHICS (11 models)
  { id: "3d-illustration", name: "3D Illustration", category: "design-graphics", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "birthday-card", name: "Birthday Card", category: "design-graphics", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "business-card", name: "Business Card", category: "design-graphics", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "christmas-card", name: "Christmas Card", category: "design-graphics", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "coloring-page", name: "Coloring Page", category: "design-graphics", provider: "google", credits: 2, price: "0.40", difficulty: 2, isStudioTool: false },
  { id: "gift-card", name: "Gift Card", category: "design-graphics", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "icon-design", name: "Icon", category: "design-graphics", provider: "google", credits: 1, price: "0.25", difficulty: 1, isStudioTool: false },
  { id: "logo-design", name: "Logo", category: "design-graphics", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "poster-design", name: "Poster", category: "design-graphics", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "product-packaging", name: "Product Packaging", category: "design-graphics", provider: "google", credits: 4, price: "1.00", difficulty: 4, isStudioTool: false },
  { id: "text-overlay", name: "Text", category: "design-graphics", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "valentine-card", name: "Valentine's Card", category: "design-graphics", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },

  // EFFECTS (1 model)
  { id: "gemini-shadow-generation", name: "AI Shadow Generation", category: "effects", provider: "google", credits: 1, price: "0.40", difficulty: 1, isStudioTool: false },

  // ENHANCEMENT (1 model)
  { id: "gemini-product-beautification", name: "Product Beautification", category: "enhancement", provider: "google", credits: 2, price: "0.60", difficulty: 2, isStudioTool: false },

  // FASHION APPAREL (2 models)
  { id: "ghost-mannequin", name: "Ghost Mannequin", category: "fashion-apparel", provider: "google", credits: 4, price: "1.00", difficulty: 4, isStudioTool: false },
  { id: "virtual-model", name: "Virtual Model", category: "fashion-apparel", provider: "google", credits: 4, price: "1.00", difficulty: 4, isStudioTool: false },

  // GENERAL (1 model)
  { id: "remove_bg", name: "Remove background", category: "general", provider: "removebg", credits: 1, price: "0.50", difficulty: 1, isStudioTool: false },

  // IMAGE EDITING (1 model)
  { id: "image-studio-edit", name: "AI Image Editor", category: "image-editing", provider: "google", credits: 3, price: "0.04", difficulty: 1, isStudioTool: true },

  // IMAGE GENERATION (1 model)
  { id: "image-studio-generation", name: "AI Image Generation", category: "image-generation", provider: "google", credits: 3, price: "0.04", difficulty: 1, isStudioTool: true },

  // PHOTO EDITING (8 models)
  { id: "background-removal", name: "Background Removal", category: "photo-editing", provider: "replicate", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "swatch-matching", name: "Color Swatch Matching", category: "photo-editing", provider: "google", credits: 3, price: "0.75", difficulty: 1, isStudioTool: false },
  { id: "pattern-match", name: "Garment Pattern Match", category: "photo-editing", provider: "google", credits: 3, price: "0.75", difficulty: 1, isStudioTool: false },
  { id: "clipping-path", name: "Photo Clipping Path", category: "photo-editing", provider: "google", credits: 3, price: "0.75", difficulty: 1, isStudioTool: false },
  { id: "photo-cutout", name: "Photo Cutout", category: "photo-editing", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },
  { id: "photo-enhancement", name: "Photo Enhancement", category: "photo-editing", provider: "replicate", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "photo-resizing", name: "Photo Resizing", category: "photo-editing", provider: "google", credits: 1, price: "0.25", difficulty: 1, isStudioTool: false },
  { id: "photo-retouching", name: "Photo Retouching", category: "photo-editing", provider: "replicate", credits: 3, price: "0.75", difficulty: 2, isStudioTool: false },
  { id: "print-ready", name: "Print Ready Images", category: "photo-editing", provider: "google", credits: 2, price: "0.50", difficulty: 1, isStudioTool: false },

  // PHOTOGRAPHY (10 models)
  { id: "animal-photography", name: "Animal Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "architecture-photography", name: "Architecture Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "business-photography", name: "Business Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "flat-lay", name: "Flat Lay", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "food-photography", name: "Food Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "landscape-photography", name: "Landscape Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "lifestyle-photography", name: "Lifestyle Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "people-photography", name: "People Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "product-photography", name: "Product Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "sport-photography", name: "Sport Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "street-photography", name: "Street Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },
  { id: "wellness-photography", name: "Wellness Photography", category: "photography", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },

  // PLATFORM OPTIMIZATION (4 models)
  { id: "gemini-amazon-optimization", name: "Amazon Optimization", category: "platform-optimization", provider: "google", credits: 2, price: "0.60", difficulty: 2, isStudioTool: false },
  { id: "gemini-etsy-optimization", name: "Etsy Optimization", category: "platform-optimization", provider: "google", credits: 2, price: "0.60", difficulty: 2, isStudioTool: false },
  { id: "gemini-instagram-optimization", name: "Instagram Optimization", category: "platform-optimization", provider: "google", credits: 2, price: "0.60", difficulty: 2, isStudioTool: false },
  { id: "gemini-shopify-optimization", name: "Shopify Optimization", category: "platform-optimization", provider: "google", credits: 2, price: "0.60", difficulty: 2, isStudioTool: false },

  // PRODUCT EDITING (1 model)
  { id: "professional-clipping-path", name: "Professional Clipping Path", category: "product-editing", provider: "google", credits: 3, price: "0.60", difficulty: 2, isStudioTool: false },

  // PRODUCT ENHANCEMENT (2 models)
  { id: "product-beautifier", name: "Product Beautifier", category: "product-enhancement", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false },
  { id: "product-staging", name: "Product Staging", category: "product-enhancement", provider: "google", credits: 3, price: "0.75", difficulty: 3, isStudioTool: false },

  // PRODUCT PHOTOGRAPHY (1 model)
  { id: "google-product-photo-pro", name: "Product Photo Pro", category: "product-photography", provider: "google", credits: 2, price: "0.60", difficulty: 2, isStudioTool: false },

  // SOCIAL MARKETING (2 models)
  { id: "inspirational-quote", name: "Inspirational Quote", category: "social-marketing", provider: "google", credits: 2, price: "0.40", difficulty: 2, isStudioTool: false },
  { id: "instagram-story", name: "Instagram Story", category: "social-marketing", provider: "google", credits: 2, price: "0.50", difficulty: 2, isStudioTool: false }
];

// Helper functions
export function getMetadataById(id: string): ModelMetadata | undefined {
  return AI_MODELS_METADATA.find(m => m.id === id);
}

export function getMetadataByCategory(category: string): ModelMetadata[] {
  return AI_MODELS_METADATA.filter(m => m.category === category);
}

export function getMetadataByProvider(provider: string): ModelMetadata[] {
  return AI_MODELS_METADATA.filter(m => m.provider === provider);
}

export function getStudioToolsMetadata(): ModelMetadata[] {
  return AI_MODELS_METADATA.filter(m => m.isStudioTool);
}

// Summary statistics
export const METADATA_STATS = {
  total: 68,
  byProvider: {
    google: 64,
    replicate: 3,
    removebg: 1
  },
  byCategory: {
    "background-editing": 3,
    "batch-processing": 1,
    "color-correction": 5,
    "color-enhancement": 3,
    "composition": 3,
    "content-generation": 3,
    "design-graphics": 12,
    "effects": 1,
    "enhancement": 1,
    "fashion-apparel": 2,
    "general": 1,
    "image-editing": 1,
    "image-generation": 1,
    "photo-editing": 9,
    "photography": 12,
    "platform-optimization": 4,
    "product-editing": 1,
    "product-enhancement": 2,
    "product-photography": 1,
    "social-marketing": 2
  },
  studioTools: 2,
  priceRange: {
    min: 0.04,
    max: 1.00,
    average: 0.58
  },
  creditsRange: {
    min: 1,
    max: 4,
    average: 2.5
  }
};
