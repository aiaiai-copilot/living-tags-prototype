import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Default tags for new users (Russian joke categories)
 */
const DEFAULT_TAGS = [
  'Вовочка',
  'Штирлиц',
  'Программисты',
  'Работа',
  'Семья',
  'Политика',
  'Черный юмор',
  'Каламбур',
  'Абсурд',
  'Советские',
  'Современные',
  'Детские',
  'Медицина',
  'Студенты',
  'Армия',
];

interface UseInitializeDefaultTagsReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  initializeTags: () => Promise<boolean>;
}

/**
 * Hook to initialize default tags for new users
 * Checks if user has any tags, and if not, creates the default set
 */
export function useInitializeDefaultTags(): UseInitializeDefaultTagsReturn {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initializeTags = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if user already has tags
      const { data: existingTags, error: fetchError } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (fetchError) {
        throw new Error(`Failed to check existing tags: ${fetchError.message}`);
      }

      // If user already has tags, no need to initialize
      if (existingTags && existingTags.length > 0) {
        setIsInitialized(false);
        setIsLoading(false);
        return false;
      }

      // Insert default tags
      const tagsToInsert = DEFAULT_TAGS.map((name) => ({
        name,
        user_id: user.id,
      }));

      const { error: insertError } = await supabase
        .from('tags')
        .insert(tagsToInsert);

      if (insertError) {
        throw new Error(`Failed to insert default tags: ${insertError.message}`);
      }

      setIsInitialized(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(errorObj);
      setIsLoading(false);
      console.error('Error initializing default tags:', errorObj);
      return false;
    }
  }, [user]);

  return {
    isInitialized,
    isLoading,
    error,
    initializeTags,
  };
}
