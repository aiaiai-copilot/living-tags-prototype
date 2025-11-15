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
 * 3. Gets existing manual tags to avoid conflicts
 * 4. Deletes only AI-generated tags (preserves manual tags)
 * 5. Filters out AI suggestions that already exist as manual tags
 * 6. Saves new AI tag assignments to the text_tags table
 *
 * IMPORTANT: Manual tags (source='manual') are preserved during re-tagging.
 * Only AI tags (source='ai') are replaced with new AI analysis.
 * If AI suggests a tag that user already added manually, it's skipped to avoid conflicts.
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

      // Step 3: Get existing manual tags to avoid conflicts
      const { data: manualTags } = await supabase
        .from('text_tags')
        .select('tag_id')
        .eq('text_id', textId)
        .eq('source', 'manual');

      const manualTagIds = new Set(manualTags?.map(t => t.tag_id) || []);

      // Step 4: Delete only AI tags for this text (preserve manual tags)
      const { error: deleteError } = await supabase
        .from('text_tags')
        .delete()
        .eq('text_id', textId)
        .eq('source', 'ai');

      if (deleteError) {
        console.warn('Failed to delete old AI tags:', deleteError.message);
      }

      // Step 5: Filter out AI tags that already exist as manual tags
      const tagsToInsert = analyzedTags.filter(tag => !manualTagIds.has(tag.id));

      if (tagsToInsert.length === 0) {
        // All AI-suggested tags already exist as manual tags
        console.info('All AI-suggested tags already exist as manual tags');
        return analyzedTags;
      }

      // Step 6: Insert new AI tag assignments (excluding manual tags)
      const tagAssignments = tagsToInsert.map((tag) => ({
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
      // Invalidate ALL texts queries (with any searchQuery) to show newly assigned tags
      queryClient.invalidateQueries({
        queryKey: ['texts', user?.id],
        exact: false
      });
      // Invalidate tag usage counts since text_tags were modified
      queryClient.invalidateQueries({ queryKey: ['tag-usage-counts', user?.id] });
    },
  });
}
