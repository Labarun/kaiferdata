/**
 * BuyDataPage - Premium guided buying with liquid-glass surfaces
 */
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

  const networks = useMemo(() => getNetworks(plans), [plans]);
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
    setNetwork(null);
    setPlan(null);
    setPhoneNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setIntent(null);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-[11px] text-muted-foreground">Loading plans…</p>
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
      {/* Page header */}
      <div className="bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[hsl(228_28%_16%/0.5)] blur-[100px]" />
        </div>
        <div className="container relative py-7 sm:py-9">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-xl sm:text-2xl font-medium text-hero-foreground tracking-tight">
              Buy Data Bundle
            </h1>
            <p className="text-[11px] text-hero-muted mt-1.5">
              Select your network and plan to get started
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border/20 to-transparent" />
      </div>

      <div className="container py-5 sm:py-7">
        <div className="max-w-lg mx-auto space-y-5">
          <NoticeBanner audience="public" />

          {/* Network selector */}
          <section className="animate-fade-in">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest mb-3 font-medium">
              Choose Network
            </p>
            <NetworkSelector
              networks={networks}
              selected={network}
              onSelect={handleNetworkSelect}
            />
          </section>

          {/* Plan grid */}
          {network && (
            <section className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-medium">
                  {network} Plans
                </p>
                <p className="text-[10px] text-muted-foreground/50">
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
                className="w-full glass-elevated rounded-2xl p-4 flex items-center justify-between gap-3 active:scale-[0.98] transition-all duration-200 hover:shadow-[0_0_32px_-8px_hsl(42_88%_56%/0.12)]"
              >
                <div className="min-w-0 text-left">
                  <p className="text-[11px] text-muted-foreground truncate">
                    {plan.volume} · {network}
                  </p>
                  <p className="text-base font-medium text-primary mt-0.5">
                    GH₵{Number(plan.amount).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 h-10 px-5 rounded-xl bg-gradient-to-b from-primary to-primary/90 text-primary-foreground text-xs font-medium flex items-center gap-1.5 shadow-[0_1px_0_0_hsl(42_88%_70%/0.3)_inset,0_4px_20px_-4px_hsl(42_88%_56%/0.4)]">
                  Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            </div>
          )}
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
