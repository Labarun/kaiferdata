/**
 * EarningsBalanceCard
 * Premium glass card showing the agent's separate earnings balance.
 * Distinct visual identity from the personal WalletCard so users never
 * confuse the two.
 */
import { Link } from "react-router-dom";
import { Sparkles, ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentEarningsWallet } from "@/services/agentEarningsWallet";

const fmt = (n: number) => `${n.toFixed(2)}`;

interface Props {
  wallet: AgentEarningsWallet | null;
  loading?: boolean;
}

export function EarningsBalanceCard({ wallet, loading }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-success/20 bg-gradient-to-br from-success/10 via-background to-primary/5 p-5 shimmer-edge">
      <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-success/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-success/80 font-bold">Earnings Balance</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Profit from sales · separate from personal wallet</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-success/15 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-success" />
          </div>
        </div>

        <p className="text-[32px] font-bold text-success tabular-nums tracking-tight leading-none">
          <span className="text-base text-success/70 mr-1">GH₵</span>
          {loading ? "—" : fmt(Number(wallet?.current_balance ?? 0))}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-success/10">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Total Earned</p>
            <p className="text-[14px] font-bold tabular-nums">GH₵ {fmt(Number(wallet?.total_earned ?? 0))}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Total Withdrawn</p>
            <p className="text-[14px] font-bold tabular-nums">GH₵ {fmt(Number(wallet?.total_withdrawn ?? 0))}</p>
          </div>
        </div>

        <Button asChild size="sm" className="mt-4 w-full bg-success hover:bg-success/90 text-success-foreground">
          <Link to="/agent/withdraw">
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
            Withdraw to MoMo
          </Link>
        </Button>
      </div>
    </div>
  );
}
