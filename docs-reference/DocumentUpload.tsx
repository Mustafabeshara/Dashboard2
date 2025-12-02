import { useState, useCallback } from "react";
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DocumentUploadProps {
  documentType?: "po" | "invoice" | "delivery_note" | "tender" | "expense_receipt" | "other";
  onUploadComplete?: (documentId: number) => void;
  autoExtract?: boolean;
}

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  documentId?: number;
  error?: string;
}

export default function DocumentUpload({ 
  documentType = "other", 
  onUploadComplete,
  autoExtract = false 
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = trpc.documents.upload.useMutation();
  const extractMutation = trpc.documents.extractData.useMutation();

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
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = async (newFiles: File[]) => {
    // Validate file types
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const validFiles = newFiles.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }
      if (file.size > 16 * 1024 * 1024) { // 16MB limit
        toast.error(`${file.name} exceeds 16MB size limit`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Add files to state
    const uploadedFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      await uploadFile(validFiles[i], files.length + i);
    }
  };

  const uploadFile = async (file: File, index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], status: "uploading", progress: 50 };
      return newFiles;
    });

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // Upload to server
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileData: base64,
        mimeType: file.type as "application/pdf" | "image/png" | "image/jpeg" | "image/jpg",
        documentType,
      });

      const documentId = Number((result as any).insertId);

      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = { 
          ...newFiles[index], 
          status: "success", 
          progress: 100,
          documentId,
        };
        return newFiles;
      });

      toast.success(`${file.name} uploaded successfully`);
      
      if (onUploadComplete) {
        onUploadComplete(documentId);
      }

      // Auto-extract if enabled and document type is extractable
      if (autoExtract && ["po", "invoice", "delivery_note", "tender"].includes(documentType)) {
        await extractData(documentId, index);
      }

    } catch (error) {
      console.error("Upload error:", error);
      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = { 
          ...newFiles[index], 
          status: "error", 
          progress: 0,
          error: error instanceof Error ? error.message : "Upload failed",
        };
        return newFiles;
      });
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const extractData = async (documentId: number, index: number) => {
    try {
      toast.info("Extracting data from document...");
      
      await extractMutation.mutateAsync({
        documentId,
        documentType: documentType as "po" | "invoice" | "delivery_note" | "tender",
      });

      toast.success("Data extracted successfully");
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Failed to extract data from document");
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
        `}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        
        <h3 className="text-lg font-semibold mb-2">
          Drop files here or click to browse
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4">
          Supports PDF, Images (JPG, PNG), Excel, and Word documents (max 16MB)
        </p>
        
        <Button
          onClick={() => document.getElementById("file-upload")?.click()}
          variant="outline"
        >
          Select Files
        </Button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Uploaded Files</h4>
          {files.map((uploadedFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center gap-3">
                <File className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{uploadedFile.file.name}</p>
                    {uploadedFile.status === "success" && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                    {uploadedFile.status === "error" && (
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )}
                    {uploadedFile.status === "uploading" && (
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(uploadedFile.file.size)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {uploadedFile.status}
                    </Badge>
                  </div>
                  
                  {uploadedFile.error && (
                    <p className="text-sm text-red-500 mt-1">{uploadedFile.error}</p>
                  )}
                  
                  {uploadedFile.status === "uploading" && (
                    <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploadedFile.status === "uploading"}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
