import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for fetching the usage count of a specific tag
 *
 * This hook queries the number of texts that are currently associated
 * with a given tag via the text_tags join table.
 *
 * @param tagId - The ID of the tag to get usage count for
 * @returns Query result with the usage count (number) and loading/error states
 *
 * @example
 * ```typescript
 * const { data: usageCount, isLoading } = useTagUsageCount('tag-uuid');
 * // usageCount will be a number (e.g., 45)
 * ```
 */
export function useTagUsageCount(tagId: string | null) {
  const { user } = useAuth();

  return useQuery<number, Error>({
    queryKey: ['tag-usage-count', tagId],
    queryFn: async () => {
      // Don't query if no tag ID provided
      if (!tagId) {
        return 0;
      }

      // Query the count of text_tags rows for this tag
      const { count, error } = await supabase
        .from('text_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', tagId);

      if (error) {
        throw new Error(`Failed to get tag usage count: ${error.message}`);
      }

      return count ?? 0;
    },
    enabled: !!tagId && !!user, // Only run query if tagId and user exist
  });
}
