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
import { Shield, Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/DeleteButton";

export default function WhitelistSettings() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Fetch whitelist
  const { data: whitelist = [], isLoading, refetch } = trpc.whitelist.list.useQuery();

  // Mutations
  const addMutation = trpc.whitelist.add.useMutation({
    onSuccess: () => {
      toast.success("Email added to whitelist");
      setIsAddDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add email: ${error.message}`);
    },
  });

  const removeMutation = trpc.whitelist.remove.useMutation({
    onSuccess: () => {
      toast.success("Email removed from whitelist");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to remove email: ${error.message}`);
    },
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    addMutation.mutate({
      email: formData.get("email") as string,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Access Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage which email addresses can access this application
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleAdd}>
              <DialogHeader>
                <DialogTitle>Add Email to Whitelist</DialogTitle>
                <DialogDescription>
                  Grant access to a new email address
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Reason for access, department, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding..." : "Add to Whitelist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">How Access Control Works</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              Only users with email addresses on this whitelist can access the application.
              Administrators (including you) always have access regardless of whitelist status.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email Address</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading whitelist...
                  </TableCell>
                </TableRow>
              ) : whitelist.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No emails in whitelist yet. Add email addresses to grant access to your team.
                  </TableCell>
                </TableRow>
              ) : (
                whitelist.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.email}</TableCell>
                    <TableCell>{entry.addedBy}</TableCell>
                    <TableCell>{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <DeleteButton
                        onDelete={() => removeMutation.mutate({ id: entry.id })}
                        itemName={entry.email}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Stats */}
      {whitelist.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Total authorized emails: <span className="font-semibold">{whitelist.length}</span>
        </div>
      )}
    </div>
  );
}
