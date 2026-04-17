/**
 * Agent Transactions — /agent/transactions
 * Earnings wallet ledger: commissions, withdrawals, refunds, adjustments.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, ArrowUpRight, Loader2, Sparkles, RefreshCcw, Settings2 } from "lucide-react";
import { fetchEarningsLedger, fetchEarningsWallet, type AgentWalletTxn } from "@/services/agentEarningsWallet";
import { EarningsBalanceCard } from "@/components/agent/EarningsBalanceCard";

const TYPE_META: Record<string, { icon: any; label: string; tint: string }> = {
  commission: { icon: Sparkles, label: "Commission", tint: "text-success" },
  withdrawal: { icon: ArrowDownToLine, label: "Withdrawal", tint: "text-destructive" },
  refund: { icon: RefreshCcw, label: "Refund", tint: "text-info" },
  adjustment: { icon: Settings2, label: "Adjustment", tint: "text-warning" },
};

export default function AgentTransactionsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<AgentWalletTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const [w, l] = await Promise.all([
        fetchEarningsWallet(user.id),
        fetchEarningsLedger(user.id, 100),
      ]);
      if (cancelled) return;
      setWallet(w);
      setTxns(l);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Transactions" description="Every credit & debit on your earnings balance." />

      <EarningsBalanceCard wallet={wallet} loading={loading} />

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : txns.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No earnings transactions yet.
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/40">
              {txns.map((t) => {
                const meta = TYPE_META[t.txn_type] ?? TYPE_META.adjustment;
                const Icon = meta.icon;
                const isInflow = t.direction === "inflow";
                return (
                  <li key={t.id} className="cv-auto px-4 py-3 flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 ${meta.tint}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold truncate">{meta.label}</p>
                        <Badge variant="outline" className="text-[9px] capitalize">{t.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 truncate">
                        {t.narration || t.reference || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[13px] font-bold tabular-nums ${isInflow ? "text-success" : "text-foreground"}`}>
                        {isInflow ? "+" : "−"} GH₵ {Number(t.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {new Date(t.created_at).toLocaleDateString()} · Bal {Number(t.closing_balance).toFixed(2)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
