import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Pencil, Calendar, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/DeleteButton";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "@/lib/exportUtils";

export function InvoicesPageNew() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createCustomerId, setCreateCustomerId] = useState<string>("");
  const [createDeliveryId, setCreateDeliveryId] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<string>("draft");
  const [editCustomerId, setEditCustomerId] = useState<string>("");
  const [editDeliveryId, setEditDeliveryId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("draft");

  // Fetch data
  const { data: invoices = [], isLoading, refetch } = trpc.crud.invoices.list.useQuery({ showArchived });
  const { data: customers = [] } = trpc.crud.customers.list.useQuery();
  const { data: deliveries = [] } = trpc.crud.deliveries.list.useQuery();

  // Mutations
  const createMutation = trpc.crud.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    },
  });

  const updateMutation = trpc.crud.invoices.update.useMutation({
    onSuccess: () => {
      toast.success("Invoice updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update invoice: ${error.message}`);
    },
  });

  const archiveMutation = trpc.crud.invoices.archive.useMutation({
    onSuccess: () => {
      toast.success("Invoice archived successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to archive invoice: ${error.message}`);
    },
  });

  const unarchiveMutation = trpc.crud.invoices.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Invoice unarchived successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to unarchive invoice: ${error.message}`);
    },
  });

  const deleteMutation = trpc.crud.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete invoice: ${error.message}`);
    },
  });

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedIds.length} invoice(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync({ id })));
      toast.success(`Successfully deleted ${selectedIds.length} invoice(s)`);
      setSelectedIds([]);
    } catch (error: any) {
      toast.error(`Failed to delete invoices: ${error.message}`);
    }
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const exportData = invoices.map(invoice => {
        const customer = customers.find((c: any) => c.id === invoice.customerId);
        return {
          invoiceNumber: invoice.invoiceNumber || '',
          customer: customer?.name || '',
          invoiceDate: formatDateForExport(invoice.invoiceDate),
          dueDate: formatDateForExport(invoice.dueDate),
          subtotal: formatCurrencyForExport(invoice.subtotal),
          taxAmount: formatCurrencyForExport(invoice.taxAmount),
          totalAmount: formatCurrencyForExport(invoice.totalAmount),
          status: invoice.status || '',
          paidDate: formatDateForExport(invoice.paidDate),
          isArchived: invoice.isArchived ? 'Yes' : 'No',
        };
      });

      exportToCSV(exportData, 'invoices', [
        { key: 'invoiceNumber', label: 'Invoice Number' },
        { key: 'customer', label: 'Customer' },
        { key: 'invoiceDate', label: 'Invoice Date' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'taxAmount', label: 'Tax Amount' },
        { key: 'totalAmount', label: 'Total Amount' },
        { key: 'status', label: 'Status' },
        { key: 'paidDate', label: 'Paid Date' },
        { key: 'isArchived', label: 'Archived' },
      ]);

      toast.success("Invoices exported successfully");
    } catch (error) {
      toast.error("Failed to export invoices");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map((inv: any) => inv.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice: any) => {
    const customer = customers.find((c: any) => c.id === invoice.customerId);
    const customerName = customer?.name || "";
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoiceNumber?.toLowerCase().includes(query) ||
      customerName.toLowerCase().includes(query) ||
      invoice.status?.toLowerCase().includes(query)
    );
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const subtotal = formData.get("subtotal") as string;
    const taxAmount = formData.get("taxAmount") as string;
    const totalAmount = formData.get("totalAmount") as string;

    createMutation.mutate({
      invoiceNumber: formData.get("invoiceNumber") as string,
      customerId: parseInt(createCustomerId),
      deliveryId: createDeliveryId ? parseInt(createDeliveryId) : undefined,
      invoiceDate: new Date(formData.get("invoiceDate") as string),
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      subtotal: Math.round(parseFloat(subtotal) * 100),
      taxAmount: taxAmount ? Math.round(parseFloat(taxAmount) * 100) : 0,
      totalAmount: Math.round(parseFloat(totalAmount) * 100),
      currency: "USD",
      status: createStatus as any,
      paidDate: formData.get("paidDate") ? new Date(formData.get("paidDate") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
    // Reset state
    setCreateCustomerId("");
    setCreateDeliveryId("");
    setCreateStatus("draft");
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const subtotal = formData.get("subtotal") as string;
    const taxAmount = formData.get("taxAmount") as string;
    const totalAmount = formData.get("totalAmount") as string;

    updateMutation.mutate({
      id: editingItem.id,
      invoiceNumber: formData.get("invoiceNumber") as string,
      customerId: parseInt(editCustomerId),
      deliveryId: editDeliveryId ? parseInt(editDeliveryId) : undefined,
      invoiceDate: new Date(formData.get("invoiceDate") as string),
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      subtotal: Math.round(parseFloat(subtotal) * 100),
      taxAmount: taxAmount ? Math.round(parseFloat(taxAmount) * 100) : 0,
      totalAmount: Math.round(parseFloat(totalAmount) * 100),
      currency: "USD",
      status: editStatus as any,
      paidDate: formData.get("paidDate") ? new Date(formData.get("paidDate") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: "outline", className: "border-gray-300 text-gray-600" },
      sent: { variant: "info", className: "" },
      paid: { variant: "success", className: "" },
      overdue: { variant: "destructive", className: "" },
      cancelled: { variant: "outline", className: "border-red-300 text-red-600" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  const formatCurrency = (cents?: number | null) => {
    if (!cents && cents !== 0) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-orange-600" />
            Invoices Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track invoices, payments, and customer billing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Invoice
              </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Invoice</DialogTitle>
                <DialogDescription>
                  Create a new invoice for a customer
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <Input
                      id="invoiceNumber"
                      name="invoiceNumber"
                      required
                      placeholder="e.g., INV-2024-001"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customerId">Customer *</Label>
                    <Select value={createCustomerId} onValueChange={setCreateCustomerId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="invoiceDate">Invoice Date *</Label>
                    <Input
                      id="invoiceDate"
                      name="invoiceDate"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="deliveryId">Related Delivery</Label>
                  <Select value={createDeliveryId} onValueChange={setCreateDeliveryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {deliveries.map((delivery: any) => (
                        <SelectItem key={delivery.id} value={delivery.id.toString()}>
                          Delivery #{delivery.id} - {formatDate(delivery.deliveryDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="subtotal">Subtotal (USD) *</Label>
                    <Input
                      id="subtotal"
                      name="subtotal"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxAmount">Tax Amount (USD)</Label>
                    <Input
                      id="taxAmount"
                      name="taxAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="totalAmount">Total Amount (USD) *</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={createStatus} onValueChange={setCreateStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="paidDate">Paid Date</Label>
                    <Input
                      id="paidDate"
                      name="paidDate"
                      type="date"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Additional notes or payment terms"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Invoice"}
                </Button>
              </DialogFooter>
            </form>
           </DialogContent>
         </Dialog>
        </div>
       </div>

      {/* Search */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by invoice number, customer, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(!showArchived)}
        >
          <FileText className="w-4 h-4 mr-2" />
          {showArchived ? "Hide Archived" : "Show Archived"}
        </Button>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No invoices found matching your search" : "No invoices yet. Add your first invoice to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice: any) => {
                  const customer = customers.find((c: any) => c.id === invoice.customerId);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(invoice.id)}
                          onCheckedChange={() => toggleSelect(invoice.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{customer?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {formatDate(invoice.invoiceDate)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(invoice.totalAmount)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{formatDate(invoice.paidDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(invoice);
                              setEditCustomerId(invoice.customerId?.toString() || "");
                              setEditDeliveryId(invoice.deliveryId?.toString() || "");
                              setEditStatus(invoice.status || "draft");
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (invoice.isArchived) {
                                unarchiveMutation.mutate({ id: invoice.id });
                              } else {
                                archiveMutation.mutate({ id: invoice.id });
                              }
                            }}
                            disabled={archiveMutation.isPending || unarchiveMutation.isPending}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <DeleteButton
                            itemName={`invoice ${invoice.invoiceNumber}`}
                            onDelete={() => deleteMutation.mutate({ id: invoice.id })}
                            isDeleting={deleteMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Invoice</DialogTitle>
              <DialogDescription>
                Update invoice details
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-invoiceNumber">Invoice Number *</Label>
                    <Input
                      id="edit-invoiceNumber"
                      name="invoiceNumber"
                      required
                      defaultValue={editingItem.invoiceNumber}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-customerId">Customer *</Label>
                    <Select value={editCustomerId} onValueChange={setEditCustomerId} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-invoiceDate">Invoice Date *</Label>
                    <Input
                      id="edit-invoiceDate"
                      name="invoiceDate"
                      type="date"
                      required
                      defaultValue={editingItem.invoiceDate ? new Date(editingItem.invoiceDate).toISOString().split('T')[0] : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-dueDate">Due Date</Label>
                    <Input
                      id="edit-dueDate"
                      name="dueDate"
                      type="date"
                      defaultValue={editingItem.dueDate ? new Date(editingItem.dueDate).toISOString().split('T')[0] : ""}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-deliveryId">Related Delivery</Label>
                  <Select value={editDeliveryId} onValueChange={setEditDeliveryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {deliveries.map((delivery: any) => (
                        <SelectItem key={delivery.id} value={delivery.id.toString()}>
                          Delivery #{delivery.id} - {formatDate(delivery.deliveryDate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-subtotal">Subtotal (USD) *</Label>
                    <Input
                      id="edit-subtotal"
                      name="subtotal"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={editingItem.subtotal ? (editingItem.subtotal / 100).toFixed(2) : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-taxAmount">Tax Amount (USD)</Label>
                    <Input
                      id="edit-taxAmount"
                      name="taxAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingItem.taxAmount ? (editingItem.taxAmount / 100).toFixed(2) : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-totalAmount">Total Amount (USD) *</Label>
                    <Input
                      id="edit-totalAmount"
                      name="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={editingItem.totalAmount ? (editingItem.totalAmount / 100).toFixed(2) : ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-paidDate">Paid Date</Label>
                    <Input
                      id="edit-paidDate"
                      name="paidDate"
                      type="date"
                      defaultValue={editingItem.paidDate ? new Date(editingItem.paidDate).toISOString().split('T')[0] : ""}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    name="notes"
                    defaultValue={editingItem.notes || ""}
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditingItem(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
