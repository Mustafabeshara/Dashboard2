import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TenderDocumentUploadProps {
  onSuccess?: () => void;
}

interface ExtractedTenderData {
  reference: string;
  title?: string;
  organization?: string;
  closingDate?: string;
  items: Array<{
    itemDescription: string;
    quantity: number;
    unit: string;
  }>;
  notes?: string;
}

export default function TenderDocumentUpload({ onSuccess }: TenderDocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedTenderData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const uploadMutation = trpc.documents.upload.useMutation();
  const extractMutation = trpc.documents.extractTender.useMutation();
  const createTenderMutation = trpc.tenders.create.useMutation();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (selectedFile: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload a PDF or image file (JPG, PNG)");
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    await extractTenderData(selectedFile);
  };

  const extractTenderData = async (fileToExtract: File) => {
    setIsExtracting(true);
    setExtractedData(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileToExtract);
      });

      // Upload file first
      const uploadResult = await uploadMutation.mutateAsync({
        fileName: fileToExtract.name,
        fileData: base64,
        mimeType: fileToExtract.type as "application/pdf" | "image/png" | "image/jpeg" | "image/jpg",
        documentType: "tender",
      });

      // Extract tender data
      const extracted = await extractMutation.mutateAsync({
        documentId: uploadResult.documentId,
      });

      setExtractedData(extracted);
      toast.success("Tender data extracted successfully!");
    } catch (error) {
      console.error("Extraction error:", error);
      toast.error("Failed to extract tender data. Please try again or enter manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateTender = async () => {
    if (!extractedData) return;

    setIsCreating(true);
    try {
      await createTenderMutation.mutateAsync({
        reference: extractedData.reference,
        title: extractedData.title,
        organization: extractedData.organization,
        closingDate: extractedData.closingDate ? new Date(extractedData.closingDate) : undefined,
        status: "open",
        notes: extractedData.notes,
        items: extractedData.items,
      });

      toast.success("Tender created successfully!");
      setFile(null);
      setExtractedData(null);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Create tender error:", error);
      toast.error("Failed to create tender");
    } finally {
      setIsCreating(false);
    }
  };

  const updateExtractedData = (field: keyof ExtractedTenderData, value: any) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
  };

  const updateItem = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    const newItems = [...extractedData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setExtractedData({ ...extractedData, items: newItems });
  };

  const removeItem = (index: number) => {
    if (!extractedData) return;
    const newItems = extractedData.items.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, items: newItems });
  };

  const addItem = () => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      items: [...extractedData.items, { itemDescription: "", quantity: 1, unit: "pcs" }],
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!file && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Tender Document</CardTitle>
            <CardDescription>
              Upload a tender PDF or image to automatically extract tender information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Drop your tender document here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports PDF, JPG, PNG (max 10MB)
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extraction Progress */}
      {file && isExtracting && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <div>
                <p className="font-medium">Extracting tender data...</p>
                <p className="text-sm text-muted-foreground">
                  Analyzing {file.name}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data Review */}
      {extractedData && !isExtracting && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <CardTitle>Extracted Tender Data</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Review and edit the extracted information before creating the tender
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tender Reference *</Label>
                  <Input
                    value={extractedData.reference}
                    onChange={(e) => updateExtractedData("reference", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Organization/Hospital</Label>
                  <Input
                    value={extractedData.organization || ""}
                    onChange={(e) => updateExtractedData("organization", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={extractedData.title || ""}
                  onChange={(e) => updateExtractedData("title", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Closing Date</Label>
                <Input
                  type="date"
                  value={extractedData.closingDate || ""}
                  onChange={(e) => updateExtractedData("closingDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={extractedData.notes || ""}
                  onChange={(e) => updateExtractedData("notes", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Tender Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    Add Item
                  </Button>
                </div>

                {extractedData.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm">Description</Label>
                          <Input
                            value={item.itemDescription}
                            onChange={(e) =>
                              updateItem(index, "itemDescription", e.target.value)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="mt-7"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", parseInt(e.target.value) || 1)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Unit</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(index, "unit", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateTender} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Tender"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
