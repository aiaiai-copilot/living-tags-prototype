import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types';

/**
 * Input type for creating a new tag
 */
export interface CreateTagInput {
  name: string; // User-entered tag name (1-50 chars, will be trimmed)
}

/**
 * Hook for creating a new tag in the database
 *
 * This hook:
 * 1. Validates user is authenticated
 * 2. Inserts tag into the database with user_id
 * 3. Handles duplicate name errors (unique constraint per user)
 * 4. Invalidates tags query to trigger refetch
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const createTag = useCreateTag();
 *
 * await createTag.mutateAsync({ name: 'анекдот' });
 * ```
 */
export function useCreateTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Tag, Error, CreateTagInput>({
    mutationFn: async (input: CreateTagInput) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to create a tag');
      }

      // Trim whitespace from tag name
      const trimmedName = input.name.trim();

      // Insert tag into database with user_id
      const { data, error } = await supabase
        .from('tags')
        .insert([{ name: trimmedName, user_id: user.id }])
        .select()
        .single();

      if (error) {
        // Handle duplicate name error (unique constraint violation)
        if (error.code === '23505') {
          throw new Error('A tag with this name already exists');
        }
        throw new Error(`Failed to create tag: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned after creating tag');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate tags query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['tags', user?.id] });
    },
  });
}
