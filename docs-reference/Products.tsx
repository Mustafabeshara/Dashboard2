import { useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TableSkeleton } from "@/components/LoadingSkeletons";
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
import { Package2, Plus, Search, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteButton } from "@/components/DeleteButton";
import { exportToCSV } from "@/lib/exportUtils";

export function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createManufacturerId, setCreateManufacturerId] = useState<string>("");
  const [editManufacturerId, setEditManufacturerId] = useState<string>("");

  // Fetch data
  const { data: products = [], isLoading: productsLoading, refetch } = trpc.crud.products.list.useQuery();
  const isLoading = productsLoading;
  const { data: manufacturers = [] } = trpc.crud.manufacturers.list.useQuery();

  // Mutations
  const createMutation = trpc.crud.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });

  const deleteMutation = trpc.crud.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${error.message}`);
    },
  });

  const updateMutation = trpc.crud.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  // Bulk delete handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(i => i !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} product(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(selectedIds.map(id => deleteMutation.mutateAsync({ id })));
      toast.success(`Successfully deleted ${selectedIds.length} product(s)`);
      setSelectedIds([]);
      refetch();
    } catch (error) {
      toast.error("Failed to delete some products");
    }
  };

  const handleExportCSV = () => {
    const exportData = filteredProducts.map(product => ({
      'Product Name': product.name,
      'SKU': product.sku || '',
      'Category': product.category || '',
      'Manufacturer': manufacturers.find(m => m.id === product.manufacturerId)?.name || '',
      'Unit Price': product.unitPrice || 0,
      'Represented': product.isRepresented ? 'Yes' : 'No',
      'Description': product.description || ''
    }));
    exportToCSV(exportData, 'products');
    toast.success('Products exported to CSV');
  };

  // Filter products
  const filteredProducts = products.filter((product: any) => {
    const manufacturer = manufacturers.find((m: any) => m.id === product.manufacturerId);
    const manufacturerName = manufacturer?.name || "";
    const query = searchQuery.toLowerCase();
    return (
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      manufacturerName.toLowerCase().includes(query)
    );
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const unitPrice = formData.get("unitPrice") as string;
    const isRepresented = formData.get("isRepresented") === "on";

    createMutation.mutate({
      name: formData.get("name") as string,
      sku: formData.get("sku") as string || undefined,
      manufacturerId: createManufacturerId && createManufacturerId !== "none" ? parseInt(createManufacturerId) : undefined,
      category: formData.get("category") as string || undefined,
      description: formData.get("description") as string || undefined,
      specifications: formData.get("specifications") as string || undefined,
      unitPrice: unitPrice ? Math.round(parseFloat(unitPrice) * 100) : undefined,
      currency: "USD",
      isRepresented,
    });
    setCreateManufacturerId(""); // Reset after creation
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const unitPrice = formData.get("unitPrice") as string;
    const isRepresented = formData.get("isRepresented") === "on";

    updateMutation.mutate({
      id: editingItem.id,
      name: formData.get("name") as string,
      sku: formData.get("sku") as string || undefined,
      manufacturerId: editManufacturerId && editManufacturerId !== "none" ? parseInt(editManufacturerId) : undefined,
      category: formData.get("category") as string || undefined,
      description: formData.get("description") as string || undefined,
      specifications: formData.get("specifications") as string || undefined,
      unitPrice: unitPrice ? Math.round(parseFloat(unitPrice) * 100) : undefined,
      currency: "USD",
      isRepresented,
    });
  };

  const formatCurrency = (cents?: number | null) => {
    if (!cents) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container py-6">
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package2 className="w-8 h-8 text-blue-600" />
            Products Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage product catalog, manufacturers, and pricing
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to your catalog
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="e.g., Surgical Gloves"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      name="sku"
                      placeholder="e.g., SKU-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="manufacturerId">Manufacturer</Label>
                    <Select value={createManufacturerId} onValueChange={setCreateManufacturerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {manufacturers.map((manufacturer: any) => (
                          <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                            {manufacturer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      name="category"
                      placeholder="e.g., Medical Supplies"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Product description"
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="specifications">Specifications</Label>
                  <Textarea
                    id="specifications"
                    name="specifications"
                    placeholder="Technical specifications"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="unitPrice">Unit Price (USD)</Label>
                    <Input
                      id="unitPrice"
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="isRepresented" className="mb-2">Product Status</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="isRepresented" name="isRepresented" />
                      <label
                        htmlFor="isRepresented"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        We represent this product
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Bulk Actions */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, SKU, category, or manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={deleteMutation.isPending}
          >
            Delete Selected ({selectedIds.length})
          </Button>
        )}
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={8} />
      ) : (
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No products found matching your search" : "No products yet. Add your first product to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product: any) => {
                  const manufacturer = manufacturers.find((m: any) => m.id === product.manufacturerId);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectOne(product.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku || "-"}</TableCell>
                      <TableCell>{manufacturer?.name || "-"}</TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>{formatCurrency(product.unitPrice)}</TableCell>
                      <TableCell>
                        {product.isRepresented ? (
                          <Badge variant="success">Represented</Badge>
                        ) : (
                          <Badge variant="outline">Not Represented</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingItem(product);
                              setEditManufacturerId(product.manufacturerId?.toString() || "");
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DeleteButton
                            itemName={`product ${product.name}`}
                            onDelete={() => deleteMutation.mutate({ id: product.id })}
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
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product details
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Product Name *</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      required
                      defaultValue={editingItem.name}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input
                      id="edit-sku"
                      name="sku"
                      defaultValue={editingItem.sku || ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-manufacturerId">Manufacturer</Label>
                    <Select value={editManufacturerId} onValueChange={setEditManufacturerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manufacturer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {manufacturers.map((manufacturer: any) => (
                          <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                            {manufacturer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Input
                      id="edit-category"
                      name="category"
                      defaultValue={editingItem.category || ""}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editingItem.description || ""}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-specifications">Specifications</Label>
                  <Textarea
                    id="edit-specifications"
                    name="specifications"
                    defaultValue={editingItem.specifications || ""}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-unitPrice">Unit Price (USD)</Label>
                    <Input
                      id="edit-unitPrice"
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingItem.unitPrice ? (editingItem.unitPrice / 100).toFixed(2) : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-isRepresented" className="mb-2">Product Status</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="edit-isRepresented" 
                        name="isRepresented"
                        defaultChecked={editingItem.isRepresented}
                      />
                      <label
                        htmlFor="edit-isRepresented"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        We represent this product
                      </label>
                    </div>
                  </div>
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
                {updateMutation.isPending ? "Updating..." : "Update Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
