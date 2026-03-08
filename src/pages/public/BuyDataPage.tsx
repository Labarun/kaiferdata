/**
 * BuyDataPage — Premium art-directed Ghana buy-data landing
 */
import { useEffect, useState, useMemo } from "react";
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
          <div className="h-11 w-11 rounded-2xl glass-elevated flex items-center justify-center animate-pulse-soft">
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

  return (
    <div className="min-h-[70vh] pb-10">
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
            {/* Status pill — signature component */}
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
            <h1 className="text-[1.75rem] sm:text-[2.125rem] font-bold tracking-[-0.035em] text-foreground/90 leading-[1.1] animate-fade-in-up">
              Buy Data{" "}
              <span className="text-gradient-gold">Instantly</span>
            </h1>
            <p
              className="mt-3.5 text-[13.5px] text-muted-foreground/75 leading-[1.65] max-w-[300px] mx-auto animate-fade-in-up"
              style={{ animationDelay: "0.08s" }}
            >
              Pick a network, choose your bundle, receive data in seconds.
            </p>
          </div>
        </div>

        {/* Trust strip — elegant horizontal */}
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
          <section className="animate-fade-in mb-7">
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

          {/* Plans */}
          {network && (
            <section className="animate-fade-in-up mb-7">
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

          {/* Sticky bottom summary */}
          {plan && !checkoutOpen && (
            <div className="sticky bottom-5 z-30 animate-slide-up">
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full glass-premium rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-all duration-200 glow-gold-strong shimmer-edge overflow-hidden"
              >
                <div className="min-w-0 text-left relative z-10">
                  <p className="text-[10.5px] text-muted-foreground/60 truncate font-medium tracking-wide">
                    {plan.volume} · {network}
                  </p>
                  <p className="text-lg font-bold text-primary mt-0.5 tracking-tight">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 relative z-10 h-11 px-6 rounded-xl bg-gradient-to-b from-[hsl(38_88%_50%)] via-primary to-[hsl(34_75%_38%)] text-primary-foreground text-[13px] font-semibold flex items-center gap-2 shadow-[inset_0_1.5px_0_0_hsl(42_92%_65%/0.55),0_2px_8px_-2px_hsl(38_82%_44%/0.25),0_8px_24px_-8px_hsl(38_82%_44%/0.2)]">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </div>
              </button>
            </div>
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
