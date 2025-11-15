import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Input type for removing a tag from a text
 */
export interface RemoveTagInput {
  textId: string;
  tagId: string;
}

/**
 * Hook for removing a tag from a text
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Deletes the text_tag relationship
 * 3. Works for both AI and manual tags
 * 4. Handles optimistic updates for instant UI feedback
 * 5. Invalidates relevant queries
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const removeTag = useRemoveTag();
 *
 * await removeTag.mutateAsync({
 *   textId: '123',
 *   tagId: '456'
 * });
 * ```
 */
export function useRemoveTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, RemoveTagInput, { previousQueries: Array<[any, any]> }>({
    mutationFn: async (input: RemoveTagInput) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to remove a tag');
      }

      // Delete the text_tag relationship
      const { error } = await supabase
        .from('text_tags')
        .delete()
        .match({
          text_id: input.textId,
          tag_id: input.tagId
        });

      if (error) {
        throw new Error(`Failed to remove tag: ${error.message}`);
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

      // Optimistically update ALL texts queries by removing the tag
      queryClient.setQueriesData(
        { queryKey: ['texts', user?.id], exact: false },
        (old: any) => {
          if (!old) return old;

          return old.map((text: any) => {
            if (text.id !== textId) return text;

            // Remove the tag from the tags array
            return {
              ...text,
              tags: text.tags.filter((tag: any) => tag.id !== tagId)
            };
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
      toast.error('Не удалось удалить тег', {
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
