/**
 * User Transactions Page — Financial activity history
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRightLeft, Clock } from "lucide-react";

export default function UserTransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      // First get user's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (wallet) {
        const { data } = await supabase
          .from("wallet_transactions")
          .select("*")
          .eq("wallet_id", wallet.id)
          .order("created_at", { ascending: false })
          .limit(50);
        setTransactions(data || []);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Transaction History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your financial activity</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : transactions.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <ArrowRightLeft className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your wallet activity will appear here</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <Card key={t.id as string}>
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.narration as string || t.transaction_type as string}</p>
                  {t.reference && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{t.reference as string}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(t.created_at as string).toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${t.direction === "inflow" ? "text-primary" : "text-foreground"}`}>
                    {t.direction === "inflow" ? "+" : "−"}GH₵{Number(t.amount).toLocaleString()}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${
                    t.status === "completed" ? "text-primary" : t.status === "failed" ? "text-destructive" : "text-muted-foreground"
                  }`}>{t.status as string}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
