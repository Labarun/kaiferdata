/**
 * OrderReview - Review step before purchase intent creation
 */
import type { DataPlan } from "@/services/purchaseIntent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";

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
  network,
  plan,
  phoneNumber,
  customerName,
  customerEmail,
  onBack,
  onConfirm,
  loading,
}: OrderReviewProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Order Summary</h3>
          <div className="space-y-3">
            <ReviewRow label="Network" value={network} />
            <ReviewRow label="Plan" value={`${plan.volume} — ${plan.plan_name}`} />
            <ReviewRow label="Phone Number" value={phoneNumber} />
            {customerName && <ReviewRow label="Name" value={customerName} />}
            {customerEmail && <ReviewRow label="Email" value={customerEmail} />}
            <div className="pt-3 border-t">
              <ReviewRow
                label="Amount"
                value={`₦${Number(plan.amount).toLocaleString()}`}
                bold
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span>Your order details are secured. You'll receive a reference for tracking.</span>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={loading}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button onClick={onConfirm} className="flex-1" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : null}
          {loading ? "Processing..." : "Continue to Payment"}
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${bold ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
