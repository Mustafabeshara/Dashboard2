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
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Pencil, Download, Trash2, Eye } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteButton } from "@/components/DeleteButton";
import { exportToCSV } from "@/lib/exportUtils";

export function ManufacturersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Fetch data
  const { data: manufacturers = [], isLoading, refetch } = trpc.crud.manufacturers.list.useQuery();

  // Mutations
  const createMutation = trpc.crud.manufacturers.create.useMutation({
    onSuccess: () => {
      toast.success("Manufacturer created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create manufacturer: ${error.message}`);
    },
  });

  const updateMutation = trpc.crud.manufacturers.update.useMutation({
    onSuccess: () => {
      toast.success("Manufacturer updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update manufacturer: ${error.message}`);
    },
  });

  const deleteMutation = trpc.crud.manufacturers.delete.useMutation({
    onSuccess: () => {
      toast.success("Manufacturer deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete manufacturer: ${error.message}`);
    },
  });

  // Filter manufacturers
  const filteredManufacturers = manufacturers.filter((manufacturer: any) => {
    const query = searchQuery.toLowerCase();
    return (
      manufacturer.name?.toLowerCase().includes(query) ||
      manufacturer.country?.toLowerCase().includes(query) ||
      manufacturer.contactEmail?.toLowerCase().includes(query)
    );
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name") as string,
      country: formData.get("country") as string || undefined,
      email: formData.get("contactEmail") as string || undefined,
      phone: formData.get("contactPhone") as string || undefined,
      website: formData.get("website") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    updateMutation.mutate({
      id: editingItem.id,
      name: formData.get("name") as string,
      country: formData.get("country") as string || undefined,
      email: formData.get("contactEmail") as string || undefined,
      phone: formData.get("contactPhone") as string || undefined,
      website: formData.get("website") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleExportCSV = () => {
    const exportData = filteredManufacturers.map((manufacturer: any) => ({
      'Name': manufacturer.name || '',
      'Country': manufacturer.country || '',
      'Contact Email': manufacturer.contactEmail || '',
      'Contact Phone': manufacturer.contactPhone || '',
      'Website': manufacturer.website || '',
      'Notes': manufacturer.notes || ''
    }));
    exportToCSV(exportData, 'manufacturers');
    toast.success('Manufacturers exported to CSV');
  };

  // Bulk delete
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredManufacturers.map((m: any) => m.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} manufacturer(s)?`)) {
      return;
    }

    try {
      await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync({ id })));
      toast.success(`${selectedIds.length} manufacturer(s) deleted successfully`);
      setSelectedIds([]);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to delete manufacturers: ${error.message}`);
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Manufacturers Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage product manufacturers and suppliers
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Manufacturer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Manufacturer</DialogTitle>
                <DialogDescription>
                  Create a new manufacturer record
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Manufacturer Name *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" placeholder="e.g., USA, Germany, China" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input id="contactPhone" name="contactPhone" type="tel" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" type="url" placeholder="https://" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Manufacturer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search, Export, and Bulk Delete */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, country, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedIds.length > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredManufacturers.length && filteredManufacturers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading manufacturers...
                  </TableCell>
                </TableRow>
              ) : filteredManufacturers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No manufacturers found matching your search" : "No manufacturers yet. Add your first manufacturer to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredManufacturers.map((manufacturer: any) => (
                  <TableRow key={manufacturer.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(manufacturer.id)}
                        onCheckedChange={(checked) => handleSelectOne(manufacturer.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/manufacturers/${manufacturer.id}`}>
                        <Button variant="link" className="p-0 h-auto font-normal text-blue-600">
                          {manufacturer.name}
                        </Button>
                      </Link>
                    </TableCell>
                    <TableCell>{manufacturer.country || "-"}</TableCell>
                    <TableCell>{manufacturer.contactEmail || "-"}</TableCell>
                    <TableCell>{manufacturer.contactPhone || "-"}</TableCell>
                    <TableCell>
                      {manufacturer.website ? (
                        <a href={manufacturer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Visit
                        </a>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(manufacturer);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <DeleteButton
                          onDelete={() => deleteMutation.mutate({ id: manufacturer.id })}
                          itemName={manufacturer.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
              <DialogTitle>Edit Manufacturer</DialogTitle>
              <DialogDescription>
                Update manufacturer information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Manufacturer Name *</Label>
                <Input id="edit-name" name="name" defaultValue={editingItem?.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input id="edit-country" name="country" defaultValue={editingItem?.country} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contactEmail">Contact Email</Label>
                <Input id="edit-contactEmail" name="contactEmail" type="email" defaultValue={editingItem?.contactEmail} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contactPhone">Contact Phone</Label>
                <Input id="edit-contactPhone" name="contactPhone" type="tel" defaultValue={editingItem?.contactPhone} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input id="edit-website" name="website" type="url" defaultValue={editingItem?.website} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea id="edit-notes" name="notes" rows={3} defaultValue={editingItem?.notes} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Manufacturer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
