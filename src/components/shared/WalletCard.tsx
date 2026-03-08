/**
 * WalletCard - Displays wallet balance summary (GH₵)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export function WalletCard({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [locked, setLocked] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function fetchWallet() {
      const { data } = await supabase
        .from("wallets")
        .select("current_balance, locked_balance")
        .eq("user_id", user!.id)
        .single();
      if (data) {
        setBalance(Number(data.current_balance));
        setLocked(Number(data.locked_balance));
      }
      setLoading(false);
    }
    fetchWallet();
  }, [user]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-primary" />
        {loading ? (
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
        ) : (
          <span className="text-sm font-semibold text-foreground">GH₵{balance.toLocaleString()}</span>
        )}
      </div>
    );
  }

  return (
    <Card className="glass-premium shimmer-edge overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
        </div>
        {loading ? (
          <div className="h-9 w-36 bg-muted animate-pulse rounded-lg" />
        ) : (
          <>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              GH₵{balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
            </p>
            {locked > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Locked: GH₵{locked.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
