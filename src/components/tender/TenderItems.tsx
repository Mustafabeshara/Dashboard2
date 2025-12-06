/**
 * Tender Items Management Component
 * Editable table of tender line items with participation toggle
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Package, Plus, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TenderItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: number;
  unit: string;
  specifications?: string | null;
  isParticipating: boolean;
  estimatedPrice?: number | null;
  notes?: string | null;
}

interface TenderItemsProps {
  tenderId: string;
  isReadOnly?: boolean;
}

export function TenderItems({ tenderId, isReadOnly = false }: TenderItemsProps) {
  const [items, setItems] = useState<TenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TenderItem>>({});

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tenderId}/items`);
      const result = await response.json();

      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to load tender items');
    } finally {
      setLoading(false);
    }
  }, [tenderId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleEdit = (item: TenderItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const response = await fetch(`/api/tenders/${tenderId}/items/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Item updated successfully');
        fetchItems();
        setEditingId(null);
        setEditForm({});
      } else {
        toast.error(result.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleToggleParticipation = async (itemId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/tenders/${tenderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isParticipating: !currentValue }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          !currentValue ? 'Item marked for participation' : 'Item excluded from participation'
        );
        fetchItems();
      } else {
        toast.error(result.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error toggling participation:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/tenders/${tenderId}/items/${itemId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Item deleted successfully');
        fetchItems();
      } else {
        toast.error(result.error || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Tender Items
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
              <Package className="h-5 w-5" />
              Tender Items ({items.length})
            </CardTitle>
            <CardDescription>
              Manage line items. Uncheck items you are not participating in.
            </CardDescription>
          </div>
          {!isReadOnly && (
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No items added yet. Items from AI extraction will appear here.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">✓</TableHead>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Qty</TableHead>
                  <TableHead className="w-20">Unit</TableHead>
                  <TableHead className="w-32">Est. Price</TableHead>
                  {!isReadOnly && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const isEditing = editingId === item.id;

                  return (
                    <TableRow
                      key={item.id}
                      className={!item.isParticipating ? 'bg-gray-50 opacity-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={item.isParticipating}
                          onCheckedChange={() =>
                            handleToggleParticipation(item.id, item.isParticipating)
                          }
                          disabled={isReadOnly}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.itemNumber}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editForm.description || ''}
                            onChange={e =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.specifications && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.specifications}
                              </p>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editForm.quantity || ''}
                            onChange={e =>
                              setEditForm({ ...editForm, quantity: parseInt(e.target.value) })
                            }
                            className="h-8 w-20"
                          />
                        ) : (
                          <span className="font-medium">{item.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editForm.unit || ''}
                            onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                            className="h-8 w-16"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.estimatedPrice || ''}
                            onChange={e =>
                              setEditForm({
                                ...editForm,
                                estimatedPrice: parseFloat(e.target.value),
                              })
                            }
                            className="h-8"
                            placeholder="0.00"
                          />
                        ) : (
                          item.estimatedPrice && (
                            <span className="font-medium">
                              {item.estimatedPrice.toFixed(2)} KWD
                            </span>
                          )
                        )}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
