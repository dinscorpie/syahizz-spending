import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Calendar, DollarSign, Zap, Receipt, Download } from "lucide-react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface UsageData {
  id: string;
  function_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  receipt_id?: string;
  created_at: string;
}

interface UsageSummary {
  totalTokens: number;
  totalCost: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
}

export const BillingUsage = () => {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;
  const [summary, setSummary] = useState<UsageSummary>({
    totalTokens: 0,
    totalCost: 0,
    promptTokens: 0,
    completionTokens: 0,
    requestCount: 0
  });

  useEffect(() => {
    if (user) {
      setCurrentPage(1); // Reset to first page when period changes
      fetchUsageData();
    }
  }, [user, period]);

  useEffect(() => {
    if (user) {
      fetchUsageData();
    }
  }, [currentPage]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "today":
        return [startOfDay(now), endOfDay(now)];
      case "week":
        return [startOfWeek(now), endOfWeek(now)];
      case "month":
        return [startOfMonth(now), endOfMonth(now)];
      default:
        return [null, null];
    }
  };

  const fetchUsageData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let baseQuery = supabase
        .from("api_usage")
        .select("*", { count: 'exact' })
        .eq("user_id", user.id);

      const [startDate, endDate] = getDateRange();
      if (startDate && endDate) {
        baseQuery = baseQuery
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
      }

      // Get total count for pagination
      const { count } = await baseQuery;
      setTotalCount(count || 0);

      // Get paginated data
      const { data, error } = await baseQuery
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      setUsageData(data || []);

      // Calculate summary from all data (not just current page)
      const { data: summaryData, error: summaryError } = await supabase
        .from("api_usage")
        .select("total_tokens, cost_usd, prompt_tokens, completion_tokens")
        .eq("user_id", user.id)
        .then(result => {
          if (startDate && endDate && !result.error) {
            return supabase
              .from("api_usage")
              .select("total_tokens, cost_usd, prompt_tokens, completion_tokens")
              .eq("user_id", user.id)
              .gte("created_at", startDate.toISOString())
              .lte("created_at", endDate.toISOString());
          }
          return result;
        });

      if (!summaryError && summaryData) {
        const totalTokens = summaryData.reduce((sum, item) => sum + item.total_tokens, 0);
        const totalCost = summaryData.reduce((sum, item) => sum + parseFloat(item.cost_usd.toString()), 0);
        const promptTokens = summaryData.reduce((sum, item) => sum + item.prompt_tokens, 0);
        const completionTokens = summaryData.reduce((sum, item) => sum + item.completion_tokens, 0);

        setSummary({
          totalTokens,
          totalCost,
          promptTokens,
          completionTokens,
          requestCount: summaryData.length
        });
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ["Date", "Function", "Model", "Prompt Tokens", "Completion Tokens", "Total Tokens", "Cost (USD)", "Receipt ID"].join(","),
      ...usageData.map(item => [
        format(new Date(item.created_at), "yyyy-MM-dd HH:mm:ss"),
        item.function_name,
        item.model,
        item.prompt_tokens,
        item.completion_tokens,
        item.total_tokens,
        item.cost_usd,
        item.receipt_id || ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usage_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading usage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Usage & Billing</h2>
          <p className="text-muted-foreground">Track your AI processing costs and token usage</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(value: typeof period) => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData} disabled={usageData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">{summary.requestCount} requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Input + Output tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Input Tokens</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.promptTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">${((summary.promptTokens / 1000000) * 2).toFixed(4)} cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Output Tokens</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completionTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">${((summary.completionTokens / 1000000) * 8).toFixed(4)} cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Usage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No usage data found for the selected period
            </p>
          ) : (
            <div className="space-y-4">
              {usageData.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.function_name}</Badge>
                      <span className="text-sm text-muted-foreground">{item.model}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.created_at), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                    {item.receipt_id && (
                      <p className="text-xs text-muted-foreground">Receipt: {item.receipt_id}</p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-semibold">${parseFloat(item.cost_usd.toString()).toFixed(6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.total_tokens.toLocaleString()} tokens
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.prompt_tokens} input · {item.completion_tokens} output
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalCount > itemsPerPage && (
                <div className="flex justify-center mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.ceil(totalCount / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(totalCount / itemsPerPage);
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 2) return true;
                          return false;
                        })
                        .map((page, index, array) => (
                          <PaginationItem key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / itemsPerPage), currentPage + 1))}
                          className={currentPage >= Math.ceil(totalCount / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};