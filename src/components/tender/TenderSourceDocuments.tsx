'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  File,
  FileImage,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SourceDocument {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  status: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface TenderSourceDocumentsProps {
  tenderId: string;
  tenderNumber: string;
  isReadOnly?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (mimeType.startsWith('image/')) {
    return <FileImage className="h-8 w-8 text-blue-500" />;
  }
  return <File className="h-8 w-8 text-gray-400" />;
}

export function TenderSourceDocuments({
  tenderId,
  tenderNumber,
  isReadOnly = false,
}: TenderSourceDocumentsProps) {
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}/documents`);
      if (!response.ok) {
        if (response.status === 404) {
          // No documents endpoint or tender not found
          setDocuments([]);
          return;
        }
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', 'TENDER_DOCUMENT');
      formData.append('moduleType', 'TENDER');
      formData.append('moduleId', tenderId);
      formData.append('description', description);
      formData.append('tags', `tender,${tenderNumber},source`);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      // Reset form and close dialog
      setSelectedFile(null);
      setDescription('');
      setUploadDialogOpen(false);

      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeleting(documentId);
    try {
      const response = await fetch(`/api/tenders/${tenderId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = (url: string, mimeType: string) => {
    setPreviewUrl(url);
    setPreviewType(mimeType);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading source documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Source Documents
            </CardTitle>
            <CardDescription>
              Original tender documents ({documents.length} files)
            </CardDescription>
          </div>

          {!isReadOnly && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Source Document</DialogTitle>
                  <DialogDescription>
                    Add original tender documentation (PDF, images)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief description of the document"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setUploadDialogOpen(false)}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No source documents</p>
              <p className="text-sm">Upload the original tender documents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getFileIcon(doc.mimeType)}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(doc.createdAt)}
                        </span>
                        {doc.uploadedBy && (
                          <>
                            <span>•</span>
                            <span>by {doc.uploadedBy.fullName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Preview button for PDFs and images */}
                    {(doc.mimeType === 'application/pdf' || doc.mimeType.startsWith('image/')) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreview(doc.url, doc.mimeType)}
                        title="Preview document"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {doc.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {doc.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.url} download={doc.originalName} title="Download">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {!isReadOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewType === 'application/pdf' ? (
              <iframe
                src={previewUrl || ''}
                className="w-full h-[70vh] border rounded"
                title="PDF Preview"
              />
            ) : previewType.startsWith('image/') ? (
              <img
                src={previewUrl || ''}
                alt="Document Preview"
                className="max-w-full h-auto mx-auto rounded"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Preview not available for this file type
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
