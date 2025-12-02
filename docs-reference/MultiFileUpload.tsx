import { useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExtractedTender {
  fileName: string;
  documentId: number;
  success: boolean;
  data?: {
    reference: string;
    title: string;
    organization: string;
    closingDate: string;
    items: Array<{
      itemDescription: string;
      quantity: number;
      unit: string;
    }>;
    notes: string;
  };
  error?: string;
}

interface MultiFileUploadProps {
  onComplete: (results: ExtractedTender[]) => void;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export default function MultiFileUpload({ onComplete }: MultiFileUploadProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const multiFileUploadMutation = trpc.documents.multiFileUpload.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length === 0) return;
    
    if (selectedFiles.length > 10) {
      toast.error("Maximum 10 files allowed per upload");
      return;
    }

    // Validate file types
    const invalidFiles = selectedFiles.filter(f => 
      !f.type.includes('pdf') && 
      !f.type.includes('image')
    );

    if (invalidFiles.length > 0) {
      toast.error("Only PDF and image files are supported");
      return;
    }

    // Check file sizes (10MB per file)
    const oversizedFiles = selectedFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Each file must be under 10MB");
      return;
    }

    setFiles(selectedFiles.map(file => ({
      file,
      progress: 0,
      status: "pending" as const,
    })));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) return;
    
    if (droppedFiles.length > 10) {
      toast.error("Maximum 10 files allowed per upload");
      return;
    }

    // Validate file types
    const invalidFiles = droppedFiles.filter(f => 
      !f.type.includes('pdf') && 
      !f.type.includes('image')
    );

    if (invalidFiles.length > 0) {
      toast.error("Only PDF and image files are supported");
      return;
    }

    // Check file sizes (10MB per file)
    const oversizedFiles = droppedFiles.filter(f => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error("Each file must be under 10MB");
      return;
    }

    setFiles(droppedFiles.map(file => ({
      file,
      progress: 0,
      status: "pending" as const,
    })));
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);

    // Set all files to uploading status
    setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const, progress: 10 })));

    try {
      // Read all files as base64
      const filePromises = files.map(async ({ file }) => {
        return new Promise<{ fileName: string; fileData: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            const base64Data = base64.split(',')[1];
            resolve({
              fileName: file.name,
              fileData: base64Data,
              mimeType: file.type,
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(filePromises);
      
      // Update progress after reading files
      setFiles(prev => prev.map(f => ({ ...f, progress: 30 })));

      // Upload all files
      const result = await multiFileUploadMutation.mutateAsync({
        files: filesData,
      });

      toast.success(
        `Processed ${result.totalFiles} files: ${result.successful} successful, ${result.failed} failed`
      );

      // Update file statuses
      setFiles(prev => prev.map((f, i) => ({
        ...f,
        status: result.results[i]?.success ? "success" : "error",
        error: result.results[i]?.error,
        progress: 100,
      })));

      // Call onComplete with successful results
      onComplete(result.results.filter(r => r.success) as ExtractedTender[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload files");
      setFiles(prev => prev.map(f => ({
        ...f,
        status: "error" as const,
        error: "Upload failed",
      })));
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Multiple Tenders
        </CardTitle>
        <CardDescription>
          Select up to 10 PDF or image files to upload and process at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input with Drag and Drop */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
        >
          <input
            type="file"
            id="multi-file-input"
            multiple
            accept=".pdf,image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="multi-file-input" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2 py-8 px-4">
              <Upload className={`w-8 h-8 ${
                dragActive ? "text-primary" : "text-muted-foreground"
              }`} />
              <div className="text-center">
                <span className="text-sm font-medium">
                  {dragActive ? "Drop files here" : "Drag and drop files here"}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse (max 10 files, up to 10MB each)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: PDF, PNG, JPG, JPEG
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Selected Files ({files.length}/10)</h4>
              {!uploading && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles([])}
                >
                  Clear All
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((fileItem, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <div className="flex-shrink-0">
                    {fileItem.status === "pending" && <FileText className="w-5 h-5 text-muted-foreground" />}
                    {fileItem.status === "uploading" && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
                    {fileItem.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {fileItem.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    {fileItem.status === "uploading" && (
                      <div className="mt-2">
                        <Progress value={fileItem.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {fileItem.progress < 30 ? "Reading file..." : "Extracting data..."}
                        </p>
                      </div>
                    )}
                    {fileItem.error && (
                      <p className="text-xs text-red-500 mt-1">{fileItem.error}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {fileItem.status === "pending" && !uploading && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    {fileItem.status === "success" && (
                      <Badge variant="default">Extracted</Badge>
                    )}
                    {fileItem.status === "error" && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && files.some(f => f.status === "pending") && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing {files.length} files...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload and Extract {files.length} {files.length === 1 ? "File" : "Files"}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
