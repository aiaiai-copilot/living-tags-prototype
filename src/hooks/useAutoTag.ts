import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { analyzeTextForTags, type TagAnalysisResult } from '@/lib/claude';
import type { Tag } from '@/types';

/**
 * Parameters for auto-tagging a text
 */
interface AutoTagParams {
  textId: string;
  content: string;
}

/**
 * Hook for automatically tagging a text using Claude API
 *
 * This hook orchestrates the entire auto-tagging process:
 * 1. Fetches all available tags from the database for the current user
 * 2. Calls Claude API to analyze the text
 * 3. Saves the tag assignments to the text_tags table
 *
 * @returns Mutation result with mutateAsync function, loading state, and error
 *
 * @example
 * ```typescript
 * const autoTag = useAutoTag();
 *
 * await autoTag.mutateAsync({
 *   textId: '123',
 *   content: 'Анекдот про Штирлица...'
 * });
 * ```
 */
export function useAutoTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<TagAnalysisResult[], Error, AutoTagParams>({
    mutationFn: async ({ textId, content }: AutoTagParams) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to use auto-tagging');
      }

      // Step 1: Fetch all available tags from database for the current user
      const { data: tags, error: fetchError } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', user.id)
        .returns<Tag[]>();

      if (fetchError) {
        throw new Error(`Failed to fetch tags: ${fetchError.message}`);
      }

      if (!tags || tags.length === 0) {
        throw new Error('No tags available in the database. Please add tags first.');
      }

      // Step 2: Call Claude API to analyze text
      let analyzedTags: TagAnalysisResult[];
      try {
        analyzedTags = await analyzeTextForTags(content, tags);
      } catch (error) {
        throw new Error(
          `Failed to analyze text with Claude API: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      if (analyzedTags.length === 0) {
        // No tags were assigned - this is not an error, just return empty array
        console.info('No tags were assigned to this text by Claude');
        return [];
      }

      // Step 3: Delete existing tags for this text (if re-tagging)
      const { error: deleteError } = await supabase
        .from('text_tags')
        .delete()
        .eq('text_id', textId);

      if (deleteError) {
        console.warn('Failed to delete old tags:', deleteError.message);
      }

      // Step 4: Insert new tag assignments into text_tags table
      const tagAssignments = analyzedTags.map((tag) => ({
        text_id: textId,
        tag_id: tag.id,
        confidence: tag.confidence,
        source: 'ai' as const,
      }));

      const { error: insertError } = await supabase
        .from('text_tags')
        .insert(tagAssignments);

      if (insertError) {
        throw new Error(`Failed to save tags: ${insertError.message}`);
      }

      return analyzedTags;
    },
    onSuccess: () => {
      // Invalidate texts query to show newly assigned tags
      queryClient.invalidateQueries({ queryKey: ['texts'] });
    },
  });
}
