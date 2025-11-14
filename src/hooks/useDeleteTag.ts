import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types';

/**
 * Input type for deleting a tag
 */
export interface DeleteTagInput {
  id: string; // Tag ID to delete
}

/**
 * Hook for deleting a tag from the database
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Deletes tag from the database (user_id verification via RLS)
 * 3. Database CASCADE automatically deletes related text_tags rows
 * 4. Uses optimistic updates for instant UI feedback
 * 5. Invalidates both tags and texts queries since relationships changed
 *
 * Note: When a tag is deleted, all text_tags relationships are automatically
 * removed by the database's ON DELETE CASCADE constraint. The texts themselves
 * remain unchanged.
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const deleteTag = useDeleteTag();
 *
 * await deleteTag.mutateAsync({ id: 'tag-uuid' });
 * ```
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, DeleteTagInput, { previous: Tag[] | undefined }>({
    mutationFn: async (input: DeleteTagInput) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to delete a tag');
      }

      // Delete tag from database
      // RLS policies ensure user can only delete their own tags
      // CASCADE will automatically delete related text_tags rows
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', input.id)
        .eq('user_id', user.id); // Extra safety check

      if (error) {
        throw new Error(`Failed to delete tag: ${error.message}`);
      }
    },
    // Optimistic update: immediately remove tag from UI before server responds
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tags', user?.id] });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<Tag[]>(['tags', user?.id]);

      // Optimistically update by removing the tag
      queryClient.setQueryData<Tag[]>(['tags', user?.id], (old) => {
        if (!old) return old;
        return old.filter((tag) => tag.id !== variables.id);
      });

      // Return context object with the snapshotted value
      return { previous };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tags', user?.id], context.previous);
      }
    },
    // On success, invalidate texts query since tag associations changed
    onSuccess: () => {
      // Invalidate texts query to reflect removed tag associations
      queryClient.invalidateQueries({ queryKey: ['texts'] });
      // Invalidate tag usage counts since tag was deleted (CASCADE deletes text_tags)
      queryClient.invalidateQueries({ queryKey: ['tag-usage-counts'] });
    },
    // Always refetch tags after error or success to ensure data is in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', user?.id] });
    },
  });
}
