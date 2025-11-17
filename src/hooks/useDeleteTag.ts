import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tag, TextWithTags } from '@/types';

/**
 * Input type for deleting a tag
 */
export interface DeleteTagInput {
  id: string; // Tag ID to delete
}

interface DeleteTagContext {
  previousTags: Tag[] | undefined;
  previousTextsQueries: Array<[any, any]>;
}

/**
 * Hook for deleting a tag from the database
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Deletes tag from the database (user_id verification via RLS)
 * 3. Database CASCADE automatically deletes related text_tags rows
 * 4. Uses optimistic updates for instant UI feedback (both tags and texts)
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

  return useMutation<void, Error, DeleteTagInput, DeleteTagContext>({
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
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tags', user?.id] });
      await queryClient.cancelQueries({ queryKey: ['texts', user?.id], exact: false });

      // Snapshot the previous tags
      const previousTags = queryClient.getQueryData<Tag[]>(['tags', user?.id]);

      // Snapshot ALL texts queries
      const previousTextsQueries = queryClient.getQueriesData({
        queryKey: ['texts', user?.id],
        exact: false
      });

      // Optimistically update tags list
      queryClient.setQueryData<Tag[]>(['tags', user?.id], (old) => {
        if (!old) return old;
        return old.filter((tag) => tag.id !== variables.id);
      });

      // Optimistically remove tag from all texts
      queryClient.setQueriesData(
        { queryKey: ['texts', user?.id], exact: false },
        (old: TextWithTags[] | undefined) => {
          if (!old) return old;
          return old.map((text) => ({
            ...text,
            tags: text.tags.filter((tag) => tag.id !== variables.id)
          }));
        }
      );

      // Return context object for rollback
      return { previousTags, previousTextsQueries };
    },
    // If the mutation fails, roll back
    onError: (err, _variables, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(['tags', user?.id], context.previousTags);
      }
      if (context?.previousTextsQueries) {
        context.previousTextsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to delete tag', { description: err.message });
    },
    onSuccess: () => {
      toast.success('Tag deleted');
    },
    // Always refetch after error or success to ensure data is in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['texts', user?.id], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tagUsageCounts', user?.id] });
    },
  });
}
