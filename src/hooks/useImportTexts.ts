import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Tag } from '@/types';

interface ImportedText {
  content: string;
  tags?: string[] | Array<{
    name: string;
    confidence?: number;
    source?: 'ai' | 'manual';
  }>;
}

interface ImportData {
  format?: string;
  texts: ImportedText[];
}

interface ParsedTag {
  tagId: string;
  confidence: number;
  source: 'ai' | 'manual';
}

interface ImportResult {
  textsImported: number;
  tagsCreated: number;
  aiTagsAssigned: number;
  manualTagsAssigned: number;
  errors: string[];
}

/**
 * Hook for importing texts with tags from JSON file
 * Supports multiple tag formats:
 * - String array: treated as manual tags (confidence 1.0)
 * - Object without source: treated as AI tags
 * - Object with source: preserves AI/manual distinction
 */
export function useImportTexts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: ImportData,
      // Progress callback is optional - can be used by dialog
    ): Promise<ImportResult> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const result: ImportResult = {
        textsImported: 0,
        tagsCreated: 0,
        aiTagsAssigned: 0,
        manualTagsAssigned: 0,
        errors: [],
      };

      // Validate format
      if (data.format && data.format !== 'living-tags-v1') {
        throw new Error(`Unsupported format: ${data.format}. Expected: living-tags-v1`);
      }

      if (!data.texts || !Array.isArray(data.texts)) {
        throw new Error('Invalid import data: missing texts array');
      }

      if (data.texts.length === 0) {
        throw new Error('No texts to import');
      }

      // Fetch existing tags for the user
      const { data: existingTags, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id);

      if (tagsError) {
        throw new Error(`Failed to fetch existing tags: ${tagsError.message}`);
      }

      // Create a map for quick lookup by name (case-insensitive)
      const tagMap = new Map<string, Tag>();
      (existingTags || []).forEach(tag => {
        tagMap.set(tag.name.toLowerCase(), tag);
      });

      // Helper function to find or create a tag
      const findOrCreateTag = async (tagName: string): Promise<Tag> => {
        const normalizedName = tagName.trim();
        const lowerName = normalizedName.toLowerCase();

        // Check if tag exists
        const existingTag = tagMap.get(lowerName);
        if (existingTag) {
          return existingTag;
        }

        // Create new tag
        const { data: newTag, error } = await supabase
          .from('tags')
          .insert({
            user_id: user.id,
            name: normalizedName,
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create tag "${normalizedName}": ${error.message}`);
        }

        // Add to map for future lookups
        tagMap.set(lowerName, newTag);
        result.tagsCreated++;

        return newTag;
      };

      // Helper function to parse tag format
      const parseTag = async (
        tag: string | { name: string; confidence?: number; source?: 'ai' | 'manual' }
      ): Promise<ParsedTag> => {
        // Format 1: String array (e.g., ["Штирлиц", "Советские"])
        if (typeof tag === 'string') {
          const glossaryTag = await findOrCreateTag(tag);
          return {
            tagId: glossaryTag.id,
            confidence: 1.0,
            source: 'manual', // String arrays are user-specified
          };
        }

        // Format 2: Object without source
        if (!tag.source) {
          const glossaryTag = await findOrCreateTag(tag.name);
          return {
            tagId: glossaryTag.id,
            confidence: tag.confidence || 0.5,
            source: 'ai', // Default to AI if confidence provided
          };
        }

        // Format 3: Full object with source
        const glossaryTag = await findOrCreateTag(tag.name);
        return {
          tagId: glossaryTag.id,
          confidence: tag.confidence || (tag.source === 'manual' ? 1.0 : 0.5),
          source: tag.source,
        };
      };

      // Process texts in batches to avoid overwhelming the database
      const BATCH_SIZE = 10;
      const total = data.texts.length;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = data.texts.slice(i, i + BATCH_SIZE);

        for (const textData of batch) {
          try {
            // Validate text content
            if (!textData.content || typeof textData.content !== 'string') {
              result.errors.push(`Text at index ${i}: missing or invalid content`);
              continue;
            }

            const content = textData.content.trim();
            if (content.length === 0) {
              result.errors.push(`Text at index ${i}: empty content`);
              continue;
            }

            // Insert text
            const { data: newText, error: textError } = await supabase
              .from('texts')
              .insert({
                user_id: user.id,
                content: content,
              })
              .select()
              .single();

            if (textError) {
              result.errors.push(`Text at index ${i}: ${textError.message}`);
              continue;
            }

            result.textsImported++;

            // Process tags if provided
            if (textData.tags && Array.isArray(textData.tags)) {
              const tagsToInsert: Array<{
                text_id: string;
                tag_id: string;
                confidence: number;
                source: 'ai' | 'manual';
              }> = [];

              for (const tagData of textData.tags) {
                try {
                  const parsedTag = await parseTag(tagData);
                  tagsToInsert.push({
                    text_id: newText.id,
                    tag_id: parsedTag.tagId,
                    confidence: parsedTag.confidence,
                    source: parsedTag.source,
                  });

                  if (parsedTag.source === 'ai') {
                    result.aiTagsAssigned++;
                  } else {
                    result.manualTagsAssigned++;
                  }
                } catch (tagError) {
                  const errorMessage = tagError instanceof Error ? tagError.message : 'Unknown error';
                  result.errors.push(`Text at index ${i}, tag: ${errorMessage}`);
                }
              }

              // Insert all tags for this text
              if (tagsToInsert.length > 0) {
                const { error: insertError } = await supabase
                  .from('text_tags')
                  .insert(tagsToInsert);

                if (insertError) {
                  result.errors.push(`Text at index ${i}: Failed to insert tags: ${insertError.message}`);
                }
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push(`Text at index ${i}: ${errorMessage}`);
          }
        }
      }

      return result;
    },
    onSuccess: (result) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['texts', user?.id], exact: false });
      queryClient.invalidateQueries({ queryKey: ['tags', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['tagUsageCounts', user?.id] });

      // Show success toast
      const description = [
        `Imported ${result.textsImported} texts`,
        result.tagsCreated > 0 ? `Created ${result.tagsCreated} new tags` : null,
        result.manualTagsAssigned > 0 ? `${result.manualTagsAssigned} manual tags` : null,
        result.aiTagsAssigned > 0 ? `${result.aiTagsAssigned} AI tags` : null,
        result.errors.length > 0 ? `${result.errors.length} errors` : null,
      ].filter(Boolean).join(', ');

      if (result.errors.length > 0) {
        toast.warning('Import completed with warnings', { description });
      } else {
        toast.success('Import successful', { description });
      }
    },
    onError: (error: Error) => {
      toast.error('Import failed', {
        description: error.message,
      });
    },
  });
}

/**
 * Parse and validate JSON import file
 */
export function parseImportFile(content: string): ImportData {
  try {
    const data = JSON.parse(content);

    // Validate structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON structure');
    }

    // Check if it's our format
    if (data.texts && Array.isArray(data.texts)) {
      return data as ImportData;
    }

    // Maybe it's a simple array of texts
    if (Array.isArray(data)) {
      return {
        texts: data.map((item: any) => {
          if (typeof item === 'string') {
            return { content: item };
          }
          return item;
        }),
      };
    }

    throw new Error('Could not parse import format');
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON: ' + error.message);
    }
    throw error;
  }
}
