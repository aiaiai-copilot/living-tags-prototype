import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { TagAnalysisResult } from '@/types';

// Re-export for convenience
export type { TagAnalysisResult };

/**
 * Zod schema for validating Claude API response
 */
const TagAnalysisSchema = z.object({
  id: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

const TagAnalysisArraySchema = z.array(TagAnalysisSchema);

/**
 * Initialize Anthropic client with API key from environment
 */
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    'Missing VITE_ANTHROPIC_API_KEY environment variable. Please check your .env.local file.'
  );
}

export const anthropic = new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true, // PoC only - not for production
});

/**
 * Analyzes Russian text (jokes/anecdotes) and assigns semantic tags using Claude API
 *
 * @param text - The Russian text to analyze
 * @param availableTags - Array of available tags with id and name
 * @returns Array of tag analysis results with confidence scores
 * @throws Error if API call fails or response is invalid
 *
 * @example
 * ```typescript
 * const tags = await analyzeTextForTags(
 *   'Какой-то анекдот про Штирлица',
 *   [{ id: '1', name: 'Штирлиц' }, { id: '2', name: 'Военные' }]
 * );
 * ```
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

  // Build the analysis prompt
  const tagsListFormatted = availableTags
    .map((tag) => `- ID: ${tag.id}, Name: ${tag.name}`)
    .join('\n');

  const userPrompt = `Analyze the following Russian joke/anecdote and assign relevant semantic tags from the provided list.

TEXT TO ANALYZE:
"""
${text}
"""

AVAILABLE TAGS:
${tagsListFormatted}

INSTRUCTIONS:
1. FIRST, scan for EXPLICIT MENTIONS of names, places, or keywords in the text
   - If a tag name appears directly in the text, it MUST be included with confidence 0.95-1.0
   - Example: If text contains "Вовочка", the tag "Вовочка" must be assigned

2. SECOND, identify thematic and semantic connections:
   - Strong thematic connection: 0.7-0.9
   - Moderate relevance: 0.5-0.6
   - Weak but present connection: 0.3-0.4

3. Only include tags with confidence > 0.3
4. Select a maximum of 5-7 most relevant tags
5. Return ONLY valid JSON (no markdown, no explanation)

RESPONSE FORMAT (JSON array):
[
  {
    "id": "tag-id-here",
    "name": "Tag Name",
    "confidence": 0.95,
    "reasoning": "Brief explanation (optional)"
  }
]

Return the JSON array now:`;

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system:
        'You are an expert at analyzing Russian humor and assigning semantic tags. You understand the cultural context, references, and themes common in Russian jokes and anecdotes. Always respond with valid JSON only.',
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content from response
    const content = response.content[0];
    if (!content) {
      throw new Error('Empty response from Claude API');
    }

    if (content.type !== 'text') {
      throw new Error('Unexpected response format from Claude API');
    }

    const responseText = content.text.trim();

    // Parse JSON response (handle potential markdown code blocks)
    let jsonText = responseText;
    if (responseText.startsWith('```')) {
      // Extract JSON from markdown code block
      const match = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        jsonText = match[1].trim();
      }
    }

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      throw new Error(
        `Failed to parse Claude API response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}\n\nResponse: ${responseText}`
      );
    }

    // Validate response structure with Zod
    const validationResult = TagAnalysisArraySchema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error(
        `Invalid response structure from Claude API: ${validationResult.error.message}`
      );
    }

    const analyzedTags = validationResult.data;

    // Validate that all tag IDs exist in availableTags
    const availableTagIds = new Set(availableTags.map((t) => t.id));
    const invalidTags = analyzedTags.filter((t) => !availableTagIds.has(t.id));

    if (invalidTags.length > 0) {
      console.warn(
        'Claude returned invalid tag IDs:',
        invalidTags.map((t) => t.id)
      );
      // Filter out invalid tags
      return analyzedTags.filter((t) => availableTagIds.has(t.id));
    }

    return analyzedTags;
  } catch (error) {
    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        throw new Error(
          'Rate limit exceeded for Claude API. Please try again in a moment.'
        );
      }
      throw new Error(
        `Claude API error (${error.status}): ${error.message}`
      );
    }

    // Re-throw other errors
    throw error;
  }
}
