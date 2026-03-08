/**
 * BuyDataPage — Premium art-directed Ghana buy-data landing
 */
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, ArrowRight, Zap, Shield, Clock, Search, Wifi } from "lucide-react";
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

  const handleNetworkSelect = (n: string) => {
    setNetwork(n);
    setPlan(null);
  };

  const handlePlanSelect = (p: DataPlan) => {
    setPlan(p);
    setCheckoutOpen(true);
  };

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
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-2xl glass-elevated flex items-center justify-center animate-pulse-soft">
            <Wifi className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Loading plans…</p>
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

  return (
    <div className="min-h-[70vh] pb-8">
      {/* ─── Premium hero intro ─── */}
      <section className="bg-hero-gradient relative overflow-hidden">
        {/* Ambient light orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[hsl(38_50%_85%/0.35)] blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[250px] h-[250px] rounded-full bg-[hsl(212_40%_88%/0.25)] blur-[80px]" />
          <div className="absolute bottom-[10%] left-[-8%] w-[200px] h-[200px] rounded-full bg-[hsl(38_45%_86%/0.2)] blur-[70px]" />
        </div>

        <div className="container relative pt-10 pb-7 sm:pt-14 sm:pb-9">
          <div className="max-w-md mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-premium text-[11px] text-muted-foreground mb-5 animate-fade-in shimmer-edge overflow-hidden">
              <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_6px_hsl(152_52%_36%/0.4)] animate-pulse-soft" />
              <span className="font-medium text-foreground/60">Service Online</span>
              <span className="h-3.5 w-px bg-border/50" />
              <Zap className="h-3 w-3 text-primary/50" />
              <span className="text-foreground/50">Instant Delivery</span>
            </div>

            <h1 className="text-[1.625rem] sm:text-[2rem] font-bold tracking-[-0.03em] text-foreground/90 leading-[1.12] animate-fade-in-up">
              Buy Data{" "}
              <span className="text-gradient-gold">Instantly</span>
            </h1>
            <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed max-w-[280px] mx-auto animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
              No account needed. Pick a network, choose a bundle, receive data in seconds.
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative">
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          <div className="container py-3">
            <div className="flex items-center justify-center gap-6 sm:gap-9">
              {[
                { icon: Zap, label: "Instant", accent: "text-primary/55" },
                { icon: Shield, label: "Secure", accent: "text-success/55" },
                { icon: Clock, label: "24/7", accent: "text-info/55" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <item.icon className={`h-3.5 w-3.5 ${item.accent}`} />
                  <span className="text-[11px] text-muted-foreground/70 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent" />
        </div>
      </section>

      {/* ─── Main buy flow ─── */}
      <div className="container pt-6 sm:pt-8">
        <div className="max-w-lg mx-auto space-y-6">
          <NoticeBanner audience="public" />

          {/* Network selector */}
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-1 rounded-full bg-primary/40" />
              <p className="text-[11px] text-muted-foreground/55 uppercase tracking-[0.14em] font-semibold">
                Choose Network
              </p>
            </div>
            <NetworkSelector
              networks={networks.length > 0 ? networks : GHANA_NETWORKS}
              selected={network}
              onSelect={handleNetworkSelect}
            />
          </section>

          {/* Plans */}
          {network && (
            <section className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary/40" />
                  <p className="text-[11px] text-muted-foreground/55 uppercase tracking-[0.14em] font-semibold">
                    {network} Bundles
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/35 font-medium">
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

          {/* Sticky bottom summary */}
          {plan && !checkoutOpen && (
            <div className="sticky bottom-5 z-30 animate-slide-up">
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full glass-premium rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-all duration-200 glow-gold shimmer-edge overflow-hidden"
              >
                <div className="min-w-0 text-left relative z-10">
                  <p className="text-[10px] text-muted-foreground/60 truncate font-medium">
                    {plan.volume} · {network}
                  </p>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 relative z-10 h-11 px-6 rounded-xl bg-gradient-to-b from-[hsl(38_88%_50%)] via-primary to-[hsl(34_75%_38%)] text-primary-foreground text-[13px] font-semibold flex items-center gap-2 shadow-[inset_0_1.5px_0_0_hsl(42_92%_65%/0.55),0_4px_14px_-4px_hsl(38_82%_44%/0.3)]">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </div>
          )}

          {/* Quick links */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <Button variant="ghost" size="sm" asChild className="text-[11px] text-muted-foreground/45 h-8 font-medium">
              <Link to="/track">
                <Search className="h-3 w-3 mr-1" />
                Track Order
              </Link>
            </Button>
          </div>
        </div>
      </div>

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
