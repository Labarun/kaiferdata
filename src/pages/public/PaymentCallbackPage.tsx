/**
 * PaymentCallbackPage — Handles Paystack redirect back
 * Shows status based on intent lookup, prepares for verification phase
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { lookupIntent, type PurchaseIntent } from "@/services/purchaseIntent";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Copy, ArrowRight, RotateCcw, Search } from "lucide-react";

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref") || searchParams.get("reference") || "";
  const trxref = searchParams.get("trxref") || "";

  const [loading, setLoading] = useState(true);
  const [intent, setIntent] = useState<PurchaseIntent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const lookup = ref || trxref;
    if (!lookup) {
      setLoading(false);
      return;
    }
    lookupIntent(lookup)
      .then(setIntent)
      .finally(() => setLoading(false));
  }, [ref, trxref]);

  const copyRef = () => {
    const r = intent?.intent_reference || ref;
    if (r) {
      navigator.clipboard.writeText(r);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground/60">Checking payment status…</p>
        </div>
      </div>
    );
  }

  const snapshot = (intent?.plan_snapshot || {}) as Record<string, unknown>;
  const isPending = intent?.status === "pending_payment" || intent?.status === "payment_processing";
  const isSuccess = intent?.status === "payment_confirmed" || intent?.status === "completed";
  const isFailed = intent?.status === "failed" || intent?.status === "expired" || intent?.status === "cancelled";

  return (
    <div className="container py-8 sm:py-12">
      <div className="max-w-md mx-auto space-y-6 animate-fade-in">
        {/* Status icon */}
        <div className="text-center">
          <div className={`h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mx-auto mb-4 ${isPending ? "glow-gold-strong" : ""}`}>
            {isPending && <Loader2 className="h-7 w-7 text-primary animate-spin" />}
            {isSuccess && <CheckCircle2 className="h-7 w-7 text-success" />}
            {isFailed && <XCircle className="h-7 w-7 text-destructive/70" />}
            {!intent && <Search className="h-7 w-7 text-muted-foreground/50" />}
          </div>

          <h2 className="text-lg font-bold text-foreground/90 tracking-tight">
            {isPending && "Payment Processing"}
            {isSuccess && "Payment Successful"}
            {isFailed && "Payment Failed"}
            {!intent && "Order Not Found"}
          </h2>
          <p className="text-[12px] text-muted-foreground/55 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
            {isPending && "Your payment is being verified. This usually takes a few seconds."}
            {isSuccess && "Your data bundle is being delivered to the recipient."}
            {isFailed && "The payment could not be completed. You can try again from the homepage."}
            {!intent && "We couldn't find an order with that reference."}
          </p>
        </div>

        {/* Intent details */}
        {intent && (
          <>
            {/* Reference card */}
            <div className="glass-premium rounded-2xl p-4 flex items-center justify-between gap-3 shimmer-edge overflow-hidden">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground/55 uppercase tracking-wider font-semibold">
                  Reference
                </p>
                <p className="font-mono text-sm font-bold text-foreground mt-0.5 truncate">
                  {intent.intent_reference}
                </p>
              </div>
              <button
                onClick={copyRef}
                className="shrink-0 h-10 w-10 rounded-xl glass-card hover:glass-elevated flex items-center justify-center transition-all active:scale-95"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            {copied && (
              <p className="text-[11px] text-success text-center -mt-4 font-medium animate-fade-in">Copied!</p>
            )}

            {/* Order details */}
            <div className="rounded-2xl glass-card divide-y divide-border/20 overflow-hidden">
              <Row label="Network" value={intent.network} />
              <Row label="Bundle" value={`${String(snapshot.volume || "")} — ${String(snapshot.plan_name || "")}`} />
              <Row label="Recipient" value={intent.phone_number} mono />
              <div className="flex items-center justify-between px-4 py-3.5">
                <span className="text-xs text-muted-foreground font-medium">Amount</span>
                <span className="text-lg font-bold text-gradient-gold">
                  GH₵{Number(intent.amount_expected).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                <span className={`text-[11px] font-semibold capitalize px-3 py-1 rounded-full border ${
                  isPending
                    ? "text-primary bg-primary/8 border-primary/15"
                    : isSuccess
                    ? "text-success bg-success/8 border-success/15"
                    : "text-destructive bg-destructive/8 border-destructive/15"
                }`}>
                  {intent.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1 h-12">
            <Link to="/">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              New Order
            </Link>
          </Button>
          <Button asChild className="flex-[2] h-12">
            <Link to={`/track${intent ? `?ref=${intent.intent_reference}` : ""}`}>
              Track Order
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
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
