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
import { Truck, Plus, Search, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/DeleteButton";
import { exportToCSV } from "@/lib/exportUtils";

export function DeliveriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch data
  const { data: deliveries = [], isLoading, refetch } = trpc.crud.deliveries.list.useQuery();
  const { data: customers = [] } = trpc.crud.customers.list.useQuery();

  // Mutations
  const createMutation = trpc.crud.deliveries.create.useMutation({
    onSuccess: () => {
      toast.success("Delivery created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create delivery: ${error.message}`);
    },
  });

  const deleteMutation = trpc.crud.deliveries.delete.useMutation({
    onSuccess: () => {
      toast.success("Delivery deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete delivery: ${error.message}`);
    },
  });

  const updateMutation = trpc.crud.deliveries.update.useMutation({
    onSuccess: () => {
      toast.success("Delivery updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update delivery: ${error.message}`);
    },
  });

  // Filter deliveries
  const filteredDeliveries = deliveries.filter((delivery: any) => {
    const customer = customers.find((c: any) => c.id === delivery.customerId);
    const customerName = customer?.name || "";
    const query = searchQuery.toLowerCase();
    return (
      customerName.toLowerCase().includes(query) ||
      delivery.trackingNumber?.toLowerCase().includes(query) ||
      delivery.deliveryAddress?.toLowerCase().includes(query)
    );
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerId = parseInt(formData.get("customerId") as string);
    const deliveryDate = formData.get("deliveryDate") as string;

    createMutation.mutate({
      customerId,
      deliveryDate: new Date(deliveryDate),
      status: formData.get("status") as any || "scheduled",
      deliveryAddress: formData.get("deliveryAddress") as string || undefined,
      trackingNumber: formData.get("trackingNumber") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const deliveryDate = formData.get("deliveryDate") as string;

    updateMutation.mutate({
      id: editingItem.id,
      deliveryDate: new Date(deliveryDate),
      status: formData.get("status") as any || undefined,
      deliveryAddress: formData.get("deliveryAddress") as string || undefined,
      trackingNumber: formData.get("trackingNumber") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Scheduled", variant: "secondary" },
      in_transit: { label: "In Transit", variant: "default" },
      delivered: { label: "Delivered", variant: "outline" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    return variants[status] || { label: status, variant: "default" };
  };

  const handleExportCSV = () => {
    const exportData = filteredDeliveries.map((delivery: any) => ({
      'Customer': customers.find((c: any) => c.id === delivery.customerId)?.name || '',
      'Delivery Date': formatDate(delivery.deliveryDate),
      'Status': getStatusBadge(delivery.status).label,
      'Tracking Number': delivery.trackingNumber || '',
      'Delivery Address': delivery.deliveryAddress || '',
      'Notes': delivery.notes || ''
    }));
    exportToCSV(exportData, 'deliveries');
    toast.success('Deliveries exported to CSV');
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Delivery Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule and track product deliveries to customers
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Schedule New Delivery</DialogTitle>
                <DialogDescription>
                  Create a new delivery schedule
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Customer *</Label>
                  <Select name="customerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No customers available. Please add customers first.
                        </div>
                      ) : (
                        customers.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deliveryDate">Delivery Date *</Label>
                    <Input
                      id="deliveryDate"
                      name="deliveryDate"
                      type="date"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="scheduled">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    name="trackingNumber"
                    placeholder="e.g., TRK-2024-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Textarea
                    id="deliveryAddress"
                    name="deliveryAddress"
                    placeholder="Enter full delivery address"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any special instructions or notes"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || customers.length === 0}>
                  {createMutation.isPending ? "Creating..." : "Schedule Delivery"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Export */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by customer, tracking number, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking Number</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No deliveries found matching your search" : customers.length === 0 ? "Please add customers first before scheduling deliveries" : "No deliveries scheduled yet. Create your first delivery to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery: any) => {
                  const customer = customers.find((c: any) => c.id === delivery.customerId);
                  const statusInfo = getStatusBadge(delivery.status);
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">{customer?.name || "Unknown Customer"}</TableCell>
                      <TableCell>{formatDate(delivery.deliveryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell>{delivery.trackingNumber || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{delivery.deliveryAddress || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{delivery.notes || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(delivery);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DeleteButton
                            itemName={`delivery ${delivery.trackingNumber || 'to ' + customers.find(c => c.id === delivery.customerId)?.name}`}
                            onDelete={() => deleteMutation.mutate({ id: delivery.id })}
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
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Delivery</DialogTitle>
              <DialogDescription>
                Update delivery details
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-customerId">Customer *</Label>
                  <Select name="customerId" defaultValue={editingItem.customerId?.toString()} required>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-deliveryDate">Delivery Date *</Label>
                    <Input
                      id="edit-deliveryDate"
                      name="deliveryDate"
                      type="date"
                      required
                      defaultValue={editingItem.deliveryDate ? new Date(editingItem.deliveryDate).toISOString().split('T')[0] : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select name="status" defaultValue={editingItem.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-trackingNumber">Tracking Number</Label>
                  <Input
                    id="edit-trackingNumber"
                    name="trackingNumber"
                    defaultValue={editingItem.trackingNumber || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-deliveryAddress">Delivery Address</Label>
                  <Textarea
                    id="edit-deliveryAddress"
                    name="deliveryAddress"
                    defaultValue={editingItem.deliveryAddress || ""}
                    rows={3}
                  />
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
                {updateMutation.isPending ? "Updating..." : "Update Delivery"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
