/**
 * BuyDataPage — Premium art-directed Ghana buy-data landing with interaction layer
 */
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, ArrowRight, Zap, Shield, Clock, Search, Wifi, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { NetworkSelector } from "@/components/buy/NetworkSelector";
import { PlanSelector } from "@/components/buy/PlanSelector";
import { CheckoutSheet } from "@/components/buy/CheckoutSheet";
import { IntentCreated } from "@/components/buy/IntentCreated";
import { NoticeBanner } from "@/components/shared/NoticeBanner";
import {
  fetchDataPlans,
  getNetworks,
  filterPlansByNetwork,
  createPurchaseIntent,
  type DataPlan,
  type PurchaseIntent,
} from "@/services/purchaseIntent";

const GHANA_NETWORKS = ["MTN", "Telecel", "AirtelTigo"];

const NETWORK_TINT: Record<string, string> = {
  MTN: "from-[hsl(46_80%_52%/0.06)] to-transparent",
  Telecel: "from-[hsl(0_60%_52%/0.04)] to-transparent",
  AirtelTigo: "from-[hsl(212_70%_52%/0.04)] to-transparent",
};

export default function BuyDataPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [network, setNetwork] = useState<string | null>(searchParams.get("network"));
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [intent, setIntent] = useState<PurchaseIntent | null>(null);

  // Track plan grid transition key for re-entrance animation
  const [plansKey, setPlansKey] = useState(0);
  // Track summary visibility state for exit animation
  const [summaryVisible, setSummaryVisible] = useState(false);
  const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchDataPlans()
      .then(setPlans)
      .catch(() => toast({ title: "Error", description: "Failed to load plans", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const networks = useMemo(() => {
    const available = getNetworks(plans);
    return GHANA_NETWORKS.filter((n) => available.includes(n));
  }, [plans]);

  useEffect(() => {
    if (!network && networks.length > 0 && !loading) {
      setNetwork(networks[0]);
    }
  }, [networks, loading]);

  const filteredPlans = useMemo(
    () => (network ? filterPlansByNetwork(plans, network) : []),
    [plans, network]
  );

  const handleNetworkSelect = useCallback((n: string) => {
    setNetwork(n);
    setPlan(null);
    setSummaryVisible(false);
    // Trigger re-entrance animation for plans grid
    setPlansKey((k) => k + 1);
  }, []);

  const handlePlanSelect = useCallback((p: DataPlan) => {
    setPlan(p);
    // Don't auto-open checkout; show floating summary instead
    setSummaryVisible(true);
  }, []);

  // Manage summary exit animation before hiding
  const handleDismissSummary = useCallback(() => {
    setSummaryVisible(false);
  }, []);

  const handleOpenCheckout = useCallback(() => {
    setCheckoutOpen(true);
  }, []);

  const handleConfirm = async () => {
    if (!network || !plan) return;
    setSubmitting(true);
    try {
      const result = await createPurchaseIntent({
        phoneNumber,
        network,
        plan,
        customerEmail: customerEmail || undefined,
        customerName: customerName || undefined,
      });
      setIntent(result);
      setCheckoutOpen(false);
      setSummaryVisible(false);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setNetwork(networks[0] || null);
    setPlan(null);
    setPhoneNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setIntent(null);
    setSummaryVisible(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 rounded-2xl glass-elevated flex items-center justify-center animate-pulse">
            <Wifi className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground/60">Loading plans…</p>
        </div>
      </div>
    );
  }

  if (intent) {
    return (
      <div className="container py-6 sm:py-10">
        <div className="max-w-md mx-auto">
          <IntentCreated intent={intent} onNewOrder={resetFlow} />
        </div>
      </div>
    );
  }

  const networkTint = network ? NETWORK_TINT[network] || "" : "";

  return (
    <div className="min-h-[70vh] pb-28">
      {/* ─── Premium hero intro ─── */}
      <section className="bg-hero-gradient relative overflow-hidden">
        {/* Layered ambient light */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[35%] left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[hsl(38_45%_85%/0.4)] blur-[120px]" />
          <div className="absolute bottom-[-25%] right-[-12%] w-[280px] h-[280px] rounded-full bg-[hsl(212_35%_86%/0.28)] blur-[90px]" />
          <div className="absolute top-[40%] left-[-10%] w-[220px] h-[220px] rounded-full bg-[hsl(38_40%_84%/0.22)] blur-[80px]" />
        </div>

        <div className="container relative pt-12 pb-8 sm:pt-16 sm:pb-10">
          <div className="max-w-md mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-premium text-[11px] mb-6 animate-fade-in shimmer-edge overflow-hidden">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success shadow-[0_0_8px_hsl(152_52%_36%/0.45)]" />
              </span>
              <span className="font-semibold text-foreground/65 tracking-wide">Service Online</span>
              <span className="h-3 w-px bg-border/40 mx-0.5" />
              <Zap className="h-3 w-3 text-primary/55" />
              <span className="text-foreground/50 font-medium">Instant Delivery</span>
            </div>

            {/* Headline */}
            <h1 className="text-[1.75rem] sm:text-[2.125rem] font-bold tracking-[-0.035em] text-foreground/90 leading-[1.1] animate-fade-in">
              Buy Data{" "}
              <span className="text-gradient-gold">Instantly</span>
            </h1>
            <p
              className="mt-3.5 text-[13.5px] text-muted-foreground/75 leading-[1.65] max-w-[300px] mx-auto animate-fade-in"
              style={{ animationDelay: "0.08s" }}
            >
              Pick a network, choose your bundle, receive data in seconds.
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative">
          <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="container py-3.5">
            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {[
                { icon: Zap, label: "Instant", accent: "text-primary/60" },
                { icon: Shield, label: "Secure", accent: "text-success/60" },
                { icon: Clock, label: "24/7", accent: "text-info/60" },
                { icon: Globe, label: "Ghana Only", accent: "text-muted-foreground/45" },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="h-3 w-px bg-border/30 -ml-2.5 mr-0.5 sm:-ml-4 sm:mr-0" />}
                  <div className="h-5 w-5 rounded-md bg-[hsl(0_0%_100%/0.5)] border border-[hsl(228_18%_86%/0.5)] flex items-center justify-center">
                    <item.icon className={`h-3 w-3 ${item.accent}`} />
                  </div>
                  <span className="text-[11px] text-muted-foreground/65 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/25 to-transparent" />
        </div>
      </section>

      {/* ─── Main buy flow ─── */}
      <div className="container pt-7 sm:pt-9">
        <div className="max-w-lg mx-auto">
          <NoticeBanner audience="public" />

          {/* Network selector */}
          <section className="mb-7">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="h-1 w-1 rounded-full bg-primary/50" />
              <p className="section-label">Choose Network</p>
            </div>
            <NetworkSelector
              networks={networks.length > 0 ? networks : GHANA_NETWORKS}
              selected={network}
              onSelect={handleNetworkSelect}
            />
          </section>

          {/* Plans — with entrance animation on network switch */}
          {network && (
            <section key={plansKey} className="animate-plans-enter mb-7">
              {/* Context-aware tint overlay behind plans */}
              <div className={`absolute inset-0 -z-10 pointer-events-none bg-gradient-to-b ${networkTint} rounded-3xl opacity-60`} />

              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary/50" />
                  <p className="section-label">{network} Bundles</p>
                </div>
                <span className="text-[10px] text-muted-foreground/35 font-medium tabular-nums">
                  {filteredPlans.length} available
                </span>
              </div>
              <PlanSelector
                plans={filteredPlans}
                selected={plan}
                onSelect={handlePlanSelect}
              />
            </section>
          )}

          {/* Quick links */}
          <div className="flex items-center justify-center pt-2 pb-2">
            <Button variant="ghost" size="sm" asChild className="text-[11px] text-muted-foreground/45 h-8 font-medium">
              <Link to="/track">
                <Search className="h-3 w-3 mr-1.5" />
                Track Order
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Floating selected plan summary ─── */}
      {plan && summaryVisible && !checkoutOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 pt-2 pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <div className="animate-summary-enter glass-premium rounded-2xl overflow-hidden glow-gold-strong shimmer-edge">
              {/* Context network tint at top */}
              <div className={`h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent`} />

              <div className="p-4 flex items-center gap-4">
                {/* Plan info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                      {network}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-border/50" />
                    <span className="text-[10px] text-muted-foreground/40 font-medium truncate">
                      {plan.plan_name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-foreground/85 tracking-tight">
                      {plan.volume}
                    </span>
                    <span className="text-[15px] font-bold text-gradient-gold">
                      GH₵{Number(plan.amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleOpenCheckout}
                  className="shrink-0 h-12 px-6 rounded-xl bg-gradient-to-b from-[hsl(38_88%_50%)] via-primary to-[hsl(34_75%_38%)] text-primary-foreground text-[13px] font-semibold flex items-center gap-2 shadow-[inset_0_1.5px_0_0_hsl(42_92%_65%/0.55),0_2px_8px_-2px_hsl(38_82%_44%/0.25),0_8px_24px_-8px_hsl(38_82%_44%/0.2)] active:scale-[0.96] active:brightness-[0.94] transition-all duration-150"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        network={network}
        plan={plan}
        phoneNumber={phoneNumber}
        onPhoneChange={setPhoneNumber}
        customerName={customerName}
        onCustomerNameChange={setCustomerName}
        customerEmail={customerEmail}
        onCustomerEmailChange={setCustomerEmail}
        onConfirm={handleConfirm}
        loading={submitting}
      />
    </div>
  );
}
