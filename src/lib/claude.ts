import { z } from 'zod';
import type { TagAnalysisResult } from '@/types';
import { supabase } from './supabase';

// Re-export for convenience
export type { TagAnalysisResult };

/**
 * Zod schema for validating API response
 */
const TagAnalysisSchema = z.object({
  id: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

const TagAnalysisArraySchema = z.array(TagAnalysisSchema);

/**
 * Analyzes Russian text (jokes/anecdotes) and assigns semantic tags using Supabase Edge Function
 * (which proxies to Claude API to avoid client-side blocking)
 *
 * @param text - The Russian text to analyze
 * @param availableTags - Array of available tags with id and name
 * @returns Array of tag analysis results with confidence scores
 * @throws Error if API call fails or response is invalid
 */
export async function analyzeTextForTags(
  text: string,
  availableTags: Array<{ id: string; name: string }>
): Promise<TagAnalysisResult[]> {
  // Validate input
  if (!text.trim()) {
    throw new Error('Text content cannot be empty');
  }

  if (!availableTags.length) {
    throw new Error('No available tags provided');
  }

  try {
    console.log('Invoking analyze-text Edge Function...');

    const { data, error } = await supabase.functions.invoke('analyze-text', {
      body: {
        text,
        availableTags: availableTags.map(t => ({ id: t.id, name: t.name }))
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function error: ${error.message || 'Unknown error'}`);
    }

    if (!data) {
      throw new Error('Empty response from Edge Function');
    }

    // Validate response structure with Zod
    const validationResult = TagAnalysisArraySchema.safeParse(data);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      throw new Error(
        `Invalid response structure from API: ${validationResult.error.message}`
      );
    }

    const analyzedTags = validationResult.data;

    // Validate that all tag IDs exist in availableTags
    const availableTagIds = new Set(availableTags.map((t) => t.id));
    const invalidTags = analyzedTags.filter((t) => !availableTagIds.has(t.id));

    if (invalidTags.length > 0) {
      console.warn(
        'API returned invalid tag IDs:',
        invalidTags.map((t) => t.id)
      );
      // Filter out invalid tags
      return analyzedTags.filter((t) => availableTagIds.has(t.id));
    }

    return analyzedTags;
  } catch (error) {
    console.error('Tag analysis failed:', error);
    throw error;
  }
}
