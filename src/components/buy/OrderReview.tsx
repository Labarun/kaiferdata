/**
 * OrderReview - Glass-styled review panel before payment
 */
import type { DataPlan } from "@/services/purchaseIntent";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, ShieldCheck } from "lucide-react";

interface OrderReviewProps {
  network: string;
  plan: DataPlan;
  phoneNumber: string;
  customerName?: string;
  customerEmail?: string;
  onBack: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export function OrderReview({
  network, plan, phoneNumber, customerName, customerEmail,
  onBack, onConfirm, loading,
}: OrderReviewProps) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back */}
      <button onClick={onBack} disabled={loading} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-3.5 w-3.5" /> Edit details
      </button>

      {/* Glass review card */}
      <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Order Summary</p>
        <div className="space-y-3">
          <ReviewRow label="Network" value={network} />
          <ReviewRow label="Plan" value={`${plan.volume} — ${plan.plan_name}`} />
          <ReviewRow label="Phone Number" value={phoneNumber} />
          {customerName && <ReviewRow label="Name" value={customerName} />}
          {customerEmail && <ReviewRow label="Email" value={customerEmail} />}
        </div>
        <div className="pt-3 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Amount</span>
            <span className="text-xl font-extrabold text-primary">GH₵{Number(plan.amount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-success" />
        <span>Your order is secured. You'll receive a tracking reference after confirmation.</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-11 rounded-xl font-semibold" disabled={loading}>
          <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Edit
        </Button>
        <Button onClick={onConfirm} className="flex-1 h-11 rounded-xl font-bold shadow-sm" disabled={loading}>
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {loading ? "Processing..." : "Continue to Payment"}
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}