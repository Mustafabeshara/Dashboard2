/**
 * Tender Participants Management Component
 * Manage bidders and their item-level pricing
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Award, Building2, Loader2, Plus, Save, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TenderItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: number;
  unit: string;
  isParticipating: boolean;
}

interface ParticipantBid {
  id: string;
  manufacturer?: string | null;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  deliveryTime?: number | null;
  deliveryUnit?: string | null;
  notes?: string | null;
  isWinner: boolean;
  tenderItem: TenderItem;
}

interface Participant {
  id: string;
  name: string;
  companyName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isOurBid: boolean;
  itemBids: ParticipantBid[];
  addedAt: string;
}

interface TenderParticipantsProps {
  tenderId: string;
  tenderStatus: string;
  submissionDeadline?: string | null;
}

export function TenderParticipants({
  tenderId,
  tenderStatus,
  submissionDeadline,
}: TenderParticipantsProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<TenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showBiddingDialog, setShowBiddingDialog] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    isOurBid: false,
  });

  // Bid form for selected item
  const [selectedItemForBid, setSelectedItemForBid] = useState<TenderItem | null>(null);
  const [bidForm, setBidForm] = useState({
    manufacturer: '',
    unitPrice: '',
    totalPrice: '',
    currency: 'KWD',
    deliveryTime: '',
    deliveryUnit: 'days',
    notes: '',
    isWinner: false,
  });

  const isTenderClosed =
    ['WON', 'LOST', 'CANCELLED'].includes(tenderStatus) ||
    (submissionDeadline && new Date(submissionDeadline) < new Date());

  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/participants`);
      const result = await response.json();

      if (result.success) {
        setParticipants(result.data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/items`);
      const result = await response.json();

      if (result.success) {
        setItems(result.data.filter((item: TenderItem) => item.isParticipating));
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }, [tenderId]);

  useEffect(() => {
    fetchParticipants();
    fetchItems();
  }, [fetchParticipants, fetchItems]);

  const handleAddParticipant = async () => {
    if (!newParticipant.name.trim()) {
      toast.error('Participant name is required');
      return;
    }

    if (isTenderClosed) {
      toast.error('Cannot add participants after tender is closed');
      return;
    }

    try {
      const response = await fetch(`/api/tenders/${tenderId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParticipant),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Participant added successfully');
        fetchParticipants();
        setShowAddParticipant(false);
        setNewParticipant({
          name: '',
          companyName: '',
          contactEmail: '',
          contactPhone: '',
          isOurBid: false,
        });
      } else {
        toast.error(result.error || 'Failed to add participant');
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('Failed to add participant');
    }
  };

  const handleOpenBidding = (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowBiddingDialog(true);
  };

  const handleAddBid = async (item: TenderItem) => {
    if (!selectedParticipant || !bidForm.unitPrice || !bidForm.totalPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(
        `/api/tenders/${tenderId}/participants/${selectedParticipant.id}/bids`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenderItemId: item.id,
            manufacturer: bidForm.manufacturer || undefined,
            unitPrice: parseFloat(bidForm.unitPrice),
            totalPrice: parseFloat(bidForm.totalPrice),
            currency: bidForm.currency,
            deliveryTime: bidForm.deliveryTime ? parseInt(bidForm.deliveryTime) : undefined,
            deliveryUnit: bidForm.deliveryUnit || undefined,
            notes: bidForm.notes || undefined,
            isWinner: bidForm.isWinner,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Bid added successfully');
        fetchParticipants();
        setSelectedItemForBid(null);
        setBidForm({
          manufacturer: '',
          unitPrice: '',
          totalPrice: '',
          currency: 'KWD',
          deliveryTime: '',
          deliveryUnit: 'days',
          notes: '',
          isWinner: false,
        });
      } else {
        toast.error(result.error || 'Failed to add bid');
      }
    } catch (error) {
      console.error('Error adding bid:', error);
      toast.error('Failed to add bid');
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedItemForBid || !bidForm.unitPrice) return;
    const total = parseFloat(bidForm.unitPrice) * selectedItemForBid.quantity;
    setBidForm({ ...bidForm, totalPrice: total.toFixed(2) });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Participants & Bidding
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Participants & Bidding ({participants.length})
            </CardTitle>
            <CardDescription>
              {isTenderClosed
                ? 'Tender is closed. Cannot add new participants.'
                : 'Add bidders and manage their pricing breakdown.'}
            </CardDescription>
          </div>
          {!isTenderClosed && (
            <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Participant</DialogTitle>
                  <DialogDescription>Add a bidder/competitor to this tender</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={newParticipant.name}
                      onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })}
                      placeholder="Participant name"
                    />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={newParticipant.companyName}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, companyName: e.target.value })
                      }
                      placeholder="Company name (optional)"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newParticipant.contactEmail}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, contactEmail: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newParticipant.contactPhone}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, contactPhone: e.target.value })
                      }
                      placeholder="+965 XXXX XXXX"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isOurBid"
                      checked={newParticipant.isOurBid}
                      onChange={e =>
                        setNewParticipant({ ...newParticipant, isOurBid: e.target.checked })
                      }
                      className="rounded"
                    />
                    <Label htmlFor="isOurBid" className="cursor-pointer">
                      This is our bid
                    </Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowAddParticipant(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddParticipant}>Add Participant</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No participants added yet. Add bidders to track their pricing.
          </div>
        ) : (
          <div className="space-y-4">
            {participants.map(participant => (
              <Card key={participant.id} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {participant.name}
                        {participant.isOurBid && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Our Bid
                          </span>
                        )}
                      </CardTitle>
                      {participant.companyName && (
                        <p className="text-sm text-muted-foreground">{participant.companyName}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenBidding(participant)}
                    >
                      Manage Bids ({participant.itemBids?.length || 0}/{items.length})
                    </Button>
                  </div>
                </CardHeader>
                {participant.itemBids && participant.itemBids.length > 0 && (
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <p className="text-muted-foreground">Recent Bids:</p>
                      {participant.itemBids.slice(0, 3).map(bid => (
                        <div
                          key={bid.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex-1">
                            <p className="font-medium">Item #{bid.tenderItem.itemNumber}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-md">
                              {bid.tenderItem.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {bid.totalPrice.toFixed(2)} {bid.currency}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bid.unitPrice.toFixed(2)} × {bid.tenderItem.quantity}
                            </p>
                          </div>
                          {bid.isWinner && <Award className="h-4 w-4 ml-2 text-green-500" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Bidding Dialog */}
        <Dialog open={showBiddingDialog} onOpenChange={setShowBiddingDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Bids - {selectedParticipant?.name}</DialogTitle>
              <DialogDescription>Add or update pricing for each tender item</DialogDescription>
            </DialogHeader>
            {selectedParticipant && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Manufacturer</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => {
                      const existingBid = selectedParticipant.itemBids?.find(
                        b => b.tenderItem.id === item.id
                      );
                      const isAddingBid = selectedItemForBid?.id === item.id;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.itemNumber}</TableCell>
                          <TableCell>
                            <p className="font-medium max-w-xs truncate">{item.description}</p>
                          </TableCell>
                          <TableCell>
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell>
                            {isAddingBid ? (
                              <Input
                                value={bidForm.manufacturer}
                                onChange={e =>
                                  setBidForm({ ...bidForm, manufacturer: e.target.value })
                                }
                                placeholder="Manufacturer"
                                className="h-8"
                              />
                            ) : (
                              existingBid?.manufacturer || '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isAddingBid ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={bidForm.unitPrice}
                                onChange={e =>
                                  setBidForm({ ...bidForm, unitPrice: e.target.value })
                                }
                                onBlur={calculateTotalPrice}
                                placeholder="0.00"
                                className="h-8 w-24"
                              />
                            ) : existingBid ? (
                              `${existingBid.unitPrice.toFixed(2)} ${existingBid.currency}`
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isAddingBid ? (
                              <Input
                                type="number"
                                step="0.01"
                                value={bidForm.totalPrice}
                                onChange={e =>
                                  setBidForm({ ...bidForm, totalPrice: e.target.value })
                                }
                                placeholder="0.00"
                                className="h-8 w-24"
                              />
                            ) : existingBid ? (
                              <span className="font-semibold">
                                {existingBid.totalPrice.toFixed(2)} {existingBid.currency}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isAddingBid ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAddBid(item)}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedItemForBid(null);
                                    setBidForm({
                                      manufacturer: '',
                                      unitPrice: '',
                                      totalPrice: '',
                                      currency: 'KWD',
                                      deliveryTime: '',
                                      deliveryUnit: 'days',
                                      notes: '',
                                      isWinner: false,
                                    });
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : existingBid ? (
                              <Button size="sm" variant="ghost">
                                Edit
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItemForBid(item)}
                              >
                                Add Bid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
