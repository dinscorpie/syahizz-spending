import { useState, useEffect } from 'react';
import { format, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, subDays } from 'date-fns';
import { CalendarIcon, DollarSign, Receipt, TrendingUp, TrendingDown, Plus, BarChart3, User, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccountContext } from '@/hooks/useAccountContext';
import { AccountSelector } from '@/components/AccountSelector';

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
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { currentAccount } = useAccountContext();

  const periodOptions = [
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'last7Days', label: 'Last 7 Days' },
    { value: 'last30Days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const CHART_COLORS = [
    'hsl(217 91% 60%)', // Primary blue
    'hsl(142 76% 36%)', // Green
    'hsl(48 96% 53%)',  // Yellow
    'hsl(25 95% 53%)',  // Orange
    'hsl(262 83% 58%)', // Purple
    'hsl(173 58% 39%)', // Teal
    'hsl(43 74% 66%)',  // Light orange
    'hsl(0 84% 60%)',   // Red
    'hsl(200 71% 73%)', // Light blue
    'hsl(310 56% 67%)', // Pink
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      fetchDashboardData();
    }
  }, [selectedPeriod, customDateRange, currentAccount]);

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
    if (!currentAccount) return;
    
    setIsLoading(true);
    try {
      const dateRange = getDateRange();
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      // Build query based on account type
      let query = supabase
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
        .lte('date', toDate);

      // Filter by account type
      if (currentAccount.type === 'personal') {
        query = query.is('family_id', null);
      } else if (currentAccount.type === 'family') {
        query = query.eq('family_id', currentAccount.familyId);
      }

      const { data: receiptsData, error: receiptsError } = await query.order('date', { ascending: false });

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
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };

  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="font-medium text-card-foreground">{`${label}`}</p>
          <p className="text-primary font-semibold">
            {`Amount: ${formatCurrency(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="font-medium text-card-foreground">{data.payload.category}</p>
          <p className="text-primary font-semibold">
            {`Amount: ${formatCurrency(data.value)}`}
          </p>
          <p className="text-muted-foreground text-sm">
            {`${data.payload.count} items`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="container py-6">
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground mt-1">
                Viewing: {currentAccount?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/profile")}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* Controls Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Account:</span>
              <AccountSelector className="w-[200px]" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[180px]">
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
                    <Button variant="outline" className="w-[250px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from && customDateRange.to ? (
                        <>
                          {format(customDateRange.from, "MMM dd")} - {format(customDateRange.to, "MMM dd")}
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
          
          <Button 
            onClick={() => navigate('/add-transaction')} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Primary Stats Card */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="text-2xl font-bold text-primary">{formatCurrency(dashboardData.totalAmount)}</div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </div>
                <div className="text-center p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.avgTransaction)}</div>
                  <p className="text-sm text-muted-foreground">Avg per Receipt</p>
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {selectedPeriod === 'custom' 
                  ? `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`
                  : periodOptions.find(p => p.value === selectedPeriod)?.label
                }
              </div>
            </CardContent>
          </Card>

          {/* Activity Stats Card */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Activity Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                  <div className="text-2xl font-bold text-orange-600">{dashboardData.transactionCount}</div>
                  <p className="text-sm text-muted-foreground">Receipts</p>
                </div>
                <div className="text-center p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <div className="text-lg font-bold text-purple-600">
                    {dashboardData.categoryBreakdown[0]?.category || 'None'}
                  </div>
                  <p className="text-sm text-muted-foreground">Top Category</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Top spending: {dashboardData.categoryBreakdown[0] 
                    ? formatCurrency(dashboardData.categoryBreakdown[0].amount)
                    : 'No data'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.categoryBreakdown.length > 0 ? (
              <div className="space-y-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => 
                          percent > 0.05 ? `${category} (${(percent * 100).toFixed(0)}%)` : ''
                        }
                        outerRadius={90}
                        innerRadius={30}
                        fill="#8884d8"
                        dataKey="amount"
                        stroke="transparent"
                        strokeWidth={2}
                      >
                        {dashboardData.categoryBreakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            className="hover:opacity-80 transition-opacity duration-200"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={renderPieTooltip} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3">
                  {dashboardData.categoryBreakdown.slice(0, 5).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-background shadow-sm" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(category.amount)}</div>
                        <div className="text-xs text-muted-foreground">{category.count} items</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-6xl mb-4 opacity-20">📊</div>
                <p className="text-lg font-medium">No spending data</p>
                <p className="text-sm">for this period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Spending Chart */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Daily Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.dailySpending.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.dailySpending} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                     <YAxis 
                       tickFormatter={(value) => `RM${value}`}
                       tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                       axisLine={{ stroke: 'hsl(var(--border))' }}
                     />
                    <Tooltip content={renderCustomTooltip} />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      className="hover:opacity-80 transition-opacity duration-200"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
                <div className="text-6xl mb-4 opacity-20">📈</div>
                <p className="text-lg font-medium">No spending data</p>
                <p className="text-sm">for this period</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;