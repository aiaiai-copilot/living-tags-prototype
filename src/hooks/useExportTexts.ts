import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ExportFormat } from '@/types';

/**
 * Hook for exporting all user texts with tags to JSON file
 * Format: living-tags-v1 with source preservation
 */
export function useExportTexts() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch all texts with their tags
      const { data: textsData, error: textsError } = await supabase
        .from('texts')
        .select(`
          id,
          content,
          created_at,
          text_tags (
            confidence,
            source,
            tags (
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (textsError) {
        throw new Error(`Failed to fetch texts: ${textsError.message}`);
      }

      // Fetch all tags for glossary
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (tagsError) {
        throw new Error(`Failed to fetch tags: ${tagsError.message}`);
      }

      // Transform to export format
      const exportData: ExportFormat = {
        format: 'living-tags-v1',
        exported_at: new Date().toISOString(),
        user_email: user.email || 'unknown',
        tag_glossary: (tagsData || []).map((tag) => ({ name: tag.name })),
        texts: (textsData || []).map((text) => ({
          content: text.content,
          tags: (text.text_tags || [])
            .map((tt: any) => {
              const tag = tt.tags;
              if (!tag) return null;
              return {
                name: tag.name,
                confidence: tt.confidence,
                source: tt.source as 'ai' | 'manual',
              };
            })
            .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
          created_at: text.created_at,
        })),
      };

      // Custom compact JSON formatter
      const formatCompactJson = (data: ExportFormat): string => {
        const lines: string[] = [];
        lines.push('{');
        lines.push(`  "format": "${data.format}",`);
        lines.push(`  "exported_at": "${data.exported_at}",`);
        lines.push(`  "user_email": "${data.user_email}",`);

        // Tag glossary - compact
        const glossaryItems = data.tag_glossary.map(t => `{"name": "${t.name}"}`).join(', ');
        lines.push(`  "tag_glossary": [${glossaryItems}],`);

        // Texts
        lines.push('  "texts": [');
        data.texts.forEach((text, index) => {
          const isLast = index === data.texts.length - 1;
          lines.push('    {');
          lines.push(`      "content": ${JSON.stringify(text.content)},`);

          // Tags on one line
          const tagsStr = text.tags.map(tag =>
            `{"name": "${tag.name}", "confidence": ${tag.confidence}, "source": "${tag.source}"}`
          ).join(', ');
          lines.push(`      "tags": [${tagsStr}],`);

          lines.push(`      "created_at": "${text.created_at}"`);
          lines.push(`    }${isLast ? '' : ','}`);
        });
        lines.push('  ]');
        lines.push('}');

        return lines.join('\n');
      };

      // Create and download file
      const jsonString = formatCompactJson(exportData);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `living-tags-export-${date}.json`;

      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up object URL
      URL.revokeObjectURL(url);

      return {
        textsCount: exportData.texts.length,
        tagsCount: exportData.tag_glossary.length,
        filename,
      };
    },
    onSuccess: (data) => {
      toast.success('Export successful', {
        description: `Exported ${data.textsCount} texts and ${data.tagsCount} tags to ${data.filename}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Export failed', {
        description: error.message,
      });
    },
  });
}
