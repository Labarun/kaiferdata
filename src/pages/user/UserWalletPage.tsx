/**
 * User Wallet Page — Premium liquid-glass wallet experience
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WalletCard } from "@/components/shared/WalletCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowDownToLine, Wifi, ArrowRightLeft, Loader2, Clock, ShieldCheck } from "lucide-react";

export default function UserWalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Record<string, unknown> | null>(null);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data: w } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      setWallet(w);

      if (w) {
        const { data: txns } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", w.id)
          .order("created_at", { ascending: false })
          .limit(20);
        setTransactions(txns || []);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your balance and transactions</p>
      </div>

      {/* Wallet hero + actions */}
      <div className="space-y-3 animate-fade-in animate-stagger-1">
        <WalletCard />

        <div className="grid grid-cols-2 gap-3">
          <Button className="h-12 gap-2 text-sm rounded-xl glass-card border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90" disabled>
            <ArrowDownToLine className="h-4 w-4" /> Top Up
          </Button>
          <Link to="/dashboard/buy">
            <Button variant="outline" className="w-full h-12 gap-2 text-sm rounded-xl glass-card border-primary/20">
              <Wifi className="h-4 w-4 text-primary" /> Buy Data
            </Button>
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Wallet top-up coming soon</p>
      </div>

      {/* Wallet status */}
      {wallet && (
        <div className="glass-subtle rounded-xl py-3 px-4 flex items-center justify-between animate-fade-in animate-stagger-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary/60" />
            <span className="text-xs text-muted-foreground">Wallet Status</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg ${
            wallet.status === "active"
              ? "bg-primary/10 text-primary"
              : "bg-destructive/10 text-destructive"
          }`}>
            {((wallet.status as string) || "active").charAt(0).toUpperCase() + ((wallet.status as string) || "active").slice(1)}
          </span>
        </div>
      )}

      {/* Recent transactions */}
      <div className="animate-fade-in animate-stagger-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5" /> Wallet Transactions
          </h2>
          <Link to="/dashboard/transactions" className="text-[11px] text-primary hover:underline font-medium">View all →</Link>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {transactions.map((t) => (
                <div key={t.id as string} className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{(t.narration as string) || (t.transaction_type as string)}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(t.created_at as string).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${t.direction === "inflow" ? "text-primary" : "text-foreground"}`}>
                      {t.direction === "inflow" ? "+" : "−"}GH₵{Number(t.amount).toLocaleString()}
                    </p>
                    <p className={`text-[10px] ${
                      t.status === "completed" ? "text-primary/70" : t.status === "failed" ? "text-destructive" : "text-muted-foreground"
                    }`}>{t.status as string}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
