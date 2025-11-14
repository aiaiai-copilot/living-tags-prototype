import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { analyzeTextForTags } from '@/lib/claude';
import type { Tag, Text } from '@/types';

/**
 * Progress information for batch auto-tagging
 */
export interface BatchAutoTagProgress {
  current: number; // Current text being processed (1-indexed)
  total: number; // Total number of texts to process
  successCount: number; // Number of texts successfully tagged
  errorCount: number; // Number of texts that failed
}

/**
 * Error detail for a failed text
 */
export interface BatchAutoTagError {
  textId: string;
  error: string;
}

/**
 * Result of batch auto-tagging operation
 */
export interface BatchAutoTagResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: BatchAutoTagError[];
}

/**
 * Hook for batch auto-tagging all user's texts with a newly created tag
 *
 * This hook orchestrates the batch auto-tagging process:
 * 1. Fetches all texts from database for the current user
 * 2. For each text sequentially:
 *    a. Calls Claude API to analyze the text with all available tags
 *    b. Checks if the new tag is suggested with confidence > 0.3
 *    c. If yes, inserts text_tag relationship
 * 3. Provides progress updates via callback
 * 4. Handles API errors gracefully (continues processing remaining texts)
 *
 * @returns Object with batchAutoTag function and processing state
 *
 * @example
 * ```typescript
 * const { batchAutoTag, isProcessing, progress } = useBatchAutoTag();
 *
 * const result = await batchAutoTag({
 *   newTagId: 'tag-123',
 *   onProgress: (progress) => console.log(`Processing ${progress.current}/${progress.total}`)
 * });
 * ```
 */
export function useBatchAutoTag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchAutoTagProgress>({
    current: 0,
    total: 0,
    successCount: 0,
    errorCount: 0,
  });

  /**
   * Batch auto-tag all user's texts with a new tag
   */
  const batchAutoTag = async (params: {
    newTagId: string;
    onProgress?: (progress: BatchAutoTagProgress) => void;
  }): Promise<BatchAutoTagResult> => {
    const { newTagId, onProgress } = params;

    // Validate user is authenticated
    if (!user) {
      throw new Error('You must be logged in to use batch auto-tagging');
    }

    setIsProcessing(true);

    try {
      // Step 1: Fetch all available tags from database for the current user
      const { data: tags, error: fetchTagsError } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', user.id)
        .returns<Tag[]>();

      if (fetchTagsError) {
        throw new Error(`Failed to fetch tags: ${fetchTagsError.message}`);
      }

      if (!tags || tags.length === 0) {
        throw new Error('No tags available in the database');
      }

      // Verify the new tag exists in the list
      const newTag = tags.find((t) => t.id === newTagId);
      if (!newTag) {
        throw new Error('New tag not found in database');
      }

      // Step 2: Fetch all texts from database for the current user
      const { data: texts, error: fetchTextsError } = await supabase
        .from('texts')
        .select('id, content')
        .eq('user_id', user.id)
        .returns<Text[]>();

      if (fetchTextsError) {
        throw new Error(`Failed to fetch texts: ${fetchTextsError.message}`);
      }

      if (!texts || texts.length === 0) {
        // No texts to process - not an error
        return {
          totalProcessed: 0,
          successCount: 0,
          errorCount: 0,
          errors: [],
        };
      }

      // Initialize progress tracking
      const errors: BatchAutoTagError[] = [];
      let successCount = 0;
      let errorCount = 0;

      const initialProgress: BatchAutoTagProgress = {
        current: 0,
        total: texts.length,
        successCount: 0,
        errorCount: 0,
      };

      setProgress(initialProgress);
      onProgress?.(initialProgress);

      // Step 3: Process each text sequentially
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const currentProgress: BatchAutoTagProgress = {
          current: i + 1,
          total: texts.length,
          successCount,
          errorCount,
        };

        setProgress(currentProgress);
        onProgress?.(currentProgress);

        try {
          // Call Claude API to analyze text with all available tags
          const analyzedTags = await analyzeTextForTags(text.content, tags);

          // Check if the new tag is suggested with confidence > 0.3
          const newTagAnalysis = analyzedTags.find((t) => t.id === newTagId);

          if (newTagAnalysis && newTagAnalysis.confidence > 0.3) {
            // Insert text_tag relationship
            const { error: insertError } = await supabase
              .from('text_tags')
              .insert([
                {
                  text_id: text.id,
                  tag_id: newTagId,
                  confidence: newTagAnalysis.confidence,
                  source: 'ai' as const,
                },
              ]);

            if (insertError) {
              // Check if it's a duplicate key error (tag already assigned)
              if (insertError.code === '23505') {
                // Not a real error - tag already exists, count as success
                successCount++;
              } else {
                throw new Error(`Failed to insert tag: ${insertError.message}`);
              }
            } else {
              successCount++;
            }
          }
          // If confidence <= 0.3 or tag not suggested, we don't tag it (not an error)
        } catch (error) {
          // Log error and continue processing remaining texts
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `Failed to process text ${text.id}:`,
            errorMessage
          );
          errors.push({
            textId: text.id,
            error: errorMessage,
          });
          errorCount++;
        }
      }

      // Final progress update
      const finalProgress: BatchAutoTagProgress = {
        current: texts.length,
        total: texts.length,
        successCount,
        errorCount,
      };
      setProgress(finalProgress);
      onProgress?.(finalProgress);

      // Invalidate queries to update UI with new tag assignments
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['texts', user.id] });
        queryClient.invalidateQueries({ queryKey: ['tag-usage-counts', user.id] });
      }

      return {
        totalProcessed: texts.length,
        successCount,
        errorCount,
        errors,
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    batchAutoTag,
    isProcessing,
    progress,
  };
}
