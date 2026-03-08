/**
 * PaymentCallbackPage — Handles Paystack redirect back
 * Verifies payment server-side, shows real order result
 */
import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyPayment } from "@/services/purchaseIntent";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PageState = "verifying" | "success" | "failed" | "error";

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const ref =
    searchParams.get("ref") ||
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    "";

  const [state, setState] = useState<PageState>("verifying");
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!ref || verifiedRef.current) {
      if (!ref) {
        setState("error");
        setErrorMsg("No payment reference found.");
      }
      return;
    }
    verifiedRef.current = true;

    verifyPayment(ref)
      .then((result) => {
        if (result.success && result.order) {
          setOrder(result.order);
          setState("success");
        } else {
          setErrorMsg(
            result.error || "Payment was not successful."
          );
          setState("failed");
        }
      })
      .catch((err) => {
        setErrorMsg(err?.message || "Verification failed. Please contact support.");
        setState("error");
      });
  }, [ref]);

  const publicOrderId = order?.public_order_id as string | undefined;
  const snapshot = (order?.bundle_snapshot || {}) as Record<string, unknown>;

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Verifying ── */
  if (state === "verifying") {
    return (
      <div className="min-h-[65vh] flex items-center justify-center">
        <div className="text-center space-y-5 animate-fade-in max-w-xs mx-auto px-4">
          <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mx-auto glow-gold-strong">
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-foreground/85 tracking-tight">
              Verifying Payment…
            </h2>
            <p className="text-[12px] text-muted-foreground/50 mt-2 leading-relaxed">
              We're confirming your payment with our provider. This usually takes a few seconds.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Success ── */
  if (state === "success" && order) {
    return (
      <div className="container py-8 sm:py-12">
        <div className="max-w-md mx-auto space-y-6 animate-fade-in">
          {/* Success icon */}
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_hsl(152_52%_36%/0.15)]">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground/90 tracking-tight">
              Payment Successful!
            </h2>
            <p className="text-[12.5px] text-muted-foreground/55 mt-1.5 leading-relaxed max-w-[280px] mx-auto">
              Your order has been created and is being processed.
            </p>
          </div>

          {/* Order ID card */}
          {publicOrderId && (
            <>
              <div className="glass-premium rounded-2xl p-4 flex items-center justify-between gap-3 shimmer-edge overflow-hidden glow-gold-strong">
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground/55 uppercase tracking-wider font-semibold">
                    Order ID
                  </p>
                  <p className="font-mono text-[15px] font-bold text-foreground mt-0.5 truncate">
                    {publicOrderId}
                  </p>
                </div>
                <button
                  onClick={() => copyRef(publicOrderId)}
                  className="shrink-0 h-10 w-10 rounded-xl glass-card hover:glass-elevated flex items-center justify-center transition-all active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              {copied && (
                <p className="text-[11px] text-success text-center -mt-4 font-medium animate-fade-in">
                  Copied!
                </p>
              )}
            </>
          )}

          {/* Order details */}
          <div className="rounded-2xl glass-card divide-y divide-border/20 overflow-hidden">
            <Row label="Network" value={order.network as string} />
            <Row
              label="Bundle"
              value={`${String(snapshot.volume || "")} — ${String(snapshot.plan_name || "")}`}
            />
            <Row
              label="Recipient"
              value={order.beneficiary_number as string}
              mono
              icon={<span className="text-[10px] mr-1">🇬🇭</span>}
            />
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-xs text-muted-foreground font-medium">Amount Paid</span>
              <span className="text-lg font-bold text-gradient-gold">
                GH₵{Number(order.amount_charged).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground font-medium">Status</span>
              <span className="text-[11px] font-semibold capitalize px-3 py-1 rounded-full text-success bg-success/8 border border-success/15">
                {String(order.status).replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Trust message */}
          <div className="flex items-start gap-2.5 text-[10.5px] text-muted-foreground/50 px-1">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-success/55" />
            <span className="leading-relaxed">
              Your data bundle will be delivered to the recipient shortly. Use your Order ID to track progress.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" asChild className="flex-1 h-12">
              <Link to="/">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                New Order
              </Link>
            </Button>
            <Button asChild className="flex-[2] h-12">
              <Link to={`/track?ref=${publicOrderId}`}>
                Track Order
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Failed / Error ── */
  return (
    <div className="container py-8 sm:py-12">
      <div className="max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mx-auto mb-4">
            {state === "failed" ? (
              <XCircle className="h-8 w-8 text-destructive/70" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-500/70" />
            )}
          </div>
          <h2 className="text-lg font-bold text-foreground/90 tracking-tight">
            {state === "failed" ? "Payment Not Completed" : "Something Went Wrong"}
          </h2>
          <p className="text-[12.5px] text-muted-foreground/55 mt-1.5 leading-relaxed max-w-[300px] mx-auto">
            {errorMsg || "We couldn't verify your payment. No charges were made."}
          </p>
        </div>

        {ref && (
          <div className="glass-card rounded-2xl p-4">
            <p className="text-[10px] text-muted-foreground/45 uppercase tracking-wider font-semibold mb-1">
              Reference
            </p>
            <p className="font-mono text-sm text-foreground/70 font-medium">{ref}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" asChild className="flex-1 h-12">
            <Link to="/">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Try Again
            </Link>
          </Button>
          <Button variant="glass" asChild className="flex-1 h-12">
            <a href="https://wa.me/233000000000" target="_blank" rel="noopener noreferrer">
              Contact Support
            </a>
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/40 text-center leading-relaxed">
          If you were charged, please contact support with your reference number. We'll resolve it promptly.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span
        className={cn(
          "text-sm text-foreground/75 font-medium flex items-center",
          mono && "font-mono"
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
