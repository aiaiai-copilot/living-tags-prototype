import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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

  return useMutation<void, Error, RemoveTagInput, { previousTexts: any }>({
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['texts', user?.id] });

      // Snapshot the previous value
      const previousTexts = queryClient.getQueryData(['texts', user?.id]);

      // Optimistically update the UI by removing the tag
      queryClient.setQueryData(['texts', user?.id], (old: any) => {
        if (!old) return old;

        return old.map((text: any) => {
          if (text.id !== textId) return text;

          // Remove the tag from the tags array
          return {
            ...text,
            tags: text.tags.filter((tag: any) => tag.id !== tagId)
          };
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
    onSettled: () => {
      // Always refetch after mutation completes to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['texts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tag-usage-counts', user?.id] });
    },
  });
}
