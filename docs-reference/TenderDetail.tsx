import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Building2, Calendar, FileText, Plus, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { DocumentFolders } from "@/components/DocumentFolders";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function TenderDetail() {
  const [, params] = useRoute("/tenders/:id");
  const [, setLocation] = useLocation();
  const tenderId = params?.id || "";

  const [showAddResult, setShowAddResult] = useState(false);
  const [resultData, setResultData] = useState({
    bidPrice: "",
    currency: "USD",
    isOurBid: false,
    competitorName: "",
    isWinner: false,
    notes: "",
  });

  const { data, isLoading, refetch } = trpc.tenders.getById.useQuery({ id: tenderId });
  const addResultMutation = trpc.tenders.addResult.useMutation();

  const handleAddResult = async () => {
    if (!data) return;
    try {
      await addResultMutation.mutateAsync({
        tenderId: data.id,
        bidPrice: resultData.bidPrice ? Math.round(parseFloat(resultData.bidPrice) * 100) : undefined,
        currency: resultData.currency,
        isOurBid: resultData.isOurBid,
        competitorName: resultData.competitorName || undefined,
        isWinner: resultData.isWinner,
        notes: resultData.notes || undefined,
      });

      toast.success("Tender result added successfully");
      setShowAddResult(false);
      setResultData({
        bidPrice: "",
        currency: "USD",
        isOurBid: false,
        competitorName: "",
        isWinner: false,
        notes: "",
      });
      refetch();
    } catch (error) {
      console.error("Error adding result:", error);
      toast.error("Failed to add tender result");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <p className="text-center text-muted-foreground">Loading tender details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-6">
        <p className="text-center text-muted-foreground">Tender not found</p>
      </div>
    );
  }

  // Data is now flattened - tender properties are directly on data
  const tender = data;
  const items = data.items || [];
  const results = data.results || [];

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      open: { className: "bg-blue-500/10 text-blue-500", label: "Open" },
      closed: { className: "bg-gray-500/10 text-gray-500", label: "Closed" },
      awarded: { className: "bg-green-500/10 text-green-500", label: "Awarded" },
      lost: { className: "bg-red-500/10 text-red-500", label: "Lost" },
    };

    const variant = variants[status] || variants.open;
    return (
      <Badge variant="secondary" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb 
        items={[
          { label: "Tenders", path: "/tenders" },
          { label: tender.reference }
        ]} 
      />

      {/* Tender Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{tender.reference}</CardTitle>
                {getStatusBadge(tender.status)}
              </div>
              {tender.title && (
                <CardDescription className="text-base">{tender.title}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Organization</p>
                <p className="font-medium">{tender.organization || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Closing Date</p>
                <p className="font-medium">{formatDate(tender.closingDate)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(tender.createdAt)}</p>
              </div>
            </div>
          </div>

          {tender.notes && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <p className="text-sm">{tender.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tender Items */}
      <Card>
        <CardHeader>
          <CardTitle>Tender Items</CardTitle>
          <CardDescription>Products and quantities requested in this tender</CardDescription>
        </CardHeader>
        <CardContent>
          {items && items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemDescription}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">No items added yet</p>
          )}
        </CardContent>
      </Card>

      {/* Tender Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tender Results & Bids</CardTitle>
              <CardDescription>Competitor bids and pricing information</CardDescription>
            </div>
            <Dialog open={showAddResult} onOpenChange={setShowAddResult}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Result
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Tender Result</DialogTitle>
                  <DialogDescription>
                    Record a bid or result for this tender
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bid Price</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={resultData.bidPrice}
                        onChange={(e) => setResultData({ ...resultData, bidPrice: e.target.value })}
                        placeholder="0.00"
                        className="flex-1"
                      />
                      <Select
                        value={resultData.currency}
                        onValueChange={(value) => setResultData({ ...resultData, currency: value })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="KWD">KWD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Competitor Name (if not our bid)</Label>
                    <Input
                      value={resultData.competitorName}
                      onChange={(e) => setResultData({ ...resultData, competitorName: e.target.value })}
                      placeholder="e.g., ABC Medical Supplies"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resultData.isOurBid}
                        onChange={(e) => setResultData({ ...resultData, isOurBid: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">This is our bid</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resultData.isWinner}
                        onChange={(e) => setResultData({ ...resultData, isWinner: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Winning bid</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={resultData.notes}
                      onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                      placeholder="Additional information"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddResult(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddResult} disabled={addResultMutation.isPending}>
                      {addResultMutation.isPending ? "Adding..." : "Add Result"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {results && results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bidder</TableHead>
                  <TableHead>Bid Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      {result.isOurBid ? (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                          Our Bid
                        </Badge>
                      ) : (
                        <span>{result.competitorName || "Unknown"}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(result.bidPrice, result.currency)}
                    </TableCell>
                    <TableCell>
                      {result.isOurBid ? "Internal" : "Competitor"}
                    </TableCell>
                    <TableCell>
                      {result.isWinner ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          Winner
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {result.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6">No results recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Documents & Folders */}
      <Card>
        <CardHeader>
          <CardTitle>Documents & Folders</CardTitle>
          <CardDescription>
            Organize tender documents in folders with required document checklists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentFolders entityType="tender" entityId={tender.id} />
        </CardContent>
      </Card>
    </div>
  );
}
