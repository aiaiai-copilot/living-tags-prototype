/**
 * Database types for Living Tags
 */

/**
 * User type from Supabase Auth
 */
export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Auth session information
 */
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: User;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Text {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TextTag {
  id: string;
  text_id: string;
  tag_id: string;
  confidence: number;
  source: 'ai' | 'manual';
  created_at: string;
}

/**
 * Extended type for texts with their associated tags
 */
export interface TextWithTags extends Text {
  tags: Array<Tag & { confidence: number; source: 'ai' | 'manual' }>;
}

/**
 * Result of Claude API tag analysis for a single tag
 */
export interface TagAnalysisResult {
  id: string;
  name: string;
  confidence: number; // 0.0 to 1.0
  reasoning?: string;
}

/**
 * Export format for Living Tags data
 */
export interface ExportFormat {
  format: 'living-tags-v1';
  exported_at: string;
  user_email: string;
  tag_glossary: Array<{ name: string }>;
  texts: Array<{
    content: string;
    tags: Array<{
      name: string;
      confidence: number;
      source: 'ai' | 'manual';
    }>;
    created_at: string;
  }>;
}

/**
 * Import format for Living Tags data - supports multiple tag formats
 */
export interface ImportFormat {
  format: 'living-tags-v1';
  texts: Array<{
    content: string;
    tags?: string[] | Array<{
      name: string;
      confidence?: number;
      source?: 'ai' | 'manual';
    }>;
  }>;
}
