/**
 * Agent Dashboard Home
 */
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { WalletCard } from "@/components/shared/WalletCard";
import { Card, CardContent } from "@/components/ui/card";
import { Store, ShoppingCart, DollarSign, CreditCard } from "lucide-react";

export default function AgentDashboardHome() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back${user?.fullName ? `, ${user.fullName}` : ""}`}
        description="Agent dashboard overview"
      />

      {/* Status area placeholder */}
      <Card className="mb-4 border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Agent Status</p>
            <p className="text-xs text-muted-foreground">Subscription & verification status will appear here</p>
          </div>
          <CreditCard className="h-5 w-5 text-primary" />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WalletCard />
        {[
          { icon: Store, title: "My Store", desc: "Manage your store products" },
          { icon: ShoppingCart, title: "Orders", desc: "View and manage orders" },
          { icon: DollarSign, title: "Earnings", desc: "Track your commissions" },
        ].map((item) => (
          <Card key={item.title} className="hover:shadow-sm transition-shadow cursor-pointer">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
