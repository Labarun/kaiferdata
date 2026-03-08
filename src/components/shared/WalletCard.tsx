/**
 * WalletCard — Premium liquid-glass wallet hero surface (GH₵)
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Wallet, TrendingUp, Lock } from "lucide-react";

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
    <div className="glass-wallet-hero rounded-2xl shimmer-edge overflow-hidden p-6 relative">
      {/* Ambient glow dot */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-primary/60 font-medium">
          <TrendingUp className="h-3 w-3" /> GHS
        </div>
      </div>

      {loading ? (
        <div className="h-10 w-40 bg-muted/40 animate-pulse rounded-xl" />
      ) : (
        <>
          <p className="text-4xl font-bold text-foreground tracking-tight leading-none">
            GH₵{balance.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
          </p>
          {locked > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              <Lock className="h-3 w-3 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                Locked: GH₵{locked.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
