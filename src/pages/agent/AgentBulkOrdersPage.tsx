/**
 * Agent Bulk Orders — /agent/bulk
 * Premium info page directing agents to use the existing wallet-funded
 * bulk flow on the user dashboard. Strict additive: doesn't replace the
 * single-order pipeline, just surfaces where to find batch tools.
 */
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, ShoppingCart, Wallet, Sparkles } from "lucide-react";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";

export default function AgentBulkOrdersPage() {
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Bulk Orders" description="Buy data for many recipients at once." />
      <SubscriptionGate message="Subscribe to unlock bulk ordering.">
        <BulkInner />
      </SubscriptionGate>
    </div>
  );
}

function BulkInner() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-success/5">
        <CardContent className="p-5 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <p className="text-base font-semibold">Bulk delivery, one wallet swipe</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Top up your personal wallet, then place orders one after another for
            different beneficiaries — each is delivered in seconds. Bulk orders
            are charged at <strong>your agent pricing</strong> and earn profit
            into your earnings balance once delivered.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link to="/dashboard/wallet"><Wallet className="h-3.5 w-3.5 mr-1.5" /> Top up wallet</Link>
            </Button>
            <Button asChild size="sm" className="text-xs">
              <Link to="/dashboard/buy"><ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Place orders</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">How profit works on bulk orders</p>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Personal wallet pays the cost (your agent base price).</li>
            <li>Customer pays the selling price you set on your storefront.</li>
            <li>Profit lands in your separate earnings balance once the order is delivered.</li>
            <li>Withdraw earnings to MoMo from <Link to="/agent/withdraw" className="text-primary underline">/agent/withdraw</Link>.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
