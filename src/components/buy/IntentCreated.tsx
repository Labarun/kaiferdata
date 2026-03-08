/**
 * IntentCreated - Success state after purchase intent is created
 */
import type { PurchaseIntent } from "@/services/purchaseIntent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, ArrowRight } from "lucide-react";
import { useState } from "react";

interface IntentCreatedProps {
  intent: PurchaseIntent;
  onNewOrder: () => void;
}

export function IntentCreated({ intent, onNewOrder }: IntentCreatedProps) {
  const [copied, setCopied] = useState(false);
  const snapshot = intent.plan_snapshot as Record<string, unknown>;

  const copyRef = () => {
    navigator.clipboard.writeText(intent.intent_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="border-success/20 bg-success/5">
        <CardContent className="p-5 sm:p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-1">Order Initialized</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your purchase intent has been created. Use the reference below to track your order.
          </p>

          {/* Reference */}
          <div className="bg-card rounded-lg border p-3 flex items-center justify-between gap-2 max-w-xs mx-auto">
            <span className="font-mono text-sm font-bold text-foreground">{intent.intent_reference}</span>
            <button
              onClick={copyRef}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {copied && <p className="text-xs text-success mt-1">Copied!</p>}
        </CardContent>
      </Card>

      {/* Order details */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium text-foreground">{intent.network}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium text-foreground">{String(snapshot.volume || "")} — {String(snapshot.plan_name || "")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{intent.phone_number}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-foreground">₦{Number(intent.amount_expected).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-primary capitalize">{intent.status.replace("_", " ")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onNewOrder} className="flex-1">
          New Order
        </Button>
        <Button asChild className="flex-1">
          <Link to={`/track?ref=${intent.intent_reference}`}>
            Track Order <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Payment integration will be available soon. Your intent reference is saved and can be used to complete payment later.
      </p>
    </div>
  );
}
