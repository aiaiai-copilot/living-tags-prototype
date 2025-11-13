/**
 * Database types for Living Tags PoC
 */

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
  created_at: string;
}

/**
 * Extended type for texts with their associated tags
 */
export interface TextWithTags extends Text {
  tags: Array<Tag & { confidence: number }>;
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
