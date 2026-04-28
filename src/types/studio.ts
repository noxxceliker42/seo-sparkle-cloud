export interface DesignTemplateData {
  mood?: string;
  css?: string;
  rules?: string[];
  animations?: string[];
  textures?: string;
  googleFonts?: string[];
  [key: string]: unknown;
}

export interface DesignTemplate {
  id: string;
  firm_id: string | null;
  brand_kit_id: string | null;
  created_by: string | null;
  name: string;
  description: string | null;
  component_type: string;
  variant: string | null;
  category: 'custom' | 'global' | 'premium' | string;
  thumbnail_url: string | null;
  design_philosophy: string | null;
  design_data: DesignTemplateData;
  html_output: string | null;
  css_output: string | null;
  js_output: string | null;
  usage_count: number;
  last_used_at: string | null;
  qa_score: number;
  is_global: boolean;
  is_favorite: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ComponentJobStatus = 'pending' | 'generating' | 'completed' | 'error';

export interface ComponentJob {
  id: string;
  job_id: string;
  firm_id: string | null;
  user_id: string | null;
  component_type: string;
  variant: string | null;
  name: string | null;
  design_philosophy: string | null;
  status: ComponentJobStatus;
  error_message: string | null;
  html_output: string | null;
  css_output: string | null;
  js_output: string | null;
  qa_score: number | null;
  warnings: string[];
  tokens_used: number;
  saved_template_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TriggerGenerationPayload {
  componentType: string;
  variant: string;
  name: string;
  description?: string;
  prompt?: string;
  designPhilosophy: string;
  designPhilosophyCustom?: string;
  brandKit?: Record<string, unknown>;
  brandKitId?: string;
  templateId?: string;
  templateHtml?: string;
  config?: Record<string, unknown>;
  firmId: string;
  userId: string;
  firm: string;
  branche: string;
}
