import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Edit, Save, Trash2, Plus, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import MultiFileUpload from "@/components/MultiFileUpload";
import * as XLSX from "xlsx";

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
    confidence?: {
      overall: number;
      reference: number;
      title: number;
      organization: number;
      closingDate: number;
      items: number;
    };
  };
  error?: string;
}

export default function BulkTenderReview() {
  const [, setLocation] = useLocation();
  const [extractedTenders, setExtractedTenders] = useState<ExtractedTender[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchEditField, setBatchEditField] = useState<string>("");
  const [batchEditValue, setBatchEditValue] = useState<string>("");

  const createTenderMutation = trpc.tenders.create.useMutation();
  const extractTenderMutation = trpc.documents.extractTender.useMutation();
  const [reExtracting, setReExtracting] = useState<number | null>(null);

  const handleReExtract = async (index: number, documentId: number) => {
    setReExtracting(index);
    try {
      const result = await extractTenderMutation.mutateAsync({ documentId });
      setExtractedTenders(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          success: true,
          data: result,
        };
        return updated;
      });
      toast.success("Re-extraction completed");
    } catch (error: any) {
      toast.error("Re-extraction failed: " + (error.message || "Unknown error"));
    } finally {
      setReExtracting(null);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const handleComplete = (results: ExtractedTender[]) => {
    // Show all results (both successful and failed) so users can see errors and re-extract
    setExtractedTenders(results);
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (failCount > 0) {
      toast.warning(`${successCount} extracted successfully, ${failCount} failed. Use re-extract button to retry.`);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveDraft = () => {
    const draftData = {
      extractedTenders,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem('tender_extraction_draft', JSON.stringify(draftData));
    toast.success("Draft saved successfully");
  };

  const handleLoadDraft = () => {
    const savedDraft = localStorage.getItem('tender_extraction_draft');
    
    if (!savedDraft) {
      toast.error("No saved draft found");
      return;
    }

    try {
      const draftData = JSON.parse(savedDraft);
      setExtractedTenders(draftData.extractedTenders);
      toast.success(`Draft loaded (saved ${new Date(draftData.timestamp).toLocaleString()})`);
    } catch (error) {
      toast.error("Failed to load draft");
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('tender_extraction_draft');
    toast.success("Draft cleared");
  };

  const handleExportToExcel = () => {
    const successfulTenders = extractedTenders.filter(t => t.success && t.data);
    
    if (successfulTenders.length === 0) {
      toast.error("No successful extractions to export");
      return;
    }

    // Prepare data for Excel
    const excelData = successfulTenders.map((tender, index) => ({
      "#": index + 1,
      "File Name": tender.fileName,
      "Reference": tender.data?.reference || "",
      "Title": tender.data?.title || "",
      "Organization": tender.data?.organization || "",
      "Closing Date": tender.data?.closingDate || "",
      "Items Count": tender.data?.items.length || 0,
      "Notes": tender.data?.notes || "",
      "Confidence": tender.data?.confidence?.overall ? `${tender.data.confidence.overall}%` : "N/A",
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 5 },  // #
      { wch: 25 }, // File Name
      { wch: 15 }, // Reference
      { wch: 40 }, // Title
      { wch: 30 }, // Organization
      { wch: 12 }, // Closing Date
      { wch: 12 }, // Items Count
      { wch: 40 }, // Notes
      { wch: 12 }, // Confidence
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extracted Tenders");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `extracted_tenders_${timestamp}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${successfulTenders.length} tenders to Excel`);
  };

  const handleApplyBatchEdit = () => {
    if (!batchEditField || !batchEditValue) {
      toast.error("Please select a field and enter a value");
      return;
    }

    setExtractedTenders(prev => prev.map(tender => {
      if (!tender.success || !tender.data) return tender;
      
      return {
        ...tender,
        data: {
          ...tender.data,
          [batchEditField]: batchEditValue,
        },
      };
    }));

    toast.success(`Applied ${batchEditField} to all tenders`);
    setBatchEditMode(false);
    setBatchEditField("");
    setBatchEditValue("");
  };

  const handleSave = () => {
    setEditingIndex(null);
    toast.success("Changes saved");
  };

  const handleRemove = (index: number) => {
    setExtractedTenders(prev => prev.filter((_, i) => i !== index));
    toast.success("Tender removed from batch");
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    setExtractedTenders(prev => {
      const updated = [...prev];
      if (updated[index]?.data) {
        (updated[index].data as any)[field] = value;
      }
      return updated;
    });
  };

  const handleItemChange = (tenderIndex: number, itemIndex: number, field: string, value: any) => {
    setExtractedTenders(prev => {
      const updated = [...prev];
      if (updated[tenderIndex]?.data?.items[itemIndex]) {
        (updated[tenderIndex].data!.items[itemIndex] as any)[field] = value;
      }
      return updated;
    });
  };

  const handleAddItem = (tenderIndex: number) => {
    setExtractedTenders(prev => {
      const updated = [...prev];
      if (updated[tenderIndex]?.data) {
        updated[tenderIndex].data!.items.push({
          itemDescription: "",
          quantity: 1,
          unit: "pcs",
        });
      }
      return updated;
    });
  };

  const handleRemoveItem = (tenderIndex: number, itemIndex: number) => {
    setExtractedTenders(prev => {
      const updated = [...prev];
      if (updated[tenderIndex]?.data) {
        updated[tenderIndex].data!.items = updated[tenderIndex].data!.items.filter((_, i) => i !== itemIndex);
      }
      return updated;
    });
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const tender of extractedTenders) {
      if (!tender.data) continue;

      try {
        await createTenderMutation.mutateAsync({
          reference: tender.data.reference,
          title: tender.data.title,
          organization: tender.data.organization,
          closingDate: tender.data.closingDate ? new Date(tender.data.closingDate) : new Date(),
          status: "open",
          items: tender.data.items.map(item => ({
            itemDescription: item.itemDescription,
            quantity: item.quantity,
            unit: item.unit,
          })),
          notes: tender.data.notes,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to create tender ${tender.data.reference}:`, error);
        failCount++;
      }
    }

    setSubmitting(false);
    
    if (failCount === 0) {
      toast.success(`Successfully created ${successCount} tenders`);
      setLocation("/tenders");
    } else {
      toast.error(`Created ${successCount} tenders, ${failCount} failed`);
    }
  };

  if (extractedTenders.length === 0) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bulk Tender Upload</h1>
            <p className="text-muted-foreground mt-1">
              Upload multiple tender documents at once for batch processing
            </p>
          </div>
          {localStorage.getItem('tender_extraction_draft') && (
            <Button
              variant="outline"
              onClick={handleLoadDraft}
            >
              Load Saved Draft
            </Button>
          )}
        </div>
        <MultiFileUpload onComplete={handleComplete} />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Extracted Tenders</h1>
          <p className="text-muted-foreground mt-1">
            Review and edit extracted data before creating tenders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={extractedTenders.length === 0}
          >
            Save Draft
          </Button>
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={extractedTenders.filter(t => t.success).length === 0}
          >
            Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setExtractedTenders([]);
              handleClearDraft();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAll}
            disabled={submitting || extractedTenders.length === 0}
          >
            {submitting ? "Creating..." : `Create ${extractedTenders.length} Tenders`}
          </Button>
        </div>
      </div>

      {/* Batch Edit Mode */}
      {!batchEditMode && extractedTenders.some(t => t.success) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Batch Edit</CardTitle>
            <CardDescription>
              Apply the same value to a field across all successfully extracted tenders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setBatchEditMode(true)}
            >
              Enable Batch Edit Mode
            </Button>
          </CardContent>
        </Card>
      )}

      {batchEditMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Batch Edit Mode</CardTitle>
            <CardDescription>
              Select a field and enter a value to apply to all tenders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field to Edit</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={batchEditField}
                  onChange={(e) => setBatchEditField(e.target.value)}
                >
                  <option value="">Select field...</option>
                  <option value="organization">Organization</option>
                  <option value="closingDate">Closing Date</option>
                  <option value="notes">Notes</option>
                </select>
              </div>
              <div>
                <Label>Value</Label>
                {batchEditField === "closingDate" ? (
                  <Input
                    type="date"
                    value={batchEditValue}
                    onChange={(e) => setBatchEditValue(e.target.value)}
                  />
                ) : (
                  <Input
                    value={batchEditValue}
                    onChange={(e) => setBatchEditValue(e.target.value)}
                    placeholder="Enter value to apply to all"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyBatchEdit}>
                Apply to All Tenders
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBatchEditMode(false);
                  setBatchEditField("");
                  setBatchEditValue("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {extractedTenders.map((tender, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {tender.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{tender.fileName}</CardTitle>
                      {tender.success && tender.data?.confidence && (
                        <Badge variant={getConfidenceBadge(tender.data.confidence.overall)}>
                          {tender.data.confidence.overall}% confidence
                        </Badge>
                      )}
                      {!tender.success && (
                        <Badge variant="destructive">Extraction Failed</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {tender.success ? (tender.data?.reference || "No reference") : (tender.error || "Unknown error")}
                    </CardDescription>
                    {tender.data?.confidence && tender.data.confidence.overall < 70 && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-yellow-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Low confidence - please review carefully</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReExtract(index, tender.documentId)}
                    disabled={reExtracting === index}
                  >
                    {reExtracting === index ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Re-extract
                  </Button>
                  {editingIndex === index ? (
                    <Button size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(index)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            {tender.success && tender.data && (
              <CardContent className="space-y-4">
              {editingIndex === index ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reference</Label>
                      <Input
                        value={tender.data?.reference || ""}
                        onChange={(e) => handleFieldChange(index, "reference", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Organization</Label>
                      <Input
                        value={tender.data?.organization || ""}
                        onChange={(e) => handleFieldChange(index, "organization", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={tender.data?.title || ""}
                        onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Closing Date</Label>
                      <Input
                        type="date"
                        value={tender.data?.closingDate || ""}
                        onChange={(e) => handleFieldChange(index, "closingDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Items</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddItem(index)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {tender.data?.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2 items-start">
                          <Input
                            placeholder="Item description"
                            value={item.itemDescription}
                            onChange={(e) => handleItemChange(index, itemIndex, "itemDescription", e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, itemIndex, "quantity", parseInt(e.target.value))}
                            className="w-24"
                          />
                          <Input
                            placeholder="Unit"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, itemIndex, "unit", e.target.value)}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(index, itemIndex)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={tender.data?.notes || ""}
                      onChange={(e) => handleFieldChange(index, "notes", e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Organization</p>
                      <p className="font-medium">{tender.data?.organization || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Closing Date</p>
                      <p className="font-medium">{tender.data?.closingDate || "N/A"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Items ({tender.data?.items.length || 0})</p>
                    <div className="space-y-1">
                      {tender.data?.items.slice(0, 3).map((item, itemIndex) => (
                        <div key={itemIndex} className="text-sm flex justify-between">
                          <span className="truncate">{item.itemDescription}</span>
                          <Badge variant="secondary">{item.quantity} {item.unit}</Badge>
                        </div>
                      ))}
                      {(tender.data?.items.length || 0) > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{(tender.data?.items.length || 0) - 3} more items
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
