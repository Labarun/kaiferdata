/**
 * WalletCard - Displays wallet balance summary
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export function WalletCard() {
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

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
        </div>
        {loading ? (
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <p className="text-3xl font-bold text-foreground">
              {balance.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </p>
            {locked > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Locked: {locked.toLocaleString("en-US", { style: "currency", currency: "USD" })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
