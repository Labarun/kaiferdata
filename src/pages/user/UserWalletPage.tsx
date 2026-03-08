/**
 * User Wallet Page — Balance, recent transactions, top-up CTA
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WalletCard } from "@/components/shared/WalletCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowDownToLine, Wifi, ArrowRightLeft, Loader2, Clock } from "lucide-react";

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
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your balance and transactions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <WalletCard />

        <div className="grid gap-3">
          <Button className="h-12 gap-2 text-sm" disabled>
            <ArrowDownToLine className="h-4 w-4" /> Top Up Wallet
          </Button>
          <Link to="/dashboard/buy">
            <Button variant="outline" className="w-full h-12 gap-2 text-sm">
              <Wifi className="h-4 w-4" /> Buy Data with Wallet
            </Button>
          </Link>
          <p className="text-[10px] text-muted-foreground text-center">Wallet top-up coming soon</p>
        </div>
      </div>

      {/* Wallet status */}
      {wallet && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Wallet Status</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              wallet.status === "active" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}>
              {(wallet.status as string || "active").charAt(0).toUpperCase() + (wallet.status as string || "active").slice(1)}
            </span>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" /> Wallet Transactions
          </CardTitle>
          <Link to="/dashboard/transactions" className="text-[11px] text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {transactions.map((t) => (
                <div key={t.id as string} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.narration as string || t.transaction_type as string}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(t.created_at as string).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${t.direction === "inflow" ? "text-primary" : "text-foreground"}`}>
                      {t.direction === "inflow" ? "+" : "−"}GH₵{Number(t.amount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t.status as string}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
