/**
 * User Transactions Page — Premium liquid-glass financial history
 */
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Clock, ArrowUpRight, ArrowDownLeft, ChevronRight } from "lucide-react";
import { ListSkeleton } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { motion } from "framer-motion";

export default function UserTransactionsPage() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["user-transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!wallet) return [];

      const { data } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your financial activity</p>
      </div>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No transactions yet"
          description="Your wallet activity, including deposits and purchases, will appear here."
        />
      ) : (
        <div className="space-y-2">
          {transactions.map((t, i) => {
            const isInflow = t.direction === "inflow";
            return (
              <motion.div
                key={t.id as string}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/dashboard/transactions/${t.id}`}
                  className="cv-auto-card block glass-card rounded-xl hover:bg-primary/[0.03] active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center gap-3.5 p-4">
                    {/* Direction icon */}
                    <div className={`p-2 rounded-xl ${isInflow ? "bg-primary/10" : "bg-muted"}`}>
                      {isInflow
                        ? <ArrowDownLeft className="h-4 w-4 text-primary" />
                        : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{(t.narration as string) || (t.transaction_type as string)}</p>
                      {t.reference && <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{t.reference as string}</p>}
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(t.created_at as string).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1">
                      <div>
                        <p className={`text-sm font-bold ${isInflow ? "text-primary" : "text-foreground"}`}>
                          {isInflow ? "+" : "−"}GH₵{Number(t.amount).toFixed(2)}
                        </p>
                        <p className={`text-[10px] font-medium mt-0.5 ${
                          t.status === "completed" ? "text-primary/70" : t.status === "failed" ? "text-destructive" : "text-muted-foreground"
                        }`}>{t.status as string}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
