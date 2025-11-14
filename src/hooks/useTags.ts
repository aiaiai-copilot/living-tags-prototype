import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types';

/**
 * Hook for fetching all tags from the database for the current user
 * @returns Query result with tags array, loading state, and error
 */
export function useTags() {
  const { user } = useAuth();

  return useQuery<Tag[], Error>({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      // Return empty array if user is not authenticated
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!user, // Only run query when user is authenticated
  });
}
