/**
 * RecoveryDialog — Confirmation dialog for missing-order recovery.
 * Shows full context before admin confirms recovery action.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsBadge } from "@/components/admin/OperationsBadge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecoveryContext {
  payment?: Record<string, unknown> | null;
  intent?: Record<string, unknown> | null;
}

interface RecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: RecoveryContext;
  onSuccess?: (order: Record<string, unknown>) => void;
}

export function RecoveryDialog({ open, onOpenChange, context, onSuccess }: RecoveryDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; order?: Record<string, unknown> } | null>(null);
  const { toast } = useToast();

  const { payment, intent } = context;
  const snap = (intent?.plan_snapshot as Record<string, unknown>) || {};

  const handleRecover = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({ success: false, message: "You must be logged in." });
        setLoading(false);
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/recover-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            payment_record_id: payment?.id || null,
            intent_id: intent?.id || null,
            reason: reason.trim() || "Admin recovery from reconciliation",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.blocks?.join(" ") || data.error || "Recovery failed.";
        setResult({ success: false, message: msg });
        toast({ title: "Recovery blocked", description: msg, variant: "destructive" });
      } else {
        setResult({ success: true, message: data.message || "Order recovered!", order: data.order });
        toast({ title: "Order Recovered", description: data.message });
        onSuccess?.(data.order);
      }
    } catch (err) {
      setResult({ success: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Recover Missing Order
          </DialogTitle>
          <DialogDescription className="text-xs">
            This will create a real order from the verified payment using the same creation path as normal purchases.
          </DialogDescription>
        </DialogHeader>

        {result?.success ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-medium text-foreground">{result.message}</p>
            {result.order && (
              <p className="text-xs font-mono text-muted-foreground">
                {(result.order as Record<string, unknown>).public_order_id as string}
              </p>
            )}
            <Button size="sm" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <>
            {/* Context review */}
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Record</p>
                {payment ? (
                  <div className="grid grid-cols-2 gap-y-1 text-[12px]">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-mono text-right">{payment.internal_reference as string}</span>
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium text-right">GH₵{Number(payment.amount).toLocaleString()}</span>
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-right"><OperationsBadge status={payment.status as string} /></span>
                    <span className="text-muted-foreground">Provider Ref</span>
                    <span className="font-mono text-[11px] text-right truncate">{payment.provider_reference as string}</span>
                  </div>
                ) : (
                  <p className="text-xs text-destructive">No payment record</p>
                )}
              </div>

              <div className="rounded-lg border border-border/60 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Purchase Intent</p>
                {intent ? (
                  <div className="grid grid-cols-2 gap-y-1 text-[12px]">
                    <span className="text-muted-foreground">Network</span>
                    <span className="text-right">{intent.network as string}</span>
                    <span className="text-muted-foreground">Plan</span>
                    <span className="text-right">{(snap.volume as string) || "—"} — {(snap.plan_name as string) || "—"}</span>
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-mono text-right">{intent.phone_number as string}</span>
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-right"><OperationsBadge status={intent.status as string} /></span>
                  </div>
                ) : (
                  <p className="text-xs text-destructive">No intent found</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Recovery Reason (optional)</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Order creation failed after Paystack verification…"
                  className="text-sm min-h-[60px]"
                />
              </div>

              {result && !result.success && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{result.message}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRecover}
                disabled={loading || !payment || payment.status !== "verified"}
                className="gap-1.5"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {loading ? "Recovering…" : "Create Missing Order"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
