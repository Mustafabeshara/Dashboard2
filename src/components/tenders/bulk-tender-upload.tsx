/**
 * Bulk Tender Upload Component
 * Upload a ZIP file containing multiple tender PDFs for batch AI extraction
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  FileArchive,
  FileText,
  Loader2,
  Plus,
  Upload,
  XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';

interface TenderItem {
  itemDescription: string;
  quantity: number;
  unit: string;
}

interface ExtractedTenderData {
  reference: string;
  title: string;
  organization: string;
  closingDate: string;
  items: TenderItem[];
  notes: string;
}

interface ExtractedTender {
  fileName: string;
  documentId?: string;
  success: boolean;
  data?: ExtractedTenderData;
  error?: string;
  confidence?: number;
}

interface BulkTenderUploadProps {
  onComplete?: (results: ExtractedTender[]) => void;
  onCreateTender?: (tender: ExtractedTenderData) => void;
}

export function BulkTenderUpload({ onComplete, onCreateTender }: BulkTenderUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ExtractedTender[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTender, setSelectedTender] = useState<ExtractedTender | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setResults(null);

    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      setError('Please select a ZIP file');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size is 100MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);

      const response = await fetch('/api/tenders/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      setProgress(100);
      setResults(result.results);

      // Success message is shown via the results UI

      if (onComplete) {
        onComplete(result.results);
      }
    } catch (err) {
      console.error('Bulk upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process ZIP file';
      setError(
        `Error: ${errorMessage}. Please check that your ZIP contains valid PDF, PNG, or JPG files.`
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleCreateTender = (tender: ExtractedTender) => {
    if (tender.data && onCreateTender) {
      onCreateTender(tender.data);
    }
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;

    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'destructive';

    return (
      <Badge
        variant={
          variant === 'success' ? 'default' : variant === 'warning' ? 'secondary' : 'destructive'
        }
      >
        {percentage}% confidence
      </Badge>
    );
  };

  const successCount = results?.filter(r => r.success).length || 0;
  const failCount = results?.filter(r => !r.success).length || 0;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5 text-primary" />
            Bulk Tender Upload
          </CardTitle>
          <CardDescription>
            Upload a ZIP file containing multiple tender PDFs for batch AI extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50',
              uploading && 'pointer-events-none opacity-50'
            )}
          >
            <input
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
              id="zip-upload"
              disabled={uploading}
            />
            <label htmlFor="zip-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">Drop ZIP file here or click to browse</p>
                <p className="text-sm text-muted-foreground">
                  Supports ZIP files up to 100MB containing PDF, PNG, or JPG files
                </p>
              </div>
            </label>
          </div>

          {/* Selected File */}
          {file && !uploading && !results && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileArchive className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button onClick={handleUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Process Files
              </Button>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing...</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                Extracting tender data from documents...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Extraction Results</span>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {successCount} Successful
                </Badge>
                {failCount > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    {failCount} Failed
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Closing Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {result.fileName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.success ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {getConfidenceBadge(result.confidence)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-500">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">{result.error}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{result.data?.reference || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">
                          {result.data?.organization || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.data?.closingDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {result.data.closingDate}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{result.data?.items?.length || 0} items</TableCell>
                    <TableCell className="text-right">
                      {result.success && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTender(result)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCreateTender(result)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            Create
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedTender} onOpenChange={() => setSelectedTender(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedTender?.fileName}
            </DialogTitle>
            <DialogDescription>
              Extracted tender data with {selectedTender?.data?.items?.length || 0} items
            </DialogDescription>
          </DialogHeader>

          {selectedTender?.data && (
            <div className="space-y-4">
              <hr className="my-4" />

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reference</p>
                  <p className="font-medium">{selectedTender.data.reference || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organization</p>
                  <p className="font-medium">{selectedTender.data.organization || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Closing Date</p>
                  <p className="font-medium">{selectedTender.data.closingDate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Confidence</p>
                  {getConfidenceBadge(selectedTender.confidence)}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p>{selectedTender.data.title || 'N/A'}</p>
              </div>

              <hr className="my-4" />

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Items ({selectedTender.data.items?.length || 0})
                </p>
                {selectedTender.data.items && selectedTender.data.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTender.data.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.itemDescription}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No items extracted</p>
                )}
              </div>

              {selectedTender.data.notes && (
                <>
                  <hr className="my-4" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedTender.data.notes}</p>
                  </div>
                </>
              )}

              <hr className="my-4" />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTender(null)}>
                  Close
                </Button>
                <Button onClick={() => handleCreateTender(selectedTender)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Tender
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
