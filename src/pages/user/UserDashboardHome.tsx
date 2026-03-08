/**
 * User Dashboard Home
 */
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { WalletCard } from "@/components/shared/WalletCard";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, ArrowDownToLine, Clock } from "lucide-react";

export default function UserDashboardHome() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back${user?.fullName ? `, ${user.fullName}` : ""}`}
        description="Here's your account overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WalletCard />

        {/* Quick action placeholders */}
        {[
          { icon: ShoppingCart, title: "Buy Data", desc: "Purchase data bundles", path: "/dashboard/orders" },
          { icon: ArrowDownToLine, title: "Top Up", desc: "Fund your wallet", path: "/dashboard/deposits" },
          { icon: Clock, title: "Recent Orders", desc: "View order history", path: "/dashboard/orders" },
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
