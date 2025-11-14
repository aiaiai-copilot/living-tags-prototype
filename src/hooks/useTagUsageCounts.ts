import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook for fetching usage counts for ALL user's tags in a single efficient query
 *
 * This hook queries the text_tags table once to get counts for all tags,
 * instead of making individual queries per tag.
 *
 * @returns Query result with a Record mapping tag_id to usage count
 *
 * @example
 * ```typescript
 * const { data: usageCounts } = useTagUsageCounts();
 * // usageCounts = { 'tag-uuid-1': 45, 'tag-uuid-2': 12, ... }
 * // Access count for specific tag: usageCounts[tag.id] ?? 0
 * ```
 */
export function useTagUsageCounts() {
  const { user } = useAuth();

  return useQuery<Record<string, number>, Error>({
    queryKey: ['tag-usage-counts', user?.id],
    queryFn: async () => {
      // Return empty object if user is not authenticated
      if (!user) {
        return {};
      }

      // Step 1: Get all tag IDs for the current user
      const { data: userTags, error: tagsError } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id);

      if (tagsError) {
        throw new Error(`Failed to fetch user tags: ${tagsError.message}`);
      }

      // If user has no tags, return empty counts
      if (!userTags || userTags.length === 0) {
        return {};
      }

      // Extract tag IDs
      const tagIds = userTags.map((tag) => tag.id);

      // Step 2: Query text_tags filtered to only user's tags
      const { data, error } = await supabase
        .from('text_tags')
        .select('tag_id')
        .in('tag_id', tagIds);

      if (error) {
        throw new Error(`Failed to fetch tag usage counts: ${error.message}`);
      }

      // Convert array of { tag_id } to Record<string, number> with counts
      const counts: Record<string, number> = {};

      if (data) {
        for (const row of data) {
          counts[row.tag_id] = (counts[row.tag_id] || 0) + 1;
        }
      }

      return counts;
    },
    enabled: !!user, // Only run query when user is authenticated
  });
}
