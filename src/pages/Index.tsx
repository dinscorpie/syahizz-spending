import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Receipt, BarChart3 } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="text-center mb-8">
          <h1 className="mb-4 text-4xl font-bold">Our Finance</h1>
          <p className="text-xl text-muted-foreground">Track your expenses with AI-powered receipt processing</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Plus className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Add Transaction</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Upload receipts or manually enter transactions with AI processing
              </p>
              <Link to="/add-transaction">
                <Button className="w-full">Add New Transaction</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>View Receipts</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Browse and manage all your saved receipts and transactions
              </p>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary" />
              <CardTitle>Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                View spending analytics and financial insights
              </p>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full">
                  View Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
