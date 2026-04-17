/**
 * User Transaction Detail — Premium liquid-glass detail surface for a single
 * personal-wallet transaction. Shows direction, amount, balance change,
 * narration, reference, status and any linked record (order/deposit).
 *
 * Strict additive: read-only view of `wallet_transactions` for the current
 * user. RLS already restricts SELECT to the wallet owner.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2, ArrowLeft, Copy, ArrowDownLeft, ArrowUpRight, Clock,
  ShieldCheck, Wallet, Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type WalletTxn = Record<string, unknown>;
type LinkedOrder = { id: string; public_order_id: string; status: string };

export default function UserTransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const { toast } = useToast();
  const [txn, setTxn] = useState<WalletTxn | null>(null);
  const [linkedOrder, setLinkedOrder] = useState<LinkedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) return;
    let active = true;
    async function load() {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("id", transactionId)
        .maybeSingle();
      if (!active) return;
      setTxn(data || null);

      // Hydrate linked order for nicer cross-link
      if (data && data.linked_record_type === "order" && data.linked_record_id) {
        const { data: ord } = await supabase
          .from("orders")
          .select("id, public_order_id, status")
          .eq("id", data.linked_record_id as string)
          .maybeSingle();
        if (active && ord) setLinkedOrder(ord as LinkedOrder);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [transactionId]);

  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: "Copied", description: val });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!txn) {
    return (
      <div className="text-center py-20 text-sm text-muted-foreground">
        Transaction not found.
      </div>
    );
  }

  const isInflow = txn.direction === "inflow";
  const amount = Number(txn.amount);
  const opening = Number(txn.opening_balance ?? 0);
  const closing = Number(txn.closing_balance ?? 0);
  const status = (txn.status as string) || "completed";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Link to="/dashboard/transactions">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">Transaction</h1>
          <p className="text-[11px] text-muted-foreground capitalize">
            {(txn.transaction_type as string) || "wallet"} · {(txn.direction as string)}
          </p>
        </div>
      </div>

      {/* Amount hero */}
      <div className="glass-wallet-hero rounded-2xl p-5 animate-fade-in animate-stagger-1">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-xl ${
              isInflow ? "bg-primary/10" : "bg-muted"
            }`}
          >
            {isInflow ? (
              <ArrowDownLeft className="h-5 w-5 text-primary" />
            ) : (
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {isInflow ? "Money in" : "Money out"}
            </p>
            <p className="text-[12px] text-muted-foreground/80">
              {new Date(txn.created_at as string).toLocaleString()}
            </p>
          </div>
        </div>

        <p
          className={`text-[34px] font-bold tracking-tight leading-none ${
            isInflow ? "text-primary" : "text-foreground"
          }`}
        >
          <span className="text-lg text-muted-foreground/60">
            {isInflow ? "+" : "−"}GH₵
          </span>
          {amount.toFixed(2)}
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/40 border border-border/30">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "completed"
                ? "bg-success"
                : status === "failed"
                ? "bg-destructive"
                : "bg-warning"
            }`}
          />
          <span className="text-[10.5px] font-semibold capitalize text-foreground/80">
            {status}
          </span>
        </div>
      </div>

      {/* Balance change */}
      <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-2">
        <div className="px-4 py-3 border-b border-border/20">
          <h3 className="section-label flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5" /> Balance Change
          </h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border/20 text-center">
          <BalanceCell label="Before" value={opening} />
          <BalanceCell
            label={isInflow ? "Credit" : "Debit"}
            value={amount}
            accent
            sign={isInflow ? "+" : "−"}
          />
          <BalanceCell label="After" value={closing} highlight />
        </div>
      </div>

      {/* Details */}
      <div className="glass-card rounded-xl overflow-hidden animate-fade-in animate-stagger-3">
        <div className="px-4 py-3 border-b border-border/20">
          <h3 className="section-label flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Details
          </h3>
        </div>
        <div className="divide-y divide-border/20">
          {txn.narration && (
            <DetailRow label="Description" value={txn.narration as string} />
          )}
          <DetailRow label="Type" value={(txn.transaction_type as string) || "—"} capitalize />
          <DetailRow label="Direction" value={(txn.direction as string) || "—"} capitalize />
          {txn.reference && (
            <DetailRow
              label="Reference"
              value={txn.reference as string}
              mono
              onCopy={() => copy(txn.reference as string)}
            />
          )}
          <DetailRow
            label="Date"
            value={new Date(txn.created_at as string).toLocaleString()}
          />
          <DetailRow
            label="Transaction ID"
            value={txn.id as string}
            mono
            onCopy={() => copy(txn.id as string)}
          />
        </div>
      </div>

      {/* Linked order shortcut */}
      {linkedOrder && (
        <Link
          to={`/dashboard/orders/${linkedOrder.id}`}
          className="block glass-card rounded-xl p-4 hover:bg-primary/[0.03] transition-colors animate-fade-in animate-stagger-3"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Linked Order
              </p>
              <p className="text-sm font-semibold text-foreground font-mono">
                {linkedOrder.public_order_id}
              </p>
            </div>
            <span className="text-[10.5px] font-semibold text-primary">View →</span>
          </div>
        </Link>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  capitalize,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 justify-end">
        <span
          className={`text-sm text-foreground font-medium truncate ${
            mono ? "font-mono text-[11.5px]" : ""
          } ${capitalize ? "capitalize" : ""}`}
          title={value}
        >
          {value}
        </span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 shrink-0"
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function BalanceCell({
  label,
  value,
  accent,
  highlight,
  sign,
}: {
  label: string;
  value: number;
  accent?: boolean;
  highlight?: boolean;
  sign?: string;
}) {
  return (
    <div className="py-3 px-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/55 font-semibold">
        {label}
      </p>
      <p
        className={`text-[14px] font-bold mt-1 tabular-nums ${
          accent
            ? "text-primary"
            : highlight
            ? "text-foreground"
            : "text-foreground/70"
        }`}
      >
        {sign || ""}GH₵{value.toFixed(2)}
      </p>
    </div>
  );
}
