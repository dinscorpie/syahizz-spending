import { useState, useEffect } from "react";
import { useAccountContext } from "@/hooks/useAccountContext";
import { AccountSelector } from "@/components/AccountSelector";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronDown, 
  ChevronRight, 
  Pencil, 
  Trash2,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Receipt {
  id: string;
  vendor_name: string;
  total_amount: number;
  date: string;
  notes?: string;
  family_id?: string;
  user_id: string;
}

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category_path?: string;
  receipt_id: string;
}

const TransactionHistory = () => {
  const { currentAccount } = useAccountContext();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editForm, setEditForm] = useState({
    vendor_name: "",
    total_amount: "",
    date: "",
    notes: ""
  });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    console.log("Account changed:", currentAccount);
    if (currentAccount) {
      setCurrentPage(1); // Reset to first page when account changes
      fetchTransactions();
    }
  }, [currentAccount]);

  useEffect(() => {
    console.log("Page changed:", currentPage);
    if (currentAccount) {
      fetchTransactions();
    }
  }, [currentPage]);

  // Initial load: fetch using RLS (no account filter yet)
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Build the base query
      let query = supabase
        .from("receipts")
        .select("*", { count: 'exact' })
        .order("date", { ascending: false });

      // Apply account filtering (only when we know the current account)
      if (currentAccount?.type === "family" && currentAccount.familyId) {
        query = query.eq("family_id", currentAccount.familyId);
      } else if (currentAccount?.type === "personal" && currentAccount.id) {
        query = query.eq("user_id", currentAccount.id).is("family_id", null);
      }
      // Else: no extra filter — rely on RLS to return only the authenticated user's data

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: receiptsData, error, count } = await query;

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setReceipts(receiptsData || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (receiptId: string) => {
    if (items[receiptId]) return; // Already fetched

    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("name");

      if (error) throw error;

      setItems(prev => ({
        ...prev,
        [receiptId]: data || []
      }));
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    }
  };

  const toggleExpanded = (receiptId: string) => {
    const newExpanded = new Set(expandedReceipts);
    if (newExpanded.has(receiptId)) {
      newExpanded.delete(receiptId);
    } else {
      newExpanded.add(receiptId);
      fetchItems(receiptId);
    }
    setExpandedReceipts(newExpanded);
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditForm({
      vendor_name: receipt.vendor_name,
      total_amount: receipt.total_amount.toString(),
      date: format(new Date(receipt.date), "yyyy-MM-dd"),
      notes: receipt.notes || ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editingReceipt) return;

    try {
      const { error } = await supabase
        .from("receipts")
        .update({
          vendor_name: editForm.vendor_name,
          total_amount: parseFloat(editForm.total_amount),
          date: editForm.date,
          notes: editForm.notes
        })
        .eq("id", editingReceipt.id);

      if (error) throw error;

      setReceipts(prev => prev.map(receipt => 
        receipt.id === editingReceipt.id 
          ? { ...receipt, ...editForm, total_amount: parseFloat(editForm.total_amount) }
          : receipt
      ));

      setEditingReceipt(null);
      toast.success("Receipt updated successfully");
    } catch (error) {
      console.error("Error updating receipt:", error);
      toast.error("Failed to update receipt");
    }
  };

  const handleDelete = async () => {
    if (!deleteReceiptId) return;

    try {
      // Delete items first (foreign key constraint)
      await supabase
        .from("items")
        .delete()
        .eq("receipt_id", deleteReceiptId);

      // Then delete receipt
      const { error } = await supabase
        .from("receipts")
        .delete()
        .eq("id", deleteReceiptId);

      if (error) throw error;

      setReceipts(prev => prev.filter(receipt => receipt.id !== deleteReceiptId));
      setItems(prev => {
        const newItems = { ...prev };
        delete newItems[deleteReceiptId];
        return newItems;
      });

      setDeleteReceiptId(null);
      toast.success("Receipt deleted successfully");
    } catch (error) {
      console.error("Error deleting receipt:", error);
      toast.error("Failed to delete receipt");
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-muted-foreground mt-1">
              Viewing: {currentAccount?.name}
            </p>
          </div>
          <AccountSelector />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-muted-foreground mt-1">
            Viewing: {currentAccount?.name} ({totalCount} transactions)
          </p>
        </div>
        <AccountSelector />
      </div>

      {receipts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No transactions found for this account</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => toggleExpanded(receipt.id)}
                    >
                      {expandedReceipts.has(receipt.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{receipt.vendor_name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-1" />
                            ${receipt.total_amount.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(receipt.date), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(receipt);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedReceipts.has(receipt.id) && (
                    <div className="border-t bg-muted/20 p-4">
                      {items[receipt.id]?.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground mb-3">Items:</h4>
                          {items[receipt.id].map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-background rounded-md">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.category_path && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {item.category_path}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-sm">
                                  {item.quantity} × ${item.unit_price.toFixed(2)}
                                </div>
                                <div className="font-medium">${item.total_price.toFixed(2)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No items found</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReceipt} onOpenChange={() => setEditingReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
            <DialogDescription>
              Update the receipt details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="vendor_name">Vendor Name</Label>
              <Input
                id="vendor_name"
                value={editForm.vendor_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, vendor_name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={editForm.total_amount}
                onChange={(e) => setEditForm(prev => ({ ...prev, total_amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteReceiptId(editingReceipt?.id || null);
                setEditingReceipt(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setEditingReceipt(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReceiptId} onOpenChange={() => setDeleteReceiptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receipt? This action cannot be undone and will also delete all associated items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransactionHistory;