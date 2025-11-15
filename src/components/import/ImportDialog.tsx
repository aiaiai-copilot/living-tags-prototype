import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useImportTexts, parseImportFile } from '@/hooks/useImportTexts';
import { Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewData {
  textsCount: number;
  withTags: number;
  withoutTags: number;
  tagFormats: {
    stringArrays: number;
    aiObjects: number;
    manualObjects: number;
  };
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importTexts = useImportTexts();

  const resetState = () => {
    setSelectedFile(null);
    setFileContent(null);
    setPreview(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!importTexts.isPending) {
      onOpenChange(newOpen);
      if (!newOpen) {
        resetState();
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setPreview(null);

    try {
      const content = await file.text();
      setFileContent(content);

      // Parse and validate
      const data = parseImportFile(content);

      // Analyze preview
      const previewData: PreviewData = {
        textsCount: data.texts.length,
        withTags: 0,
        withoutTags: 0,
        tagFormats: {
          stringArrays: 0,
          aiObjects: 0,
          manualObjects: 0,
        },
      };

      for (const text of data.texts) {
        if (!text.tags || text.tags.length === 0) {
          previewData.withoutTags++;
        } else {
          previewData.withTags++;

          // Analyze tag format
          for (const tag of text.tags) {
            if (typeof tag === 'string') {
              previewData.tagFormats.stringArrays++;
            } else if (tag.source === 'manual') {
              previewData.tagFormats.manualObjects++;
            } else if (tag.source === 'ai') {
              previewData.tagFormats.aiObjects++;
            } else {
              // Object without source - defaults to AI
              previewData.tagFormats.aiObjects++;
            }
          }
        }
      }

      setPreview(previewData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      setParseError(errorMessage);
    }
  };

  const handleImport = async () => {
    if (!fileContent) return;

    try {
      const data = parseImportFile(fileContent);
      await importTexts.mutateAsync(data);
      handleOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Texts</DialogTitle>
          <DialogDescription>
            Import texts from a JSON file. Supports Living Tags export format with AI/manual tag preservation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              disabled={importTexts.isPending}
            />
            {!selectedFile ? (
              <div className="space-y-2">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <Button
                    variant="outline"
                    onClick={handleBrowseClick}
                    disabled={importTexts.isPending}
                  >
                    Browse Files
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Select a .json file
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileJson className="h-10 w-10 mx-auto text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  disabled={importTexts.isPending}
                >
                  Choose different file
                </Button>
              </div>
            )}
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Parse Error</p>
                <p className="text-sm">{parseError}</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="bg-muted/50 border rounded-md p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Valid file</span>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Total texts:</span> {preview.textsCount}
                </p>
                <p>
                  <span className="font-medium">With tags:</span> {preview.withTags}
                </p>
                <p>
                  <span className="font-medium">Without tags:</span> {preview.withoutTags}
                </p>
                {preview.withTags > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="font-medium mb-1">Tag formats detected:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {preview.tagFormats.stringArrays > 0 && (
                        <li>
                          String arrays (→ manual): {preview.tagFormats.stringArrays} tags
                        </li>
                      )}
                      {preview.tagFormats.aiObjects > 0 && (
                        <li>
                          AI objects: {preview.tagFormats.aiObjects} tags
                        </li>
                      )}
                      {preview.tagFormats.manualObjects > 0 && (
                        <li>
                          Manual objects: {preview.tagFormats.manualObjects} tags
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Progress */}
          {importTexts.isPending && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
              <p className="font-medium">Importing...</p>
              <p className="text-sm">This may take a moment for large files.</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importTexts.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview || importTexts.isPending}
          >
            {importTexts.isPending
              ? 'Importing...'
              : `Import ${preview?.textsCount || 0} Texts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
