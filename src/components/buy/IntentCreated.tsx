/**
 * IntentCreated — Premium light glass success state
 */
import type { PurchaseIntent } from "@/services/purchaseIntent";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy, ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { AnimatedCheckmark } from "@/components/shared/AnimatedCheckmark";

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
    <div className="space-y-5 animate-fade-in-up">
      <div className="text-center py-6">
        <div className="h-14 w-14 rounded-2xl glass-premium flex items-center justify-center mx-auto mb-4 glow-soft">
          <AnimatedCheckmark size={24} className="text-success" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Order Initialized</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Save your reference to track this order
        </p>
      </div>

      <div className="glass-premium rounded-2xl p-4 flex items-center justify-between gap-3 glow-brand shimmer-edge overflow-hidden">
        <div className="min-w-0 relative z-10">
          <p className="text-[10px] text-muted-foreground/55 uppercase tracking-wider font-semibold">
            Reference
          </p>
          <p className="font-mono text-sm font-bold text-foreground mt-0.5 truncate">
            {intent.intent_reference}
          </p>
        </div>
        <button
          onClick={copyRef}
          className="relative z-10 shrink-0 h-10 w-10 rounded-xl glass-card hover:glass-elevated flex items-center justify-center transition-all active:scale-95"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      {copied && (
        <p className="text-[11px] text-success text-center -mt-3 font-medium animate-fade-in">
          Copied!
        </p>
      )}

      <div className="rounded-2xl glass-card divide-y divide-border/30">
        <Row label="Network" value={intent.network} />
        <Row
          label="Plan"
          value={`${String(snapshot.volume || "")} — ${String(snapshot.plan_name || "")}`}
        />
        <Row label="Phone" value={intent.phone_number} mono />
        <div className="flex items-center justify-between px-4 py-3.5">
          <span className="text-xs text-muted-foreground font-medium">Amount</span>
          <span className="text-lg font-bold text-primary">
            GH₵{Number(intent.amount_expected).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground font-medium">Status</span>
          <span className="text-[11px] text-primary font-semibold capitalize px-3 py-1 rounded-full bg-primary/8 border border-primary/15">
            {intent.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onNewOrder}
          className="flex-1 h-12"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          New Order
        </Button>
        <Button asChild className="flex-[2] h-12">
          <Link to={`/track?ref=${intent.intent_reference}`}>
            Track Order
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <p className="text-[11px] text-center text-muted-foreground/50">
        Payment integration coming soon. Your reference is saved.
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className={`text-sm text-foreground/75 font-medium ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
