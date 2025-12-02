import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TableSkeleton } from "@/components/LoadingSkeletons";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Package, Plus, Search, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/DeleteButton";
import { exportToCSV } from "@/lib/exportUtils";

export function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch data
  const { data: inventoryItems = [], isLoading, refetch } = trpc.inventory.list.useQuery();
  const { data: products = [] } = trpc.crud.products.list.useQuery();

  // Mutations
  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Inventory item added successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add inventory: ${error.message}`);
    },
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Inventory item deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete inventory: ${error.message}`);
    },
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      toast.success("Inventory item updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update inventory: ${error.message}`);
    },
  });

  // Filter items
  const filteredItems = inventoryItems.filter((item: any) => {
    const product = products.find((p: any) => p.id === item.productId);
    const productName = product?.name || "";
    const query = searchQuery.toLowerCase();
    return (
      productName.toLowerCase().includes(query) ||
      item.batchNumber?.toLowerCase().includes(query) ||
      item.warehouseLocation?.toLowerCase().includes(query)
    );
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productId = parseInt(formData.get("productId") as string);
    const quantity = parseInt(formData.get("quantity") as string);
    const minimumStock = parseInt(formData.get("minimumStock") as string);