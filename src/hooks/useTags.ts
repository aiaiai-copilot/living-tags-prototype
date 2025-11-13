import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tag } from '@/types';

/**
 * Hook for fetching all tags from the database
 * @returns Query result with tags array, loading state, and error
 */
export function useTags() {
  return useQuery<Tag[], Error>({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch tags: ${error.message}`);
      }

      return data || [];
    },
  });
}
