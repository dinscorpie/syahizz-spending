import { useState, useEffect } from "react";
import { useAccountContext } from "@/hooks/useAccountContext";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
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
  ChevronRight as ChevronRightIcon,
  Filter,
  ArrowUp,
  ArrowDown,
  List,
  Receipt as ReceiptIcon
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
  category_id: string;
  receipt_id: string;
  receipts?: Receipt;
}

interface Category {
  id: string;
  name: string;
}

const TransactionHistory = () => {
  const { currentAccount } = useAccountContext();
  const { user } = useAuth();
  const { getDisplayName, familyMembers } = useFamilyData();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "user">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"receipt" | "item">("receipt");
  const [editForm, setEditForm] = useState({
    vendor_name: "",
    total_amount: "",
    date: "",
    notes: ""
  });
  const [editItemForm, setEditItemForm] = useState({
    name: "",
    quantity: "",
    unit_price: "",
    category_id: ""
  });
  const [editingItems, setEditingItems] = useState<Item[]>([]);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "1",
    unit_price: "",
    category_id: ""
  });

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      setCurrentPage(1);
      if (viewMode === "receipt") {
        fetchTransactions();
      } else {
        fetchAllItems();
      }
    }
  }, [currentAccount, selectedCategory, sortBy, sortOrder, viewMode]);

  useEffect(() => {
    if (currentAccount) {
      if (viewMode === "receipt") {
        fetchTransactions();
      } else {
        fetchAllItems();
      }
    }
  }, [currentPage]);

  // Initial load
  useEffect(() => {
    fetchCategories();
    if (currentAccount) {
      if (viewMode === "receipt") {
        fetchTransactions();
      } else {
        fetchAllItems();
      }
    }
  }, []);

  // Clear cache when filters change
  useEffect(() => {
    if (currentAccount) {
      setItems({});
      if (viewMode === "receipt") {
        fetchTransactions();
      } else {
        fetchAllItems();
      }
    }
  }, [selectedCategory, viewMode]);

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
      
      let query = supabase
        .from("receipts")
        .select(`
          *,
          items (
            id,
            name,
            category_id,
            categories (
              id,
              name
            )
          )
        `, { count: 'exact' });

      // Apply sorting
      if (sortBy === "date") {
        query = query.order("date", { ascending: sortOrder === "asc" });
      } else if (sortBy === "amount") {
        query = query.order("total_amount", { ascending: sortOrder === "asc" });
      } else if (sortBy === "user") {
        query = query.order("user_id", { ascending: sortOrder === "asc" });
      }

      // Apply account filtering
      if (currentAccount?.type === "family" && currentAccount.familyId) {
        query = query.eq("family_id", currentAccount.familyId);
      } else if (currentAccount?.type === "personal" && user?.id) {
        query = query.eq("user_id", user.id).is("family_id", null);
      } else if (currentAccount?.type === "my-spending" && user?.id) {
        query = query.eq("added_by", user.id);
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

      // Process receipts to remove duplicates
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

  const fetchAllItems = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("items")
        .select(`
          *,
          receipts!inner (
            id,
            vendor_name,
            total_amount,
            date,
            user_id,
            family_id,
            added_by
          ),
          categories (
            id,
            name
          )
        `, { count: 'exact' });

      // Apply account filtering
      if (currentAccount?.type === "family" && currentAccount.familyId) {
        query = query.eq("receipts.family_id", currentAccount.familyId);
      } else if (currentAccount?.type === "personal" && user?.id) {
        query = query.eq("receipts.user_id", user.id)
          .filter("receipts.family_id", "is", null);
      } else if (currentAccount?.type === "my-spending" && user?.id) {
        query = query.eq("receipts.added_by", user.id);
      }

      // Apply category filtering
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      // Apply sorting
      if (sortBy === "date") {
        query = query.order("date", { foreignTable: "receipts", ascending: sortOrder === "asc" });
      } else if (sortBy === "amount") {
        query = query.order("total_price", { ascending: sortOrder === "asc" });
      } else if (sortBy === "user") {
        query = query.order("user_id", { foreignTable: "receipts", ascending: sortOrder === "asc" });
      } else {
        // Default sorting by item name
        query = query.order("name", { ascending: sortOrder === "asc" });
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: itemsData, error, count } = await query;

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      setAllItems(itemsData || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (receiptId: string): Promise<Item[]> => {
    if (items[receiptId]) {
      const cachedItems = items[receiptId];
      if (selectedCategory === "all") {
        return cachedItems;
      }
      return cachedItems.filter(item => item.category_id === selectedCategory);
    }

    try {
      let query = supabase
        .from("items")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("name");

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      setItems(prev => ({
        ...prev,
        [receiptId]: data || []
      }));

      return data || [];
    } catch (error) {
      console.error("Error fetching items:", error);
      toast.error("Failed to load items");
      return [];
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

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setEditItemForm({
      name: item.name,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      category_id: item.category_id
    });
  };

  const recalculateReceiptTotal = async (receiptId: string) => {
    try {
      // Get all items for this receipt
      const { data: allItems, error } = await supabase
        .from("items")
        .select("total_price")
        .eq("receipt_id", receiptId);

      if (error) throw error;

      // Calculate new total
      const newTotal = (allItems || []).reduce((sum, item) => sum + item.total_price, 0);

      // Update receipt total
      const { error: updateError } = await supabase
        .from("receipts")
        .update({ total_amount: newTotal })
        .eq("id", receiptId);

      if (updateError) throw updateError;

      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === receiptId 
          ? { ...receipt, total_amount: newTotal }
          : receipt
      ));

      return newTotal;
    } catch (error) {
      console.error("Error recalculating receipt total:", error);
      throw error;
    }
  };

  const handleSaveItemEdit = async () => {
    if (!editingItem) return;

    try {
      const totalPrice = parseInt(editItemForm.quantity) * parseFloat(editItemForm.unit_price);
      
      // Update item
      const { error: itemError } = await supabase
        .from("items")
        .update({
          name: editItemForm.name,
          quantity: parseInt(editItemForm.quantity),
          unit_price: parseFloat(editItemForm.unit_price),
          total_price: totalPrice,
          category_id: editItemForm.category_id
        })
        .eq("id", editingItem.id);

      if (itemError) throw itemError;

      // Recalculate receipt total
      const receiptId = editingItem.receipts?.id || editingItem.receipt_id;
      if (receiptId) {
        await recalculateReceiptTotal(receiptId);
      }

      // Update local state for items view
      if (viewMode === "item") {
        setAllItems(prev => prev.map(item => 
          item.id === editingItem.id 
            ? { 
                ...item, 
                name: editItemForm.name,
                quantity: parseInt(editItemForm.quantity),
                unit_price: parseFloat(editItemForm.unit_price),
                total_price: totalPrice,
                category_id: editItemForm.category_id
              }
            : item
        ));
      }

      // Update cached items for receipt view
      setItems(prev => {
        const updatedItems = { ...prev };
        Object.keys(updatedItems).forEach(receiptId => {
          updatedItems[receiptId] = updatedItems[receiptId].map(item =>
            item.id === editingItem.id
              ? {
                  ...item,
                  name: editItemForm.name,
                  quantity: parseInt(editItemForm.quantity),
                  unit_price: parseFloat(editItemForm.unit_price),
                  total_price: totalPrice,
                  category_id: editItemForm.category_id
                }
              : item
          );
        });
        return updatedItems;
      });

      setEditingItem(null);
      toast.success("Item updated successfully and receipt total recalculated");
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const handleEdit = async (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setEditForm({
      vendor_name: receipt.vendor_name,
      total_amount: receipt.total_amount.toString(),
      date: format(new Date(receipt.date), "yyyy-MM-dd"),
      notes: receipt.notes || ""
    });
    
    const loaded = await fetchItems(receipt.id);
    setEditingItems(loaded);
  };

  const handleSaveEdit = async () => {
    if (!editingReceipt) return;

    try {
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

      for (const item of editingItems) {
        const { error: itemError } = await supabase
          .from("items")
          .update({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            category_id: item.category_id
          })
          .eq("id", item.id);

        if (itemError) throw itemError;
      }

      // Recalculate receipt total based on actual items
      const newTotal = await recalculateReceiptTotal(editingReceipt.id);

      setReceipts(prev => prev.map(receipt => 
        receipt.id === editingReceipt.id 
          ? { 
              ...receipt, 
              vendor_name: editForm.vendor_name,
              date: editForm.date,
              notes: editForm.notes,
              total_amount: newTotal 
            }
          : receipt
      ));

      setItems(prev => ({
        ...prev,
        [editingReceipt.id]: editingItems
      }));

      setEditingReceipt(null);
      setEditingItems([]);
      toast.success("Receipt and items updated successfully with recalculated total");
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
          category_id: newItem.category_id,
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
        category_id: ""
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
      await supabase
        .from("items")
        .delete()
        .eq("receipt_id", deleteReceiptId);

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
            Viewing: {currentAccount?.name} ({totalCount} {viewMode === "receipt" ? "transactions" : "items"})
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <Button
              variant={viewMode === "receipt" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("receipt")}
              className="h-8 px-3"
            >
              <ReceiptIcon className="h-4 w-4 mr-1" />
              Receipts
            </Button>
            <Button
              variant={viewMode === "item" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("item")}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-1" />
              Items
            </Button>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: "date" | "amount" | "user") => setSortBy(value)}>
              <SelectTrigger className="w-32 bg-background border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
              className="px-2"
            >
              {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
          </div>

          {/* Category Filter */}
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

      {viewMode === "receipt" ? (
        receipts.length === 0 ? (
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
                            {format(new Date(receipt.date), "dd MMM yyyy")}
                            <span>• By: {getDisplayName(receipt.user_id)}</span>
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
                                  {item.category_id && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {categories.find((c) => c.id === item.category_id)?.name || 'Unknown'}
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
        )
      ) : (
        // Item View
        allItems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No items found for this account</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {allItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{item.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {categories.find((c) => c.id === item.category_id)?.name || 'Unknown'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            RM{item.total_price.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.receipts && format(new Date(item.receipts.date), "dd MMM yyyy")}
                          </div>
                          <div>From: {item.receipts?.vendor_name}</div>
                          <div>By: {getDisplayName(item.receipts?.user_id)}</div>
                          <div>{item.quantity} × RM{item.unit_price.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination for Item View */}
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
        )
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReceipt} onOpenChange={() => {
        setEditingReceipt(null);
        setEditingItems([]);
        setNewItem({ name: "", quantity: "1", unit_price: "", category_id: "" });
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Receipt</DialogTitle>
            <DialogDescription>
              Update the receipt details and manage items
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Items ({editingItems.length})</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {editingItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No items found</p>
                ) : (
                  editingItems.map((item, index) => (
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
                        value={item.category_id || (categories.length > 0 ? categories[0].id : 'default')}
                        onValueChange={(value) => handleItemChange(index, 'category_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border z-50 max-h-60 overflow-y-auto">
                          {categories.length === 0 ? (
                            <SelectItem value="default">Loading categories...</SelectItem>
                          ) : (
                            categories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-muted-foreground">
                        Total: RM{item.total_price.toFixed(2)}
                      </div>
                    </div>
                  </Card>
                 ))
                )}

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
                    value={newItem.category_id}
                    onValueChange={(value) => setNewItem(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50 max-h-60 overflow-y-auto">
                      {categories.length === 0 ? (
                        <SelectItem value="loading">Loading categories...</SelectItem>
                      ) : (
                        categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAddItem} 
                    className="w-full" 
                    size="sm"
                    disabled={!newItem.name || !newItem.unit_price || !newItem.category_id}
                  >
                    Add Item
                  </Button>
                </div>
              </Card>
            </div>
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
              setNewItem({ name: "", quantity: "1", unit_price: "", category_id: "" });
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => {
        setEditingItem(null);
        setEditItemForm({ name: "", quantity: "", unit_price: "", category_id: "" });
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the item details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                value={editItemForm.name}
                onChange={(e) => setEditItemForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Item name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item_quantity">Quantity</Label>
                <Input
                  id="item_quantity"
                  type="number"
                  value={editItemForm.quantity}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Qty"
                />
              </div>
              <div>
                <Label htmlFor="item_price">Unit Price</Label>
                <Input
                  id="item_price"
                  type="number"
                  step="0.01"
                  value={editItemForm.unit_price}
                  onChange={(e) => setEditItemForm(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="Unit price"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="item_category">Category</Label>
              <Select
                value={editItemForm.category_id}
                onValueChange={(value) => setEditItemForm(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-popover border z-50 max-h-60 overflow-y-auto">
                  {categories.length === 0 ? (
                    <SelectItem value="loading">Loading categories...</SelectItem>
                  ) : (
                    categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {editItemForm.quantity && editItemForm.unit_price && (
              <div className="text-sm text-muted-foreground">
                Total: RM{(parseInt(editItemForm.quantity) * parseFloat(editItemForm.unit_price)).toFixed(2)}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setEditingItem(null);
              setEditItemForm({ name: "", quantity: "", unit_price: "", category_id: "" });
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveItemEdit}
              disabled={!editItemForm.name || !editItemForm.quantity || !editItemForm.unit_price || !editItemForm.category_id}
            >
              Save Changes
            </Button>
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