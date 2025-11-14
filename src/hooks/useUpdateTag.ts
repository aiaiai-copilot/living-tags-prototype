import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types';

/**
 * Input type for updating a tag
 */
export interface UpdateTagInput {
  id: string;     // Tag ID to update
  name: string;   // New tag name (1-50 chars, will be trimmed)
}

/**
 * Hook for updating a tag's name in the database
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Updates tag.name in the database (user_id verification via RLS)
 * 3. Handles duplicate name errors (unique constraint per user)
 * 4. Uses optimistic updates for instant UI feedback
 * 5. Invalidates tags query to trigger refetch
 *
 * Note: Only the tag name is updated. All text_tags relationships
 * remain unchanged since tag_id stays the same.
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const updateTag = useUpdateTag();
 *
 * await updateTag.mutateAsync({
 *   id: 'tag-uuid',
 *   name: 'Разработчики'
 * });
 * ```
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Tag, Error, UpdateTagInput, { previous: Tag[] | undefined }>({
    mutationFn: async (input: UpdateTagInput) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to update a tag');
      }

      // Trim whitespace from tag name
      const trimmedName = input.name.trim();

      // Validate trimmed name is not empty
      if (trimmedName.length === 0) {
        throw new Error('Tag name cannot be empty');
      }

      // Update tag in database
      // RLS policies ensure user can only update their own tags
      const { data, error } = await supabase
        .from('tags')
        .update({ name: trimmedName })
        .eq('id', input.id)
        .eq('user_id', user.id) // Extra safety check
        .select()
        .single();

      if (error) {
        // Handle duplicate name error (unique constraint violation)
        if (error.code === '23505') {
          throw new Error('A tag with this name already exists');
        }
        throw new Error(`Failed to update tag: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned after updating tag');
      }

      return data;
    },
    // Optimistic update: immediately update UI before server responds
    onMutate: async (variables) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tags', user?.id] });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<Tag[]>(['tags', user?.id]);

      // Optimistically update to the new value
      queryClient.setQueryData<Tag[]>(['tags', user?.id], (old) => {
        if (!old) return old;
        return old.map((tag) =>
          tag.id === variables.id
            ? { ...tag, name: variables.name.trim() }
            : tag
        );
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
    // Always refetch after error or success to ensure data is in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tags', user?.id] });
    },
  });
}
