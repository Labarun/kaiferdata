/**
 * Agent Withdraw Page — request mobile money payouts from the
 * SEPARATE agent earnings balance (not the personal wallet).
 */
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowDownToLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listMyWithdrawals, requestWithdrawal, getMinWithdrawal,
  type WithdrawalRequest, type WithdrawalStatus,
} from "@/services/agentWithdrawals";
import { fetchEarningsWallet, type AgentEarningsWallet } from "@/services/agentEarningsWallet";
import { EarningsBalanceCard } from "@/components/agent/EarningsBalanceCard";
import { SubscriptionGate } from "@/components/agent/SubscriptionGate";

const statusStyle: Record<WithdrawalStatus, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-info/10 text-info border-info/20",
  paid: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const NETWORKS = [
  { value: "MTN", label: "MTN MoMo" },
  { value: "Telecel", label: "Telecel Cash" },
  { value: "AirtelTigo", label: "AirtelTigo Money" },
];

export default function AgentWithdrawPage() {
  return (
    <div className="animate-fade-in pb-8 space-y-4">
      <PageHeader title="Withdraw" description="Cash out your earnings to mobile money." />
      <SubscriptionGate message="Subscribe to enable withdrawals.">
        <WithdrawInner />
      </SubscriptionGate>
    </div>
  );
}

function WithdrawInner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<AgentEarningsWallet | null>(null);
  const [minAmount, setMinAmount] = useState(10);
  const [history, setHistory] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("MTN");
  const [momoName, setMomoName] = useState("");

  const refresh = async () => {
    if (!user) return;
    const [w, minA, hist] = await Promise.all([
      fetchEarningsWallet(user.id),
      getMinWithdrawal(),
      listMyWithdrawals(user.id),
    ]);
    setWallet(w);
    setMinAmount(minA);
    setHistory(hist.data ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  const balance = Number(wallet?.current_balance ?? 0);
  const numericAmount = useMemo(() => Number(amount), [amount]);
  const canSubmit =
    !!user && numericAmount >= minAmount && numericAmount <= balance &&
    momoNumber.length >= 9 && momoName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSubmitting(true);
    const { data, error } = await requestWithdrawal({
      userId: user.id,
      amount: numericAmount,
      momoNumber,
      momoNetwork,
      momoName: momoName.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Withdrawal requested", description: `GH₵ ${numericAmount.toFixed(2)} held from your earnings.` });
    setAmount(""); setMomoNumber(""); setMomoName("");
    refresh();
  };

  return (
    <div className="space-y-5">
      <EarningsBalanceCard wallet={wallet} loading={loading} />

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-primary" />
            New withdrawal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GH₵)</Label>
            <Input
              id="amount" type="number" inputMode="decimal" min={minAmount} max={balance} step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`${minAmount.toFixed(2)} or more`}
              className="text-base md:text-sm"
            />
            <p className="text-[10px] text-muted-foreground/60">Min: GH₵ {minAmount.toFixed(2)} · Available: GH₵ {balance.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={momoNetwork} onValueChange={setMomoNetwork}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NETWORKS.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="momoNumber">MoMo number</Label>
              <Input id="momoNumber" inputMode="numeric" value={momoNumber}
                onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ""))} placeholder="0244123456"
                className="text-base md:text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="momoName">Account name</Label>
            <Input id="momoName" value={momoName} onChange={(e) => setMomoName(e.target.value)} placeholder="As registered on MoMo"
              className="text-base md:text-sm" />
          </div>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-11">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request payout
          </Button>
          {numericAmount > 0 && numericAmount > balance && (
            <p className="text-xs text-destructive">Amount exceeds your earnings balance.</p>
          )}
        </CardContent>
      </Card>

      <div>
        <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-muted-foreground/70 mb-2">Recent requests</p>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">No withdrawals yet.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {history.map((w) => (
              <Card key={w.id} className="glass-card rounded-xl">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tabular-nums">GH₵ {Number(w.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.momo_network} · {w.momo_number} · {new Date(w.requested_at).toLocaleDateString()}
                    </p>
                    {w.admin_note && <p className="text-[11px] text-muted-foreground/80 mt-0.5 italic">"{w.admin_note}"</p>}
                  </div>
                  <Badge variant="outline" className={`text-[10px] capitalize ${statusStyle[w.status]}`}>{w.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
