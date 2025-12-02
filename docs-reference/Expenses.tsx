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
import { DollarSign, Plus, Search, Pencil, Calendar, Download } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/DeleteButton";
import { exportToCSV } from "@/lib/exportUtils";

export function ExpensesPageNew() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Fetch data
  const { data: expenses = [], isLoading, refetch } = trpc.crud.expenses.list.useQuery();

  // Mutations
  const createMutation = trpc.crud.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense created successfully");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create expense: ${error.message}`);
    },
  });

  const deleteMutation = trpc.crud.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete expense: ${error.message}`);
    },
  });

  const updateMutation = trpc.crud.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully");
      setIsEditDialogOpen(false);
      setEditingItem(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update expense: ${error.message}`);
    },
  });

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: any) => {
    const query = searchQuery.toLowerCase();
    return (
      expense.category?.toLowerCase().includes(query) ||
      expense.description?.toLowerCase().includes(query) ||
      expense.status?.toLowerCase().includes(query)
    );
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const amount = formData.get("amount") as string;

    createMutation.mutate({
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      amount: Math.round(parseFloat(amount) * 100),
      currency: "USD",
      expenseDate: new Date(formData.get("expenseDate") as string),
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const amount = formData.get("amount") as string;

    updateMutation.mutate({
      id: editingItem.id,
      status: (formData.get("status") as any) || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "outline", className: "border-yellow-300 text-yellow-700" },
      approved: { variant: "success", className: "" },
      rejected: { variant: "destructive", className: "" },
      paid: { variant: "info", className: "" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      travel: "bg-blue-100 text-blue-700 border-blue-300",
      supplies: "bg-green-100 text-green-700 border-green-300",
      utilities: "bg-purple-100 text-purple-700 border-purple-300",
      equipment: "bg-orange-100 text-orange-700 border-orange-300",
      marketing: "bg-pink-100 text-pink-700 border-pink-300",
      office: "bg-gray-100 text-gray-700 border-gray-300",
    };
    const colorClass = colors[category.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-300";
    return <Badge variant="outline" className={colorClass}>{category}</Badge>;
  };

  const formatCurrency = (cents?: number | null) => {
    if (!cents && cents !== 0) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const handleExportCSV = () => {
    const exportData = filteredExpenses.map((expense: any) => ({
      'Category': expense.category || '',
      'Description': expense.description || '',
      'Amount': formatCurrency(expense.amount),
      'Expense Date': formatDate(expense.expenseDate),
      'Status': expense.status || '',
      'Notes': expense.notes || ''
    }));
    exportToCSV(exportData, 'expenses');
    toast.success('Expenses exported to CSV');
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            Expenses Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track business expenses, approvals, and reimbursements
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Record a new business expense
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Supplies">Supplies</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Office">Office</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (USD) *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    required
                    placeholder="Describe the expense"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expenseDate">Expense Date *</Label>
                    <Input
                      id="expenseDate"
                      name="expenseDate"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="pending">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Additional notes or details"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Expense"}
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
            placeholder="Search by category, description, or status..."
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
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Expense Date</TableHead>
                <TableHead>Status</TableHead>
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
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No expenses found matching your search" : "No expenses yet. Add your first expense to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense: any) => (
                  <TableRow key={expense.id}>
                    <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {formatDate(expense.expenseDate)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    <TableCell className="max-w-xs truncate">{expense.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(expense);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <DeleteButton
                          itemName={`expense ${expense.description || expense.category}`}
                          onDelete={() => deleteMutation.mutate({ id: expense.id })}
                          isDeleting={deleteMutation.isPending}
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
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Update expense details
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select name="category" defaultValue={editingItem.category} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Supplies">Supplies</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Office">Office</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-amount">Amount (USD) *</Label>
                    <Input
                      id="edit-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      defaultValue={editingItem.amount ? (editingItem.amount / 100).toFixed(2) : ""}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Description *</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    required
                    defaultValue={editingItem.description || ""}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-expenseDate">Expense Date *</Label>
                    <Input
                      id="edit-expenseDate"
                      name="expenseDate"
                      type="date"
                      required
                      defaultValue={editingItem.expenseDate ? new Date(editingItem.expenseDate).toISOString().split('T')[0] : ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select name="status" defaultValue={editingItem.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
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
                {updateMutation.isPending ? "Updating..." : "Update Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
