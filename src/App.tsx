import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AccountProvider } from "@/hooks/useAccountContext";
import AddTransaction from "./pages/AddTransaction";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import TransactionHistory from "./pages/TransactionHistory";
import AppNavigation from "./components/AppNavigation";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <AccountProvider>
      <div className="min-h-screen bg-background">
        <AppNavigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<TransactionHistory />} />
          <Route path="/add-transaction" element={<AddTransaction />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </AccountProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
