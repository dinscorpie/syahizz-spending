import { useState, useEffect } from "react";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useAuth } from "@/hooks/useAuth";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
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

interface Category {
  id: string;
  name: string;
}

const TransactionHistory = () => {
  const { currentAccount } = useAccountContext();
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editForm, setEditForm] = useState({
    vendor_name: "",
    total_amount: "",
    date: "",
    notes: ""
  });
  const [editingItems, setEditingItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "1",
    unit_price: "",
    category_path: ""
  });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    console.log("Account or category changed:", currentAccount, selectedCategory);
    if (currentAccount) {
      setCurrentPage(1); // Reset to first page when account or category changes
      fetchTransactions();
    }
  }, [currentAccount, selectedCategory]);

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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Build the base query with joins to get category information
      let query = supabase
        .from("receipts")
        .select(`
          *,
          items!inner (
            id,
            name,
            category_id,
            category_path,
            categories (
              id,
              name
            )
          )
        `, { count: 'exact' })
        .order("date", { ascending: false });

      // Apply account filtering (only when we know the current account)
      if (currentAccount?.type === "family" && currentAccount.familyId) {
        query = query.eq("family_id", currentAccount.familyId);
      } else if (currentAccount?.type === "personal" && user?.id) {
        query = query.eq("user_id", user.id).is("family_id", null);
      }

      // Apply category filtering
      if (selectedCategory !== "all") {
        query = query.eq("items.category_id", selectedCategory);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: receiptsData, error, count } = await query;

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Process receipts to remove duplicates (due to joins)
      const uniqueReceipts = receiptsData?.reduce((acc: Receipt[], receipt: any) => {
        const existingIndex = acc.findIndex(r => r.id === receipt.id);
        if (existingIndex === -1) {
          acc.push({
            id: receipt.id,
            vendor_name: receipt.vendor_name,
            total_amount: receipt.total_amount,
            date: receipt.date,
            notes: receipt.notes,
            family_id: receipt.family_id,
            user_id: receipt.user_id
          });
        }
        return acc;
      }, []) || [];

      setReceipts(uniqueReceipts);
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

  const handleEdit = async (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditForm({
      vendor_name: receipt.vendor_name,
      total_amount: receipt.total_amount.toString(),
      date: format(new Date(receipt.date), "yyyy-MM-dd"),
      notes: receipt.notes || ""
    });
    
    // Fetch items for editing
    if (!items[receipt.id]) {
      await fetchItems(receipt.id);
    }
    setEditingItems(items[receipt.id] || []);
  };

  const handleSaveEdit = async () => {
    if (!editingReceipt) return;

    try {
      // Update receipt
      const { error: receiptError } = await supabase
        .from("receipts")
        .update({
          vendor_name: editForm.vendor_name,
          total_amount: parseFloat(editForm.total_amount),
          date: editForm.date,
          notes: editForm.notes
        })
        .eq("id", editingReceipt.id);

      if (receiptError) throw receiptError;

      // Update items
      for (const item of editingItems) {
        const { error: itemError } = await supabase
          .from("items")
          .update({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category_path: item.category_path
          })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === editingReceipt.id 
          ? { ...receipt, ...editForm, total_amount: parseFloat(editForm.total_amount) }
          : receipt
      ));

      setItems(prev => ({
        ...prev,
        [editingReceipt.id]: editingItems
      }));

      setEditingReceipt(null);
      setEditingItems([]);
      toast.success("Receipt and items updated successfully");
    } catch (error) {
      console.error("Error updating receipt:", error);
      toast.error("Failed to update receipt");
    }
  };

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    setEditingItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setEditingItems(prev => prev.filter(item => item.id !== itemId));
      if (editingReceipt) {
        setItems(prev => ({
          ...prev,
          [editingReceipt.id]: prev[editingReceipt.id]?.filter(item => item.id !== itemId) || []
        }));
      }
      toast.success("Item deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleAddItem = async () => {
    if (!editingReceipt || !newItem.name || !newItem.unit_price) return;

    try {
      const totalPrice = parseInt(newItem.quantity) * parseFloat(newItem.unit_price);
      
      const { data, error } = await supabase
        .from("items")
        .insert({
          name: newItem.name,
          quantity: parseInt(newItem.quantity),
          unit_price: parseFloat(newItem.unit_price),
          total_price: totalPrice,
          category_path: newItem.category_path || null,
          receipt_id: editingReceipt.id
        })
        .select()
        .single();

      if (error) throw error;

      setEditingItems(prev => [...prev, data]);
      setItems(prev => ({
        ...prev,
        [editingReceipt.id]: [...(prev[editingReceipt.id] || []), data]
      }));

      setNewItem({
        name: "",
        quantity: "1",
        unit_price: "",
        category_path: ""
      });

      toast.success("Item added successfully");
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
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
      <div className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <p className="text-muted-foreground mt-1">
              Viewing: {currentAccount?.name}
            </p>
          </div>
          <AccountSelector className="w-full sm:w-[200px]" />
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
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <p className="text-muted-foreground mt-1">
            Viewing: {currentAccount?.name} ({totalCount} transactions)
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 bg-background border">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50 max-h-60 overflow-y-auto">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AccountSelector className="w-full sm:w-[200px]" />
        </div>
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
                            RM{receipt.total_amount.toFixed(2)}
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
                                   {item.quantity} × RM{item.unit_price.toFixed(2)}
                                 </div>
                                 <div className="font-medium">RM{item.total_price.toFixed(2)}</div>
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
      <Dialog open={!!editingReceipt} onOpenChange={() => {
        setEditingReceipt(null);
        setEditingItems([]);
        setNewItem({ name: "", quantity: "1", unit_price: "", category_path: "" });
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
            <DialogDescription>
              Update the receipt details and manage items
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Receipt Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Receipt Details</h3>
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

            {/* Items Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Items</h3>
              
              {/* Existing Items */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {editingItems.map((item, index) => (
                  <Card key={item.id} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Input
                          value={item.name}
                          onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                          placeholder="Item name"
                          className="flex-1 mr-2"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Qty"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          placeholder="Unit price"
                        />
                      </div>
                      <Select
                        value={item.category_path || ''}
                        onValueChange={(value) => handleItemChange(index, 'category_path', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No category</SelectItem>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-muted-foreground">
                        Total: RM{item.total_price.toFixed(2)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add New Item */}
              <Card className="p-3 border-dashed">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Add New Item</h4>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Item name"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                      placeholder="Quantity"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: e.target.value }))}
                      placeholder="Unit price"
                    />
                  </div>
                  <Select
                    value={newItem.category_path}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, category_path: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No category</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddItem} 
                    className="w-full" 
                    size="sm"
                    disabled={!newItem.name || !newItem.unit_price}
                  >
                    Add Item
                  </Button>
                </div>
              </Card>
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
              Delete Receipt
            </Button>
            <Button variant="outline" onClick={() => {
              setEditingReceipt(null);
              setEditingItems([]);
              setNewItem({ name: "", quantity: "1", unit_price: "", category_path: "" });
            }}>
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