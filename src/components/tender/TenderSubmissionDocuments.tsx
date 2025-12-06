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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  File,
  FileCheck,
  FilePlus,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SubmissionDocument {
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

interface TenderSubmissionDocumentsProps {
  tenderId: string;
  tenderNumber: string;
  tenderStatus: string;
  isReadOnly?: boolean;
}

// Submission document type labels
const SUBMISSION_TYPES = {
  SUBMISSION_TECHNICAL: {
    label: 'Technical Proposal',
    description: 'Technical specifications and compliance documents',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  SUBMISSION_COMMERCIAL: {
    label: 'Commercial Proposal',
    description: 'Pricing and payment terms',
    icon: FileCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  SUBMISSION_SAMPLES: {
    label: 'Sample Documentation',
    description: 'Sample certificates and test reports',
    icon: File,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  SUBMISSION_CERTIFICATE: {
    label: 'Certificates',
    description: 'Company certificates, licenses, registrations',
    icon: FileCheck,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  SUBMISSION_FEES: {
    label: 'Tender Fees',
    description: 'Proof of tender fee payment',
    icon: FileText,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  SUBMISSION_BOND: {
    label: 'Bid Bond',
    description: 'Bank guarantee or bid bond documents',
    icon: FileCheck,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  SUBMISSION_OTHER: {
    label: 'Other Documents',
    description: 'Additional supporting documents',
    icon: File,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};

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

export function TenderSubmissionDocuments({
  tenderId,
  tenderNumber,
  tenderStatus,
  isReadOnly = false,
}: TenderSubmissionDocumentsProps) {
  const [documents, setDocuments] = useState<SubmissionDocument[]>([]);
  const [groupedDocuments, setGroupedDocuments] = useState<Record<string, SubmissionDocument[]>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<string>('SUBMISSION_TECHNICAL');
  const [description, setDescription] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}/submissions`);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.documents || []);
      setGroupedDocuments(data.groupedDocuments || {});
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
      formData.append('type', selectedType);
      formData.append('moduleType', 'TENDER');
      formData.append('moduleId', tenderId);
      formData.append('description', description);
      formData.append('tags', `tender,${tenderNumber},submission`);

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
      const response = await fetch(`/api/tenders/${tenderId}/submissions?documentId=${documentId}`, {
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

  const canEdit = !isReadOnly && !['WON', 'LOST', 'CANCELLED'].includes(tenderStatus);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading submission documents...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Submission Documents
          </CardTitle>
          <CardDescription>
            Documents prepared for tender submission ({documents.length} files)
          </CardDescription>
        </div>

        {canEdit && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Submission Document</DialogTitle>
                <DialogDescription>
                  Add a document to your tender submission package
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUBMISSION_TYPES).map(([type, info]) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <info.icon className={`h-4 w-4 ${info.color}`} />
                            {info.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {SUBMISSION_TYPES[selectedType as keyof typeof SUBMISSION_TYPES]?.description}
                  </p>
                </div>

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
                    onChange={(e) => setDescription(e.target.value)}
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
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                  >
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
            <FilePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No submission documents yet</p>
            <p className="text-sm">Upload documents to prepare your tender submission</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(SUBMISSION_TYPES).map(([type, info]) => {
              const typeDocuments = groupedDocuments[type] || [];
              if (typeDocuments.length === 0) return null;

              const Icon = info.icon;

              return (
                <div key={type} className={`rounded-lg border ${info.bgColor} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`h-5 w-5 ${info.color}`} />
                    <h4 className="font-medium">{info.label}</h4>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full">
                      {typeDocuments.length} file{typeDocuments.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {typeDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <File className="h-8 w-8 text-gray-400 flex-shrink-0" />
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
                          {doc.status === 'PROCESSED' && (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          )}

                          {doc.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Open document in new tab">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}

                          {doc.url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a href={doc.url} download={doc.originalName} title="Download document">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}

                          {canEdit && (
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
                </div>
              );
            })}
          </div>
        )}

        {/* Document type legend for empty categories */}
        {documents.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Missing document types:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUBMISSION_TYPES).map(([type, info]) => {
                const hasDocuments = (groupedDocuments[type] || []).length > 0;
                if (hasDocuments) return null;

                const Icon = info.icon;
                return (
                  <div
                    key={type}
                    className="flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded"
                  >
                    <Icon className="h-3 w-3" />
                    {info.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
