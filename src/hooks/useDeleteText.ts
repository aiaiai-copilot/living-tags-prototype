import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { TextWithTags } from '@/types';

/**
 * Hook for deleting a text and all its associated tags
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Deletes the text (CASCADE deletes text_tags)
 * 3. Handles optimistic updates for instant UI feedback
 * 4. Invalidates relevant queries
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const deleteText = useDeleteText();
 *
 * await deleteText.mutateAsync('text-id-123');
 * ```
 */
export function useDeleteText() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, string, { previousQueries: Array<[any, any]> }>({
    mutationFn: async (textId: string) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to delete a text');
      }

      // Delete the text (CASCADE will remove text_tags)
      const { error } = await supabase
        .from('texts')
        .delete()
        .eq('id', textId)
        .eq('user_id', user.id); // Ensure user owns the text

      if (error) {
        throw new Error(`Failed to delete text: ${error.message}`);
      }
    },
    onMutate: async (textId) => {
      // Cancel any outgoing refetches for ALL texts queries
      await queryClient.cancelQueries({
        queryKey: ['texts', user?.id],
        exact: false
      });

      // Snapshot ALL texts queries for rollback
      const previousQueries = queryClient.getQueriesData({
        queryKey: ['texts', user?.id],
        exact: false
      });

      // Optimistically update ALL texts queries by removing the text
      queryClient.setQueriesData(
        { queryKey: ['texts', user?.id], exact: false },
        (old: TextWithTags[] | undefined) => {
          if (!old) return old;
          return old.filter((text) => text.id !== textId);
        }
      );

      // Return context with previous queries for rollback on error
      return { previousQueries };
    },
    onError: (err, _textId, context) => {
      // Rollback ALL queries to previous values on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      // Show error notification to user
      toast.error('Failed to delete text', {
        description: err.message
      });
    },
    onSuccess: () => {
      toast.success('Text deleted');
    },
    onSettled: () => {
      // Invalidate ALL texts queries to refetch fresh data
      queryClient.invalidateQueries({
        queryKey: ['texts', user?.id],
        exact: false
      });
      // Also invalidate tag usage counts as they may have changed
      queryClient.invalidateQueries({ queryKey: ['tagUsageCounts', user?.id] });
    },
  });
}
