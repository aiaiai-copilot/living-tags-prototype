import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Input type for adding a manual tag to a text
 */
export interface AddManualTagInput {
  textId: string;
  tagId: string;
}

/**
 * Hook for manually adding a tag to a text
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Inserts/updates text_tag with source='manual' and confidence=1.0
 * 3. Uses UPSERT to convert existing AI tags to manual if user confirms
 * 4. Handles optimistic updates for instant UI feedback
 * 5. Invalidates relevant queries
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const addManualTag = useAddManualTag();
 *
 * await addManualTag.mutateAsync({
 *   textId: '123',
 *   tagId: '456'
 * });
 * ```
 */
export function useAddManualTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, AddManualTagInput, { previousTexts: any }>({
    mutationFn: async (input: AddManualTagInput) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to add a tag');
      }

      // Upsert text_tag with manual source
      // If tag already exists (from AI), update to manual with confidence 1.0
      const { error } = await supabase
        .from('text_tags')
        .upsert({
          text_id: input.textId,
          tag_id: input.tagId,
          confidence: 1.0,
          source: 'manual'
        }, {
          onConflict: 'text_id,tag_id'
        });

      if (error) {
        throw new Error(`Failed to add tag: ${error.message}`);
      }
    },
    onMutate: async ({ textId, tagId }) => {
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['texts', user?.id] });

      // Snapshot the previous value
      const previousTexts = queryClient.getQueryData(['texts', user?.id]);

      // Optimistically update the UI
      queryClient.setQueryData(['texts', user?.id], (old: any) => {
        if (!old) return old;

        return old.map((text: any) => {
          if (text.id !== textId) return text;

          // Check if tag already exists
          const existingTagIndex = text.tags.findIndex((t: any) => t.id === tagId);

          if (existingTagIndex >= 0) {
            // Update existing tag to manual
            const updatedTags = [...text.tags];
            updatedTags[existingTagIndex] = {
              ...updatedTags[existingTagIndex],
              confidence: 1.0,
              source: 'manual'
            };
            return { ...text, tags: updatedTags };
          } else {
            // Add new manual tag - need to get tag details from tags query
            const tags = queryClient.getQueryData(['tags', user?.id]) as any[];
            const tagDetails = tags?.find(t => t.id === tagId);

            if (tagDetails) {
              return {
                ...text,
                tags: [
                  ...text.tags,
                  {
                    ...tagDetails,
                    confidence: 1.0,
                    source: 'manual'
                  }
                ]
              };
            }
            return text;
          }
        });
      });

      // Return context with previous value for rollback on error
      return { previousTexts };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousTexts) {
        queryClient.setQueryData(['texts', user?.id], context.previousTexts);
      }
    },
    onSuccess: () => {
      // Only invalidate tag usage counts, not texts
      // Texts are already updated optimistically and will stay that way
      queryClient.invalidateQueries({ queryKey: ['tag-usage-counts', user?.id] });
    },
  });
}
