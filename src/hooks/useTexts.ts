import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { TextWithTags } from '@/types';

/**
 * Hook for fetching texts with their associated tags and confidence scores for the current user
 * @param searchQuery - Optional search query to filter texts by tag name
 * @returns Query result with texts array, loading state, and error
 */
export function useTexts(searchQuery?: string) {
  const { user } = useAuth();

  return useQuery<TextWithTags[], Error>({
    queryKey: ['texts', user?.id, searchQuery],
    queryFn: async () => {
      // Return empty array if user is not authenticated
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('texts')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          text_tags (
            confidence,
            tags (
              id,
              name,
              created_at
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch texts: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Transform the response to match TextWithTags type
      const transformedData: TextWithTags[] = data.map((text) => ({
        id: text.id,
        content: text.content,
        created_at: text.created_at,
        updated_at: text.updated_at,
        tags: (text.text_tags || [])
          .map((tt: any) => {
            // Supabase returns tags as an object when using foreign key relationship
            const tag = tt.tags;
            if (!tag) return null;
            return {
              id: tag.id,
              name: tag.name,
              created_at: tag.created_at,
              confidence: tt.confidence,
            };
          })
          .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
      }));

      // Client-side filtering if search query is provided
      if (searchQuery && searchQuery.trim()) {
        const normalizedQuery = searchQuery.toLowerCase().trim();
        return transformedData.filter((text) =>
          text.tags.some((tag) =>
            tag.name.toLowerCase().includes(normalizedQuery)
          )
        );
      }

      return transformedData;
    },
    enabled: !!user, // Only run query when user is authenticated
  });
}
