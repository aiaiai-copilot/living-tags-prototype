import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

  return useMutation<void, Error, AddManualTagInput, { previousQueries: Array<[any, any]> }>({
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
      // Cancel any outgoing refetches for ALL texts queries (with any searchQuery)
      await queryClient.cancelQueries({
        queryKey: ['texts', user?.id],
        exact: false
      });

      // Snapshot ALL texts queries for rollback
      const previousQueries = queryClient.getQueriesData({
        queryKey: ['texts', user?.id],
        exact: false
      });

      // Optimistically update ALL texts queries
      queryClient.setQueriesData(
        { queryKey: ['texts', user?.id], exact: false },
        (old: any) => {
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
        }
      );

      // Return context with previous queries for rollback on error
      return { previousQueries };
    },
    onError: (err, _variables, context) => {
      // Rollback ALL queries to previous values on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // Show error notification to user
      toast.error('Не удалось добавить тег', {
        description: err.message
      });
    },
    onSettled: () => {
      // Invalidate ALL texts queries (with any searchQuery) to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ['texts', user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ['tag-usage-counts', user?.id] });
    },
  });
}
