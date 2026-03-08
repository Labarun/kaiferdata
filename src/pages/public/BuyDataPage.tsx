/**
 * BuyDataPage — Light liquid-glass Ghana buy-data experience (homepage)
 */
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, ArrowRight, Zap, Shield, Clock, Search } from "lucide-react";
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
    <div className="min-h-[70vh]">
      {/* ─── Compact hero intro ─── */}
      <section className="bg-hero-gradient relative overflow-hidden">
        <div className="container relative pt-8 pb-5 sm:pt-10 sm:pb-7">
          <div className="max-w-lg mx-auto text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card text-[11px] text-muted-foreground mb-4 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
              <span>Service Online</span>
              <span className="h-3 w-px bg-border/60" />
              <span>Instant Delivery</span>
            </div>

            <h1 className="text-[1.5rem] sm:text-[1.75rem] font-semibold tracking-[-0.025em] text-foreground leading-[1.15] animate-fade-in-up">
              Buy Data{" "}
              <span className="text-gradient-gold">Instantly</span>
            </h1>
            <p className="mt-2 text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed max-w-[300px] mx-auto animate-fade-in-up" style={{ animationDelay: "0.08s" }}>
              No account needed. Choose your network, pick a plan, get data in seconds.
            </p>
          </div>
        </div>

        {/* Trust strip */}
        <div className="border-t border-border/40">
          <div className="container py-2.5">
            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {[
                { icon: Zap, label: "Instant" },
                { icon: Shield, label: "Secure" },
                { icon: Clock, label: "24/7" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <item.icon className="h-3 w-3 text-primary/60" />
                  <span className="text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Main buy flow ─── */}
      <div className="container py-5 sm:py-7">
        <div className="max-w-lg mx-auto space-y-5">
          <NoticeBanner audience="public" />

          {/* Network selector */}
          <section className="animate-fade-in">
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.12em] mb-2.5 font-medium">
              Choose Network
            </p>
            <NetworkSelector
              networks={networks.length > 0 ? networks : GHANA_NETWORKS}
              selected={network}
              onSelect={handleNetworkSelect}
            />
          </section>

          {/* Plans */}
          {network && (
            <section className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.12em] font-medium">
                  {network} Bundles
                </p>
                <p className="text-[10px] text-muted-foreground/40">
                  {filteredPlans.length} available
                </p>
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
            <div className="sticky bottom-4 z-30 animate-slide-up">
              <button
                onClick={() => setCheckoutOpen(true)}
                className="w-full glass-elevated rounded-2xl p-3.5 flex items-center justify-between gap-3 active:scale-[0.98] transition-all duration-200 glow-gold"
              >
                <div className="min-w-0 text-left">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {plan.volume} · {network}
                  </p>
                  <p className="text-base font-semibold text-primary mt-0.5">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 h-10 px-5 rounded-xl bg-gradient-to-b from-[hsl(40_90%_52%)] via-primary to-[hsl(36_78%_42%)] text-primary-foreground text-xs font-medium flex items-center gap-1.5 shadow-[inset_0_1px_0_0_hsl(42_90%_68%/0.5),0_4px_14px_-4px_hsl(40_85%_48%/0.3)]">
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            </div>
          )}

          {/* Quick links */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="ghost" size="sm" asChild className="text-[11px] text-muted-foreground/50 h-8">
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
