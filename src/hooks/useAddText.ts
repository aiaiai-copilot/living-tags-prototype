import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAutoTag } from '@/hooks/useAutoTag';
import type { Text } from '@/types';

/**
 * Hook for adding a new text to the database with automatic tagging
 *
 * This hook performs two operations:
 * 1. Inserts the text into the database
 * 2. Automatically tags the text using Claude API
 *
 * @returns Mutation result with mutate function, loading state, and error
 *
 * @example
 * ```typescript
 * const addText = useAddText();
 *
 * await addText.mutateAsync('Анекдот про Штирлица...');
 * ```
 */
export function useAddText() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const autoTag = useAutoTag();

  return useMutation<Text, Error, string>({
    mutationFn: async (content: string) => {
      // Validate user is authenticated
      if (!user) {
        throw new Error('You must be logged in to add text');
      }

      // Step 1: Insert text into database with user_id
      const { data, error } = await supabase
        .from('texts')
        .insert([{ content, user_id: user.id }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add text: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned after adding text');
      }

      // Step 2: Auto-tag the text with Claude API
      try {
        await autoTag.mutateAsync({
          textId: data.id,
          content: data.content,
        });
      } catch (tagError) {
        // Log the error but don't fail the entire operation
        // The text was successfully added, tagging is a secondary operation
        console.error('Failed to auto-tag text:', tagError);
        throw new Error(
          `Text added successfully, but auto-tagging failed: ${tagError instanceof Error ? tagError.message : 'Unknown error'}`
        );
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate ALL texts queries (with any searchQuery) to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ['texts', user?.id],
        exact: false
      });
    },
  });
}
