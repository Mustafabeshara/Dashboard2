import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TenderFormProps {
  onSuccess?: () => void;
  tenderId?: number;
}

interface TenderItem {
  productId?: number;
  itemDescription: string;
  quantity: number;
  unit: string;
}

export default function TenderForm({ onSuccess, tenderId }: TenderFormProps) {
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [status, setStatus] = useState<"open" | "closed" | "awarded" | "lost">("open");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TenderItem[]>([
    { itemDescription: "", quantity: 1, unit: "pcs" },
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const createMutation = trpc.tenders.create.useMutation();
  const updateMutation = trpc.tenders.update.useMutation();
  const { data: products } = trpc.products.list.useQuery();
  // const { data: templates } = trpc.tenderTemplates.list.useQuery(); // TODO: Re-enable when templates feature is implemented
  const templates: any[] | undefined = undefined;
  const { data: existingTender } = trpc.tenders.getById.useQuery(
    { id: tenderId! },
    { enabled: !!tenderId }
  );

  // Load template data when selected
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId || !templates) return;
    
    const template = (templates as any)?.find((t: any) => t.id === parseInt(templateId));
    if (!template) return;

    setOrganization(template.organization || "");
    setNotes(template.notes || "");
    if (template.items && template.items.length > 0) {
      setItems(template.items.map((item: any) => ({
        productId: item.productId || undefined,
        itemDescription: item.itemDescription,
        quantity: item.quantity,
        unit: item.unit || "pcs",
      })));
    }
    toast.success("Template loaded successfully");
  };

  // Load existing tender data when editing
  useEffect(() => {
    if (existingTender) {
      setReference(existingTender.reference || "");
      setTitle(existingTender.title || "");
      setOrganization(existingTender.organization || "");
      setClosingDate(existingTender.closingDate ? new Date(existingTender.closingDate).toISOString().split('T')[0] : "");
      setStatus(existingTender.status as any || "open");
      setNotes(existingTender.notes || "");
      if (existingTender.items && existingTender.items.length > 0) {
        setItems(existingTender.items.map((item: any) => ({
          productId: item.productId || undefined,
          itemDescription: item.itemDescription,
          quantity: item.quantity,
          unit: item.unit || "pcs",
        })));
      }
    }
  }, [existingTender]);

  const addItem = () => {
    setItems([...items, { itemDescription: "", quantity: 1, unit: "pcs" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TenderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reference.trim()) {
      toast.error("Tender reference is required");
      return;
    }

    const validItems = items.filter(item => item.itemDescription.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("At least one item is required");
      return;
    }

    try {
      if (tenderId) {
        // Update existing tender
        await updateMutation.mutateAsync({
          id: tenderId,
          reference,
          title: title || undefined,
          organization: organization || undefined,
          closingDate: closingDate ? new Date(closingDate) : undefined,
          status,
          notes: notes || undefined,
          items: validItems,
        });
        toast.success("Tender updated successfully");
      } else {
        // Create new tender
        await createMutation.mutateAsync({
          reference,
          title: title || undefined,
          organization: organization || undefined,
          closingDate: closingDate ? new Date(closingDate) : undefined,
          status,
          notes: notes || undefined,
          items: validItems,
        });
        toast.success("Tender created successfully");
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving tender:", error);
      toast.error(tenderId ? "Failed to update tender" : "Failed to create tender");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Selector - Only show when creating new tender */}
      {!tenderId && templates && (templates as any).length > 0 && (
        <div className="space-y-2 pb-4 border-b">
          <Label htmlFor="template">Start from Template (Optional)</Label>
          <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
            <SelectTrigger id="template">
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None - Start from scratch</SelectItem>
              {(templates as any).map((template: any) => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplateId && (
            <p className="text-xs text-muted-foreground">
              Template loaded. You can now modify the pre-filled fields.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reference">Tender Reference *</Label>
          <Input
            id="reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g., TND-2024-001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization">Organization/Hospital</Label>
          <Input
            id="organization"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g., Kuwait General Hospital"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of tender"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="closingDate">Closing Date</Label>
          <Input
            id="closingDate"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value: any) => setStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional information about this tender"
          rows={3}
        />
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Tender Items *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Label className="text-sm">Item Description *</Label>
                    <Input
                      value={item.itemDescription}
                      onChange={(e) => updateItem(index, "itemDescription", e.target.value)}
                      placeholder="e.g., Surgical Gloves, Size M"
                      required
                    />
                  </div>
                  
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="mt-7"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Unit</Label>
                    <Select
                      value={item.unit}
                      onValueChange={(value) => updateItem(index, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pcs">Pieces</SelectItem>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="pack">Pack</SelectItem>
                        <SelectItem value="unit">Unit</SelectItem>
                        <SelectItem value="set">Set</SelectItem>
                        <SelectItem value="kg">Kilogram</SelectItem>
                        <SelectItem value="liter">Liter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
          {tenderId
            ? (updateMutation.isPending ? "Updating..." : "Update Tender")
            : (createMutation.isPending ? "Creating..." : "Create Tender")}
        </Button>
      </div>
    </form>
  );
}
