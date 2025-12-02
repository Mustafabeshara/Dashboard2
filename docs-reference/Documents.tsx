import { useState } from "react";
import { FileText, Download, Eye, Loader2, Sparkles } from "lucide-react";
import { DeleteButton } from "@/components/DeleteButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DocumentUpload from "@/components/DocumentUpload";
import { exportToCSV } from "@/lib/exportUtils";

export default function Documents() {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [extracting, setExtracting] = useState<number | null>(null);

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery(
    selectedType !== "all" ? { documentType: selectedType } : undefined
  );

  const extractMutation = trpc.documents.extractData.useMutation();
  
  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });

  const handleExtractData = async (documentId: number, documentType: string) => {
    if (!["po", "invoice", "delivery_note", "tender"].includes(documentType)) {
      toast.error("This document type does not support automatic extraction");
      return;
    }

    setExtracting(documentId);
    try {
      const result = await extractMutation.mutateAsync({
        documentId,
        documentType: documentType as "po" | "invoice" | "delivery_note" | "tender",
      });

      toast.success("Data extracted successfully");
      refetch();
      
      // Show extracted data
      const doc = documents?.find(d => d.id === documentId);
      if (doc) {
        setSelectedDocument({ ...doc, extractedData: result.extractedData });
      }
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Failed to extract data from document");
    } finally {
      setExtracting(null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getDocumentTypeBadge = (type: string | null) => {
    if (!type) return <Badge variant="secondary">Other</Badge>;
    
    const colors: Record<string, string> = {
      po: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      invoice: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      delivery_note: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
      tender: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20",
      expense_receipt: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
      other: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
    };

    return (
      <Badge variant="secondary" className={colors[type] || colors.other}>
        {type.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const handleExportCSV = () => {
    const exportData = (documents || []).map((doc: any) => ({
      'Filename': doc.filename || '',
      'Document Type': doc.documentType?.replace('_', ' ').toUpperCase() || 'OTHER',
      'File Size': formatFileSize(doc.fileSize),
      'Upload Date': formatDate(doc.uploadedAt),
      'Extraction Status': doc.extractionStatus || 'Not Extracted',
      'Description': doc.description || ''
    }));
    exportToCSV(exportData, 'documents');
    toast.success('Documents exported to CSV');
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Management</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage business documents with AI-powered data extraction
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <FileText className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
        </div>
      </div>

      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Documents</CardTitle>
            <CardDescription>
              Upload POs, invoices, delivery notes, or other business documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUpload
              onUploadComplete={() => {
                refetch();
                toast.success("Document uploaded successfully");
              }}
              autoExtract={false}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="po">Purchase Orders</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="delivery_note">Delivery Notes</SelectItem>
            <SelectItem value="tender">Tenders</SelectItem>
            <SelectItem value="expense_receipt">Expense Receipts</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  {getDocumentTypeBadge(doc.documentType)}
                </div>
                <CardTitle className="text-base line-clamp-1">{doc.fileName}</CardTitle>
                <CardDescription className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Size: {formatFileSize(doc.fileSize)}</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {doc.isProcessed ? (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    Data Extracted
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                    Not Processed
                  </Badge>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  
                  {!doc.isProcessed && doc.documentType && ["po", "invoice", "delivery_note", "tender"].includes(doc.documentType) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleExtractData(doc.id, doc.documentType!)}
                      disabled={extracting === doc.id}
                    >
                      {extracting === doc.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      Extract
                    </Button>
                  )}
                  
                  {doc.isProcessed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      View Data
                    </Button>
                  )}
                  
                  <DeleteButton
                    itemName={`document "${doc.fileName}"`}
                    onDelete={() => deleteMutation.mutate({ id: doc.id })}
                    isDeleting={deleteMutation.isPending}
                    size="sm"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No documents found</h3>
              <p className="text-sm text-muted-foreground">
                Upload your first document to get started
              </p>
            </div>
            <Button onClick={() => setShowUpload(true)}>
              Upload Document
            </Button>
          </div>
        </Card>
      )}

      {/* Extracted Data Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.fileName}</DialogTitle>
            <DialogDescription>
              Extracted data from document
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument?.extractedData && (
            <div className="space-y-4">
              <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(JSON.parse(selectedDocument.extractedData), null, 2)}
              </pre>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Original
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDocument.extractedData);
                    toast.success("Copied to clipboard");
                  }}
                >
                  Copy JSON
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
