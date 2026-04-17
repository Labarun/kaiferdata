/**
 * User Wallet Page — Premium liquid-glass wallet with real deposit flow
 * Now with 3% Paystack fee display on deposits
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WalletCard } from "@/components/shared/WalletCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine, Wifi, ArrowRightLeft, Loader2, Clock,
  ShieldCheck, X, Sparkles, ArrowRight,
} from "lucide-react";
import { ListSkeleton } from "@/components/shared/LoadingState";
import {
  Drawer, DrawerContent,
} from "@/components/ui/drawer";
import { createDepositIntent, initializePayment } from "@/services/purchaseIntent";
import { calculatePaystackFee, formatGHS } from "@/services/paystackFee";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEPOSIT_PRESETS = [5, 10, 20, 50, 100, 200];

export default function UserWalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<Record<string, unknown> | null>(null);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit sheet state
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depositLabel, setDepositLabel] = useState("");

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

  const parsedAmount = parseFloat(depositAmount);
  const validAmount = !isNaN(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 10000;
  const depositFee = useMemo(() => validAmount ? calculatePaystackFee(parsedAmount) : null, [parsedAmount, validAmount]);

  const handleDeposit = useCallback(async () => {
    if (!user || !validAmount) return;

    setDepositing(true);
    try {
      setDepositLabel("Creating deposit request…");
      const intent = await createDepositIntent({
        amount: parsedAmount,
        userId: user.id,
        userEmail: user.email || undefined,
        userName: user.fullName || undefined,
      });

      setDepositLabel("Initializing payment…");
      const payment = await initializePayment(intent.id);

      setDepositLabel("Redirecting to Paystack…");
      window.location.href = payment.authorization_url;
    } catch (err: any) {
      setDepositing(false);
      setDepositLabel("");
      toast({
        title: "Deposit Failed",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, parsedAmount, validAmount, toast]);

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
          <Button
            className="h-12 gap-2 text-sm rounded-xl"
            onClick={() => {
              setDepositAmount("");
              setDepositing(false);
              setDepositLabel("");
              setDepositOpen(true);
            }}
          >
            <ArrowDownToLine className="h-4 w-4" /> Top Up
          </Button>
          <Link to="/dashboard/buy">
            <Button variant="outline" className="w-full h-12 gap-2 text-sm rounded-xl glass-card border-primary/20">
              <Wifi className="h-4 w-4 text-primary" /> Buy Data
            </Button>
          </Link>
        </div>
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
            <ListSkeleton rows={3} connected />
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
                      {t.direction === "inflow" ? "+" : "−"}GH₵{Number(t.amount).toFixed(2)}
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

      {/* ── Deposit Bottom Sheet ── */}
      <Drawer open={depositOpen} onOpenChange={(v) => { if (!depositing) setDepositOpen(v); }}>
          <DrawerContent
            className={cn(
              "border-0 rounded-t-[28px] overflow-hidden max-h-[94vh] supports-[height:100dvh]:max-h-[100dvh]",
              "bg-[hsl(214_42%_97%/0.92)] backdrop-blur-[44px] saturate-[1.9]",
              "shadow-[0_-4px_40px_-8px_hsl(213_40%_40%/0.12),0_-1px_6px_-1px_hsl(213_35%_50%/0.06),inset_0_1px_0_0_hsl(0_0%_100%/0.7)]",
            )}
          >
            <div className="flex justify-center pt-3.5 pb-2 shrink-0">
              <div className="h-[5px] w-10 rounded-full bg-[hsl(213_25%_78%/0.35)]" />
            </div>

            <div className="px-5 pb-8 pt-2 overflow-y-auto overscroll-contain flex-1 min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
              {depositing ? (
              <div className="py-10 text-center space-y-5 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl glass-premium flex items-center justify-center mx-auto">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-foreground/85 tracking-tight">
                    {depositLabel || "Processing…"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/50 mt-2 max-w-[220px] mx-auto leading-relaxed">
                    Preparing your deposit. Please don't close this screen.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in">
                <div className="text-center">
                  <h2 className="text-[17px] font-bold text-foreground/90 tracking-tight">Top Up Wallet</h2>
                  <p className="text-[12px] text-muted-foreground/55 mt-1">Enter deposit amount in GH₵</p>
                </div>

                {/* Amount input */}
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-muted-foreground/40">GH₵</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className={cn(
                        "h-16 text-[28px] font-bold tracking-tight rounded-2xl pl-14 pr-4 text-center",
                        "bg-[hsl(0_0%_100%/0.6)] border-[hsl(228_20%_84%/0.5)]",
                        "focus:bg-[hsl(0_0%_100%/0.75)] focus:border-primary/25",
                        "focus:shadow-[0_0_0_4px_hsl(215_72%_42%/0.06)]",
                        "placeholder:text-muted-foreground/20 placeholder:font-normal",
                      )}
                      min={1}
                      max={10000}
                      step="0.01"
                    />
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {DEPOSIT_PRESETS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(String(amt))}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                          Number(depositAmount) === amt
                            ? "glass-elevated ring-2 ring-primary/20 text-primary"
                            : "glass-card text-muted-foreground hover:glass-elevated"
                        )}
                      >
                        GH₵{amt}
                      </button>
                    ))}
                  </div>

                  {depositAmount && !validAmount && (
                    <p className="text-[10.5px] text-destructive/80 text-center font-medium">
                      Enter an amount between GH₵1.00 and GH₵10,000.00
                    </p>
                  )}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />

                {/* Fee breakdown */}
                {depositFee && (
                  <div className="rounded-xl glass-card overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-[11px] text-muted-foreground/55 font-medium">Deposit Amount</span>
                      <span className="text-[12px] font-semibold text-foreground/70 tabular-nums">GH₵{formatGHS(depositFee.baseAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-[hsl(215_40%_96%/0.2)]">
                      <span className="text-[11px] text-muted-foreground/55 font-medium flex items-center gap-1">
                        Processing Fee <span className="text-[9px] text-muted-foreground/35">(3%)</span>
                      </span>
                      <span className="text-[12px] font-medium text-muted-foreground/60 tabular-nums">GH₵{formatGHS(depositFee.feeAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-3 bg-[hsl(215_40%_96%/0.35)]">
                      <span className="text-[10px] text-muted-foreground/55 font-semibold uppercase tracking-wider">Total Charge</span>
                      <span className="text-[14px] font-bold text-foreground/80 tabular-nums">GH₵{formatGHS(depositFee.totalAmount)}</span>
                    </div>
                    <div className="px-3.5 py-2 bg-primary/5">
                      <p className="text-[10px] text-primary/70 font-medium text-center">
                        💰 GH₵{formatGHS(depositFee.baseAmount)} will be credited to your wallet
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleDeposit}
                  disabled={!validAmount}
                  className="w-full h-[52px] rounded-2xl text-[14px] font-semibold relative overflow-hidden"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  {depositFee
                    ? `Pay GH₵${formatGHS(depositFee.totalAmount)}`
                    : "Enter Amount"
                  }
                  {validAmount && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <p className="text-[9.5px] text-muted-foreground/35 text-center font-medium flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-3 w-3 text-success/45" />
                  Secured via Paystack · MoMo or Card
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
