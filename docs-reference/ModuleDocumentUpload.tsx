import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ModuleDocumentUploadProps {
  moduleType: "po" | "invoice" | "delivery_note" | "tender" | "expense_receipt" | "other";
  recordId: number;
  onUploadComplete?: () => void;
}

export function ModuleDocumentUpload({ moduleType, recordId, onUploadComplete }: ModuleDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      setSelectedFile(null);
      setUploading(false);
      onUploadComplete?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload document");
      setUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1]; // Remove data:mime;base64, prefix

        await uploadMutation.mutateAsync({
          fileName: selectedFile.name,
          mimeType: selectedFile.type as any,
          fileData: base64Data,
          documentType: moduleType,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          id={`file-upload-${moduleType}-${recordId}`}
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />
        <label htmlFor={`file-upload-${moduleType}-${recordId}`}>
          <Button variant="outline" size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-2" />
              Select File
            </span>
          </Button>
        </label>

        {selectedFile && (
          <Card className="flex-1">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DocumentList moduleType={moduleType} recordId={recordId} />
    </div>
  );
}

interface DocumentListProps {
  moduleType: string;
  recordId: number;
}

function DocumentList({ moduleType, recordId }: DocumentListProps) {
  const { data: documents, refetch } = trpc.documents.list.useQuery({
    documentType: moduleType,
  });

  // Note: Delete functionality would need to be added to documents router
  // For now, we'll just display the documents

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Uploaded Documents</h4>
      <div className="space-y-2">
        {documents.map((doc: any) => (
          <Card key={doc.id}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4 text-muted-foreground" />
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  {doc.fileName}
                </a>
                <span className="text-xs text-muted-foreground">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              {/* Delete functionality to be added */}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
