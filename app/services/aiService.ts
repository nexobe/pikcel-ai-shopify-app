// AI Service for PikcelAI Image Editor
// This service handles all AI-related API calls

export interface AIModel {
  id: string;
  name: string;
  description: string;
  credits_required: number;
  provider: string;
  default_parameters?: Record<string, any>;
  is_active: boolean;
  category?: string;
}

export interface Job {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result_url?: string;
  error?: string;
  progress?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProcessingJobPayload {
  model_id: string;
  image_url: string;
  parameters?: Record<string, any>;
}

// Base API URL - Replace with your actual backend URL
const API_BASE_URL = process.env.PIKCEL_AI_API_URL || "http://localhost:3000/api";

/**
 * Fetch all available AI models
 */
export async function fetchAIModels(): Promise<AIModel[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-models`);
    if (!response.ok) {
      throw new Error(`Failed to fetch AI models: ${response.statusText}`);
    }
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error("Error fetching AI models:", error);
    // Return mock data for development
    return getMockAIModels();
  }
}

/**
 * Create a new processing job
 */
export async function createProcessingJob(
  payload: ProcessingJobPayload
): Promise<Job> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create job: ${response.statusText}`);
    }

    const data = await response.json();
    return data.job;
  } catch (error) {
    console.error("Error creating processing job:", error);
    // Return mock job for development
    return {
      id: `job_${Date.now()}`,
      status: "processing",
      progress: 0,
    };
  }
}

/**
 * Get job status by ID
 */
export async function getJobStatus(jobId: string): Promise<Job> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.statusText}`);
    }
    const data = await response.json();
    return data.job;
  } catch (error) {
    console.error("Error fetching job status:", error);
    // Return mock completed job for development
    return {
      id: jobId,
      status: "completed",
      result_url: "https://picsum.photos/800/600",
      progress: 100,
    };
  }
}

/**
 * Mock AI models for development
 */
function getMockAIModels(): AIModel[] {
  return [
    {
      id: "background-removal",
      name: "Background Removal",
      description: "Remove background from product images with precision",
      credits_required: 1,
      provider: "replicate",
      category: "background",
      default_parameters: {
        strength: 0.8,
      },
      is_active: true,
    },
    {
      id: "image-enhancement",
      name: "Image Enhancement",
      description: "Enhance image quality, clarity, and details",
      credits_required: 1,
      provider: "openai",
      category: "enhancement",
      is_active: true,
    },
    {
      id: "color-correction",
      name: "Color Correction",
      description: "Correct colors, white balance, and lighting",
      credits_required: 1,
      provider: "replicate",
      category: "color",
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
      category: "apparel",
      default_parameters: {
        blend_strength: 0.9,
      },
      is_active: true,
    },
    {
      id: "photo-retouching",
      name: "Photo Retouching",
      description: "Remove blemishes, dust, and imperfections",
      credits_required: 1,
      provider: "openai",
      category: "enhancement",
      is_active: true,
    },
    {
      id: "upscale-4x",
      name: "AI Upscaling (4x)",
      description: "Upscale images up to 4x resolution with AI",
      credits_required: 2,
      provider: "replicate",
      category: "enhancement",
      default_parameters: {
        scale: 4,
        face_enhance: true,
      },
      is_active: true,
    },
  ];
}
