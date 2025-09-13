import { useState, useEffect } from 'react';
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, subDays } from 'date-fns';
import { CalendarIcon, DollarSign, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface DashboardData {
  totalAmount: number;
  transactionCount: number;
  avgTransaction: number;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  dailySpending: Array<{
    date: string;
    amount: number;
  }>;
}

interface DateRange {
  from: Date;
  to: Date;
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalAmount: 0,
    transactionCount: 0,
    avgTransaction: 0,
    categoryBreakdown: [],
    dailySpending: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  const periodOptions = [
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'last7Days', label: 'Last 7 Days' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, customDateRange]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getDateRange = (): DateRange => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'thisWeek':
        return { from: startOfWeek(now), to: endOfWeek(now) };
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'thisYear':
        return { from: startOfYear(now), to: endOfYear(now) };
      case 'last7Days':
        return { from: subDays(now, 6), to: now };
      case 'last30Days':
        return { from: subDays(now, 29), to: now };
      case 'custom':
        return customDateRange;
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const dateRange = getDateRange();
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch receipts with items and categories
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          *,
          items (
            *,
            categories (
              name
            )
          )
        `)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: false });

      if (receiptsError) throw receiptsError;

      const receipts = receiptsData || [];
      
      // Calculate summary statistics
      const totalAmount = receipts.reduce((sum, receipt) => sum + Number(receipt.total_amount), 0);
      const transactionCount = receipts.length;
      const avgTransaction = transactionCount > 0 ? totalAmount / transactionCount : 0;

      // Calculate category breakdown
      const categoryMap = new Map();
      receipts.forEach(receipt => {
        receipt.items?.forEach((item: any) => {
          const categoryName = item.categories?.name || 'Uncategorized';
          const existing = categoryMap.get(categoryName) || { amount: 0, count: 0 };
          categoryMap.set(categoryName, {
            amount: existing.amount + Number(item.total_price),
            count: existing.count + 1,
          });
        });
      });

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
      })).sort((a, b) => b.amount - a.amount);

      // Calculate daily spending
      const dailyMap = new Map();
      receipts.forEach(receipt => {
        const date = format(new Date(receipt.date), 'MM/dd');
        const existing = dailyMap.get(date) || 0;
        dailyMap.set(date, existing + Number(receipt.total_amount));
      });

      const dailySpending = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14); // Show last 14 days

      setDashboardData({
        totalAmount,
        transactionCount,
        avgTransaction,
        categoryBreakdown,
        dailySpending,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    if (value === 'custom') {
      setShowCustomPicker(true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-primary">
            {`Amount: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your financial overview</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedPeriod === 'custom' && (
            <Popover open={showCustomPicker} onOpenChange={setShowCustomPicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange.from && customDateRange.to ? (
                    <>
                      {format(customDateRange.from, "LLL dd, y")} -{" "}
                      {format(customDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange.from}
                  selected={customDateRange}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomDateRange({ from: range.from, to: range.to });
                      setShowCustomPicker(false);
                    }
                  }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'custom' 
                ? `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`
                : periodOptions.find(p => p.value === selectedPeriod)?.label
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.transactionCount}</div>
            <p className="text-xs text-muted-foreground">
              Number of receipts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.avgTransaction)}</div>
            <p className="text-xs text-muted-foreground">
              Per receipt
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.categoryBreakdown[0]?.category || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.categoryBreakdown[0] 
                ? formatCurrency(dashboardData.categoryBreakdown[0].amount)
                : 'No data'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => 
                          `${category} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {dashboardData.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-2">
                  {dashboardData.categoryBreakdown.slice(0, 5).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(category.amount)}</div>
                        <div className="text-xs text-muted-foreground">{category.count} items</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No spending data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Spending Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.dailySpending.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                No spending data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;