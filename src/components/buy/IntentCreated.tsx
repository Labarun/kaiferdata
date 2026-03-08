/**
 * IntentCreated - Premium success state with glass card
 */
import type { PurchaseIntent } from "@/services/purchaseIntent";
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
    <div className="space-y-5 animate-fade-in">
      {/* Success header */}
      <div className="text-center py-6">
        <div className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="h-7 w-7 text-success" />
        </div>
        <h3 className="text-lg font-extrabold text-foreground">Order Initialized</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Save your reference to track this order
        </p>
      </div>

      {/* Reference card */}
      <div className="glass rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reference</p>
          <p className="font-mono text-sm font-bold text-foreground mt-0.5 truncate">{intent.intent_reference}</p>
        </div>
        <button
          onClick={copyRef}
          className="shrink-0 h-9 w-9 rounded-lg bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      {copied && <p className="text-[11px] text-success font-semibold text-center -mt-3">Copied to clipboard!</p>}

      {/* Details */}
      <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2.5 text-sm">
        <Row label="Network" value={intent.network} />
        <Row label="Plan" value={`${String(snapshot.volume || "")} — ${String(snapshot.plan_name || "")}`} />
        <Row label="Phone" value={intent.phone_number} />
        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount</span>
          <span className="text-base font-extrabold text-primary">GH₵{Number(intent.amount_expected).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status</span>
          <span className="text-xs font-bold text-primary capitalize px-2 py-0.5 rounded-full bg-primary/10">{intent.status.replace("_", " ")}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onNewOrder} className="flex-1 h-11 rounded-xl font-semibold">
          New Order
        </Button>
        <Button asChild className="flex-1 h-11 rounded-xl font-bold shadow-sm">
          <Link to={`/track?ref=${intent.intent_reference}`}>
            Track Order <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Payment integration coming soon. Your reference is saved for future completion.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}