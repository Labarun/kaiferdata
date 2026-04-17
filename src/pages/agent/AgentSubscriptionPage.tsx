/**
 * AgentSubscriptionPage — Agent subscription management & checkout
 *
 * Lives under /agent/subscription (mounted on UserLayout, NOT AgentLayout —
 * a brand-new approved agent has no `agent` role yet, so they can't reach
 * pages gated behind it). Once they pay, role is granted by the webhook
 * and they can immediately enter /agent.
 *
 * States rendered:
 *   - active                     → status card + countdown to expiry + manual renewal
 *   - approved_pending_subscription / subscription_expired → plan picker + Pay
 *   - any other state            → bounce back to /dashboard/become-agent
 *
 * Strict additive: never mutates orders/wallets. Subscription payment goes
 * through the same Paystack pipeline as data bundles via initialize-payment.
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveAgentState, AGENT_PLANS, type AgentState, type AgentPlanCode,
  createSubscriptionIntent, initializeSubscriptionCheckout,
} from "@/services/agent";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/shared/LoadingState";
import { useToast } from "@/hooks/use-toast";
import {
  Check, Sparkles, ShieldCheck, CreditCard, Loader2, Calendar, ArrowRight, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AgentSubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<AgentPlanCode>("monthly");
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setState(await resolveAgentState(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const handlePay = async () => {
    if (!user || paying) return;
    setPaying(true);
    try {
      const intent = await createSubscriptionIntent({
        userId: user.id,
        email: user.email || null,
        fullName: user.fullName || null,
        phone: user.phone || null,
        plan: selectedPlan,
      });
      const url = await initializeSubscriptionCheckout(intent.id);
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not start checkout.";
      toast({ title: "Payment failed", description: message, variant: "destructive" });
      setPaying(false);
    }
  };

  if (loading || !state) return <PageLoader />;

  // Bounce non-agents back to onboarding
  if (
    state.kind === "no_application" ||
    state.kind === "draft" ||
    state.kind === "needs_changes" ||
    state.kind === "submitted" ||
    state.kind === "under_review" ||
    state.kind === "declined"
  ) {
    navigate("/dashboard/become-agent", { replace: true });
    return null;
  }

  if (state.kind === "suspended") {
    return (
      <div className="space-y-5 pb-4 animate-fade-in">
        <div className="glass-elevated rounded-2xl p-5 text-center space-y-2">
          <p className="text-sm font-bold text-foreground">Account suspended</p>
          <p className="text-[12px] text-muted-foreground/80 max-w-[280px] mx-auto leading-relaxed">
            Your agent account is suspended. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  /* ── ACTIVE: show current plan + manual renewal ── */
  if (state.kind === "active") {
    const sub = state.subscription;
    const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
    const daysLeft = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
      : null;
    const renewSoon = daysLeft !== null && daysLeft <= 7;

    return (
      <div className="space-y-5 pb-32 md:pb-8 animate-fade-in">
        <div className="glass-premium rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/65 font-semibold">
                  Status
                </p>
                <p className="text-sm font-bold text-foreground">Active subscription</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success border border-success/20 capitalize">
              {sub.plan}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="glass-card rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/55 font-semibold">
                Started
              </p>
              <p className="text-[12.5px] font-semibold text-foreground/85 mt-1">
                {sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <div className="glass-card rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/55 font-semibold">
                Expires
              </p>
              <p className="text-[12.5px] font-semibold text-foreground/85 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-muted-foreground/55" />
                {expiresAt ? expiresAt.toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
          {daysLeft !== null && (
            <p
              className={cn(
                "text-[11px] text-center font-medium pt-1",
                renewSoon ? "text-warning" : "text-muted-foreground/65",
              )}
            >
              {daysLeft === 0
                ? "Expires today — renew to avoid losing access."
                : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`}
            </p>
          )}
        </div>

        <PlanPicker
          selected={selectedPlan}
          onSelect={setSelectedPlan}
          ctaLabel="Renew now"
          paying={paying}
          onPay={handlePay}
          subtitle="Manual renewal — pay early to extend your agent access."
        />
      </div>
    );
  }

  /* ── APPROVED PENDING / EXPIRED: needs to pay ── */
  const isExpired = state.kind === "subscription_expired";
  return (
    <div className="space-y-5 pb-32 md:pb-8 animate-fade-in">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-primary/70" />
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
            {isExpired ? "Renew subscription" : "One step away"}
          </p>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {isExpired ? "Reactivate your agent account" : "Activate your agent account"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          {isExpired
            ? "Your subscription lapsed. Pick a plan to restore reseller pricing & your storefront."
            : "Your application was approved. Pick a plan to unlock reseller pricing & your storefront."}
        </p>
      </div>

      <PlanPicker
        selected={selectedPlan}
        onSelect={setSelectedPlan}
        ctaLabel="Pay & activate"
        paying={paying}
        onPay={handlePay}
      />

      <div className="glass-card rounded-xl p-4 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-success/65 shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-muted-foreground/75 leading-relaxed">
          Secure payment via Paystack. Your subscription activates instantly after payment confirmation.
        </p>
      </div>
    </div>
  );
}

/* ──────────────── Subcomponent: Plan picker ──────────────── */
function PlanPicker({
  selected,
  onSelect,
  ctaLabel,
  onPay,
  paying,
  subtitle,
}: {
  selected: AgentPlanCode;
  onSelect: (p: AgentPlanCode) => void;
  ctaLabel: string;
  onPay: () => void;
  paying: boolean;
  subtitle?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {(Object.keys(AGENT_PLANS) as AgentPlanCode[]).map((code) => {
          const plan = AGENT_PLANS[code];
          const isSel = selected === code;
          const monthlyEq = code === "yearly" ? plan.price / 12 : plan.price;
          const savings = code === "yearly"
            ? Math.round((1 - AGENT_PLANS.yearly.price / (AGENT_PLANS.monthly.price * 12)) * 100)
            : 0;

          return (
            <button
              key={code}
              onClick={() => onSelect(code)}
              className={cn(
                "text-left glass-card rounded-2xl p-4 border-2 transition-all active:scale-[0.99]",
                isSel
                  ? "border-primary/45 shadow-[0_0_22px_hsl(var(--primary)/0.18)]"
                  : "border-transparent hover:border-primary/15",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground capitalize">{plan.label}</p>
                    {code === "yearly" && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/12 text-primary border border-primary/20">
                        Save {savings}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-muted-foreground/70 mt-0.5">
                    {code === "monthly"
                      ? "Pay every 30 days. Cancel anytime."
                      : "Pay once for 365 days of agent access."}
                  </p>
                </div>
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    isSel ? "border-primary bg-primary" : "border-muted-foreground/30",
                  )}
                >
                  {isSel && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground/55 uppercase tracking-wider font-semibold">
                    Total
                  </p>
                  <p className="text-2xl font-bold text-foreground tracking-tight leading-none mt-1">
                    <span className="text-sm text-muted-foreground/65">GH₵</span>
                    {plan.price.toFixed(2)}
                  </p>
                </div>
                {code === "yearly" && (
                  <p className="text-[10.5px] text-muted-foreground/65">
                    ≈ GH₵{monthlyEq.toFixed(2)}/mo
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {subtitle && (
        <p className="text-[11px] text-muted-foreground/65 text-center">{subtitle}</p>
      )}

      <Button
        onClick={onPay}
        disabled={paying}
        className="w-full h-12 rounded-xl gap-2 text-[14px] font-semibold"
      >
        {paying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Starting checkout…
          </>
        ) : ctaLabel === "Renew now" ? (
          <>
            <RefreshCw className="h-4 w-4" /> {ctaLabel}
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" /> {ctaLabel} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
